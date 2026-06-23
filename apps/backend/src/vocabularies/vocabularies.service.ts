import { Injectable } from '@nestjs/common';
import { toApiVocabulary } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

export type Vocabulary = {
  id: number;
  inGroup: number;
  byUser: number;
  name: string;
  words: string[];
  meanings: string[];
  wordCount: number;
};

@Injectable()
export class VocabulariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    inGroup: number,
    byUser: number,
    name: string,
    words: string[] = [],
    meanings: string[] = [],
  ): Promise<Vocabulary> {
    const vocabulary = await this.prisma.vocabulary.create({
      data: {
        inGroupId: inGroup,
        byUserId: byUser,
        name,
        words,
        meanings,
        wordCount: words.length,
      },
    });
    return toApiVocabulary(vocabulary);
  }

  async setActive(vocabularyId: number, inGroup: number): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.findUnique({
        where: { id: vocabularyId },
      });
      if (!vocabulary) return undefined;
      await this.prisma.group.update({
        where: { id: inGroup },
        data: { currentVocabularyId: vocabularyId },
      });
      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async rename(
    vocabularyId: number,
    name: string,
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: { name },
      });
      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async updateEntries(
    vocabularyId: number,
    words: string[],
    meanings: string[],
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: { words, meanings, wordCount: words.length },
      });
      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async remove(vocabularyId: number): Promise<boolean> {
    try {
      await this.prisma.vocabulary.delete({ where: { id: vocabularyId } });
      return true;
    } catch {
      return false;
    }
  }

  async removeByGroup(inGroup: number): Promise<void> {
    await this.prisma.vocabulary.deleteMany({ where: { inGroupId: inGroup } });
  }

  async findById(vocabularyId: number): Promise<Vocabulary | undefined> {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
    });
    return vocabulary ? toApiVocabulary(vocabulary) : undefined;
  }

  async findByGroup(inGroup: number): Promise<Vocabulary[]> {
    const vocabularies = await this.prisma.vocabulary.findMany({
      where: { inGroupId: inGroup },
    });
    return vocabularies.map(toApiVocabulary);
  }
}
