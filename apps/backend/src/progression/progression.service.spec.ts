import { PARTICIPATION_XP, WIN_XP } from './progression.constants';
import { computeStreakUpdate, determineWinnerIds } from './progression.helpers';
import { ProgressionOutcomeService } from './progression-outcome.service';
import { ProgressionStatsService } from './progression-stats.service';
import { ProgressionService } from './progression.service';

function createProgressionService(prisma: unknown): ProgressionService {
  const stats = new ProgressionStatsService(prisma as never);
  const outcomes = new ProgressionOutcomeService(prisma as never);
  return new ProgressionService(stats, outcomes);
}

describe('determineWinnerIds', () => {
  it('returns all players tied for the highest score', () => {
    const winners = determineWinnerIds([
      { playerId: 1, score: 30 },
      { playerId: 2, score: 50 },
      { playerId: 3, score: 50 },
    ]);
    expect([...winners].sort()).toEqual([2, 3]);
  });

  it('returns an empty set when there are no players', () => {
    expect(determineWinnerIds([]).size).toBe(0);
  });
});

describe('computeStreakUpdate', () => {
  it('continues the streak for winners and tracks bestWinStreak', () => {
    expect(
      computeStreakUpdate({ winStreak: 2, bestWinStreak: 4 }, true),
    ).toEqual({ winStreak: 3, bestWinStreak: 4 });
    expect(
      computeStreakUpdate({ winStreak: 4, bestWinStreak: 4 }, true),
    ).toEqual({ winStreak: 5, bestWinStreak: 5 });
  });

  it('resets winStreak for non-winners without lowering bestWinStreak', () => {
    expect(
      computeStreakUpdate({ winStreak: 3, bestWinStreak: 5 }, false),
    ).toEqual({ winStreak: 0, bestWinStreak: 5 });
  });
});

describe('ProgressionService', () => {
  const gameFindUnique = jest.fn();
  const gameFindMany = jest.fn();
  const playerFindUnique = jest.fn();
  const playerFindMany = jest.fn();
  const playerUpdate = jest.fn();
  const gameUpdate = jest.fn();
  const transaction = jest.fn(async (fn: (tx: unknown) => Promise<void>) =>
    fn({
      player: { findUnique: playerFindUnique, update: playerUpdate },
      game: { update: gameUpdate },
    }),
  );

  const prisma = {
    game: {
      findUnique: gameFindUnique,
      findMany: gameFindMany,
      update: gameUpdate,
    },
    player: {
      findUnique: playerFindUnique,
      findMany: playerFindMany,
      update: playerUpdate,
    },
    $transaction: transaction,
  };

  const service = createProgressionService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    gameFindMany.mockResolvedValue([]);
    playerFindMany.mockResolvedValue([]);
  });

  it('awards participation + win XP and increments stats for winners', async () => {
    gameFindUnique.mockResolvedValue({
      id: 1,
      isFinished: true,
      progressionAppliedAt: null,
      gamePlayers: [
        { playerId: 10, score: 40, player: { id: 10, name: 'Player A' } },
        { playerId: 20, score: 60, player: { id: 20, name: 'Player B' } },
      ],
    });
    playerFindUnique
      .mockResolvedValueOnce({
        id: 10,
        winStreak: 1,
        bestWinStreak: 2,
        xp: 0,
        avatarTier: 2,
        bestWordStreak: 0,
      })
      .mockResolvedValueOnce({
        id: 20,
        winStreak: 0,
        bestWinStreak: 0,
        // 40 + win XP crosses tier-1 (50); rank auto-updates to 1
        xp: 40,
        avatarTier: 0,
        bestWordStreak: 0,
      });

    const outcome = await service.recordGameOutcome(1);

    expect(outcome?.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 10,
          score: 40,
          xpAwarded: PARTICIPATION_XP,
          isWinner: false,
          newlyUnlockedTier: null,
        }),
        expect.objectContaining({
          playerId: 20,
          score: 60,
          xpAwarded: PARTICIPATION_XP + WIN_XP,
          isWinner: true,
          newlyUnlockedTier: 1,
        }),
      ]),
    );

    expect(playerUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        xp: { increment: PARTICIPATION_XP },
        gamesPlayed: { increment: 1 },
        winStreak: 0,
        bestWinStreak: 2,
        // XP still below Explorer (50); rank stays Apprentice
        avatarTier: 0,
      },
    });
    expect(playerUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: {
        xp: { increment: PARTICIPATION_XP + WIN_XP },
        gamesPlayed: { increment: 1 },
        wins: { increment: 1 },
        winStreak: 1,
        bestWinStreak: 1,
        // Rank follows XP: 40 + win XP unlocks Explorer
        avatarTier: 1,
      },
    });
    expect(gameUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { progressionAppliedAt: expect.any(Date) as Date },
    });
  });

  it('awards participation XP only for solo games', async () => {
    gameFindUnique.mockResolvedValue({
      id: 2,
      isFinished: true,
      progressionAppliedAt: null,
      gamePlayers: [
        { playerId: 10, score: 50, player: { id: 10, name: 'Solo Player' } },
      ],
    });
    playerFindUnique.mockResolvedValue({
      id: 10,
      winStreak: 0,
      bestWinStreak: 0,
      xp: 0,
      avatarTier: 0,
      bestWordStreak: 0,
    });

    const outcome = await service.recordGameOutcome(2);

    expect(outcome?.players[0]).toMatchObject({
      playerId: 10,
      xpAwarded: PARTICIPATION_XP,
      isWinner: false,
      newlyUnlockedTier: null,
    });
    expect(playerUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        xp: { increment: PARTICIPATION_XP },
        gamesPlayed: { increment: 1 },
        winStreak: 0,
        bestWinStreak: 0,
        avatarTier: 0,
      },
    });
  });

  it('is idempotent when progression was already applied', async () => {
    gameFindUnique.mockResolvedValue({
      id: 1,
      isFinished: true,
      progressionAppliedAt: new Date(),
      gamePlayers: [
        { playerId: 10, score: 10, player: { id: 10, name: 'Player A' } },
      ],
    });

    const outcome = await service.recordGameOutcome(1);

    expect(transaction).not.toHaveBeenCalled();
    expect(outcome?.players[0]).toMatchObject({
      playerId: 10,
      score: 10,
      xpAwarded: PARTICIPATION_XP,
      isWinner: false,
    });
  });

  it('skips unfinished games', async () => {
    gameFindUnique.mockResolvedValue({
      id: 1,
      isFinished: false,
      progressionAppliedAt: null,
      gamePlayers: [],
    });

    await service.recordGameOutcome(1);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns finish standings with zero XP when progression was skipped', async () => {
    gameFindUnique.mockResolvedValue({
      id: 1,
      isFinished: true,
      progressionAppliedAt: null,
      gamePlayers: [
        { playerId: 10, score: 4, player: { id: 10, name: 'Player A' } },
        { playerId: 11, score: 7, player: { id: 11, name: 'Player B' } },
      ],
    });

    const outcome = await service.getUnrewardedFinishOutcome(1);

    expect(outcome?.players).toEqual([
      {
        playerId: 10,
        playerName: 'Player A',
        score: 4,
        xpAwarded: 0,
        isWinner: false,
      },
      {
        playerId: 11,
        playerName: 'Player B',
        score: 7,
        xpAwarded: 0,
        isWinner: true,
      },
    ]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('ranks leaderboard entries by XP', async () => {
    const playerFindMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Alex',
        xp: 120,
        wins: 5,
        winStreak: 2,
        gamesPlayed: 7,
        bestWordStreak: 4,
        avatarTier: 2,
      },
      {
        id: 2,
        name: 'Blair',
        xp: 80,
        wins: 3,
        winStreak: 1,
        gamesPlayed: 5,
        bestWordStreak: 2,
        avatarTier: 1,
      },
    ]);

    const prismaWithLeaderboard = {
      ...prisma,
      player: { ...prisma.player, findMany: playerFindMany },
      game: { ...prisma.game, findMany: jest.fn().mockResolvedValue([]) },
    };
    const leaderboardService = createProgressionService(prismaWithLeaderboard);

    const result = await leaderboardService.getLeaderboard(9);

    expect(result.groupId).toBe(9);
    expect(result.entries[0]).toMatchObject({ playerId: 1, rank: 1 });
    expect(result.entries[1]).toMatchObject({ playerId: 2, rank: 2 });
    expect(playerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inGroupId: 9 },
        orderBy: [{ xp: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('rejects equipping an invalid avatar animal', async () => {
    playerFindUnique.mockResolvedValue({
      id: 5,
      xp: 30,
      gamesPlayed: 2,
      wins: 0,
      winStreak: 0,
      bestWinStreak: 0,
      bestWordStreak: 0,
      avatarTier: 0,
      avatarAnimal: 0,
    });

    await expect(service.equipAvatar(5, { avatarAnimal: 9 })).rejects.toThrow(
      'Invalid avatar animal',
    );
  });

  it('returns progression payload with unlocked tiers', async () => {
    playerFindUnique.mockResolvedValue({
      id: 5,
      inGroupId: null,
      xp: 150,
      gamesPlayed: 10,
      wins: 4,
      winStreak: 2,
      bestWinStreak: 3,
      bestWordStreak: 5,
      avatarTier: 1,
      avatarAnimal: 2,
    });

    const result = await service.getMyProgression(5);

    expect(result).toMatchObject({
      playerId: 5,
      xp: 150,
      unlockedTiers: [0, 1, 2],
      // Rank always mirrors XP (150 → Wordsmith / tier 2), not stored choice
      avatarTier: 2,
      avatarAnimal: 2,
      bestWordStreak: 5,
    });
    expect(result.tiers.length).toBeGreaterThan(0);
    expect(result.animals.length).toBe(5);
  });
});
