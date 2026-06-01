import { apiRequest } from '../http';
import type {
  AcceptInvitationInput,
  SendInvitationInput,
  ValidateInvitationResult,
} from './types';

export const invitationsApi = {
  validateToken(token: string): Promise<ValidateInvitationResult> {
    return apiRequest<ValidateInvitationResult>(
      `/invitations/validate/${encodeURIComponent(token)}`,
    );
  },

  send(input: SendInvitationInput): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/invitations/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  accept(input: AcceptInvitationInput): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
