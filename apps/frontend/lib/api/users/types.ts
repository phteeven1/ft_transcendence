/** API contract for user endpoints — mirrors backend JSON, not the database. */
export type UserDto = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
  showEmail: boolean;
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
  userName?: string;
};

export type ChangePasswordInput = {
  userId: number;
  oldPassword: string;
  newPassword: string;
};