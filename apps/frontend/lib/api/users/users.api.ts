import { apiRequest } from '../http';
import type {
  RegisterUserInput,
  SignInUserInput,
  UserDto,
  UpdateUserInput,
  ChangePasswordInput,
} from './types';

/**
 * Users domain API — the only place that knows user HTTP paths and request body shapes.
 */
export const usersApi = {
  register(input: RegisterUserInput): Promise<UserDto> {
    return apiRequest<UserDto>('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        userName: input.userName,
        userPassword: input.userPassword,
        userEmail: input.userEmail,
      }),
    });
  },

  signIn(input: SignInUserInput): Promise<UserDto> {
    return apiRequest<UserDto>('/users/signin', {
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

  update(input: UpdateUserInput): Promise<UserDto> {
    return apiRequest<UserDto>('/users/update', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  changePassword(input: ChangePasswordInput): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/users/changePassword', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};