import { Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private counter = 0;

  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const health = await this.appService.getHealth();
    if (health.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }

  @Get('counter')
  getCounter(): number {
    return this.counter;
  }

  @Post('counter')
  incrementCounter(): number {
    this.counter += 1;
    return this.counter;
  }
}
