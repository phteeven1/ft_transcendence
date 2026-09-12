/** API contract for user endpoints — mirrors backend JSON, not the database. */
export type UserDto = {
  id: number;
  name: string;
  email: string;
  isMemberOf: number[];
  isAdminOf: number[];
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
  userName?: string;
};

export type ChangePasswordInput = {
  oldPassword: string;
  newPassword: string;
};

export type UserSessionDto = {
  token: string;
  userId: number;
};

export type ChangePasswordResult = {
  success: boolean;
  session: UserSessionDto | null;
};

export type AuthResult = {
  user: UserDto | null;
  session: UserSessionDto | null;
};
