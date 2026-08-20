import { WordBuildingService } from './word-building.service';

function createFakePrisma(
  gamePlayers: Array<{ playerId: number; score: number }>,
) {
  const crosswordFindUniqueOrThrow = jest.fn(() =>
    Promise.resolve({
      solution: [[null]],
      playerGrid: [[null]],
      creditGrid: [[null]],
      clues: { across: [], down: [] },
      revision: 0,
      game: { gamePlayers },
    }),
  );
  return {
    crossword: { findUniqueOrThrow: crosswordFindUniqueOrThrow },
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
});

describe('WordBuildingService.clearLiveGame', () => {
  it('is a harmless no-op when no live state exists for the game', () => {
    const service = new WordBuildingService({} as never);
    expect(() => service.clearLiveGame(999)).not.toThrow();
  });
});
