import { UnauthorizedException } from '@nestjs/common';
import { PlayersService } from './players.service';

describe('PlayersService sessions', () => {
  const gateway = { emitPlayerSessionReplaced: jest.fn() };
  const prisma = {
    player: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    playerSession: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  };

  let service: PlayersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.playerSession.deleteMany.mockResolvedValue({ count: 0 });
    prisma.player.updateMany.mockResolvedValue({ count: 1 });
    service = new PlayersService(prisma as never, gateway as never);
  });

  it('replaces an existing live session on startSession', async () => {
    prisma.player.findUnique.mockResolvedValue({ id: 7 });
    const created = {
      token: 'new-token',
      playerId: 7,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prisma.playerSession.create.mockResolvedValue(created);

    const result = await service.startSession(7, 30);

    expect(prisma.playerSession.deleteMany).toHaveBeenCalledWith({
      where: { playerId: 7 },
    });
    expect(result.session.token).toBe('new-token');
    expect(gateway.emitPlayerSessionReplaced).toHaveBeenCalledWith(7);
  });

  it('clears a session only when the token matches', async () => {
    prisma.playerSession.deleteMany.mockResolvedValue({ count: 0 });
    await service.clearSession(7, { token: 'stale' });
    expect(prisma.player.updateMany).not.toHaveBeenCalled();
    expect(gateway.emitPlayerSessionReplaced).not.toHaveBeenCalled();

    prisma.playerSession.deleteMany.mockResolvedValue({ count: 1 });
    await service.clearSession(7, { token: 'live' });
    expect(prisma.playerSession.deleteMany).toHaveBeenCalledWith({
      where: { playerId: 7, token: 'live' },
    });
    expect(prisma.player.updateMany).toHaveBeenCalled();
    expect(gateway.emitPlayerSessionReplaced).toHaveBeenCalledWith(7);
  });

  it('force-clears a session without a token', async () => {
    prisma.playerSession.deleteMany.mockResolvedValue({ count: 1 });
    await service.clearSession(7, { force: true });
    expect(prisma.playerSession.deleteMany).toHaveBeenCalledWith({
      where: { playerId: 7 },
    });
    expect(gateway.emitPlayerSessionReplaced).toHaveBeenCalledWith(7);
  });

  it('rejects a mismatched validateSession token', async () => {
    prisma.playerSession.findUnique.mockResolvedValue({
      token: 'live',
      playerId: 7,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    await expect(service.validateSession(7, 'stale')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
