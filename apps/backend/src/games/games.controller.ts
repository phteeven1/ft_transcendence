import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayerSessionGuard } from '../players/player-session.guard';
import { AuthenticatedPlayerId } from '../players/authenticated-player.decorator';
import { PlayersService } from '../players/players.service';

@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly playersService: PlayersService,
  ) {}

  @Post('create')
  @UseGuards(PlayerSessionGuard)
  create(
    @AuthenticatedPlayerId() playerId: number,
    @Body()
    body: {
      name: string;
      inGroup: number;
    },
  ) {
    return this.gamesService.create(body.name, body.inGroup, playerId);
  }

  @Post('join')
  @UseGuards(PlayerSessionGuard)
  join(
    @AuthenticatedPlayerId() playerId: number,
    @Body() body: { gameId: number },
  ) {
    return this.gamesService.join(body.gameId, playerId);
  }

  @Post('start')
  @UseGuards(PlayerSessionGuard)
  async start(
    @AuthenticatedPlayerId() playerId: number,
    @Body() body: { gameId: number },
  ) {
    await this.playersService.assertPlayerInGame(playerId, body.gameId);
    return this.gamesService.start(body.gameId);
  }

  @Post('leave')
  @UseGuards(PlayerSessionGuard)
  leave(
    @AuthenticatedPlayerId() playerId: number,
    @Body() body: { gameId: number },
  ) {
    return this.gamesService.leave(body.gameId, playerId);
  }

  @Post(':gameId/markIntroShown')
  @UseGuards(PlayerSessionGuard)
  async markIntroShown(
    @AuthenticatedPlayerId() playerId: number,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    await this.playersService.assertPlayerInGame(playerId, gameId);
    return this.gamesService.markIntroShown(gameId, playerId);
  }

  @Post('finish')
  @UseGuards(PlayerSessionGuard)
  async finish(
    @AuthenticatedPlayerId() playerId: number,
    @Body() body: { gameId: number },
  ) {
    await this.playersService.assertPlayerInGame(playerId, body.gameId);
    return this.gamesService.finish(body.gameId);
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.gamesService.findByGroup(groupId);
  }

  @Get(':id/finish-outcome')
  getFinishOutcome(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.getFinishOutcome(id);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.findById(id);
  }

  @Get(':id/players')
  findPlayersForGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.findPlayersForGame(id);
  }
}
