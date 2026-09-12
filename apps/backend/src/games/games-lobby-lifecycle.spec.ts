import { ConflictException } from '@nestjs/common';
import { GamesService } from './games.service';
import { GAME_LOBBY_CONFIG } from './game-lobby.config';

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
  completed?: boolean;
  leftAt?: Date | null;
};

type WhereClause = Record<string, unknown>;

function gameMatchesWhere(
  game: FakeGame,
  gamePlayers: FakeGamePlayer[],
  where: WhereClause,
): boolean {
  if ('id' in where) {
    const idClause = where.id;
    if (idClause && typeof idClause === 'object' && 'not' in idClause) {
      if (game.id === (idClause as { not: number }).not) return false;
    } else if (game.id !== idClause) {
      return false;
    }
  }
  if ('isActive' in where && game.isActive !== where.isActive) return false;
  if ('isFinished' in where && game.isFinished !== where.isFinished) {
    return false;
  }
  if ('inGroupId' in where && game.inGroupId !== where.inGroupId) {
    return false;
  }
  if (
    where.initiatedTime &&
    typeof where.initiatedTime === 'object' &&
    'lte' in where.initiatedTime
  ) {
    const cutoff = (where.initiatedTime as { lte: Date }).lte;
    if (!(game.initiatedTime <= cutoff)) return false;
  }
  const gamePlayersClause = where.gamePlayers as
    | { some?: { playerId: number }; none?: object }
    | undefined;
  if (gamePlayersClause?.some) {
    const has = gamePlayers.some(
      (gp) =>
        gp.gameId === game.id &&
        gp.playerId === gamePlayersClause.some?.playerId,
    );
    if (!has) return false;
  }
  if (gamePlayersClause?.none) {
    const has = gamePlayers.some((gp) => gp.gameId === game.id);
    if (has) return false;
  }
  return true;
}

/**
 * Multi-game, in-memory Prisma stand-in for GamesService's lobby-lifecycle
 * behavior: join() with its row-locked capacity check, the idempotent
 * startGame()/applyStartSideEffects() split, sweepPendingGames(), and
 * reapAbandonedPlayers() driving the existing leave()/finish() paths. Unlike
 * games-leave-finish.spec.ts's single-game fixture, this store holds several
 * games at once so the sweep and the "steal from other pending games"
 * cascade can be exercised across games. WordSoupService/WordBuildingService
 * are fully mocked here (not wired to a real instance) since these tests are
 * about generic lobby/lifecycle mechanics, not either game's own logic.
 *
 * Note: $transaction here just invokes the callback against this same
 * synchronous in-memory store — it does not model real Postgres row-lock
 * contention. These tests verify join()'s branching logic (reject at
 * capacity, start exactly at capacity, no duplicate players), not the
 * SQL-level FOR UPDATE guarantee itself.
 */
function createStore() {
  const games: FakeGame[] = [];
  const gamePlayers: FakeGamePlayer[] = [];
  const names = new Map<number, string>();

  const withRoster = (g: FakeGame) => ({
    ...g,
    gamePlayers: gamePlayers
      .filter((gp) => gp.gameId === g.id)
      .map((gp) => ({ ...gp })),
  });

  const gameClient = {
    findUnique: jest.fn(({ where }: { where: { id: number } }) => {
      const g = games.find((game) => game.id === where.id);
      return Promise.resolve(g ? withRoster(g) : null);
    }),
    findMany: jest.fn(({ where }: { where: WhereClause }) =>
      Promise.resolve(
        games
          .filter((g) => gameMatchesWhere(g, gamePlayers, where))
          .map(withRoster),
      ),
    ),
    update: jest.fn(
      ({ where, data }: { where: { id: number }; data: Partial<FakeGame> }) => {
        const g = games.find((game) => game.id === where.id);
        if (!g) throw new Error(`game ${where.id} not found`);
        Object.assign(g, data);
        return Promise.resolve(withRoster(g));
      },
    ),
    updateMany: jest.fn(
      ({ where, data }: { where: WhereClause; data: Partial<FakeGame> }) => {
        const matches = games.filter((g) =>
          gameMatchesWhere(g, gamePlayers, where),
        );
        for (const g of matches) Object.assign(g, data);
        return Promise.resolve({ count: matches.length });
      },
    ),
    delete: jest.fn(({ where }: { where: { id: number } }) => {
      const idx = games.findIndex((game) => game.id === where.id);
      if (idx === -1) throw new Error(`game ${where.id} not found`);
      games.splice(idx, 1);
      for (let i = gamePlayers.length - 1; i >= 0; i--) {
        if (gamePlayers[i].gameId === where.id) gamePlayers.splice(i, 1);
      }
      return Promise.resolve(undefined);
    }),
    deleteMany: jest.fn(({ where }: { where: WhereClause }) => {
      const matches = games.filter((g) =>
        gameMatchesWhere(g, gamePlayers, where),
      );
      for (const g of matches) {
        const idx = games.indexOf(g);
        games.splice(idx, 1);
        for (let i = gamePlayers.length - 1; i >= 0; i--) {
          if (gamePlayers[i].gameId === g.id) gamePlayers.splice(i, 1);
        }
      }
      return Promise.resolve({ count: matches.length });
    }),
    create: jest.fn(),
  };

  const gamePlayerClient = {
    create: jest.fn(
      ({ data }: { data: { gameId: number; playerId: number } }) => {
        gamePlayers.push({
          gameId: data.gameId,
          playerId: data.playerId,
          score: 0,
        });
        return Promise.resolve(undefined);
      },
    ),
    findUnique: jest.fn(
      ({
        where,
      }: {
        where: { gameId_playerId: { gameId: number; playerId: number } };
      }) => {
        const gp = gamePlayers.find(
          (p) =>
            p.gameId === where.gameId_playerId.gameId &&
            p.playerId === where.gameId_playerId.playerId,
        );
        return Promise.resolve(gp ? { ...gp } : null);
      },
    ),
    findFirst: jest.fn(({ where }: { where: WhereClause }) => {
      const found = gamePlayers.find((gp) => {
        if ('gameId' in where && gp.gameId !== where.gameId) return false;
        if ('playerId' in where && gp.playerId !== where.playerId) {
          return false;
        }
        if (
          'completed' in where &&
          (gp.completed ?? false) !== where.completed
        ) {
          return false;
        }
        return true;
      });
      return Promise.resolve(found ? { ...found } : null);
    }),
    count: jest.fn(({ where }: { where: WhereClause }) =>
      Promise.resolve(
        gamePlayers.filter((gp) => {
          if ('gameId' in where && gp.gameId !== where.gameId) return false;
          if ('playerId' in where && gp.playerId !== where.playerId) {
            return false;
          }
          if ('leftAt' in where && where.leftAt === null && gp.leftAt != null) {
            return false;
          }
          return true;
        }).length,
      ),
    ),
    findMany: jest.fn(({ where }: { where: WhereClause }) =>
      Promise.resolve(
        gamePlayers
          .filter((gp) => {
            if ('gameId' in where && gp.gameId !== where.gameId) {
              return false;
            }
            if ('playerId' in where && gp.playerId !== where.playerId) {
              return false;
            }
            if (
              'leftAt' in where &&
              where.leftAt === null &&
              gp.leftAt != null
            ) {
              return false;
            }
            return true;
          })
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
    ),
    deleteMany: jest.fn(({ where }: { where: WhereClause }) => {
      const matches = gamePlayers.filter((gp) => {
        if ('gameId' in where && gp.gameId !== where.gameId) return false;
        if ('playerId' in where && gp.playerId !== where.playerId) {
          return false;
        }
        return true;
      });
      for (const gp of matches) {
        gamePlayers.splice(gamePlayers.indexOf(gp), 1);
      }
      return Promise.resolve({ count: matches.length });
    }),
    updateMany: jest.fn(
      ({
        where,
        data,
      }: {
        where: WhereClause;
        data: Partial<FakeGamePlayer>;
      }) => {
        const matches = gamePlayers.filter((gp) => {
          if ('gameId' in where && gp.gameId !== where.gameId) return false;
          if ('playerId' in where && gp.playerId !== where.playerId) {
            return false;
          }
          return true;
        });
        for (const gp of matches) Object.assign(gp, data);
        return Promise.resolve({ count: matches.length });
      },
    ),
  };

  const txClient = {
    game: gameClient,
    gamePlayer: gamePlayerClient,
    $queryRaw: jest.fn(
      (_strings: TemplateStringsArray, ...values: number[]) => {
        const id = values[0];
        const g = games.find((game) => game.id === id);
        if (!g) return Promise.resolve([]);
        return Promise.resolve([
          {
            id: g.id,
            inGroupId: g.inGroupId,
            isActive: g.isActive,
            isFinished: g.isFinished,
          },
        ]);
      },
    ),
  };

  const prisma = {
    game: gameClient,
    gamePlayer: gamePlayerClient,
    crossword: {
      findUnique: jest.fn(() => Promise.resolve(null)),
    },
    $transaction: jest.fn((fn: (tx: typeof txClient) => Promise<unknown>) =>
      fn(txClient),
    ),
  };

  return {
    prisma,
    seedGame: (
      game: Omit<
        FakeGame,
        'endedAt' | 'playStartedAt' | 'durationMs' | 'progressionAppliedAt'
      > &
        Partial<
          Pick<
            FakeGame,
            'endedAt' | 'playStartedAt' | 'durationMs' | 'progressionAppliedAt'
          >
        >,
      players: number[],
    ) => {
      games.push({
        endedAt: null,
        playStartedAt: null,
        durationMs: null,
        progressionAppliedAt: null,
        ...game,
      });
      for (const playerId of players) {
        gamePlayers.push({ gameId: game.id, playerId, score: 0 });
      }
    },
    setPlayerName: (id: number, name: string) => names.set(id, name),
    getGame: (id: number) => games.find((g) => g.id === id),
    getGames: () => games,
    getGamePlayers: () => gamePlayers,
  };
}

function createGamesService() {
  const store = createStore();

  const playersService = {
    setCurrentGame: jest.fn(() => Promise.resolve(undefined)),
    clearCurrentGame: jest.fn(() => Promise.resolve(undefined)),
    reapExpiredSessions: jest.fn(() =>
      Promise.resolve([] as { playerId: number; token: string }[]),
    ),
  };

  const progressionService = {
    getFinishOutcome: jest.fn(),
    getUnrewardedFinishOutcome: jest.fn(() =>
      Promise.resolve({
        players: store.getGamePlayers().map((gp) => ({
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
    markPlayerLeft: jest.fn(),
    hasAllPlayersLeft: jest.fn(() => false),
    markIntroShown: jest.fn(),
  };

  const wordBuildingService = {
    persistScores: jest.fn(() => Promise.resolve(undefined)),
    getPlayStartedAt: jest.fn(() => null),
    clearLiveGame: jest.fn(),
    markPlayerLeft: jest.fn(),
    markIntroShown: jest.fn(),
  };

  const service = new GamesService(
    store.prisma as never,
    playersService as never,
    progressionService as never,
    gateway as never,
    wordSoupService as never,
    wordBuildingService as never,
  );

  return {
    service,
    store,
    playersService,
    gateway,
    wordSoupService,
    wordBuildingService,
  };
}

describe('GamesService.join — max-player enforcement + auto-start', () => {
  it('adds a player without starting while under the cap', async () => {
    const { service, store, gateway } = createGamesService();
    store.seedGame(
      {
        id: 1,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10],
    );

    const result = await service.join(1, 20);

    expect(result?.isActive).toBe(false);
    expect(result?.players).toEqual([10, 20]);
    expect(gateway.emitGameStarted).not.toHaveBeenCalled();
    expect(gateway.emitLobbyUpdate).toHaveBeenCalled();
  });

  it('auto-starts the game the moment the join reaches maxPlayers, exactly once', async () => {
    const { service, store, gateway } = createGamesService();
    const existing = Array.from(
      { length: GAME_LOBBY_CONFIG.maxPlayers - 1 },
      (_, i) => 100 + i,
    );
    store.seedGame(
      {
        id: 2,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: existing[0],
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      existing,
    );

    const lastPlayer = 999;
    const result = await service.join(2, lastPlayer);

    expect(result?.isActive).toBe(true);
    expect(result?.players).toHaveLength(GAME_LOBBY_CONFIG.maxPlayers);
    expect(gateway.emitGameStarted).toHaveBeenCalledTimes(1);
  });

  it('rejects a join once the game already has maxPlayers players (defensive count guard), without exceeding the cap', async () => {
    // A WAITING game sitting at exactly maxPlayers without having started
    // shouldn't occur through join() itself (the join that reaches the cap
    // also flips isActive in the same transaction) — this exercises the
    // count>=maxPlayers guard defensively, e.g. against a lowered config.
    const { service, store } = createGamesService();
    const full = Array.from(
      { length: GAME_LOBBY_CONFIG.maxPlayers },
      (_, i) => 200 + i,
    );
    store.seedGame(
      {
        id: 3,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: full[0],
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      full,
    );

    await expect(service.join(3, 999)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(store.getGamePlayers().filter((gp) => gp.gameId === 3)).toHaveLength(
      GAME_LOBBY_CONFIG.maxPlayers,
    );
  });

  it('rejects joining a game that already auto-started after the previous player filled the last seat', async () => {
    // The realistic "5th player is rejected" scenario: by the time the
    // maxPlayers-th join lands, the game has already flipped to active in
    // that same call, so a subsequent join sees isActive=true rather than
    // hitting the count guard above — mirrors the pre-existing "can't join
    // an active game" behavior (join() has always returned undefined here).
    const { service, store, gateway } = createGamesService();
    const almostFull = Array.from(
      { length: GAME_LOBBY_CONFIG.maxPlayers - 1 },
      (_, i) => 300 + i,
    );
    store.seedGame(
      {
        id: 30,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: almostFull[0],
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      almostFull,
    );

    await service.join(30, 999); // fills the last seat, auto-starts
    gateway.emitGameStarted.mockClear();
    const rejected = await service.join(30, 888);

    expect(rejected).toBeUndefined();
    expect(gateway.emitGameStarted).not.toHaveBeenCalled();
    expect(
      store.getGamePlayers().filter((gp) => gp.gameId === 30),
    ).toHaveLength(GAME_LOBBY_CONFIG.maxPlayers);
  });

  it('is a no-op (no duplicate row) when the player already joined', async () => {
    const { service, store } = createGamesService();
    store.seedGame(
      {
        id: 4,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10, 20],
    );

    await service.join(4, 20);

    expect(store.getGamePlayers().filter((gp) => gp.gameId === 4)).toHaveLength(
      2,
    );
  });
});

describe('GamesService.start — idempotent double-start', () => {
  it('only runs start side effects once when called twice', async () => {
    const { service, store, gateway } = createGamesService();
    store.seedGame(
      {
        id: 5,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10, 20],
    );

    await service.start(5);
    await service.start(5);

    expect(gateway.emitGameStarted).toHaveBeenCalledTimes(1);
    expect(store.getGame(5)?.isActive).toBe(true);
  });
});

describe('GamesService background sweep — pending-game auto-start / cancellation', () => {
  it('auto-starts a WAITING game past the start timeout that still meets the minimum-player requirement', async () => {
    const { service, store, gateway } = createGamesService();
    const staleInitiatedTime = new Date(
      Date.now() - GAME_LOBBY_CONFIG.autoStartTimeoutMs - 1000,
    );
    store.seedGame(
      {
        id: 6,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: staleInitiatedTime,
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10],
    );

    await (
      service as unknown as { sweepPendingGames(): Promise<void> }
    ).sweepPendingGames();

    expect(store.getGame(6)?.isActive).toBe(true);
    expect(gateway.emitGameStarted).toHaveBeenCalledTimes(1);
  });

  it('cancels (deletes) a WAITING game with no eligible players once past the cancellation timeout', async () => {
    const { service, store, gateway } = createGamesService();
    const longStaleTime = new Date(
      Date.now() - GAME_LOBBY_CONFIG.cancellationTimeoutMs - 1000,
    );
    store.seedGame(
      {
        id: 7,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: longStaleTime,
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [], // no players — e.g. the last one already left via another path
    );

    await (
      service as unknown as { sweepPendingGames(): Promise<void> }
    ).sweepPendingGames();

    expect(store.getGame(7)).toBeUndefined();
    expect(gateway.emitLobbyUpdate).toHaveBeenCalled();
  });

  it('leaves a WAITING game with no players untouched before the (longer) cancellation timeout', async () => {
    const { service, store } = createGamesService();
    const pastStartOnly = new Date(
      Date.now() - GAME_LOBBY_CONFIG.autoStartTimeoutMs - 1000,
    );
    store.seedGame(
      {
        id: 8,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: pastStartOnly,
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [],
    );

    await (
      service as unknown as { sweepPendingGames(): Promise<void> }
    ).sweepPendingGames();

    expect(store.getGame(8)).toBeDefined();
    expect(store.getGame(8)?.isActive).toBe(false);
  });
});

describe('GamesService background sweep — expired-session reap', () => {
  it("transfers ownership of a WAITING game when the owner's session expires and other players remain", async () => {
    const { service, store, playersService } = createGamesService();
    store.seedGame(
      {
        id: 9,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10, 20, 30],
    );
    playersService.reapExpiredSessions.mockResolvedValueOnce([
      { playerId: 10, token: 'tok-10' },
    ]);

    await (
      service as unknown as { reapAbandonedPlayers(): Promise<void> }
    ).reapAbandonedPlayers();

    const game = store.getGame(9);
    expect(game?.initiatedById).toBe(20);
    expect(store.getGamePlayers().filter((gp) => gp.gameId === 9)).toHaveLength(
      2,
    );
  });

  it("cancels a WAITING game when the sole player's session expires", async () => {
    const { service, store, playersService } = createGamesService();
    store.seedGame(
      {
        id: 10,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: null,
        isActive: false,
        isFinished: false,
      },
      [10],
    );
    playersService.reapExpiredSessions.mockResolvedValueOnce([
      { playerId: 10, token: 'tok-10' },
    ]);

    await (
      service as unknown as { reapAbandonedPlayers(): Promise<void> }
    ).reapAbandonedPlayers();

    expect(store.getGame(10)).toBeUndefined();
  });

  it("resolves a STARTED game via the existing finish() path once every active player's session has expired", async () => {
    const { service, store, playersService, wordSoupService, gateway } =
      createGamesService();
    store.seedGame(
      {
        id: 11,
        name: 'Word Soup',
        inGroupId: 5,
        initiatedById: 10,
        initiatedTime: new Date(),
        startedTime: new Date(),
        isActive: true,
        isFinished: false,
      },
      [10, 20],
    );

    wordSoupService.markPlayerLeft.mockImplementation(
      (gameId: number, playerId: number, playerName: string) => {
        void store.prisma.gamePlayer.updateMany({
          where: { gameId, playerId },
          data: { leftAt: new Date() },
        });
        return Promise.resolve({ leftPlayers: { [playerId]: playerName } });
      },
    );

    playersService.reapExpiredSessions.mockResolvedValueOnce([
      { playerId: 10, token: 'tok-10' },
      { playerId: 20, token: 'tok-20' },
    ]);
    wordSoupService.hasAllPlayersLeft.mockReturnValue(false);

    await (
      service as unknown as { reapAbandonedPlayers(): Promise<void> }
    ).reapAbandonedPlayers();

    expect(store.getGame(11)?.isFinished).toBe(true);
    expect(gateway.emitGameFinished).toHaveBeenCalled();
  });
});
