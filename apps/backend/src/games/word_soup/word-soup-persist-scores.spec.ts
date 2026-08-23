import { createEmptyCourt } from './word-soup-placement-engine';
import { WordSoupService } from './word-soup.service';
import type { SharedWordSoupCourt } from './word-soup.types';

type CourtMap = Map<number, SharedWordSoupCourt>;

function sharedCourtsOf(service: WordSoupService): CourtMap {
  return (service as unknown as { sharedCourts: CourtMap }).sharedCourts;
}

function createCourt(
  overrides: Partial<SharedWordSoupCourt> = {},
): SharedWordSoupCourt {
  const now = Date.now();
  return {
    trueCourt: createEmptyCourt(),
    visibleCourt: createEmptyCourt(),
    playerColours: { 1: '#111111', 2: '#222222' },
    playerScores: { 1: 35, 2: 70 },
    playerWordCounts: { 1: 2, 2: 4 },
    playerStreaks: { 1: 1, 2: 0 },
    playerBestWordStreaks: { 1: 3, 2: 0 },
    playerFreezeCounts: { 1: 1, 2: 0 },
    leftPlayers: {},
    solutionWords: [
      {
        word: 'CAT',
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 2,
        direction: [0, 1],
      },
    ],
    foundWords: [],
    frozenUntil: {},
    isIntroAlreadyShown: { 1: true, 2: true },
    introStartedAt: now,
    playStartedAt: now,
    ...overrides,
  };
}

function createFakePrisma(
  options: {
    survivingPlayerIds?: number[];
  } = {},
) {
  const surviving = new Set(options.survivingPlayerIds ?? [1, 2]);

  const gamePlayerUpdateMany = jest.fn(
    ({ where }: { where: { gameId: number; playerId: number } }) =>
      Promise.resolve({
        count: surviving.has(where.playerId) ? 1 : 0,
      }),
  );
  const playerUpdateMany = jest.fn(() => Promise.resolve({ count: 1 }));
  const gameUpdateMany = jest.fn(() => Promise.resolve({ count: 1 }));

  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: { updateMany: gamePlayerUpdateMany },
      player: { updateMany: playerUpdateMany },
    }),
  );

  return {
    prisma: {
      $transaction: transaction,
      gamePlayer: { updateMany: gamePlayerUpdateMany },
      game: { updateMany: gameUpdateMany },
    },
    gamePlayerUpdateMany,
    playerUpdateMany,
    gameUpdateMany,
    transaction,
  };
}

describe('WordSoupService.persistScores', () => {
  it('is a no-op when no court is loaded', async () => {
    const { prisma, transaction } = createFakePrisma();
    const service = new WordSoupService(prisma as never);

    await service.persistScores(999);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('is a no-op when playerScores is empty', async () => {
    const { prisma, transaction } = createFakePrisma();
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(1, createCourt({ playerScores: {} }));

    await service.persistScores(1);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('writes score, streak, wordsFound, freezeCount, and completed via updateMany', async () => {
    const { prisma, gamePlayerUpdateMany, playerUpdateMany } =
      createFakePrisma();
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(
      1,
      createCourt({
        foundWords: [
          {
            word: 'CAT',
            playerId: 1,
            cells: [
              { row: 0, col: 0 },
              { row: 0, col: 1 },
              { row: 0, col: 2 },
            ],
            direction: [0, 1],
          },
        ],
      }),
    );

    await service.persistScores(1);

    expect(gamePlayerUpdateMany).toHaveBeenCalledWith({
      where: { gameId: 1, playerId: 1 },
      data: {
        score: 35,
        bestWordStreak: 3,
        wordsFound: 2,
        freezeCount: 1,
        completed: true,
      },
    });
    expect(gamePlayerUpdateMany).toHaveBeenCalledWith({
      where: { gameId: 1, playerId: 2 },
      data: {
        score: 70,
        bestWordStreak: 0,
        wordsFound: 4,
        freezeCount: 0,
        completed: true,
      },
    });
    // Only player 1 has a peak streak > 0 and a surviving GamePlayer row.
    expect(playerUpdateMany).toHaveBeenCalledTimes(1);
    expect(playerUpdateMany).toHaveBeenCalledWith({
      where: { id: 1, bestWordStreak: { lt: 3 } },
      data: { bestWordStreak: 3 },
    });
  });

  it('skips the Player streak bump when the GamePlayer row is already gone', async () => {
    const { prisma, gamePlayerUpdateMany, playerUpdateMany } = createFakePrisma(
      {
        survivingPlayerIds: [2],
      },
    );
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(
      1,
      createCourt({
        playerScores: { 1: 20, 2: 10 },
        playerBestWordStreaks: { 1: 5, 2: 0 },
        playerWordCounts: { 1: 1, 2: 1 },
        playerFreezeCounts: { 1: 0, 2: 0 },
      }),
    );

    await service.persistScores(1);

    expect(gamePlayerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameId: 1, playerId: 1 },
      }),
    );
    expect(playerUpdateMany).not.toHaveBeenCalled();
  });

  it('sets completed false when solution words remain unfound', async () => {
    const { prisma, gamePlayerUpdateMany } = createFakePrisma();
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(1, createCourt({ foundWords: [] }));

    await service.persistScores(1);

    expect(gamePlayerUpdateMany).toHaveBeenCalledWith({
      where: { gameId: 1, playerId: 1 },
      data: {
        score: 35,
        bestWordStreak: 3,
        wordsFound: 2,
        freezeCount: 1,
        completed: false,
      },
    });
  });
});

describe('WordSoupService.markPlayerLeft', () => {
  it('keeps the court loaded when every player has left so finish can persist scores', async () => {
    const { prisma, gamePlayerUpdateMany } = createFakePrisma();
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(1, createCourt());

    await service.markPlayerLeft(1, 1, 'Alice');
    await service.markPlayerLeft(1, 2, 'Bob');

    expect(sharedCourtsOf(service).has(1)).toBe(true);
    expect(service.hasAllPlayersLeft(1)).toBe(true);

    await service.persistScores(1);

    expect(gamePlayerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameId: 1, playerId: 1 },
        data: expect.objectContaining({ score: 35 }) as Record<string, unknown>,
      }),
    );
  });

  it('rejects guesses from a player who has already left', async () => {
    const { prisma } = createFakePrisma();
    const service = new WordSoupService(prisma as never);
    sharedCourtsOf(service).set(1, createCourt());

    await service.markPlayerLeft(1, 1, 'Alice');

    const result = service.submitGuess(1, 1, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(result.message).toBe('You have left this game.');
  });
});

describe('WordSoupService.createCourt (via initCourt)', () => {
  const storedPlayStartedAt = new Date('2026-01-01T12:00:00.000Z');

  function createInitPrisma(options: {
    playStartedAt?: Date | null;
    leftAtByPlayer?: Record<number, Date | null>;
  }) {
    const leftAtByPlayer = options.leftAtByPlayer ?? {
      1: null,
      2: null,
    };
    const gameUpdateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const gameFindUnique = jest.fn(() =>
      Promise.resolve({
        id: 1,
        isFinished: false,
        playStartedAt:
          options.playStartedAt === undefined
            ? storedPlayStartedAt
            : options.playStartedAt,
        group: {
          currentVocabulary: {
            words: ['CAT', 'DOG', 'BIRD', 'FISH', 'TREE', 'HOUSE', 'APPLE'],
          },
        },
        gamePlayers: [
          {
            playerId: 1,
            score: 0,
            leftAt: leftAtByPlayer[1] ?? null,
            player: { id: 1, name: 'Alice' },
          },
          {
            playerId: 2,
            score: 0,
            leftAt: leftAtByPlayer[2] ?? null,
            player: { id: 2, name: 'Bob' },
          },
        ],
      }),
    );

    return {
      prisma: {
        game: { findUnique: gameFindUnique, updateMany: gameUpdateMany },
        gamePlayer: {
          count: jest.fn(() => Promise.resolve(1)),
          updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        },
        $transaction: jest.fn(),
      },
      gameUpdateMany,
      gameFindUnique,
    };
  }

  it('reuses DB playStartedAt and does not overwrite it on recreate', async () => {
    const { prisma, gameUpdateMany } = createInitPrisma({
      playStartedAt: storedPlayStartedAt,
    });
    const service = new WordSoupService(prisma as never);

    const state = await service.initCourt(1, 2);

    expect(state.playStartedAt).toBe(storedPlayStartedAt.getTime());
    expect(gameUpdateMany).not.toHaveBeenCalled();
  });

  it('rehydrates leftPlayers from GamePlayer.leftAt', async () => {
    const leftAt = new Date('2026-01-01T11:55:00.000Z');
    const { prisma } = createInitPrisma({
      playStartedAt: storedPlayStartedAt,
      leftAtByPlayer: { 1: leftAt, 2: null },
    });
    const service = new WordSoupService(prisma as never);

    const state = await service.initCourt(1, 2);

    expect(state.leftPlayers).toEqual({ 1: 'Alice' });
    expect(service.hasAllPlayersLeft(1)).toBe(false);
  });

  it('persists playStartedAt only when the DB value is still null', async () => {
    const { prisma, gameUpdateMany } = createInitPrisma({
      playStartedAt: null,
    });
    const service = new WordSoupService(prisma as never);

    const state = await service.initCourt(1, 1);

    expect(typeof state.playStartedAt).toBe('number');
    expect(gameUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, playStartedAt: null },
        data: {
          playStartedAt: new Date(state.playStartedAt),
        },
      }),
    );
  });
});
