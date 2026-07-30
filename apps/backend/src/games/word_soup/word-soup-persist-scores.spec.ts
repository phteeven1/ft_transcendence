/**
 * Pure mapping used by WordSoupService.persistScores — keep in sync.
 */
function scoreEntriesFromPlayerScores(
  playerScores: Record<number, number>,
): Array<{ playerId: number; score: number }> {
  return Object.entries(playerScores).map(([playerId, score]) => ({
    playerId: Number(playerId),
    score,
  }));
}

describe('Word Soup score persistence', () => {
  it('maps in-memory playerScores to per-player score rows', () => {
    const entries = scoreEntriesFromPlayerScores({ 1: 35, 2: 70, 3: 0 });
    expect(entries).toEqual(
      expect.arrayContaining([
        { playerId: 1, score: 35 },
        { playerId: 2, score: 70 },
        { playerId: 3, score: 0 },
      ]),
    );
    expect(entries).toHaveLength(3);
  });

  it('returns an empty list when no scores are tracked', () => {
    expect(scoreEntriesFromPlayerScores({})).toEqual([]);
  });
});
