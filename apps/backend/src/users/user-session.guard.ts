import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { readHeader } from '../common/request-headers';

@Injectable()
export class UserSessionGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      userId?: number;
    }>();

    const userId = Number(readHeader(request.headers, 'x-user-id'));
    const token = readHeader(request.headers, 'x-user-session-token');

    if (!Number.isFinite(userId) || userId <= 0 || !token) {
      throw new UnauthorizedException('User session required');
    }

    await this.usersService.validateSession(userId, token);
    request.userId = userId;
    return true;
  }
}
