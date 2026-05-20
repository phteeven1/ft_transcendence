// type for parents as users. Can manage groups, vocabularies and player profiles. Not for playing
// userId is unique across the plattform. Even is a user is later deleted, the id is never re-used
export type User = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
};

// users are members or admins of groups. Groups can have several of each, but at least one admin
// users can be admins and/or members of several different groups
// groupId is unique and never re-used. Even groups created by completely different users never have same.
export type Group = {
  id: number;
  name: string;
  admins: number[];
  members: number[];
};

// used to store all members and admins of the current group, in /manage_group, when a user
// logs in to a group or creates a new group. Stored in arrays of Member
// /manage_group is refreshed every 5s to make sure that changes done by one user
// are passed on to other users logged in at the same time
// memberId is the userId of that member
export type Member = {
  id: number;
  name: string;
  isAdmin: boolean;
};

// player profile of the children a parent (user) is managing dicteé for
// belongs to a specific user and group. Only that user when logged in to that group
// can manage that player profile
// When the player wants to log in to play a game, they do so through shortcut
// set up by user, and answers passQuestion (not password) to confirm identity
// playerId is unique number and never re-used, even if created by different user in different group
export type Player = {
  id: number;
  inGroup: number;
  ofParent: number;
  name: string;
  passQuestion: string;
  currentGameId: number | null;
};

// vocabulary is a list of words used by dicteé to generate relevant crosswords and games
// belongs to a specific group, and can only be managed by admin of that group
// vocabularyId is unique number, and never re-used even if in different group
export type Vocabulary = {
  id: number;
  inGroup: number;
  name: string;
  isActive: boolean;
  words: string[];
  meanings: string[];
  wordCount: number;
  wordLanguage: string; // must be valid BCP 47 tag
  meaningLanguage: string; // must be valid BCP 47 tag
};

// Represents a pending or active game session within a group.
// waitingFor: 0 = open to anyone who joins within 5 mins; 1/2/3 = waiting for that many more players
// players: array of player ids who have joined
// isActive: true once the game has started (enough players joined or time forced it)
// startedTime: null while pending, set when game starts
export type Game = {
  id: number;
  name: string;
  inGroup: number;
  initiatedBy: number;
  initiatedTime: string; // ISO string from backend Date
  startedTime: string | null;
  players: number[];
  isActive: boolean;
  isFinished: boolean;
};
