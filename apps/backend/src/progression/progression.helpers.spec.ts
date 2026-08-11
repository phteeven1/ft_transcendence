import {
  computeXpAwarded,
  getMaxUnlockedTier,
  getUnlockedTierIds,
  resolveWinnerIds,
} from './progression.helpers';
import { PARTICIPATION_XP, WIN_XP } from './progression.constants';

describe('resolveWinnerIds', () => {
  it('returns no winners for solo games', () => {
    expect(resolveWinnerIds([{ playerId: 1, score: 40 }]).size).toBe(0);
  });
});

describe('computeXpAwarded', () => {
  it('awards participation XP only for solo games', () => {
    expect(computeXpAwarded(1, true)).toBe(PARTICIPATION_XP);
    expect(computeXpAwarded(1, false)).toBe(PARTICIPATION_XP);
  });

  it('adds win XP for multiplayer winners only', () => {
    expect(computeXpAwarded(2, true)).toBe(PARTICIPATION_XP + WIN_XP);
    expect(computeXpAwarded(2, false)).toBe(PARTICIPATION_XP);
  });
});

describe('avatar rank helpers', () => {
  it('computes max unlocked rank from XP thresholds', () => {
    expect(getMaxUnlockedTier(0)).toBe(0);
    expect(getMaxUnlockedTier(49)).toBe(0);
    expect(getMaxUnlockedTier(50)).toBe(1);
    expect(getMaxUnlockedTier(500)).toBe(4);
  });

  it('lists unlocked rank ids', () => {
    expect(getUnlockedTierIds(150)).toEqual([0, 1, 2]);
  });

  it('maps XP totals to the current rank', () => {
    expect(getMaxUnlockedTier(200)).toBe(2);
    expect(getMaxUnlockedTier(40)).toBe(0);
    expect(getMaxUnlockedTier(150)).toBe(2);
  });
});
