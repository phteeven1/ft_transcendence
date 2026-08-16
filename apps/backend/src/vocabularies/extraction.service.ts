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
import { basename, extname } from 'path';
import { MAX_VOCAB_ENTRY_CHARS } from './vocabulary-entry-rules';

type ExtractionResult = { title: string; words: string[]; meanings: string[] };

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
Each word and each meaning must be at most ${MAX_VOCAB_ENTRY_CHARS} characters. Skip any pair that cannot fit in that limit; do not truncate translations.
Do not use spaces or other whitespace inside a word or a meaning. Skip any pair that contains whitespace; do not join the letters together.
Each word may appear only once and each meaning may appear only once (ignore case). Skip duplicates.
Also include a short descriptive "title" for the vocabulary list (max 80 characters), based on the document heading, topic, or subject. If none is obvious, invent a concise title such as "French Unit 3 Vocabulary".
Return strictly JSON: { "title": "...", "words": ["..."], "meanings": ["..."] } with the same number of entries in both arrays.`;
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
    const count = Math.min(words.length, meanings.length);
    const cleanedWords: string[] = [];
    const cleanedMeanings: string[] = [];
    const seenWords = new Set<string>();
    const seenMeanings = new Set<string>();

    for (let i = 0; i < count; i++) {
      const word = words[i]?.trim() ?? '';
      const meaning = meanings[i]?.trim() ?? '';
      if (!word || !meaning) continue;
      if (/\s/.test(word) || /\s/.test(meaning)) continue;
      if (
        word.length > MAX_VOCAB_ENTRY_CHARS ||
        meaning.length > MAX_VOCAB_ENTRY_CHARS
      ) {
        continue;
      }
      const wordKey = word.toLowerCase();
      const meaningKey = meaning.toLowerCase();
      if (seenWords.has(wordKey) || seenMeanings.has(meaningKey)) continue;
      seenWords.add(wordKey);
      seenMeanings.add(meaningKey);
      cleanedWords.push(word);
      cleanedMeanings.push(meaning);
    }

    if (cleanedWords.length < MIN_VOCAB_PAIRS) {
      throw new UnprocessableEntityException(
        `AI only extracted ${cleanedWords.length} word(s), but at least ${MIN_VOCAB_PAIRS} are required. Try a clearer photo or a file with more vocabulary.`,
      );
    }

    return {
      words: cleanedWords,
      meanings: cleanedMeanings,
    };
  }

  private pdfContentPart(
    file: Express.Multer.File,
    buffer: Buffer,
  ): ChatCompletionContentPart {
    return {
      type: 'file',
      file: {
        filename: file.originalname || 'vocabulary.pdf',
        file_data: `data:application/pdf;base64,${buffer.toString('base64')}`,
      },
    } as ChatCompletionContentPart;
  }

  private async callOpenAi(
    userContent: ChatCompletionContentPart[],
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
            content: `You extract vocabulary word/translation pairs and a list title from an image or PDF. Each word and meaning is at most ${MAX_VOCAB_ENTRY_CHARS} characters, contains no whitespace, and must be unique (each word once, each meaning once). Always return valid JSON.`,
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
                  items: {
                    type: 'string',
                    maxLength: MAX_VOCAB_ENTRY_CHARS,
                  },
                  description: `List of source language words (max ${MAX_VOCAB_ENTRY_CHARS} characters each)`,
                },
                meanings: {
                  type: 'array',
                  items: {
                    type: 'string',
                    maxLength: MAX_VOCAB_ENTRY_CHARS,
                  },
                  description: `List of target language meanings/translations aligned index-by-index with words (max ${MAX_VOCAB_ENTRY_CHARS} characters each)`,
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
    const instructions = this.buildExtractionInstructions(
      fromLanguage,
      toLanguage,
    );

    if (this.isImage(file)) {
      const mime = this.resolveVisionMime(file);
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
      return this.callOpenAi(
        [
          { type: 'text', text: instructions },
          this.pdfContentPart(file, buffer),
        ],
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
