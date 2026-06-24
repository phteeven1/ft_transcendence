export type PlayerDto = {
  id: number;
  inGroup: number;
  ofUser: number;
  name: string;
  passQuestion: string;
  currentGameId: number | null;
  lastSignout: string;
  sessionExpiresAt: string | null;
};

export type CreatePlayerInput = {
  playerInGroup: number;
  playerParent: number;
  playerName: string;
  playerPassQuestion: string;
  playerPassAnswer: string;
};

export type RenamePlayerInput = {
  playerId: number;
  playerName: string;
};

export type UpdatePassPhraseInput = {
  playerId: number;
  playerPassQuestion: string;
  playerPassAnswer: string;
};

export type PlayerSessionDto = {
  token: string;
  playerId: number;
  expiresAt: string;
  createdAt: string;
};

export type StartSessionInput = {
  playerId: number;
  minutes: number;
};

export type ValidateSessionInput = {
  playerId: number;
  token: string;
};

export type ValidateSessionResult = {
  valid: true;
  expiresAt: string;
};