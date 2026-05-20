import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('create')
  create(
    @Body()
    body: {
      name: string;
      inGroup: number;
      initiatedBy: number;
    },
  ) {
    return this.gamesService.create(
      body.name,
      body.inGroup,
      body.initiatedBy,
    );
  }

  @Post('join')
  join(@Body() body: { gameId: number; playerId: number }) {
    return this.gamesService.join(body.gameId, body.playerId);
  }

  @Post('start')
  start(@Body() body: { gameId: number }) {
    return this.gamesService.start(body.gameId);
  }

  @Post('leave')
  leave(@Body() body: { gameId: number; playerId: number }) {
    return this.gamesService.leave(body.gameId, body.playerId);
  }

  @Post('finish')
  finish(@Body() body: { gameId: number }) {
    return this.gamesService.finish(body.gameId);
  }

  @Post('cleanup')
  cleanup() {
    this.gamesService.cleanupExpired();
    return { ok: true };
  }

  @Get()
  findAll() {
    return this.gamesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.gamesService.findById(Number(id));
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.gamesService.findByGroup(Number(groupId));
  }
}
