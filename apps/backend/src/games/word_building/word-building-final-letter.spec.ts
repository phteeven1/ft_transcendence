import { WordBuildingService } from './word-building.service';

/**
 * Minimal in-memory Prisma stand-in covering only what placeLetter() touches
 * on a hydrate → place → persistCompletion pass through a 1-cell puzzle.
 */
function createFakePrisma() {
  const crosswordFindUniqueOrThrow = jest.fn(() =>
    Promise.resolve({
      solution: [['A']],
      playerGrid: [[null]],
      creditGrid: [[null]],
      clues: { across: [], down: [] },
      revision: 0,
      game: { gamePlayers: [{ playerId: 1, score: 0 }] },
    }),
  );

  const gamePlayerFindMany = jest.fn(() => Promise.resolve([{ playerId: 1 }]));
  const crosswordUpdate = jest.fn(() => Promise.resolve(undefined));
  const gamePlayerUpdate = jest.fn(() => Promise.resolve(undefined));
  const gameUpdate = jest.fn(() => Promise.resolve(undefined));

  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: { findMany: gamePlayerFindMany, update: gamePlayerUpdate },
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
      $transaction: transaction,
    },
    crosswordUpdate,
    gamePlayerUpdate,
    gameUpdate,
  };
}

describe('WordBuildingService.placeLetter — final-letter detection', () => {
  it('attaches finalPlacement only on the placement that completes the puzzle', async () => {
    const { prisma, gameUpdate } = createFakePrisma();
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
  });

  it('does not attach finalPlacement on a placement that leaves cells unsolved', async () => {
    const crosswordFindUniqueOrThrow = jest.fn(() =>
      Promise.resolve({
        solution: [['A', 'B']],
        playerGrid: [[null, null]],
        creditGrid: [[null, null]],
        clues: { across: [], down: [] },
        revision: 0,
        game: { gamePlayers: [{ playerId: 1, score: 0 }] },
      }),
    );
    const prisma = {
      crossword: {
        findUniqueOrThrow: crosswordFindUniqueOrThrow,
        update: jest.fn(() => Promise.resolve(undefined)),
      },
      $transaction: jest.fn(),
    };
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
