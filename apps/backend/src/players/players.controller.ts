import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PlayersService } from './players.service';
import { GameGateway } from '../games/game.gateway';

@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly gateway: GameGateway,
  ) {}

  @Post('create')
  async create(
    @Body()
    body: {
      playerInGroup: number;
      playerParent: number;
      playerName: string;
    },
  ) {
    const created = await this.playersService.create(
      body.playerInGroup,
      body.playerParent,
      body.playerName,
    );
    this.gateway.emitDashboardUpdate(created.inGroup);
    return created;
  }

  @Post('rename')
  async rename(@Body() body: { playerId: number; playerName: string }) {
    const renamed = await this.playersService.rename(
      body.playerId,
      body.playerName,
    );
    if (renamed) this.gateway.emitDashboardUpdate(renamed.inGroup);
    return renamed;
  }

  @Post('remove')
  async remove(@Body() body: { playerId: number }) {
    const player = await this.playersService.findById(body.playerId);
    const removed = await this.playersService.remove(body.playerId);
    if (removed && player) this.gateway.emitDashboardUpdate(player.inGroup);
    return removed;
  }

  @Post('startSession')
  startSession(@Body() body: { playerId: number; minutes: number }) {
    return this.playersService.startSession(body.playerId, body.minutes);
  }

  @Post('validateSession')
  validateSession(@Body() body: { playerId: number; token: string }) {
    return this.playersService.validateSession(body.playerId, body.token);
  }

  @Post('clearSession')
  clearSession(@Body() body: { playerId: number }) {
    return this.playersService.clearSession(Number(body.playerId));
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.playersService.findByGroup(Number(groupId));
  }

  @Get(':id/activeSession')
  getActiveSession(@Param('id') id: string) {
    return this.playersService.getActiveSession(Number(id));
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.playersService.findById(Number(id));
  }
}
