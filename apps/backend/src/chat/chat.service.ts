import { Injectable } from '@nestjs/common';
import { ChatEntryType, ChatEventKey } from '@ft-transcendence/database';
import { PrismaService } from '../prisma/prisma.service';
import { toApiChatEntry } from '../common/mappers';

export type GroupChatEntry = {
  groupId:     number;
  entryNumber: number;
  createdAt:   string;
  type:        ChatEntryType;
  authorId:    number;
  targetId?:   number;
  eventKey?:   ChatEventKey;
  content?:    string;
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Read ────────────────────────────────────────────────────────────────────

  async getEntriesForGroup(groupId: number): Promise<GroupChatEntry[]> {
    const entries = await this.prisma.groupChatEntry.findMany({
      where: { groupId },
      orderBy: { entryNumber: 'asc' },
    });
    return entries.map(toApiChatEntry);
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  /** Post a user-written message (ADM, GEN, or MEM). */
  async postMessage(
    groupId:  number,
    authorId: number,
    type:     Exclude<ChatEntryType, 'LOG'>,
    content:  string,
  ): Promise<GroupChatEntry> {
    return this.createEntry({ groupId, authorId, type, content });
  }

  /**
   * Append a LOG entry for a group event.
   * Called internally by other services (GroupsService, VocabulariesService, etc.)
   * when a significant action occurs.
   */
  async logEvent(
    groupId:  number,
    authorId: number,
    eventKey: ChatEventKey,
    targetId?: number,
  ): Promise<GroupChatEntry> {
    return this.createEntry({ groupId, authorId, type: 'LOG', eventKey, targetId });
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  /**
   * Insert a new entry with the next per-group entryNumber.
   * Runs inside a transaction to prevent duplicate entryNumbers under
   * concurrent writes (two users posting to the same group at the same time).
   */
  private async createEntry(data: {
    groupId:   number;
    authorId:  number;
    type:      ChatEntryType;
    eventKey?: ChatEventKey;
    targetId?: number;
    content?:  string;
  }): Promise<GroupChatEntry> {
    const entry = await this.prisma.$transaction(async (tx) => {
      const last = await tx.groupChatEntry.findFirst({
        where:   { groupId: data.groupId },
        orderBy: { entryNumber: 'desc' },
      });

      const entryNumber = last ? last.entryNumber + 1 : 1;

      return tx.groupChatEntry.create({
        data: {
          groupId:     data.groupId,
          entryNumber,
          type:        data.type,
          authorId:    data.authorId,
          eventKey:    data.eventKey ?? null,
          targetId:    data.targetId ?? null,
          content:     data.content ?? null,
        },
      });
    });

    return toApiChatEntry(entry);
  }
}