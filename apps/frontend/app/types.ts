export type User = {
  userId: number;
  userName: string;
  userEmail: string;
  userMemberGroups: number[];
  userAdminGroups: number[];
  currentGroup?: number;
};

export type Group = {
  groupId: number;
  groupName: string;
  groupAdmins: number[];
  groupMembers: number[];
};