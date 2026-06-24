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
				text: "Extract 20 French-English vocabulary pairs. Return strictly a JSON object: { \"words\": [], \"meanings\": [] }"
			}
		];

		if (file.mimetype.startsWith('image/')) {
			const base64Image = file.buffer.toString('base64');
			userContent.push({
				type: "image_url",
				image_url: { url: `data:${file.mimetype};base64,${base64Image}` },
			});
		} else if (file.mimetype === 'application/pdf') {
			const pdf = require('pdf-parse');
			// The newer pdf-parse (v2.4.5+) by mehmet-kozan is class-based
			const instance = new pdf.PDFParse({ data: file.buffer });
			const pdfData = await instance.getText();
			
			let text = pdfData.text;
			const MAX_CHARS = 15000;
			if (text.length > MAX_CHARS) {
				console.log(`Truncating PDF text from ${text.length} to ${MAX_CHARS} characters.`);
				text = text.substring(0, MAX_CHARS) + "... [truncated]";
			}
			
			userContent[0].text += `\n\nDocument Text:\n${text}`;
			// Cleanup if needed, though usually not necessary for GC
			await instance.destroy();
		}


		const response = await this.openai.chat.completions.create({
			model: "gpt-4o",
			messages: [{ role: "user", content: userContent }],
			response_format: { type: "json_object" },
		});

		const content = response.choices[0].message.content || '{}';
		
		// Clean the response in case OpenAI wrapped it in markdown code blocks
		const jsonString = content.replace(/```json\n?|```/g, '').trim();
		
		return JSON.parse(jsonString);
	}
}
