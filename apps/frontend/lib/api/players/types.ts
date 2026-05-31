export type PlayerDto = {
  id: number;
  inGroup: number;
  ofUser: number;
  name: string;
  passQuestion: string;
  currentGameId: number | null;
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
