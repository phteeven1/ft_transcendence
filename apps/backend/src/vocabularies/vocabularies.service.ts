import { Injectable } from '@nestjs/common';

export type Vocabulary = {
  vocabularyId: number;
  vocabularyInGroup: number;
  vocabularyAuthor: number;
  vocabularyName: string;
  isCurrent: boolean;
  vocabularyWords: string[];
  vocabularyMeanings: string[];
  vocabularyCount: number;
};

@Injectable()
export class VocabulariesService {
  private vocabularies: Vocabulary[] = [];
  private nextId = 1;

  create(
    vocabularyInGroup: number,
    vocabularyAuthor: number,
    vocabularyName: string,
    vocabularyWords: string[] = [],
    vocabularyMeanings: string[] = [],
    ): Vocabulary {
    const newVocabulary: Vocabulary = {
        vocabularyId: this.nextId++,
        vocabularyInGroup: Number(vocabularyInGroup),
        vocabularyAuthor: Number(vocabularyAuthor),
        vocabularyName,
        isCurrent: false,
        vocabularyWords,
        vocabularyMeanings,
        vocabularyCount: vocabularyWords.length,
    };
    this.vocabularies.push(newVocabulary);
    return newVocabulary;
    }

  setActive(vocabularyId: number, vocabularyInGroup: number): Vocabulary | undefined {
    const vId = Number(vocabularyId);
    const gId = Number(vocabularyInGroup);
    // Set all vocabularies in group to inactive
    this.vocabularies
      .filter(v => v.vocabularyInGroup === gId)
      .forEach(v => { v.isCurrent = false; });
    // Set selected vocabulary to active
    const vocabulary = this.vocabularies.find(v => v.vocabularyId === vId);
    if (!vocabulary) return undefined;
    vocabulary.isCurrent = true;
    return vocabulary;
  }

  rename(vocabularyId: number, vocabularyName: string): Vocabulary | undefined {
    const vocabulary = this.vocabularies.find(v => v.vocabularyId === Number(vocabularyId));
    if (!vocabulary) return undefined;
    vocabulary.vocabularyName = vocabularyName;
    return vocabulary;
  }

  remove(vocabularyId: number): boolean {
    const index = this.vocabularies.findIndex(v => v.vocabularyId === Number(vocabularyId));
    if (index === -1) return false;
    this.vocabularies.splice(index, 1);
    return true;
  }

  removeByGroup(vocabularyInGroup: number): void {
    this.vocabularies = this.vocabularies.filter(
      v => v.vocabularyInGroup !== Number(vocabularyInGroup)
    );
  }

  findById(vocabularyId: number): Vocabulary | undefined {
    return this.vocabularies.find(v => v.vocabularyId === Number(vocabularyId));
  }

  findByGroup(vocabularyInGroup: number): Vocabulary[] {
    return this.vocabularies.filter(
      v => v.vocabularyInGroup === Number(vocabularyInGroup)
    );
  }
}