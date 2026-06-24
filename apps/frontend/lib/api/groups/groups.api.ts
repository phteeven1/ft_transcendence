import { apiRequest } from '../http';
import type {
  CreateGroupInput,
  GroupDto,
  GroupMemberActionInput,
  MemberDto,
  RenameGroupInput,
} from './types';

export const groupsApi = {
  create(input: CreateGroupInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getById(groupId: number): Promise<GroupDto> {
    return apiRequest<GroupDto>(`/groups/${groupId}`);
  },

  getMembers(groupId: number): Promise<MemberDto[]> {
    return apiRequest<MemberDto[]>(`/groups/${groupId}/members`);
  },

  addMember(input: GroupMemberActionInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/addMember', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  promote(input: GroupMemberActionInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/promote', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  demote(input: GroupMemberActionInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/demote', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  leave(input: GroupMemberActionInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/leave', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  rename(input: RenameGroupInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/rename', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  expel(input: GroupMemberActionInput): Promise<GroupDto> {
    return apiRequest<GroupDto>('/groups/expel', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  delete(groupId: number): Promise<boolean> {
    return apiRequest<boolean>('/groups/delete', {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    });
  },
};
