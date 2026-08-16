export { ApiError } from './errors';

export { usersApi } from './users';
export { groupsApi } from './groups';
export { playersApi } from './players';
export { vocabulariesApi } from './vocabularies';
export { gamesApi, wordBuildingApi, wordSoupApi } from './games';
export { invitationsApi } from './invitations';
export { progressionApi } from './progression';

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
