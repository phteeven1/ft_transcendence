import { UnauthorizedException } from '@nestjs/common';
import { PlayersController } from './players.controller';

describe('PlayersController.clearSession', () => {
  const playersService = {
    clearSession: jest.fn(),
    assertCanManagePlayer: jest.fn(),
  };
  const gateway = { emitDashboardUpdate: jest.fn() };
  const usersService = { validateSession: jest.fn() };

  let controller: PlayersController;

  beforeEach(() => {
    jest.clearAllMocks();
    playersService.clearSession.mockResolvedValue(undefined);
    playersService.assertCanManagePlayer.mockResolvedValue(undefined);
    usersService.validateSession.mockResolvedValue({ valid: true });
    controller = new PlayersController(
      playersService as never,
      gateway as never,
      usersService as never,
    );
  });

  it('clears by body token without live session headers', async () => {
    await controller.clearSession({ headers: {} }, { playerId: 7, token: 't' });
    expect(playersService.clearSession).toHaveBeenCalledWith(7, { token: 't' });
    expect(usersService.validateSession).not.toHaveBeenCalled();
  });

  it('clears by player session header when the body has no token', async () => {
    await controller.clearSession(
      {
        headers: {
          'x-player-id': '7',
          'x-player-session-token': 'live',
        },
      },
      { playerId: 7 },
    );
    expect(playersService.clearSession).toHaveBeenCalledWith(7, {
      token: 'live',
    });
  });

  it('force-clears when a parent session is present and no token is sent', async () => {
    await controller.clearSession(
      {
        headers: {
          'x-user-id': '1',
          'x-user-session-token': 'parent',
        },
      },
      { playerId: 7 },
    );
    expect(usersService.validateSession).toHaveBeenCalledWith(1, 'parent');
    expect(playersService.assertCanManagePlayer).toHaveBeenCalledWith(1, 7);
    expect(playersService.clearSession).toHaveBeenCalledWith(7, {
      force: true,
    });
  });

  it('rejects force-clear without a parent session', async () => {
    await expect(
      controller.clearSession({ headers: {} }, { playerId: 7 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
