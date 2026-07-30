import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthenticatedPlayerId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<{ playerId: number }>();
    return request.playerId;
  },
);
