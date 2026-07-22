/**
 * UI-facing type aliases for API DTOs.
 * Pages/components import from here; HTTP details live in lib/api/.
 */
export type { UserDto as User } from '@/lib/api/users/types';
export type { GroupDto as Group } from '@/lib/api/groups/types';
export type { MemberDto as Member } from '@/lib/api/groups/types';
export type { PlayerDto as Player } from '@/lib/api/players/types';
export type { VocabularyDto as Vocabulary } from '@/lib/api/vocabularies/types';
export type { GameDto as Game } from '@/lib/api/games/types';

export type { WordSoup } from '@/lib/api/games/word-soup/types';
export type WordSoupGameState = import('@/lib/api/games/word-soup/types').WordSoup.GameStateDto;
export type WordSoupGuessed = import('@/lib/api/games/word-soup/types').WordSoup.WordGuessedDto;
export type WordSoupFreezeNotice = import('@/lib/api/games/word-soup/types').WordSoup.FreezeNoticeDto;
export type WordSoupFoundWord = import('@/lib/api/games/word-soup/types').WordSoup.FoundWord;
export type WordSoupCourtCell = import('@/lib/api/games/word-soup/types').WordSoup.CourtCell;
