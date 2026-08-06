export { gamesApi } from './games.api';
export { wordBuildingApi } from './word-building.api';
export { wordSoupApi } from './word-soup';
export type {
  GameDto,
  GameRosterPlayerDto,
  CreateGameInput,
  GameIdInput,
  GameIdPlayerIdInput,
} from './types';

export type { 
  WordSoupCourtCell,
  WordSoupFoundWord,
  WordSoupDto,
  WordSoupFreezeNoticeDto,
  WordSoupGuessResultDto,
  WordSoupWordGuessedDto
 } from './word-soup/types';

export type {
  ClueEntry,
  ICellLocksPayload,
  IGameStatePayload,
  IInitCourtResponse,
  ILockCellDto,
  IPlaceLetterDto,
} from './word-building.types';

