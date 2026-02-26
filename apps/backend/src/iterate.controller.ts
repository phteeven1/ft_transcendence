// backend/src/iterate.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('iterate')
export class IterateController {
  @Get()
  getNumbers(): number[] {
    // Backend erzeugt die Sequenz
    return Array.from({ length: 10 }, (_, i) => i + 1);
  }
}