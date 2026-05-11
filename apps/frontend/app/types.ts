// type for parents as users. Can manage groups, vocabularies and player profiles. Not for playing
export type User = {
  userId: number;
  userName: string;
  userEmail: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
};

// users are members or admins of groups. Groups can have several of each, but at least one admin
// users can be admins and/or members of several different groups
export type Group = {
  groupId: number;
  groupName: string;
  groupAdmins: number[];
  groupMembers: number[];
};

// used to store all members and admins of the current group, in /manage_group, when a user
// logs in to a group or creates a new group. Stored in arrays of Member
// /manage_group is refreshed every 5s to make sure that changes done by one user
// are passed on to other users logged in at the same time
export type Member = {
  memberId: number;
  memberName: string;
  isAdmin: boolean;
};

// player profile of the children a parent (user) is managing dicteé for
// belongs to a specific user and group. Only that user when logged in to that group
// can manage that player profile
// When the player wants to log in to play a game, they do so through shortcut
// set up by user, and answers passQuestion (not password) to confirm identity
export type Player = {
  playerId: number;
  playerInGroup: number;
  playerParent: number;
  playerName: string;
  playerPassQuestion: string;
};

// vocabulary is a list of words used by dicteé to generate relevant crosswords and games
// belongs to a specific group, and can only be managed by admin of that group
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