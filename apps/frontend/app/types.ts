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