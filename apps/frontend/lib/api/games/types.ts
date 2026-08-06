export type GameFinishPlayerOutcomeDto = {
  playerId: number;
  playerName: string;
  score: number;
  xpAwarded: number;
  isWinner: boolean;
  /** Highest tier newly unlocked by this finish's XP; null/omitted if none. */
  newlyUnlockedTier?: number | null;
};

export type GameFinishOutcomeDto = {
  players: GameFinishPlayerOutcomeDto[];
};

export type FinishGameResultDto = {
  game: GameDto;
  outcome: GameFinishOutcomeDto | null;
};

export type GameDto = {
  id: number;
  name: string;
  inGroup: number;
  initiatedBy: number;
  initiatedTime: string;
  startedTime: string | null;
  players: number[];
  isActive: boolean;
  isFinished: boolean;
  /** Not returned by backend today; UI treats missing as open lobby (0). */
  waitingFor?: number;
};

/** Roster row from GET /games/:id/players (scoreboard / intro avatars). */
export type GameRosterPlayerDto = {
  id: number;
  name: string;
  avatarTier: number;
};

export type CreateGameInput = {
  name: string;
  inGroup: number;
  initiatedBy: number;
};

export type GameIdPlayerIdInput = {
  gameId: number;
  playerId: number;
};

export type GameIdInput = {
  gameId: number;
};
