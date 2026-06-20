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
}
