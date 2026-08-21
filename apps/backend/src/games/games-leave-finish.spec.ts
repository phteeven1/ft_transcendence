import { GamesService } from './games.service';
import { WordBuildingService } from './word_building/word-building.service';

type FakeGame = {
  id: number;
  name: string;
  inGroupId: number;
  initiatedById: number;
  initiatedTime: Date;
  startedTime: Date | null;
  isActive: boolean;
  isFinished: boolean;
  endedAt: Date | null;
  playStartedAt: Date | null;
  durationMs: number | null;
  progressionAppliedAt: Date | null;
};

type FakeGamePlayer = {
  gameId: number;
  playerId: number;
  score: number;
  leftAt?: Date | null;
};

/**
 * Minimal in-memory Prisma stand-in covering what GamesService.leave()/finish()
 * and WordBuildingService.loadOrHydrate() touch. Both services share this same
 * fake store so a real WordBuildingService can be wired into GamesService and
 * the "who is still actively playing" tracking is exercised end to end.
 */
function createFakePrisma(
  game: Omit<
    FakeGame,
    'endedAt' | 'playStartedAt' | 'durationMs' | 'progressionAppliedAt'
  >,
  initialGamePlayers: FakeGamePlayer[],
  // Defaults to a single black-square cell (unsolvable) — matches the
  // original fixture used by tests that never call placeLetter().
  solution: (string | null)[][] = [[null]],
) {
  const state: FakeGame = {
    ...game,
    endedAt: null,
    playStartedAt: null,
    durationMs: null,
    progressionAppliedAt: null,
  };
  let gamePlayers = [...initialGamePlayers];
  const names = new Map<number, string>();

  const withRoster = () => ({
    ...state,
    gamePlayers: gamePlayers.map((gp) => ({ ...gp })),
  });

  const gameFindUnique = jest.fn(() => Promise.resolve(withRoster()));
  const gameFindMany = jest.fn(() => Promise.resolve([withRoster()]));
  const gameUpdate = jest.fn(({ data }: { data: Partial<FakeGame> }) => {
    Object.assign(state, data);
    return Promise.resolve(withRoster());
  });
  const gameDelete = jest.fn(() => Promise.resolve(undefined));

  const gamePlayerDeleteMany = jest.fn(
    ({ where }: { where: { gameId: number; playerId: number } }) => {
      gamePlayers = gamePlayers.filter(
        (gp) => !(gp.gameId === where.gameId && gp.playerId === where.playerId),
      );
      return Promise.resolve(undefined);
    },
  );
  const gamePlayerFindMany = jest.fn(
    ({ where }: { where: { gameId: number } }) =>
      Promise.resolve(
        gamePlayers
          .filter((gp) => gp.gameId === where.gameId)
          .map((gp) => ({
            ...gp,
            player: {
              id: gp.playerId,
              name: names.get(gp.playerId) ?? `Player #${gp.playerId}`,
              xp: 0,
              avatarAnimal: 0,
            },
          })),
      ),
  );
  const gamePlayerCount = jest.fn(
    ({ where }: { where: { gameId: number; leftAt?: null } }) =>
      Promise.resolve(
        gamePlayers.filter((gp) => {
          if (gp.gameId !== where.gameId) return false;
          if (where.leftAt === null) return gp.leftAt == null;
          return true;
        }).length,
      ),
  );
  const gamePlayerUpdate = jest.fn(
    ({
      where,
      data,
    }: {
      where: { gameId_playerId: { gameId: number; playerId: number } };
      data: Partial<FakeGamePlayer>;
    }) => {
      const gp = gamePlayers.find(
        (g) =>
          g.gameId === where.gameId_playerId.gameId &&
          g.playerId === where.gameId_playerId.playerId,
      );
      if (gp) Object.assign(gp, data);
      return Promise.resolve(undefined);
    },
  );
  const gamePlayerUpdateMany = jest.fn(
    ({
      where,
      data,
    }: {
      where: { gameId: number; playerId: number };
      data: Partial<FakeGamePlayer>;
    }) => {
      for (const gp of gamePlayers) {
        if (gp.gameId === where.gameId && gp.playerId === where.playerId) {
          Object.assign(gp, data);
        }
      }
      return Promise.resolve({ count: 1 });
    },
  );

  // These tests only call placeLetter() (via wordBuildingService directly)
  // when a case needs to exercise real in-memory scoring — the crossword's
  // solution grid is configurable per-fixture via the `solution` parameter.
  const crosswordFindUniqueOrThrow = jest.fn(() =>
    Promise.resolve({
      solution,
      playerGrid: solution.map((row) => row.map(() => null)),
      creditGrid: solution.map((row) => row.map(() => null)),
      clues: { across: [], down: [] },
      revision: 0,
      game: {
        playStartedAt: state.playStartedAt ?? new Date(Date.now() + 60_000),
        gamePlayers: gamePlayers.map((gp) => ({
          ...gp,
          player: { name: names.get(gp.playerId) ?? `Player #${gp.playerId}` },
        })),
      },
    }),
  );

  // Backs WordBuildingService.persistScores()'s transaction — reads/writes
  // the same in-memory gamePlayers store as everything else here.
  const transaction = jest.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      gamePlayer: {
        findMany: jest.fn(({ where }: { where: { gameId: number } }) =>
          Promise.resolve(
            gamePlayers
              .filter((gp) => gp.gameId === where.gameId)
              .map((gp) => ({ playerId: gp.playerId })),
          ),
        ),
        update: gamePlayerUpdate,
        updateMany: gamePlayerUpdateMany,
      },
      crossword: { update: jest.fn(() => Promise.resolve(undefined)) },
      game: { update: gameUpdate },
    }),
  );

  const prisma = {
    game: {
      findUnique: gameFindUnique,
      findMany: gameFindMany,
      update: gameUpdate,
      delete: gameDelete,
      create: jest.fn(),
    },
    gamePlayer: {
      deleteMany: gamePlayerDeleteMany,
      findMany: gamePlayerFindMany,
      findFirst: jest.fn(() => Promise.resolve(null)),
      count: gamePlayerCount,
      update: gamePlayerUpdate,
      updateMany: gamePlayerUpdateMany,
      create: jest.fn(),
    },
    crossword: {
      findUnique: jest.fn(() => Promise.resolve(null)),
      findUniqueOrThrow: crosswordFindUniqueOrThrow,
      update: jest.fn(() => Promise.resolve(undefined)),
    },
    $transaction: transaction,
  };

  return {
    prisma,
    setPlayerName: (id: number, name: string) => names.set(id, name),
    getGamePlayers: () => gamePlayers,
  };
}

function createGamesService(
  game: Omit<
    FakeGame,
    'endedAt' | 'playStartedAt' | 'durationMs' | 'progressionAppliedAt'
  >,
  initialGamePlayers: FakeGamePlayer[],
  solution?: (string | null)[][],
) {
  const { prisma, setPlayerName, getGamePlayers } = createFakePrisma(
    game,
    initialGamePlayers,
    solution,
  );

  const playersService = {
    setCurrentGame: jest.fn(() => Promise.resolve(undefined)),
    clearCurrentGame: jest.fn(() => Promise.resolve(undefined)),
  };

  const progressionService = {
    getFinishOutcome: jest.fn(),
    getUnrewardedFinishOutcome: jest.fn(() =>
      Promise.resolve({
        players: getGamePlayers().map((gp) => ({
          playerId: gp.playerId,
          playerName: `Player #${gp.playerId}`,
          score: gp.score,
          xpAwarded: 0,
          isWinner: false,
          newlyUnlockedTier: null,
        })),
      }),
    ),
    recordGameOutcome: jest.fn(),
  };

  const gateway = {
    emitLobbyUpdate: jest.fn(),
    emitPlayerLeft: jest.fn(),
    emitGameFinished: jest.fn(),
    emitGameStarted: jest.fn(),
  };

  const wordSoupService = {
    persistScores: jest.fn(() => Promise.resolve(undefined)),
    getPlayStartedAt: jest.fn(() => null),
    isGameComplete: jest.fn(() => false),
    clearCourt: jest.fn(),
    markPlayerLeft: jest.fn(() =>
      Promise.resolve({
        leftPlayers: {} as Record<number, string>,
        playerStreaks: {},
      }),
    ),
    hasAllPlayersLeft: jest.fn(() => false),
    markIntroShown: jest.fn(),
  };

  // Real WordBuildingService, backed by the same fake store, so the
  // "who is still actively playing" tracking is exercised end to end rather
  // than assumed.
  const wordBuildingService = new WordBuildingService(prisma as never);

  const service = new GamesService(
    prisma as never,
    playersService as never,
    progressionService as never,
    gateway as never,
    wordSoupService as never,
    wordBuildingService,
  );

  return {
    service,
    prisma,
    gateway,
    wordSoupService,
    wordBuildingService,
    playersService,
    setPlayerName,
    getGamePlayers,
  };
}

describe('GamesService.leave — Word Building (per-player leave, not game-ending)', () => {
  it('does not finish the game when one of two active players leaves — the other keeps playing', async () => {
    const {
      service,
      prisma,
      gateway,
      playersService,
      setPlayerName,
      getGamePlayers,
    } = createGamesService(
      {
        id: 1,
        name: 'Word Building',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [
        { gameId: 1, playerId: 10, score: 0 },
        { gameId: 1, playerId: 20, score: 0 },
      ],
    );
    setPlayerName(10, 'Alice');
    setPlayerName(20, 'Bob');

    const result = await service.leave(1, 10);

    // The game keeps running — it must not finish just because one player left.
    expect(result?.isFinished).toBe(false);
    expect(result?.isActive).toBe(true);
    expect(gateway.emitGameFinished).not.toHaveBeenCalled();

    // Only a per-player notification goes out, not a game-ending broadcast.
    expect(gateway.emitPlayerLeft).toHaveBeenCalledWith(1, 10, 'Alice', {
      10: 'Alice',
    });

    // Alice's currentGameId is cleared — this is the authoritative signal the
    // word-building page checks on (re)mount to refuse a rejoin via browser
    // Back/refresh even though the match is still active for Bob. Bob's own
    // currentGameId must NOT be touched — he is still legitimately playing.
    expect(playersService.clearCurrentGame).toHaveBeenCalledWith(10);
    expect(playersService.clearCurrentGame).not.toHaveBeenCalledWith(20);

    // Both GamePlayer rows survive — Bob's is untouched, Alice's score is
    // preserved for whenever the match eventually does finish.
    expect(prisma.gamePlayer.deleteMany).not.toHaveBeenCalled();
    expect(getGamePlayers()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 10, score: 0 }),
        expect.objectContaining({ playerId: 20, score: 0 }),
      ]),
    );
    expect(getGamePlayers()).toHaveLength(2);
  });

  it('finishes the game once the second (last active) player also leaves', async () => {
    const { service, gateway, getGamePlayers } = createGamesService(
      {
        id: 2,
        name: 'Word Building',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [
        { gameId: 2, playerId: 10, score: 7 },
        { gameId: 2, playerId: 20, score: 3 },
      ],
    );

    const afterFirstLeave = await service.leave(2, 10);
    expect(afterFirstLeave?.isFinished).toBe(false);
    expect(gateway.emitGameFinished).not.toHaveBeenCalled();

    const afterSecondLeave = await service.leave(2, 20);
    expect(afterSecondLeave?.isFinished).toBe(true);
    expect(gateway.emitGameFinished).toHaveBeenCalledTimes(1);

    // Final scores for both players survive the sequential leave.
    const players = getGamePlayers();
    expect(players.find((p) => p.playerId === 10)?.score).toBe(7);
    expect(players.find((p) => p.playerId === 20)?.score).toBe(3);
  });

  it('keeps the third player in an active game while the first two leave one at a time', async () => {
    const { service, gateway } = createGamesService(
      {
        id: 3,
        name: 'Word Building',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [
        { gameId: 3, playerId: 10, score: 0 },
        { gameId: 3, playerId: 20, score: 0 },
        { gameId: 3, playerId: 30, score: 0 },
      ],
    );

    const afterA = await service.leave(3, 10);
    expect(afterA?.isFinished).toBe(false);

    const afterB = await service.leave(3, 20);
    expect(afterB?.isFinished).toBe(false);
    expect(gateway.emitGameFinished).not.toHaveBeenCalled();

    const afterC = await service.leave(3, 30);
    expect(afterC?.isFinished).toBe(true);
    expect(gateway.emitGameFinished).toHaveBeenCalledTimes(1);
  });

  it('finishes immediately when the only player in a solo match leaves', async () => {
    const { service, gateway } = createGamesService(
      {
        id: 4,
        name: 'Word Building',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [{ gameId: 4, playerId: 10, score: 0 }],
    );

    const result = await service.leave(4, 10);

    expect(result?.isFinished).toBe(true);
    expect(gateway.emitGameFinished).toHaveBeenCalledTimes(1);
  });
});

describe('GamesService.finish — Word Building abandon flushes live scores', () => {
  it('persists in-memory scores accumulated before an abandon-finish, not just the pre-session DB values', async () => {
    const { service, wordBuildingService, getGamePlayers } = createGamesService(
      {
        id: 6,
        name: 'Word Building',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [
        { gameId: 6, playerId: 10, score: 0 },
        { gameId: 6, playerId: 20, score: 0 },
      ],
      [['A', 'B']],
    );

    // Player 10 scores a point via a real placement before anyone leaves.
    // The puzzle stays unsolved (only 1 of 2 cells filled), so this point
    // only lives in WordBuildingService's in-memory state until finish()
    // flushes it — nothing else in this flow ever writes GamePlayer.score.
    await wordBuildingService.placeLetter({
      gameId: 6,
      playerId: 10,
      row: 0,
      col: 0,
      letter: 'a',
    });

    await service.leave(6, 10);
    await service.leave(6, 20);

    const players = getGamePlayers();
    expect(players.find((p) => p.playerId === 10)?.score).toBe(1);
    expect(players.find((p) => p.playerId === 20)?.score).toBe(0);
  });
});

describe('GamesService.leave — Word Soup (durable leftAt)', () => {
  it('keeps the match running for the remaining player instead of finishing it', async () => {
    const { service, prisma, gateway, getGamePlayers, wordSoupService } =
      createGamesService(
        {
          id: 5,
          name: 'Word Soup',
          inGroupId: 5,
          initiatedById: 10,
          initiatedTime: new Date(),
          startedTime: new Date(),
          isActive: true,
          isFinished: false,
        },
        [
          { gameId: 5, playerId: 10, score: 0 },
          { gameId: 5, playerId: 20, score: 0 },
        ],
      );

    wordSoupService.markPlayerLeft.mockImplementation(
      async (gameId: number, playerId: number, playerName: string) => {
        await prisma.gamePlayer.updateMany({
          where: { gameId, playerId },
          data: { leftAt: new Date() },
        });
        return {
          leftPlayers: { [playerId]: playerName },
          playerStreaks: {},
        };
      },
    );

    const result = await service.leave(5, 10);

    expect(result?.isFinished).toBe(false);
    expect(prisma.gamePlayer.updateMany).toHaveBeenCalled();
    expect(prisma.gamePlayer.deleteMany).not.toHaveBeenCalled();
    expect(getGamePlayers()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 10,
          leftAt: expect.any(Date) as Date,
        }),
        expect.objectContaining({ playerId: 20 }),
      ]),
    );
    expect(gateway.emitGameFinished).not.toHaveBeenCalled();
    expect(gateway.emitPlayerLeft).toHaveBeenCalledWith(
      5,
      10,
      'Player #10',
      expect.objectContaining({ 10: 'Player #10' }),
    );
  });

  it('finishes the match and persists scores when the last player leaves', async () => {
    const { service, prisma, gateway, wordSoupService } = createGamesService(
      {
        id: 6,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [{ gameId: 6, playerId: 10, score: 42 }],
    );

    wordSoupService.markPlayerLeft.mockImplementation(
      async (gameId: number, playerId: number, playerName: string) => {
        await prisma.gamePlayer.updateMany({
          where: { gameId, playerId },
          data: { leftAt: new Date() },
        });
        return {
          leftPlayers: { [playerId]: playerName },
          playerStreaks: {},
        };
      },
    );
    wordSoupService.hasAllPlayersLeft.mockReturnValue(true);

    const result = await service.leave(6, 10);

    expect(result?.isFinished).toBe(true);
    expect(wordSoupService.persistScores).toHaveBeenCalledWith(6);
    expect(wordSoupService.clearCourt).toHaveBeenCalledWith(6);
    const persistOrder =
      wordSoupService.persistScores.mock.invocationCallOrder[0];
    const clearOrder = wordSoupService.clearCourt.mock.invocationCallOrder[0];
    expect(persistOrder).toBeLessThan(clearOrder);
    expect(gateway.emitGameFinished).toHaveBeenCalled();
  });
});
