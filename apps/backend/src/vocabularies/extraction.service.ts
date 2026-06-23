import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ExtractionService {
	private openai: OpenAI;

	constructor(private configService: ConfigService) {
		const apiKey = this.configService.get<string>('OPENAI_API_KEY');

		this.openai = new OpenAI({
			apiKey: apiKey,
		});
	}

	async extractVocab(file: Express.Multer.File) {
		let userContent: any[] = [
			{
				type: "text",
				text: "Analyze this document and extract exactly 20 French words and their English meanings. Return the result ONLY as a JSON object with two arrays: 'words' and 'meanings'."
			}
		];

		if (file.mimetype.startsWith('image/')) {
			const base64Image = file.buffer.toString(('base64');
			userContent.push({
				type: "image_url",
				image_url: { url: `data:${file.mimetype};base64,${base64Image}` };
			});
		} else if (file.mimetype === 'application/pdf') {
			const pdfData = await pdfParse(file.buffer);
			userContent[0].text += `\n\nDocument Text:\n${pdfData.text}`;
		}

		const response = await this.openai.chat.completions.create({
			model: "gpt-4o",
			messages: [{ role: "user", content: userContent }],
			response_format: { type: "json_object" },
		});

		return JSON.parse(response.choices[0].message.content || '{}');
	}
}
