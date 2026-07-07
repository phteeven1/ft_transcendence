/** API contract for group chat endpoints — mirrors backend JSON, not the database. */

export type ChatEntryType = 'LOG' | 'ADM' | 'GEN' | 'MEM';

export type ChatEventKey =
  | 'CREATE_GROUP'
  | 'JOIN_GROUP'
  | 'LEAVE_GROUP'
  | 'PROMOTE_ADMIN'
  | 'RESIGN_ADMIN'
  | 'RENAME_GROUP'
  | 'EXPEL_MEMBER'
  | 'DELETE_GROUP'
  | 'UPLOAD_VOCABULARY'
  | 'RENAME_VOCABULARY'
  | 'DELETE_VOCABULARY'
  | 'SET_ACTIVE_VOCABULARY'
  | 'SEND_INVITE';

export type GroupChatEntryDto = {
  groupId:     number;
  entryNumber: number;
  createdAt:   string;           // ISO 8601
  type:        ChatEntryType;
  authorId:    number;
  authorName:   string;           // at time of entry
  targetId?:   number;           // present for most LOG entries
  targetName?:   string;          // at time of entry
  eventKey?:   ChatEventKey;     // present for LOG entries only
  content?:    string;           // present for ADM / GEN / MEM messages only
};

/** Input for a user-written message (ADM, GEN, or MEM). */
export type PostChatMessageInput = {
  groupId:  number;
  authorId: number;
  type:     Exclude<ChatEntryType, 'LOG'>; // LOG is backend-only
  content:  string;
};