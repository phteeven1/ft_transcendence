import { Injectable } from '@nestjs/common';
import { toApiVocabulary } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeVocabularyEntries } from './vocabulary-entry-rules';

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
    const entries = normalizeVocabularyEntries(words, meanings);
    const vocabulary = await this.prisma.vocabulary.create({
      data: {
        inGroupId: inGroup,
        byUserId: byUser,
        name,
        words: entries.words,
        meanings: entries.meanings,
        wordCount: entries.words.length,
      },
    });

    await this.ensureSoleVocabularyActive(inGroup);
    return toApiVocabulary(vocabulary);
  }

  async setActive(
    vocabularyId: number,
    inGroup: number,
  ): Promise<Vocabulary | undefined> {
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
    inGroup: number,
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: { name },
      });
      void inGroup;

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
    const entries = normalizeVocabularyEntries(words, meanings);
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: {
          words: entries.words,
          meanings: entries.meanings,
          wordCount: entries.words.length,
        },
      });
      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async remove(
    vocabularyId: number,
    inGroup: number,
  ): Promise<boolean> {
    try {
      await this.prisma.vocabulary.delete({ where: { id: vocabularyId } });
      await this.ensureSoleVocabularyActive(inGroup);
      return true;
    } catch {
      return false;
    }
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

  private async ensureSoleVocabularyActive(inGroup: number): Promise<void> {
    const remaining = await this.prisma.vocabulary.findMany({
      where: { inGroupId: inGroup },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (remaining.length !== 1) return;
    const sole = remaining[0];
    if (!sole) return;
    await this.prisma.group.update({
      where: { id: inGroup },
      data: { currentVocabularyId: sole.id },
    });
  }
}
