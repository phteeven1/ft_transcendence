import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { basename, extname } from 'path';
import { createWorker, type Worker } from 'tesseract.js';

type ExtractionResult = { title: string; words: string[]; meanings: string[] };

const TESSERACT_LANG: Record<string, string> = {
  en: 'eng',
  english: 'eng',
  englisch: 'eng',
  anglais: 'eng',
  fr: 'fra',
  french: 'fra',
  französisch: 'fra',
  français: 'fra',
  de: 'deu',
  german: 'deu',
  deutsch: 'deu',
  allemand: 'deu',
};

@Injectable()
export class ExtractionService implements OnModuleDestroy {
  private openai: OpenAI | null = null;
  private ocrWorker: Worker | null = null;
  private ocrLangKey = '';

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

  async onModuleDestroy() {
    await this.terminateOcrWorker();
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

  private getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer?.length) return file.buffer;
    if (file.path) return readFileSync(file.path);
    throw new BadRequestException('Uploaded file is empty.');
  }

  private resolveTesseractLang(language: string): string | null {
    const normalized = language.trim().toLowerCase();
    return (
      TESSERACT_LANG[normalized] ?? TESSERACT_LANG[language.trim()] ?? null
    );
  }

  private toTesseractLangs(fromLanguage: string, toLanguage: string): string {
    const langs = new Set<string>(['eng']);
    for (const lang of [fromLanguage, toLanguage]) {
      const resolved = this.resolveTesseractLang(lang);
      if (resolved) langs.add(resolved);
    }
    return [...langs].join('+');
  }

  private async terminateOcrWorker() {
    if (!this.ocrWorker) return;
    await this.ocrWorker.terminate();
    this.ocrWorker = null;
    this.ocrLangKey = '';
  }

  private async getOcrWorker(
    fromLanguage: string,
    toLanguage: string,
  ): Promise<Worker> {
    const langKey = this.toTesseractLangs(fromLanguage, toLanguage);
    if (this.ocrWorker && this.ocrLangKey === langKey) {
      return this.ocrWorker;
    }

    await this.terminateOcrWorker();
    this.ocrWorker = await createWorker(langKey);
    this.ocrLangKey = langKey;
    return this.ocrWorker;
  }

  private buildPrompt(
    fromLanguage: string,
    toLanguage: string,
    documentText: string,
  ): string {
    const MAX_CHARS = 15000;
    const text =
      documentText.length > MAX_CHARS
        ? documentText.substring(0, MAX_CHARS) + '... [truncated]'
        : documentText;

    return `Extract vocabulary pairs from the document text below.

Extract between 5 and 50 vocabulary pairs.
Prefer ${fromLanguage} words in "words" and ${toLanguage} meanings in "meanings".
If the document uses another language or mixed columns, still extract every clear word/translation pair you see.
Accept formats like "word - meaning", two-column tables, numbered lists, or bullet lists.
Keep words and meanings aligned by row/order.
Also include a short descriptive "title" for the vocabulary list (max 80 characters), based on the document heading, topic, or subject. If none is obvious, invent a concise title such as "French Unit 3 Vocabulary".
Return strictly JSON: { "title": "...", "words": ["..."], "meanings": ["..."] } with the same number of entries in both arrays.

Document Text:
${text}`;
  }

  private resolveTitle(
    parsed: Record<string, unknown>,
    fromLanguage: string,
    toLanguage: string,
    fallbackFilename?: string,
  ): string {
    const raw = parsed.title ?? parsed.name ?? parsed.listName;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().slice(0, 80);
    }
    if (fallbackFilename) {
      const stem = basename(fallbackFilename, extname(fallbackFilename)).trim();
      if (stem) return stem.slice(0, 80);
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
      const message =
        error instanceof Error ? error.message : 'Unknown PDF error';
      throw new BadRequestException(`Could not read PDF: ${message}`);
    } finally {
      await instance.destroy();
    }
  }

  private async extractImageText(
    buffer: Buffer,
    fromLanguage: string,
    toLanguage: string,
  ): Promise<string> {
    try {
      const worker = await this.getOcrWorker(fromLanguage, toLanguage);
      const { data } = await worker.recognize(buffer);
      return data.text.trim();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown OCR error';
      console.error('OCR extraction error:', message);
      throw new BadRequestException(
        `Could not read text from image: ${message}`,
      );
    }
  }

  private async extractDocumentText(
    file: Express.Multer.File,
    buffer: Buffer,
    fromLanguage: string,
    toLanguage: string,
  ): Promise<string> {
    if (this.isImage(file)) {
      return this.extractImageText(buffer, fromLanguage, toLanguage);
    }
    if (this.isPdf(file)) {
      return this.extractPdfText(buffer);
    }
    throw new BadRequestException(
      `Unsupported file type "${file.mimetype}". Upload a PDF or image (PNG, JPEG, etc.).`,
    );
  }

  private async callOpenAi(
    prompt: string,
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
              'You extract vocabulary word/translation pairs and a list title from document text. Always return valid JSON.',
          },
          { role: 'user', content: prompt },
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
									description: 'Short descriptive title for the vocabulary list (max 80 chars)',
								},
								words: {
									type: 'array',
									items: { type: 'string' },
									description: 'List of source language words',
								},
								meanings: {
									type: 'array',
									items: { type: 'string' },
									description: 'List of target language meanings/translations aligned index-by-index with words',
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
			// OpenAI now guarantees this parsed object matches ExtractionResult type exactly
			parsed = JSON.parse(content) as ExtractionResult;
		} catch {
			console.error('Failed to parse AI response:', content);
			throw new UnprocessableEntityException(
				'AI returned an invalid response. Please try again with a clearer file.',
			);
		}

		// Enforce minimum item count guardrail (e.g. at least 5 pairs)
		const validated = this.validatePairs(parsed.words, parsed.meanings);

		return {
			title: parsed.title.trim().slice(0, 80) || `${fromLanguage} - ${toLanguage} Vocabulary`,
			...validated,
		};
	}

  async extractVocab(
    file: Express.Multer.File,
    fromLanguage = 'French',
    toLanguage = 'English',
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim() || apiKey.trim() === 'null') {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured on the server.',
      );
    }

    const buffer = this.getFileBuffer(file);
    const documentText = await this.extractDocumentText(
      file,
      buffer,
      fromLanguage,
      toLanguage,
    );

    if (!documentText) {
      throw new BadRequestException(
        'No readable text found in the file. Try a clearer photo or PDF with visible vocabulary.',
      );
    }

    console.log(
      `Extracted ${documentText.length} characters via ${this.isImage(file) ? 'OCR' : 'PDF parsing'}`,
    );

    return this.callOpenAi(
      this.buildPrompt(fromLanguage, toLanguage, documentText),
      fromLanguage,
      toLanguage,
      file.originalname,
    );
  }
}
