import {
  computeXpAwarded,
  getMaxUnlockedTier,
  getUnlockedTierIds,
  isAvatarTierUnlocked,
  isValidAvatarTier,
  resolveEquippedAvatarTier,
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

describe('avatar tier helpers', () => {
  it('computes max unlocked tier from XP thresholds', () => {
    expect(getMaxUnlockedTier(0)).toBe(0);
    expect(getMaxUnlockedTier(49)).toBe(0);
    expect(getMaxUnlockedTier(50)).toBe(1);
    expect(getMaxUnlockedTier(500)).toBe(4);
  });

  it('lists unlocked tier ids', () => {
    expect(getUnlockedTierIds(150)).toEqual([0, 1, 2]);
  });

  it('validates tier ids and unlock state', () => {
    expect(isValidAvatarTier(2)).toBe(true);
    expect(isValidAvatarTier(99)).toBe(false);
    expect(isAvatarTierUnlocked(100, 2)).toBe(false);
    expect(isAvatarTierUnlocked(150, 2)).toBe(true);
  });

  it('keeps the equipped tier when still unlocked', () => {
    expect(resolveEquippedAvatarTier(0, 200)).toBe(0);
    expect(resolveEquippedAvatarTier(1, 200)).toBe(1);
    expect(resolveEquippedAvatarTier(2, 200)).toBe(2);
  });

  it('clamps down when equipped tier exceeds max unlocked', () => {
    expect(resolveEquippedAvatarTier(2, 40)).toBe(0);
    expect(resolveEquippedAvatarTier(4, 150)).toBe(2);
  });

  it('clamps invalid tier ids down to max unlocked', () => {
    expect(resolveEquippedAvatarTier(99, 200)).toBe(2);
  });
});
