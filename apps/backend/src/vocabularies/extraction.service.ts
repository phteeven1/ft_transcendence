import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { PDFParse } from 'pdf-parse';
import { basename, extname } from 'path';

type ExtractionResult = { title: string; words: string[]; meanings: string[] };

const MAX_DOCUMENT_CHARS = 15000;
const MAX_TITLE_CHARS = 80;
const MIN_VOCAB_PAIRS = 5;

const VISION_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const VISION_MIMES = new Set(Object.values(VISION_MIME_BY_EXT));

@Injectable()
export class ExtractionService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {}

  private getOpenAiClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim() || apiKey.trim() === 'null') {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured on the server.',
      );
    }
    if (!this.openai) {
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private isPdf(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    const pdfMimes = new Set(['application/pdf', 'application/x-pdf']);
    return (
      pdfMimes.has(file.mimetype) ||
      (ext === '.pdf' && !file.mimetype.startsWith('image/'))
    );
  }

  private isImage(file: Express.Multer.File): boolean {
    if (file.mimetype.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.originalname);
  }

  private resolveVisionMime(file: Express.Multer.File): string {
    if (VISION_MIMES.has(file.mimetype)) return file.mimetype;
    const fromExt = VISION_MIME_BY_EXT[extname(file.originalname).toLowerCase()];
    if (fromExt) return fromExt;
    throw new BadRequestException(
      'Unsupported image type. Upload a PNG, JPEG, GIF, WebP, or PDF.',
    );
  }

  private getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer?.length) return file.buffer;
    if (file.path) return readFileSync(file.path);
    throw new BadRequestException('Uploaded file is empty.');
  }

  private buildExtractionInstructions(
    fromLanguage: string,
    toLanguage: string,
  ): string {
    return `Extract vocabulary pairs from the uploaded source.

Extract between 5 and 50 vocabulary pairs.
Prefer ${fromLanguage} words in "words" and ${toLanguage} meanings in "meanings".
If the document uses another language or mixed columns, still extract every clear word/translation pair you see.
Accept formats like "word - meaning", two-column tables, numbered lists, or bullet lists.
Keep words and meanings aligned by row/order.
Also include a short descriptive "title" for the vocabulary list (max 80 characters), based on the document heading, topic, or subject. If none is obvious, invent a concise title such as "French Unit 3 Vocabulary".
Return strictly JSON: { "title": "...", "words": ["..."], "meanings": ["..."] } with the same number of entries in both arrays.`;
  }

  private buildTextPrompt(
    fromLanguage: string,
    toLanguage: string,
    documentText: string,
  ): string {
    const text =
      documentText.length > MAX_DOCUMENT_CHARS
        ? documentText.substring(0, MAX_DOCUMENT_CHARS) + '... [truncated]'
        : documentText;

    return `${this.buildExtractionInstructions(fromLanguage, toLanguage)}

Document Text:
${text}`;
  }

  private resolveTitle(
    parsed: ExtractionResult,
    fromLanguage: string,
    toLanguage: string,
    fallbackFilename?: string,
  ): string {
    if (parsed.title?.trim()) {
      return parsed.title.trim().slice(0, MAX_TITLE_CHARS);
    }
    if (fallbackFilename) {
      const stem = basename(fallbackFilename, extname(fallbackFilename)).trim();
      if (stem) return stem.slice(0, MAX_TITLE_CHARS);
    }
    return `${fromLanguage} - ${toLanguage} Vocabulary`;
  }

  private validatePairs(
    words: string[],
    meanings: string[],
  ): Pick<ExtractionResult, 'words' | 'meanings'> {
    const cleanedWords = words.map((w) => w.trim()).filter(Boolean);
    const cleanedMeanings = meanings.map((m) => m.trim()).filter(Boolean);
    const count = Math.min(cleanedWords.length, cleanedMeanings.length);

    if (count < MIN_VOCAB_PAIRS) {
      throw new UnprocessableEntityException(
        `AI only extracted ${count} word(s), but at least ${MIN_VOCAB_PAIRS} are required. Try a clearer photo or a file with more vocabulary.`,
      );
    }

    return {
      words: cleanedWords.slice(0, count),
      meanings: cleanedMeanings.slice(0, count),
    };
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const instance = new PDFParse({ data: buffer });
    try {
      const pdfData = await instance.getText();
      return pdfData.text.trim();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown PDF error';
      throw new BadRequestException(`Could not read PDF: ${message}`);
    } finally {
      await instance.destroy();
    }
  }

  private async callOpenAi(
    userContent: string | ChatCompletionContentPart[],
    fromLanguage: string,
    toLanguage: string,
    fallbackFilename?: string,
  ): Promise<ExtractionResult> {
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.getOpenAiClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You extract vocabulary word/translation pairs and a list title from an image or document text. Always return valid JSON.',
          },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'vocabulary_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description:
                    'Short descriptive title for the vocabulary list (max 80 chars)',
                },
                words: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of source language words',
                },
                meanings: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'List of target language meanings/translations aligned index-by-index with words',
                },
              },
              required: ['title', 'words', 'meanings'],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.2,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OpenAI request failed';
      console.error('OpenAI extraction error:', message);
      throw new InternalServerErrorException(
        `AI extraction failed: ${message}`,
      );
    }
    const content = response.choices[0]?.message?.content ?? '{}';

    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(content) as ExtractionResult;
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new UnprocessableEntityException(
        'AI returned an invalid response. Please try again with a clearer file.',
      );
    }

    const validated = this.validatePairs(parsed.words, parsed.meanings);

    return {
      title: this.resolveTitle(
        parsed,
        fromLanguage,
        toLanguage,
        fallbackFilename,
      ),
      ...validated,
    };
  }

  async extractVocab(
    file: Express.Multer.File,
    fromLanguage = 'French',
    toLanguage = 'English',
  ): Promise<ExtractionResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim() || apiKey.trim() === 'null') {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured on the server.',
      );
    }

    const buffer = this.getFileBuffer(file);

    if (this.isImage(file)) {
      const mime = this.resolveVisionMime(file);
      console.log(
        `Sending image to GPT-4o vision (${mime}, ${buffer.length} bytes)`,
      );
      const instructions = this.buildExtractionInstructions(
        fromLanguage,
        toLanguage,
      );
      return this.callOpenAi(
        [
          { type: 'text', text: instructions },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${buffer.toString('base64')}`,
            },
          },
        ],
        fromLanguage,
        toLanguage,
        file.originalname,
      );
    }

    if (this.isPdf(file)) {
      const documentText = await this.extractPdfText(buffer);
      if (!documentText) {
        throw new BadRequestException(
          'No readable text found in the file. Try a PDF with visible vocabulary.',
        );
      }
      console.log(
        `Extracted ${documentText.length} characters via PDF parsing`,
      );
      return this.callOpenAi(
        this.buildTextPrompt(fromLanguage, toLanguage, documentText),
        fromLanguage,
        toLanguage,
        file.originalname,
      );
    }

    throw new BadRequestException(
      `Unsupported file type "${file.mimetype}". Upload a PDF or image (PNG, JPEG, etc.).`,
    );
  }
}
