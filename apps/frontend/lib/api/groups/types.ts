export type GroupDto = {
  id: number;
  name: string;
  admins: number[];
  members: number[];
  currentVocabulary?: number;
};

export type MemberDto = {
  id: number;
  name: string;
  isAdmin: boolean;
};

export type CreateGroupInput = {
  groupName: string;
  creatorId: number;
};

export type GroupMemberActionInput = {
  groupId: number;
  userId: number;
};

export type RenameGroupInput = {
  groupId: number;
  groupName: string;
};
