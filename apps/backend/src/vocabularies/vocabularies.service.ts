import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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

function isPrismaUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

@Injectable()
export class VocabulariesService {
  constructor(private readonly prisma: PrismaService) {}

  async assertGroupMembership(userId: number, groupId: number): Promise<void> {
    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(groupId) ||
      groupId <= 0
    ) {
      throw new BadRequestException('userId and groupId are required.');
    }
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group.');
    }
  }

  async create(
    inGroup: number,
    byUser: number,
    name: string,
    words: string[] = [],
    meanings: string[] = [],
  ): Promise<Vocabulary | null> {
    const entries = normalizeVocabularyEntries(words, meanings);
    try {
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
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        return null;
      }
      throw error;
    }
  }

  async findOrCreate(
    inGroup: number,
    byUser: number,
    name: string,
    words: string[] = [],
    meanings: string[] = [],
  ): Promise<Vocabulary> {
    const existing = await this.prisma.vocabulary.findUnique({
      where: { inGroupId_name: { inGroupId: inGroup, name } },
    });
    if (existing) return toApiVocabulary(existing);

    const created = await this.create(inGroup, byUser, name, words, meanings);
    if (created) return created;

    const raced = await this.prisma.vocabulary.findUnique({
      where: { inGroupId_name: { inGroupId: inGroup, name } },
    });
    if (raced) return toApiVocabulary(raced);
    throw new Error('Failed to find or create vocabulary');
  }

  async setActive(
    vocabularyId: number,
    inGroup: number,
  ): Promise<Vocabulary | undefined> {
    const vocabulary = await this.requireVocabularyInGroup(
      vocabularyId,
      inGroup,
    );
    if (!vocabulary) return undefined;

    await this.prisma.group.update({
      where: { id: inGroup },
      data: { currentVocabularyId: vocabularyId },
    });

    return toApiVocabulary(vocabulary);
  }

  async rename(
    vocabularyId: number,
    name: string,
    inGroup: number,
  ): Promise<Vocabulary | null | undefined> {
    const existing = await this.requireVocabularyInGroup(vocabularyId, inGroup);
    if (!existing) return undefined;

    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: { name },
      });
      return toApiVocabulary(vocabulary);
    } catch (error) {
      if (isPrismaUniqueConstraint(error)) {
        return null;
      }
      throw error;
    }
  }

  async updateEntries(
    vocabularyId: number,
    inGroup: number,
    words: string[],
    meanings: string[],
  ): Promise<Vocabulary | undefined> {
    const existing = await this.requireVocabularyInGroup(vocabularyId, inGroup);
    if (!existing) return undefined;

    const entries = normalizeVocabularyEntries(words, meanings);
    const vocabulary = await this.prisma.vocabulary.update({
      where: { id: vocabularyId },
      data: {
        words: entries.words,
        meanings: entries.meanings,
        wordCount: entries.words.length,
      },
    });
    return toApiVocabulary(vocabulary);
  }

  async remove(vocabularyId: number, inGroup: number): Promise<boolean> {
    const existing = await this.requireVocabularyInGroup(vocabularyId, inGroup);
    if (!existing) return false;

    await this.prisma.vocabulary.delete({ where: { id: vocabularyId } });
    await this.ensureSoleVocabularyActive(inGroup);
    return true;
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

  private async requireVocabularyInGroup(
    vocabularyId: number,
    inGroup: number,
  ) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
    });
    if (!vocabulary) return undefined;
    if (vocabulary.inGroupId !== inGroup) {
      throw new ForbiddenException('Vocabulary does not belong to this group.');
    }
    return vocabulary;
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
