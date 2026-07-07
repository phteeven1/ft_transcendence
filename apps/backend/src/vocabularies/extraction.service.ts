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
  fr: 'fra',
  french: 'fra',
  de: 'deu',
  german: 'deu',
  es: 'spa',
  spanish: 'spa',
  it: 'ita',
  italian: 'ita',
  pt: 'por',
  portuguese: 'por',
  ru: 'rus',
  russian: 'rus',
  zh: 'chi_sim',
  chinese: 'chi_sim',
  ja: 'jpn',
  japanese: 'jpn',
};

@Injectable()
export class ExtractionService implements OnModuleDestroy {
  private openai: OpenAI;
  private ocrWorker: Worker | null = null;
  private ocrLangKey = '';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async onModuleDestroy() {
    await this.terminateOcrWorker();
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

  private resolveTesseractLang(language: string): string | null {
    const normalized = language.trim().toLowerCase();
    return TESSERACT_LANG[normalized] ?? TESSERACT_LANG[language.trim()] ?? null;
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

  private async getOcrWorker(fromLanguage: string, toLanguage: string): Promise<Worker> {
    const langKey = this.toTesseractLangs(fromLanguage, toLanguage);
    if (this.ocrWorker && this.ocrLangKey === langKey) {
      return this.ocrWorker;
    }

    await this.terminateOcrWorker();
    this.ocrWorker = await createWorker(langKey);
    this.ocrLangKey = langKey;
    return this.ocrWorker;
  }

  private buildPrompt(fromLanguage: string, toLanguage: string, documentText: string): string {
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

  private normalizePairs(parsed: Record<string, unknown>): Pick<ExtractionResult, 'words' | 'meanings'> {
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

  private validatePairs(words: string[], meanings: string[]): Pick<ExtractionResult, 'words' | 'meanings'> {
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
      const message = error instanceof Error ? error.message : 'Unknown OCR error';
      console.error('OCR extraction error:', message);
      throw new BadRequestException(`Could not read text from image: ${message}`);
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
      response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You extract vocabulary word/translation pairs and a list title from document text. Always return valid JSON.',
          },
          { role: 'user', content: prompt },
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
    const validated = this.validatePairs(words, meanings);
    return {
      title: this.resolveTitle(parsed, fromLanguage, toLanguage, fallbackFilename),
      ...validated,
    };
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
    const documentText = await this.extractDocumentText(file, buffer, fromLanguage, toLanguage);

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
