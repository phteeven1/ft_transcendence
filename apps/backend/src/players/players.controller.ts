import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { GameGateway } from '../games/game.gateway';
import { UsersService } from '../users/users.service';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';
import { readHeader } from '../common/request-headers';

function readPositiveId(
  value: string | number | undefined,
): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly gateway: GameGateway,
    private readonly usersService: UsersService,
  ) {}

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
    const created = await this.playersService.create(
      body.playerInGroup,
      userId,
      body.playerName,
    );
    this.gateway.emitDashboardUpdate(created.inGroup);
    return created;
  }

  @Post('rename')
  @UseGuards(UserSessionGuard)
  async rename(
    @AuthenticatedUserId() userId: number,
    @Body() body: { playerId: number; playerName: string },
  ) {
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    const renamed = await this.playersService.rename(
      body.playerId,
      body.playerName,
    );
    if (renamed) this.gateway.emitDashboardUpdate(renamed.inGroup);
    return renamed;
  }

  @Post('remove')
  @UseGuards(UserSessionGuard)
  async remove(
    @AuthenticatedUserId() userId: number,
    @Body() body: { playerId: number },
  ) {
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
    const player = await this.playersService.findById(body.playerId);
    const removed = await this.playersService.remove(body.playerId);
    if (removed && player) this.gateway.emitDashboardUpdate(player.inGroup);
    return removed;
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
  async clearSession(
    @Req()
    request: {
      headers: Record<string, string | string[] | undefined>;
    },
    @Body() body: { playerId: number; token?: string },
  ) {
    const bodyToken =
      typeof body.token === 'string' && body.token.length > 0
        ? body.token
        : undefined;
    const headerToken = readHeader(request.headers, 'x-player-session-token');
    const scopedToken = bodyToken ?? headerToken;
    const scopedPlayerId =
      readPositiveId(body.playerId) ??
      readPositiveId(readHeader(request.headers, 'x-player-id'));

    // Token-scoped delete is idempotent and does not need a still-valid
    // session: tab-close pending end runs from whatever tab is left
    // (including sign-in), and Leave session may already have deleted it.
    if (scopedToken && scopedPlayerId !== undefined) {
      await this.playersService.clearSession(scopedPlayerId, {
        token: scopedToken,
      });
      return;
    }

    const userId = readPositiveId(readHeader(request.headers, 'x-user-id'));
    const userToken = readHeader(request.headers, 'x-user-session-token');
    if (userId === undefined || !userToken) {
      throw new UnauthorizedException('Session required');
    }
    await this.usersService.validateSession(userId, userToken);
    await this.playersService.assertCanManagePlayer(userId, body.playerId);
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
