import { toApiGame } from './mappers';

describe('toApiGame', () => {
  it('returns active players only — leavers keep a GamePlayer row but are excluded', () => {
    const result = toApiGame({
      id: 1,
      name: 'Match',
      inGroupId: 10,
      initiatedById: 1,
      initiatedTime: new Date('2026-01-01T00:00:00Z'),
      startedTime: new Date('2026-01-01T00:01:00Z'),
      isActive: true,
      isFinished: false,
      gamePlayers: [
        { playerId: 1, leftAt: null },
        { playerId: 2, leftAt: new Date('2026-01-01T00:05:00Z') },
      ],
    });

    expect(result.players).toEqual([1]);
  });

  it('includes all players when none have left', () => {
    const result = toApiGame({
      id: 2,
      name: 'Match',
      inGroupId: 10,
      initiatedById: 1,
      initiatedTime: new Date('2026-01-01T00:00:00Z'),
      startedTime: new Date('2026-01-01T00:01:00Z'),
      isActive: true,
      isFinished: false,
      gamePlayers: [
        { playerId: 1, leftAt: null },
        { playerId: 2, leftAt: null },
      ],
    });

    expect(result.players).toEqual([1, 2]);
  });
});
