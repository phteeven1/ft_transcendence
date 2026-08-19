import { apiRequest } from '../http';
import type {
  RegisterUserInput,
  SignInUserInput,
  UserDto,
  UpdateUserInput,
  ChangePasswordInput,
  ChangePasswordResult,
  AuthResult,
} from './types';

/**
 * Users domain API — the only place that knows user HTTP paths and request body shapes.
 */
export const usersApi = {
  register(input: RegisterUserInput): Promise<AuthResult> {
    return apiRequest<AuthResult>('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        userName: input.userName,
        userPassword: input.userPassword,
        userEmail: input.userEmail,
      }),
    });
  },

  signIn(input: SignInUserInput): Promise<AuthResult> {
    return apiRequest<AuthResult>('/users/signin', {
      method: 'POST',
      body: JSON.stringify({
        userName: input.userName,
        userPassword: input.userPassword,
      }),
    });
  },

  getById(id: number): Promise<UserDto> {
    return apiRequest<UserDto>(`/users/${id}`);
  },

  validateSession(input: {
    userId: number;
    token: string;
  }): Promise<{ valid: true }> {
    return apiRequest<{ valid: true }>('/users/validateSession', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  clearSession(input: { token: string }): Promise<void> {
    return apiRequest<void>('/users/clearSession', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(input: UpdateUserInput): Promise<UserDto> {
    return apiRequest<UserDto>('/users/update', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    return apiRequest<ChangePasswordResult>('/users/changePassword', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
