export type VocabularyDto = {
  id: number;
  inGroup: number;
  byUser: number;
  name: string;
  words: string[];
  meanings: string[];
  wordCount: number;
};

export type CreateVocabularyInput = {
  vocabularyInGroup: number;
  byUser: number;
  vocabularyName: string;
  vocabularyWords?: string[];
  vocabularyMeanings?: string[];
};

export type SetActiveVocabularyInput = {
  vocabularyId:      number;
  vocabularyInGroup: number;
};

export type RenameVocabularyInput = {
  vocabularyId:      number;
  vocabularyName:    string;
  vocabularyInGroup: number;
};

export type RemoveVocabularyInput = {
  vocabularyId:      number;
  vocabularyInGroup: number;
};

export type UpdateVocabularyEntriesInput = {
  vocabularyId: number;
  vocabularyInGroup: number;
  vocabularyWords: string[];
  vocabularyMeanings: string[];
};

export const MAX_EXTRACT_FILE_MB = 10;
export const MAX_EXTRACT_FILE_BYTES = MAX_EXTRACT_FILE_MB * 1024 * 1024;

export type ExtractionErrorCode =
  | 'UNSUPPORTED_FILE_TYPE'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_AI_RESPONSE'
  | 'EXTRACTION_FAILED'
  | 'OPENAI_NOT_CONFIGURED'
  | 'TOO_FEW_WORDS';

export type ExtractVocabularyResult =
  | { success: true; title: string; words: string[]; meanings: string[] }
  | {
      success: false;
      code: ExtractionErrorCode;
      extractedCount?: number;
    };
