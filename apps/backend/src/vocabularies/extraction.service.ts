import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { extname } from 'path';

type VocabPair = { words: string[]; meanings: string[] };

@Injectable()
export class ExtractionService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  private isPdf(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    const pdfMimes = new Set(['application/pdf', 'application/x-pdf']);
    return pdfMimes.has(file.mimetype) || (ext === '.pdf' && !file.mimetype.startsWith('image/'));
  }

  private isImage(file: Express.Multer.File): boolean {
    if (file.mimetype.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.originalname);
  }

  private getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer?.length) return file.buffer;
    if (file.path) return readFileSync(file.path);
    throw new BadRequestException('Uploaded file is empty.');
  }

  private buildPrompt(fromLanguage: string, toLanguage: string, isImage: boolean): string {
    const intro = isImage
      ? `You are an OCR assistant. The attached image may be a photo of a vocabulary list, worksheet, textbook page, or screenshot (including WhatsApp photos). Read all visible text carefully, including handwriting and table layouts.`
      : `Extract vocabulary pairs from the provided document text.`;

    return `${intro}

Extract between 5 and 50 vocabulary pairs.
Prefer ${fromLanguage} words in "words" and ${toLanguage} meanings in "meanings".
If the document uses another language or mixed columns, still extract every clear word/translation pair you see.
Accept formats like "word - meaning", two-column tables, numbered lists, or bullet lists.
Keep words and meanings aligned by row/order.
Return strictly JSON: { "words": ["..."], "meanings": ["..."] } with the same number of entries in both arrays.`;
  }

  private normalizePairs(parsed: Record<string, unknown>): VocabPair {
    const words = Array.isArray(parsed.words) ? parsed.words.map(String) : [];
    const meanings = Array.isArray(parsed.meanings) ? parsed.meanings.map(String) : [];
    if (words.length > 0 || meanings.length > 0) {
      return { words, meanings };
    }

    const pairKeys = ['pairs', 'vocabulary', 'entries', 'items', 'data'] as const;
    for (const key of pairKeys) {
      const value = parsed[key];
      if (!Array.isArray(value)) continue;

      const extractedWords: string[] = [];
      const extractedMeanings: string[] = [];
      for (const item of value) {
        if (typeof item === 'string' && item.includes('-')) {
          const [word, ...rest] = item.split('-');
          const meaning = rest.join('-').trim();
          if (word.trim() && meaning) {
            extractedWords.push(word.trim());
            extractedMeanings.push(meaning);
          }
          continue;
        }
        if (!item || typeof item !== 'object') continue;
        const pair = item as Record<string, unknown>;
        const word = pair.word ?? pair.source ?? pair.term ?? pair.foreign ?? pair[0];
        const meaning = pair.meaning ?? pair.translation ?? pair.target ?? pair.english ?? pair[1];
        if (word != null && meaning != null) {
          extractedWords.push(String(word).trim());
          extractedMeanings.push(String(meaning).trim());
        }
      }
      if (extractedWords.length > 0) {
        return { words: extractedWords, meanings: extractedMeanings };
      }
    }

    return { words: [], meanings: [] };
  }

  private validatePairs(words: string[], meanings: string[]): VocabPair {
    const cleanedWords = words.map((w) => w.trim()).filter(Boolean);
    const cleanedMeanings = meanings.map((m) => m.trim()).filter(Boolean);
    const count = Math.min(cleanedWords.length, cleanedMeanings.length);

    if (count < 5) {
      throw new UnprocessableEntityException(
        `AI only extracted ${count} word(s), but at least 5 are required. Try a clearer photo or a file with more vocabulary.`,
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
      const message = error instanceof Error ? error.message : 'Unknown PDF error';
      throw new BadRequestException(`Could not read PDF: ${message}`);
    } finally {
      await instance.destroy();
    }
  }

  private async callOpenAi(
    userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[],
  ): Promise<VocabPair> {
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You extract vocabulary word/translation pairs from documents and images. Always return valid JSON.',
          },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI request failed';
      console.error('OpenAI extraction error:', message);
      throw new InternalServerErrorException(`AI extraction failed: ${message}`);
    }

    const content = response.choices[0]?.message?.content ?? '{}';
    const jsonString = content.replace(/```json\n?|```/g, '').trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
      console.error('Failed to parse AI response:', jsonString);
      throw new UnprocessableEntityException(
        'AI returned an invalid response. Please try again with a clearer file.',
      );
    }

    const { words, meanings } = this.normalizePairs(parsed);
    if (words.length === 0 && meanings.length === 0) {
      console.error('AI returned no vocabulary pairs:', jsonString);
    }
    return this.validatePairs(words, meanings);
  }

  async extractVocab(
    file: Express.Multer.File,
    fromLanguage = 'French',
    toLanguage = 'English',
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim()) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured on the server.');
    }

    const buffer = this.getFileBuffer(file);
    const imageUpload = this.isImage(file);
    const promptText = this.buildPrompt(fromLanguage, toLanguage, imageUpload);

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: 'text', text: promptText },
    ];

    if (imageUpload) {
      const mime = file.mimetype.startsWith('image/') ? file.mimetype : 'image/jpeg';
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mime};base64,${buffer.toString('base64')}`,
          detail: 'high',
        },
      });
    } else if (this.isPdf(file)) {
      let text = await this.extractPdfText(buffer);
      if (!text) {
        throw new BadRequestException(
          'No readable text found in the PDF. Try a clearer document or upload an image instead.',
        );
      }
      const MAX_CHARS = 15000;
      if (text.length > MAX_CHARS) {
        text = text.substring(0, MAX_CHARS) + '... [truncated]';
      }
      userContent[0] = { type: 'text', text: `${promptText}\n\nDocument Text:\n${text}` };
    } else {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Upload a PDF or image (PNG, JPEG, etc.).`,
      );
    }

    return this.callOpenAi(userContent);
  }
}
