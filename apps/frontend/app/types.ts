export type User = {
  userId: number;
  userName: string;
  userEmail: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
};

export type Group = {
  groupId: number;
  groupName: string;
  groupAdmins: number[];
  groupMembers: number[];
};

export type Member = {
  memberId: number;
  memberName: string;
  isAdmin: boolean;
};

export type Player = {
  playerId: number;
  playerInGroup: number;
  playerParent: number;
  playerName: string;
  playerPassQuestion: string;
};

export type Vocabulary = {
  vocabularyId: number;
  vocabularyInGroup: number;
  vocabularyAuthor: number;
  vocabularyName: string;
  isCurrent: boolean;
  vocabularyWords: string[];
  vocabularyMeanings: string[];
  vocabularyCount: number;
};