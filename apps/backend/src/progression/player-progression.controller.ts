import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { AuthenticatedPlayerId } from './authenticated-player.decorator';
import { PlayerSessionGuard } from './player-session.guard';
import { ProgressionService } from './progression.service';

class EquipAvatarDto {
  @IsInt()
  @Min(0)
  avatarTier!: number;
}

@Controller('players')
@UseGuards(PlayerSessionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PlayerProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('me/progression')
  getMyProgression(@AuthenticatedPlayerId() playerId: number) {
    return this.progressionService.getMyProgression(playerId);
  }

  @Patch('me/avatar')
  equipAvatar(
    @AuthenticatedPlayerId() playerId: number,
    @Body() body: EquipAvatarDto,
  ) {
    return this.progressionService.equipAvatar(playerId, body.avatarTier);
  }
}
