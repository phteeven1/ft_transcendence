import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupProgressionController } from './group-progression.controller';
import { PlayerProgressionController } from './player-progression.controller';
import { PlayerSessionGuard } from '../players/player-session.guard';
import { ProgressionOutcomeService } from './progression-outcome.service';
import { ProgressionStatsService } from './progression-stats.service';
import { ProgressionService } from './progression.service';

@Module({
  imports: [PrismaModule, PlayersModule],
  controllers: [GroupProgressionController, PlayerProgressionController],
  providers: [
    ProgressionStatsService,
    ProgressionOutcomeService,
    ProgressionService,
    PlayerSessionGuard,
  ],
  exports: [ProgressionService],
})
export class ProgressionModule {}
