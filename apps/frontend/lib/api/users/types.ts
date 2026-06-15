/** API contract for user endpoints — mirrors backend JSON, not the database. */
export type UserDto = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
  currentGroup?: number;
  realName?: string;
  relationshipComment?: string;
  showEmail: boolean;
  showRealName: boolean;
  showRelationshipComment: boolean;
};

export type RegisterUserInput = {
  userName: string;
  userPassword: string;
  userEmail: string;
};

export type SignInUserInput = {
  userName: string;
  userPassword: string;
};

export type UpdateUserInput = {
  userId: number;
  realName?: string;
  relationshipComment?: string;
  showEmail: boolean;
  showRealName: boolean;
  showRelationshipComment: boolean;
};

export type ChangePasswordInput = {
  userId: number;
  oldPassword: string;
  newPassword: string;
};