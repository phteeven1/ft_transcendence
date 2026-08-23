import { WordBuildingService } from './word-building.service';

type FakeGamePlayerSeed = {
  playerId: number;
  score: number;
  name?: string;
  leftAt?: Date;
};

/**
 * Minimal in-memory Prisma stand-in covering what WordBuildingService touches
 * for hydration, leave tracking, and score persistence.
 *
 * `gamePlayers` seeds the crossword→game→gamePlayers join used by
 * loadOrHydrate() (including a `leftAt` column so hydration can be tested
 * as if it were reconstructing state after a process restart). `liveGamePlayerIds`
 * seeds the separate `gamePlayer.findMany` read persistScores() uses inside its
 * transaction to decide which rows still exist — defaults to the same rows.
 */
function createFakePrisma(
  gamePlayers: FakeGamePlayerSeed[],
  options: {
    solution?: (string | null)[][];
    liveGamePlayerIds?: number[];
  } = {},
) {
  const solution = options.solution ?? [[null]];
  const liveGamePlayerIds =
    options.liveGamePlayerIds ?? gamePlayers.map((gp) => gp.playerId);

  const crosswordFindUniqueOrThrow = jest.fn(() =>
    Promise.resolve({
      solution,
      playerGrid: solution.map((row) => row.map(() => null)),
      creditGrid: solution.map((row) => row.map(() => null)),
      clues: { across: [], down: [] },
      revision: 0,
      game: {
        playStartedAt: new Date(Date.now() + 60_000),
        gamePlayers: gamePlayers.map((gp) => ({
          playerId: gp.playerId,
          score: gp.score,
          leftAt: gp.leftAt ?? null,
          player: { name: gp.name ?? `Player #${gp.playerId}` },
        })),
      },
    }),
  );

  const gamePlayerUpdate = jest.fn(() => Promise.resolve(undefined));
  const gamePlayerUpdateMany = jest.fn(() => Promise.resolve({ count: 1 }));
  const gameUpdate = jest.fn(() => Promise.resolve(undefined));

  const transactionGamePlayerFindMany = jest.fn(() =>
    Promise.resolve(liveGamePlayerIds.map((playerId) => ({ playerId }))),
  );
  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: {
        findMany: transactionGamePlayerFindMany,
        update: gamePlayerUpdate,
        updateMany: gamePlayerUpdateMany,
      },
      crossword: { update: jest.fn(() => Promise.resolve(undefined)) },
      game: { update: gameUpdate },
    }),
  );

  return {
    crossword: {
      findUniqueOrThrow: crosswordFindUniqueOrThrow,
      update: jest.fn(() => Promise.resolve(undefined)),
    },
    gamePlayer: { update: gamePlayerUpdate, updateMany: gamePlayerUpdateMany },
    game: { update: gameUpdate },
    $transaction: transaction,
  };
}

describe('WordBuildingService.markPlayerLeft', () => {
  it('does not report allLeft while a participant is still active', async () => {
    const prisma = createFakePrisma([
      { playerId: 1, score: 0 },
      { playerId: 2, score: 0 },
    ]);
    const service = new WordBuildingService(prisma as never);

    const result = await service.markPlayerLeft(1, 1, 'Alice');

    expect(result.allLeft).toBe(false);
    expect(result.leftPlayers).toEqual({ 1: 'Alice' });
  });

  it('reports allLeft once every participant has left, in any order', async () => {
    const prisma = createFakePrisma([
      { playerId: 1, score: 0 },
      { playerId: 2, score: 0 },
      { playerId: 3, score: 0 },
    ]);
    const service = new WordBuildingService(prisma as never);

    expect((await service.markPlayerLeft(1, 2, 'Bob')).allLeft).toBe(false);
    expect((await service.markPlayerLeft(1, 1, 'Alice')).allLeft).toBe(false);
    const last = await service.markPlayerLeft(1, 3, 'Charlie');

    expect(last.allLeft).toBe(true);
    expect(last.leftPlayers).toEqual({
      1: 'Alice',
      2: 'Bob',
      3: 'Charlie',
    });
  });

  it('is idempotent when the same player leave is reported twice', async () => {
    const prisma = createFakePrisma([
      { playerId: 1, score: 0 },
      { playerId: 2, score: 0 },
    ]);
    const service = new WordBuildingService(prisma as never);

    await service.markPlayerLeft(1, 1, 'Alice');
    const result = await service.markPlayerLeft(1, 1, 'Alice');

    expect(result.allLeft).toBe(false);
    expect(result.leftPlayers).toEqual({ 1: 'Alice' });
  });

  it('a solo participant leaving is immediately allLeft', async () => {
    const prisma = createFakePrisma([{ playerId: 1, score: 0 }]);
    const service = new WordBuildingService(prisma as never);

    const result = await service.markPlayerLeft(1, 1, 'Alice');

    expect(result.allLeft).toBe(true);
  });

  it('persists leftAt on the GamePlayer row so hydration can reconstruct it later', async () => {
    const prisma = createFakePrisma([
      { playerId: 1, score: 0 },
      { playerId: 2, score: 0 },
    ]);
    const service = new WordBuildingService(prisma as never);

    await service.markPlayerLeft(1, 1, 'Alice');

    expect(prisma.gamePlayer.update).toHaveBeenCalledWith({
      where: { gameId_playerId: { gameId: 1, playerId: 1 } },
      data: { leftAt: expect.any(Date) as Date },
    });
  });

  it('reconstructs a previously-left player from a persisted leftAt on hydration (simulates a process restart)', async () => {
    // Alice's leave was persisted to the DB in a prior process — this fresh
    // service instance has never seen it in memory. Bob leaves now, in this
    // process, via the normal in-memory path.
    const prisma = createFakePrisma([
      {
        playerId: 1,
        score: 0,
        name: 'Alice',
        leftAt: new Date('2026-08-01T00:00:00Z'),
      },
      { playerId: 2, score: 0, name: 'Bob' },
    ]);
    const service = new WordBuildingService(prisma as never);

    const result = await service.markPlayerLeft(1, 2, 'Bob');

    expect(result.allLeft).toBe(true);
    expect(result.leftPlayers).toEqual({ 1: 'Alice', 2: 'Bob' });
  });
});

describe('WordBuildingService.placeLetter — rejects left players', () => {
  it('returns null and does not mutate state for a player who already left', async () => {
    const prisma = createFakePrisma(
      [{ playerId: 1, score: 0, leftAt: new Date() }],
      { solution: [['A']] },
    );
    const service = new WordBuildingService(prisma as never);

    const payload = await service.placeLetter({
      gameId: 1,
      playerId: 1,
      row: 0,
      col: 0,
      letter: 'a',
    });

    expect(payload).toBeNull();
  });

  it('still accepts placements from a player who has not left', async () => {
    const prisma = createFakePrisma(
      [
        { playerId: 1, score: 0, leftAt: new Date() },
        { playerId: 2, score: 0 },
      ],
      { solution: [['A']] },
    );
    const service = new WordBuildingService(prisma as never);

    const payload = await service.placeLetter({
      gameId: 1,
      playerId: 2,
      row: 0,
      col: 0,
      letter: 'a',
    });

    expect(payload?.solved).toBe(true);
  });
});

describe('WordBuildingService.persistScores', () => {
  it('is a no-op when the game was never hydrated in this process', async () => {
    const prisma = createFakePrisma([{ playerId: 1, score: 0 }]);
    const service = new WordBuildingService(prisma as never);

    await service.persistScores(999);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('flushes in-memory scores to GamePlayer.score for existing rows', async () => {
    // A 1x2 grid: placing only the first letter scores a point without
    // solving the puzzle, so the live state stays in memory afterwards for
    // persistScores to flush (mirrors an abandoned, not fully-solved match).
    const prisma = createFakePrisma([{ playerId: 1, score: 0 }], {
      solution: [['A', 'B']],
    });
    const service = new WordBuildingService(prisma as never);

    await service.placeLetter({
      gameId: 1,
      playerId: 1,
      row: 0,
      col: 0,
      letter: 'a',
    });
    await service.persistScores(1);

    expect(prisma.gamePlayer.update).toHaveBeenCalledWith({
      where: { gameId_playerId: { gameId: 1, playerId: 1 } },
      data: { score: 1 },
    });
  });

  it('skips a player whose GamePlayer row no longer exists', async () => {
    const prisma = createFakePrisma([{ playerId: 1, score: 0 }], {
      solution: [['A', 'B']],
      liveGamePlayerIds: [],
    });
    const service = new WordBuildingService(prisma as never);

    await service.placeLetter({
      gameId: 1,
      playerId: 1,
      row: 0,
      col: 0,
      letter: 'a',
    });
    await service.persistScores(1);

    expect(prisma.gamePlayer.update).not.toHaveBeenCalled();
  });
});

describe('WordBuildingService.clearLiveGame', () => {
  it('is a harmless no-op when no live state exists for the game', () => {
    const service = new WordBuildingService({} as never);
    expect(() => service.clearLiveGame(999)).not.toThrow();
  });
});
