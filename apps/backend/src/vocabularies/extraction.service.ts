import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { extname } from 'path';

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

  async extractVocab(
    file: Express.Multer.File,
    fromLanguage = 'French',
    toLanguage = 'English',
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim()) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured on the server.');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    let promptText = `Extract between 5 and 50 vocabulary pairs from the provided document.
The words should be in ${fromLanguage} and their meanings in ${toLanguage}.
Depending on the document content, try to find as many as possible within the 50-word limit, but at least 5.
Return strictly a JSON object: { "words": [], "meanings": [] }`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: 'text', text: promptText },
    ];

    if (this.isImage(file)) {
      const mime = file.mimetype.startsWith('image/')
        ? file.mimetype
        : 'image/png';
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${file.buffer.toString('base64')}` },
      });
    } else if (this.isPdf(file)) {
      let text = await this.extractPdfText(file.buffer);
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

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: userContent }],
        response_format: { type: 'json_object' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI request failed';
      console.error('OpenAI extraction error:', message);
      throw new InternalServerErrorException(`AI extraction failed: ${message}`);
    }

    const content = response.choices[0]?.message?.content ?? '{}';
    const jsonString = content.replace(/```json\n?|```/g, '').trim();

    let parsed: { words?: unknown; meanings?: unknown };
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      console.error('Failed to parse AI response:', jsonString);
      throw new UnprocessableEntityException(
        'AI returned an invalid response. Please try again with a clearer file.',
      );
    }

    const words = Array.isArray(parsed.words) ? parsed.words.map(String) : [];
    const meanings = Array.isArray(parsed.meanings) ? parsed.meanings.map(String) : [];

    if (words.length < 5) {
      throw new UnprocessableEntityException(
        `AI only extracted ${words.length} word(s), but at least 5 are required. Try a file with more vocabulary.`,
      );
    }

    return { words, meanings };
  }
}
