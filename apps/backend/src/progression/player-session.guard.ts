import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlayersService } from '../players/players.service';

@Injectable()
export class PlayerSessionGuard implements CanActivate {
  constructor(private readonly playersService: PlayersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      playerId?: number;
    }>();

    const rawPlayerId = request.headers['x-player-id'];
    const rawToken = request.headers['x-player-session-token'];
    const playerId = Number(
      Array.isArray(rawPlayerId) ? rawPlayerId[0] : rawPlayerId,
    );
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    if (!Number.isFinite(playerId) || !token) {
      throw new UnauthorizedException('Player session required');
    }

    await this.playersService.validateSession(playerId, token);
    request.playerId = playerId;
    return true;
  }
}
