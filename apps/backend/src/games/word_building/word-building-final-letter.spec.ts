import { WordBuildingService } from './word-building.service';

/**
 * Minimal in-memory Prisma stand-in covering only what placeLetter() touches
 * on a hydrate → place → persistCompletion pass through a small puzzle.
 * Must include `game.playStartedAt` (or `prisma.game.update`) so hydrateFromDb
 * can satisfy the intro/play clock without throwing.
 */
function createFakePrisma(solution: (string | null)[][]) {
  const crosswordFindUniqueOrThrow = jest.fn(() =>
    Promise.resolve({
      solution,
      playerGrid: solution.map((row) => row.map(() => null)),
      creditGrid: solution.map((row) => row.map(() => null)),
      clues: { across: [], down: [] },
      revision: 0,
      game: {
        playStartedAt: new Date(Date.now() + 60_000),
        gamePlayers: [
          {
            playerId: 1,
            score: 0,
            leftAt: null,
            player: { name: 'Player #1' },
          },
        ],
      },
    }),
  );

  const gamePlayerFindMany = jest.fn(() => Promise.resolve([{ playerId: 1 }]));
  const crosswordUpdate = jest.fn(() => Promise.resolve(undefined));
  const gamePlayerUpdate = jest.fn(() => Promise.resolve(undefined));
  const gamePlayerUpdateMany = jest.fn(() => Promise.resolve({ count: 1 }));
  const gameUpdate = jest.fn(() => Promise.resolve(undefined));

  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: {
        findMany: gamePlayerFindMany,
        update: gamePlayerUpdate,
        updateMany: gamePlayerUpdateMany,
      },
      crossword: { update: crosswordUpdate },
      game: { update: gameUpdate },
    }),
  );

  return {
    prisma: {
      crossword: {
        findUniqueOrThrow: crosswordFindUniqueOrThrow,
        update: crosswordUpdate,
      },
      game: { update: gameUpdate },
      gamePlayer: { update: gamePlayerUpdate, updateMany: gamePlayerUpdateMany },
      $transaction: transaction,
    },
    crosswordUpdate,
    gamePlayerUpdate,
    gamePlayerUpdateMany,
    gameUpdate,
  };
}

describe('WordBuildingService.placeLetter — final-letter detection', () => {
  it('attaches finalPlacement only on the placement that completes the puzzle', async () => {
    const { prisma, gameUpdate, gamePlayerUpdateMany } = createFakePrisma([
      ['A'],
    ]);
    const service = new WordBuildingService(prisma as never);

    const payload = await service.placeLetter({
      gameId: 1,
      playerId: 1,
      row: 0,
      col: 0,
      letter: 'a',
    });

    expect(payload?.solved).toBe(true);
    expect(payload?.finalPlacement).toEqual({
      playerId: 1,
      letter: 'A',
      row: 0,
      col: 0,
    });
    expect(payload?.scores).toEqual([{ playerId: 1, score: 1 }]);
    // persistCompletion marks the underlying game finished exactly once.
    expect(gameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isFinished: true } }),
    );
    expect(gamePlayerUpdateMany).toHaveBeenCalledWith({
      where: { gameId: 1, playerId: 1 },
      data: { score: 1, completed: true },
    });
  });

  it('does not attach finalPlacement on a placement that leaves cells unsolved', async () => {
    const { prisma } = createFakePrisma([
      ['A', 'B'],
    ]);
    const service = new WordBuildingService(prisma as never);

    const payload = await service.placeLetter({
      gameId: 2,
      playerId: 1,
      row: 0,
      col: 0,
      letter: 'a',
    });

    expect(payload?.solved).toBe(false);
    expect(payload?.finalPlacement).toBeUndefined();
  });
});
