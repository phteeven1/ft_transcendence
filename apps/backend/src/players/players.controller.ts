import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';
import { PlayerOrParentSessionGuard } from './player-or-parent-session.guard';
import { readHeader } from '../common/request-headers';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('create')
  @UseGuards(UserSessionGuard)
  async create(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      playerInGroup: number;
      playerName: string;
    },
  ) {
    await this.playersService.assertParentOfNewPlayer(
      userId,
      body.playerInGroup,
    );
    return this.playersService.create(
      body.playerInGroup,
      userId,
      body.playerName,
    );
  }

  @Post('rename')
  @UseGuards(UserSessionGuard)
  async rename(
    @AuthenticatedUserId() userId: number,
    @Body() body: { playerId: number; playerName: string },
  ) {
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    return this.playersService.rename(body.playerId, body.playerName);
  }

  @Post('remove')
  @UseGuards(UserSessionGuard)
  async remove(
    @AuthenticatedUserId() userId: number,
    @Body() body: { playerId: number },
  ) {
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    return this.playersService.remove(body.playerId);
  }

  @Post('startSession')
  @UseGuards(UserSessionGuard)
  async startSession(
    @AuthenticatedUserId() userId: number,
    @Body() body: { playerId: number; minutes: number },
  ) {
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    return this.playersService.startSession(body.playerId, body.minutes);
  }

  @Post('validateSession')
  validateSession(@Body() body: { playerId: number; token: string }) {
    return this.playersService.validateSession(body.playerId, body.token);
  }

  @Post('clearSession')
  @UseGuards(PlayerOrParentSessionGuard)
  async clearSession(
    @Req()
    request: {
      playerId?: number;
      userId?: number;
      headers: Record<string, string | string[] | undefined>;
    },
    @Body() body: { playerId: number; token?: string },
  ) {
    if (request.playerId) {
      const token = readHeader(request.headers, 'x-player-session-token');
      await this.playersService.clearSession(request.playerId, { token });
      return;
    }

    const userId = request.userId;
    if (!userId) return;
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    if (body.token) {
      await this.playersService.clearSession(body.playerId, {
        token: body.token,
      });
      return;
    }
    await this.playersService.clearSession(body.playerId, { force: true });
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.playersService.findByGroup(Number(groupId));
  }

  @Get(':id/activeSession')
  @UseGuards(UserSessionGuard)
  async getActiveSession(
    @AuthenticatedUserId() userId: number,
    @Param('id') id: string,
  ) {
    const playerId = Number(id);
    await this.playersService.assertCanManagePlayer(userId, playerId);
    return this.playersService.getActiveSession(playerId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.playersService.findById(Number(id));
  }
}
