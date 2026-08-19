import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { UsersService } from '../users/users.service';
import { readHeader } from '../common/request-headers';

@Injectable()
export class PlayerOrParentSessionGuard implements CanActivate {
  constructor(
    private readonly playersService: PlayersService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      playerId?: number;
      userId?: number;
    }>();

    const playerId = Number(readHeader(request.headers, 'x-player-id'));
    const playerToken = readHeader(request.headers, 'x-player-session-token');
    if (Number.isFinite(playerId) && playerId > 0 && playerToken) {
      await this.playersService.validateSession(playerId, playerToken);
      request.playerId = playerId;
      return true;
    }

    const userId = Number(readHeader(request.headers, 'x-user-id'));
    const userToken = readHeader(request.headers, 'x-user-session-token');
    if (Number.isFinite(userId) && userId > 0 && userToken) {
      await this.usersService.validateSession(userId, userToken);
      request.userId = userId;
      return true;
    }

    throw new UnauthorizedException('Session required');
  }
}
