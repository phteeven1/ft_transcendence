import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IterateController } from './iterate.controller';

@Module({
  imports: [],
  controllers: [AppController , IterateController],
  providers: [AppService],
})
export class AppModule {}
