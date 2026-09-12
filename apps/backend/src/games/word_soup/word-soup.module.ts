import { Module, forwardRef } from '@nestjs/common';
import { WordSoupController } from './word-soup.controller';
import { WordSoupService } from './word-soup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlayersModule } from '../../players/players.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PlayersModule)],
  controllers: [WordSoupController],
  providers: [WordSoupService],
  exports: [WordSoupService],
})
export class WordSoupModule {}
