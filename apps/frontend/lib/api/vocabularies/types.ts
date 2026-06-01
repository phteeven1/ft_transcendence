/** Matches backend JSON (`isCurrent`, not `isActive`). */
export type VocabularyDto = {
  id: number;
  inGroup: number;
  byUser: number;
  name: string;
  isCurrent: boolean;
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
  vocabularyId: number;
  vocabularyInGroup: number;
};

export type RenameVocabularyInput = {
  vocabularyId: number;
  vocabularyName: string;
};

export type UpdateVocabularyEntriesInput = {
  vocabularyId: number;
  vocabularyWords: string[];
  vocabularyMeanings: string[];
};
