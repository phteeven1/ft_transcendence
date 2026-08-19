import { hash, compare } from 'bcryptjs';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-new'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockedCompare = compare as jest.MockedFunction<typeof compare>;
const mockedHash = hash as jest.MockedFunction<typeof hash>;

describe('UsersService sessions', () => {
  const gateway = { emitUserSessionReplaced: jest.fn() };
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const dbUser = {
    id: 1,
    name: 'Ada',
    email: 'ada@example.com',
    password: 'hashed-old',
    memberships: [],
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCompare.mockResolvedValue(true);
    mockedHash.mockResolvedValue('hashed-new');
    prisma.userSession.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userSession.create.mockResolvedValue({
      token: 'new-token',
      userId: 1,
    });
    service = new UsersService(prisma as never, gateway as never);
  });

  it('replaces the parent session on sign-in', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const result = await service.signIn('Ada', 'secret');

    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(result.session).toEqual({ token: 'new-token', userId: 1 });
    expect(gateway.emitUserSessionReplaced).toHaveBeenCalledWith(1);
  });

  it('clears a session only when the token matches', async () => {
    prisma.userSession.deleteMany.mockResolvedValue({ count: 0 });
    await service.clearSession(1, 'stale');
    expect(gateway.emitUserSessionReplaced).not.toHaveBeenCalled();

    prisma.userSession.deleteMany.mockResolvedValue({ count: 1 });
    await service.clearSession(1, 'live');
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, token: 'live' },
    });
    expect(gateway.emitUserSessionReplaced).toHaveBeenCalledWith(1);
  });

  it('rotates the parent token on password change without kicking this tab', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.user.update.mockResolvedValue(dbUser);

    const result = await service.changePassword(1, 'old', 'new');

    expect(result.success).toBe(true);
    expect(result.session).toEqual({ token: 'new-token', userId: 1 });
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(gateway.emitUserSessionReplaced).not.toHaveBeenCalled();
  });
});
