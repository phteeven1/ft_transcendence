import { apiRequest } from '../http';
import type { GroupChatEntryDto, PostChatMessageInput } from './types';

export const chatApi = {
  /**
   * Fetch all chat entries for a group, ordered oldest → newest.
   * The UI renders them in order and can filter client-side.
   */
  getEntries(groupId: number, userId: number): Promise<GroupChatEntryDto[]> {
    return apiRequest<GroupChatEntryDto[]>(
      `/groups/${groupId}/chat?userId=${userId}`,
    );
  },

  /**
   * Post a user-written message (ADM, GEN, or MEM).
   * LOG entries are created automatically by the backend on group events.
   */
  postMessage(input: PostChatMessageInput): Promise<GroupChatEntryDto> {
    return apiRequest<GroupChatEntryDto>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};