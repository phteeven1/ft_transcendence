export { getApiBaseUrl } from './config';
export { ApiError } from './errors';
export { apiRequest } from './http';

export { usersApi } from './users';
export { groupsApi } from './groups';
export { playersApi } from './players';
export { vocabulariesApi } from './vocabularies';
export { gamesApi, wordBuildingApi, wordSoupApi } from './games';
export { invitationsApi } from './invitations';
export { chatApi } from './chat';
export { healthApi } from './health';
export { progressionApi } from './progression';
export type {
  ChatEntryType,
  ChatEventKey,
  GroupChatEntryDto,
  PostChatMessageInput,
} from './chat';

export type { UserDto, RegisterUserInput, SignInUserInput } from './users';
export type {
  GroupDto,
  MemberDto,
  CreateGroupInput,
  GroupMemberActionInput,
  RenameGroupInput,
} from './groups';
export type {
  PlayerDto,
  PlayerSessionDto,
  CreatePlayerInput,
  RenamePlayerInput,
  UpdatePassPhraseInput,
  StartSessionInput,
  ValidateSessionInput,
  ValidateSessionResult,
} from './players';
export type {
  VocabularyDto,
  CreateVocabularyInput,
  SetActiveVocabularyInput,
  RenameVocabularyInput,
  UpdateVocabularyEntriesInput,
} from './vocabularies';
export type {
  GameDto,
  GameRosterPlayerDto,
  CreateGameInput,
  GameIdInput,
  GameIdPlayerIdInput,
  WordSoupCourtCell,
  WordSoupFoundWord,
  WordSoupDto,
  WordSoupFreezeNoticeDto,
  WordSoupGuessResultDto,
  WordSoupWordGuessedDto,
  ClueEntry,
  ICellLocksPayload,
  IGameStatePayload,
  IInitCourtResponse,
  ILockCellDto,
  IPlaceLetterDto,
} from './games';
export type {
  ValidateInvitationResult,
  SendInvitationInput,
  AcceptInvitationInput,
} from './invitations';
export type { HealthResponse, HealthCheckResult, HealthCheckStatus } from './health';
export type {
  AvatarTierDefinitionDto,
  EquipAvatarInput,
  GroupStatsResponseDto,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  PlayerGroupStatsDto,
  PlayerProgressionResponseDto,
  RecentGameEntryDto,
} from './progression';
export { AVATAR_TIERS } from './progression';
