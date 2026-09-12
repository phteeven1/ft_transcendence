/** Mirrors backend progression.constants — keep in sync. */
export const PARTICIPATION_XP = 10;
export const WIN_XP = 25;

export function isMultiplayerGame(participantCount: number): boolean {
  return participantCount >= 2;
}

/** Single source of truth for XP awarded when a game finishes. */
export function computeXpAwarded(
  participantCount: number,
  isWinner: boolean,
): number {
  if (!isMultiplayerGame(participantCount)) return PARTICIPATION_XP;
  return PARTICIPATION_XP + (isWinner ? WIN_XP : 0);
}
