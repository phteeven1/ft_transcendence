import { Injectable } from '@nestjs/common';

export type Vocabulary = {
  id: number;
  inGroup: number;
  byUser: number;
  name: string;
  isCurrent: boolean;
  words: string[];
  meanings: string[];
  wordCount: number;
};

@Injectable()
export class VocabulariesService {
  private vocabularies: Vocabulary[] = [];
  private nextId = 1;

  create(
    inGroup: number,
    byUser: number,
    name: string,
    words: string[] = [],
    meanings: string[] = [],
    ): Vocabulary {
    const newVocabulary: Vocabulary = {
        id: this.nextId++,
        inGroup: Number(inGroup),
        byUser: Number(byUser),
        name,
        isCurrent: false,
        words,
        meanings,
        wordCount: words.length,
    };
    this.vocabularies.push(newVocabulary);
    return newVocabulary;
    }

  setActive(vocabularyId: number, inGroup: number): Vocabulary | undefined {
    const vId = Number(vocabularyId);
    const gId = Number(inGroup);
    // Set all vocabularies in group to inactive
    this.vocabularies
      .filter(v => v.inGroup === gId)
      .forEach(v => { v.isCurrent = false; });
    // Set selected vocabulary to active
    const vocabulary = this.vocabularies.find(v => v.id === vId);
    if (!vocabulary) return undefined;
    vocabulary.isCurrent = true;
    return vocabulary;
  }

  rename(vocabularyId: number, name: string): Vocabulary | undefined {
    const vocabulary = this.vocabularies.find(v => v.id === Number(vocabularyId));
    if (!vocabulary) return undefined;
    vocabulary.name = name;
    return vocabulary;
  }

  updateEntries(vocabularyId: number, words: string[], meanings: string[]): Vocabulary | undefined {
    const vocabulary = this.vocabularies.find(v => v.id === Number(vocabularyId));
    if (!vocabulary) return undefined;
    vocabulary.words = words;
    vocabulary.meanings = meanings;
    vocabulary.wordCount = words.length;
    return vocabulary;
  }

  remove(vocabularyId: number): boolean {
    const index = this.vocabularies.findIndex(v => v.id === Number(vocabularyId));
    if (index === -1) return false;
    this.vocabularies.splice(index, 1);
    return true;
  }

  removeByGroup(inGroup: number): void {
    this.vocabularies = this.vocabularies.filter(
      v => v.inGroup !== Number(inGroup)
    );
  }

  findById(vocabularyId: number): Vocabulary | undefined {
    return this.vocabularies.find(v => v.id === Number(vocabularyId));
  }

  findByGroup(inGroup: number): Vocabulary[] {
    return this.vocabularies.filter(
      v => v.inGroup === Number(inGroup)
    );
  }
}