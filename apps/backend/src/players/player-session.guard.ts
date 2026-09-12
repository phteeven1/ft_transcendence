import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { readHeader } from '../common/request-headers';

@Injectable()
export class PlayerSessionGuard implements CanActivate {
  constructor(private readonly playersService: PlayersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      playerId?: number;
    }>();

    const playerId = Number(readHeader(request.headers, 'x-player-id'));
    const token = readHeader(request.headers, 'x-player-session-token');

    if (!Number.isFinite(playerId) || playerId <= 0 || !token) {
      throw new UnauthorizedException('Player session required');
    }

    await this.playersService.validateSession(playerId, token);
    request.playerId = playerId;
    return true;
  }
}
