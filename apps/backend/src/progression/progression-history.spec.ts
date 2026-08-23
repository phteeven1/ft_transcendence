import { buildGameHistoryStats } from './progression-history';
import { PARTICIPATION_XP, WIN_XP } from './progression.constants';

describe('buildGameHistoryStats', () => {
  it('ignores early leavers when awarding XP and wins', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        name: 'Word Soup',
        durationMs: 12_000,
        endedAt: new Date('2026-01-01'),
        gamePlayers: [
          {
            playerId: 1,
            score: 100,
            bestWordStreak: 2,
            wordsFound: 5,
            freezeCount: 0,
            completed: true,
            leftAt: new Date('2026-01-01'),
          },
          {
            playerId: 2,
            score: 40,
            bestWordStreak: 1,
            wordsFound: 2,
            freezeCount: 0,
            completed: true,
            leftAt: null,
          },
          {
            playerId: 3,
            score: 10,
            bestWordStreak: 0,
            wordsFound: 1,
            freezeCount: 0,
            completed: true,
            leftAt: null,
          },
        ],
      },
    ]);

    const prisma = { game: { findMany } };
    const { totalsMap } = await buildGameHistoryStats(prisma as never, 1);

    expect(totalsMap.has(1)).toBe(false);
    expect(totalsMap.get(2)).toMatchObject({
      xp: PARTICIPATION_XP + WIN_XP,
      wins: 1,
      gamesPlayed: 1,
    });
    expect(totalsMap.get(3)).toMatchObject({
      xp: PARTICIPATION_XP,
      wins: 0,
      gamesPlayed: 1,
    });
  });
});
