import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { basename, extname } from 'path';
import {
  MAX_VOCAB_ENTRY_CHARS,
  MIN_VOCAB_PAIRS,
  stripEntryWhitespace,
} from './vocabulary-entry-rules';

type ExtractionResult = { title: string; words: string[]; meanings: string[] };

export type ExtractionFailure = { success: false; message: string };
export type ExtractionSuccess = ExtractionResult & { success: true };
export type ExtractionOutcome = ExtractionSuccess | ExtractionFailure;

const UNSUPPORTED_FILE_TYPE_MESSAGE =
  'Unsupported file type. Upload a PDF or image (PNG, JPEG, GIF, WebP).';
const EMPTY_FILE_MESSAGE = 'Uploaded file is empty.';
const INVALID_AI_RESPONSE_MESSAGE =
  'AI returned an invalid response. Please try again with a clearer file.';
const EXTRACTION_FAILED_MESSAGE =
  'AI extraction failed. Please try again with a clearer file.';
const OPENAI_NOT_CONFIGURED_MESSAGE =
  'AI extraction is not available. Please try again later.';

type SniffedUploadKind = 'png' | 'jpeg' | 'gif' | 'webp' | 'pdf';

const SNIFFED_IMAGE_MIME: Record<Exclude<SniffedUploadKind, 'pdf'>, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function extractFail(message: string): ExtractionFailure {
  return { success: false, message };
}

function isExtractionFailure(
  value: Pick<ExtractionResult, 'words' | 'meanings'> | ExtractionFailure,
): value is ExtractionFailure {
  return 'success' in value && value.success === false;
}

function sniffUploadKind(buffer: Uint8Array): SniffedUploadKind | null {
  if (buffer.length < 12) return null;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'gif';
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }
  return null;
}

const MAX_TITLE_CHARS = 80;

@Injectable()
export class ExtractionService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {}

  private getOpenAiClient(): OpenAI | null {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim() || apiKey.trim() === 'null') {
      return null;
    }
    if (!this.openai) {
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private getFileBuffer(file: Express.Multer.File): Buffer | null {
    if (file.buffer?.length) return file.buffer;
    if (file.path) return readFileSync(file.path);
    return null;
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
  ): Pick<ExtractionResult, 'words' | 'meanings'> | ExtractionFailure {
    const count = Math.min(words.length, meanings.length);
    const cleanedWords: string[] = [];
    const cleanedMeanings: string[] = [];
    const seenWords = new Set<string>();
    const seenMeanings = new Set<string>();

    for (let i = 0; i < count; i++) {
      const word = stripEntryWhitespace(words[i] ?? '');
      const meaning = stripEntryWhitespace(meanings[i] ?? '');
      if (!word || !meaning) continue;
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
      return extractFail(
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
  ): Promise<ExtractionOutcome> {
    const client = this.getOpenAiClient();
    if (!client) {
      return extractFail(OPENAI_NOT_CONFIGURED_MESSAGE);
    }
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
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
      return extractFail(EXTRACTION_FAILED_MESSAGE);
    }
    const content = response.choices[0]?.message?.content ?? '{}';

    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(content) as ExtractionResult;
    } catch {
      console.error('Failed to parse AI response:', content);
      return extractFail(INVALID_AI_RESPONSE_MESSAGE);
    }

    if (!Array.isArray(parsed.words) || !Array.isArray(parsed.meanings)) {
      return extractFail(INVALID_AI_RESPONSE_MESSAGE);
    }

    const validated = this.validatePairs(parsed.words, parsed.meanings);
    if (isExtractionFailure(validated)) return validated;

    return {
      success: true,
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
  ): Promise<ExtractionOutcome> {
    const buffer = this.getFileBuffer(file);
    if (!buffer) {
      return extractFail(EMPTY_FILE_MESSAGE);
    }

    const kind = sniffUploadKind(buffer);
    if (!kind) {
      return extractFail(UNSUPPORTED_FILE_TYPE_MESSAGE);
    }

    const instructions = this.buildExtractionInstructions(
      fromLanguage,
      toLanguage,
    );

    if (kind === 'pdf') {
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

    const mime = SNIFFED_IMAGE_MIME[kind];
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
}
