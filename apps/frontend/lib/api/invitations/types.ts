export type ValidateInvitationResult = {
  valid: boolean;
  groupId?: number;
};

export type SendInvitationInput = {
  groupId: number;
  groupName: string;
  toEmail: string;
  invitationText: string;
};

export type AcceptInvitationInput = {
  token: string;
};
