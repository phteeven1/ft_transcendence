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
  authorId:          number;
};

export type RenameVocabularyInput = {
  vocabularyId:      number;
  vocabularyName:    string;
  vocabularyInGroup: number;
  authorId:          number;
};

export type RemoveVocabularyInput = {
  vocabularyId:      number;
  vocabularyInGroup: number;
  authorId:          number;
};

export type UpdateVocabularyEntriesInput = {
  vocabularyId: number;
  vocabularyWords: string[];
  vocabularyMeanings: string[];
};

export type ExtractVocabularyResult = {
  title: string;
  words: string[];
  meanings: string[];
};
