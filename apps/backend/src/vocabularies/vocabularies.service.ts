import { Injectable } from '@nestjs/common';
import { toApiVocabulary } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';

export type Vocabulary = {
  id:       number;
  inGroup:  number;
  byUser:   number;
  name:     string;
  words:    string[];
  meanings: string[];
  wordCount: number;
};

@Injectable()
export class VocabulariesService {
  constructor(
    private readonly prisma:       PrismaService,
    private readonly chatService:  ChatService,
  ) {}

  async create(
    inGroup:   number,
    byUser:    number,
    name:      string,
    words:     string[] = [],
    meanings:  string[] = [],
  ): Promise<Vocabulary> {
    const vocabulary = await this.prisma.vocabulary.create({
      data: {
        inGroupId: inGroup,
        byUserId:  byUser,
        name,
        words,
        meanings,
        wordCount: words.length,
      },
    });

    await this.chatService.logEvent(
      inGroup,
      byUser,
      'UPLOAD_VOCABULARY',
      vocabulary.id,
      vocabulary.name,
    );

    return toApiVocabulary(vocabulary);
  }

  async setActive(
    vocabularyId: number,
    inGroup:      number,
    authorId:     number,
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.findUnique({
        where: { id: vocabularyId },
      });
      if (!vocabulary) return undefined;

      await this.prisma.group.update({
        where: { id: inGroup },
        data:  { currentVocabularyId: vocabularyId },
      });

      await this.chatService.logEvent(
        inGroup,
        authorId,
        'SET_ACTIVE_VOCABULARY',
        vocabularyId,
        vocabulary.name,
      );

      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async rename(
    vocabularyId: number,
    name:         string,
    inGroup:      number,
    authorId:     number,
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data:  { name },
      });

      // Store new name in content, same pattern as RENAME_GROUP
      await this.chatService.logEvent(
        inGroup,
        authorId,
        'RENAME_VOCABULARY',
        vocabularyId,
        name,
      );

      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async updateEntries(
    vocabularyId: number,
    words:        string[],
    meanings:     string[],
  ): Promise<Vocabulary | undefined> {
    try {
      const vocabulary = await this.prisma.vocabulary.update({
        where: { id: vocabularyId },
        data:  { words, meanings, wordCount: words.length },
      });
      return toApiVocabulary(vocabulary);
    } catch {
      return undefined;
    }
  }

  async remove(
    vocabularyId: number,
    inGroup:      number,
    authorId:     number,
  ): Promise<boolean> {
    try {
      // Fetch name before deletion so it can be stored in the log entry
      const vocabulary = await this.prisma.vocabulary.findUnique({
        where: { id: vocabularyId },
      });

      await this.prisma.vocabulary.delete({ where: { id: vocabularyId } });

      await this.chatService.logEvent(
        inGroup,
        authorId,
        'DELETE_VOCABULARY',
        vocabularyId,
        vocabulary?.name,
      );

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
