import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {
  private counter = 0; // serverseitiger State

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