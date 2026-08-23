export type GameFinishPlayerOutcomeDto = {
  playerId: number;
  playerName: string;
  score: number;
  xpAwarded: number;
  isWinner: boolean;
  /** Highest tier newly unlocked by this finish's XP; null/omitted if none. */
  newlyUnlockedTier?: number | null;
  /** True when the player left before the match ended. */
  leftEarly?: boolean;
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
  /** Configured player cap — single source of truth is the backend. */
  maxPlayers: number;
  /** ISO timestamp the game auto-starts at if still WAITING; null once active/finished. */
  autoStartAt: string | null;
};

/** Roster row from GET /games/:id/players (scoreboard / intro avatars). */
export type GameRosterPlayerDto = {
  id: number;
  name: string;
  avatarTier: number;
  avatarAnimal: number;
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

/** `game:playerLeft` socket payload (playerId + display name). */
export type IPlayerLeftNoticeDto = {
  playerId: number;
  playerName: string;
};

/** Client-side game socket error surfaced to hooks (e.g. after leave). */
export type IGameSocketErrorDto = {
  message: string;
  seq: number;
};
