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
  authorName:  string;
  targetId?:   number;
  targetName?: string;
  eventKey?:   ChatEventKey;
  content?:    string;
};

const USER_TARGET_EVENTS = new Set<ChatEventKey>([
  'PROMOTE_ADMIN',
  'EXPEL_MEMBER',
]);

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
    const authorName = await this.resolveUserName(authorId);
    return this.createEntry({ groupId, authorId, authorName, type, content });
  }

  /**
   * Append a LOG entry for a group event.
   * Called internally by other services (GroupsService, VocabulariesService, etc.)
   * when a significant action occurs.
   * authorName is always resolved from the DB at write time.
   * targetName is only resolved as a user name for events where the target is a user
   * (PROMOTE_ADMIN, EXPEL_MEMBER). For vocabulary events, the name comes through content.
   */

  async logEvent(
    groupId:   number,
    authorId:  number,
    eventKey:  ChatEventKey,
    targetId?: number,
    content?:  string,
  ): Promise<GroupChatEntry> {
    const authorName = await this.resolveUserName(authorId);
    const targetName = targetId && USER_TARGET_EVENTS.has(eventKey)
      ? await this.resolveUserName(targetId)
      : undefined;
    return this.createEntry({
      groupId,
      authorId,
      authorName,
      type: 'LOG',
      eventKey,
      targetId,
      targetName,
      content,
    });
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  /**
   * Look up a user's current name from the DB.
   * Falls back to 'Unknown User' if the user no longer exists.
   */
  private async resolveUserName(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? 'Unknown User';
  }

  /**
   * Insert a new entry with the next per-group entryNumber.
   * Runs inside a transaction to prevent duplicate entryNumbers under
   * concurrent writes (two users posting to the same group at the same time).
   */
  private async createEntry(data: {
    groupId:    number;
    authorId:   number;
    authorName: string;
    type:       ChatEntryType;
    eventKey?:  ChatEventKey;
    targetId?:  number;
    targetName?: string;
    content?:   string;
  }): Promise<GroupChatEntry> {
    const entry = await this.prisma.$transaction(async (tx) => {
      const last = await tx.groupChatEntry.findFirst({
        where:   { groupId: data.groupId },
        orderBy: { entryNumber: 'desc' },
      });

      const entryNumber = last ? last.entryNumber + 1 : 1;

      return tx.groupChatEntry.create({
        data: {
          groupId:    data.groupId,
          entryNumber,
          type:       data.type,
          authorId:   data.authorId,
          authorName: data.authorName,
          eventKey:   data.eventKey   ?? null,
          targetId:   data.targetId   ?? null,
          targetName: data.targetName ?? null,
          content:    data.content    ?? null,
        },
      });
    });

    return toApiChatEntry(entry);
  }
}
