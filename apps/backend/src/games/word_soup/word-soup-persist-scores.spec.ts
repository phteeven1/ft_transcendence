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

  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: { updateMany: gamePlayerUpdateMany },
      player: { updateMany: playerUpdateMany },
    }),
  );

  return {
    prisma: { $transaction: transaction },
    gamePlayerUpdateMany,
    playerUpdateMany,
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
