import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatEntryType,
  ChatEventKey,
  GroupRole,
  Prisma,
} from '@ft-transcendence/database';
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

const MAX_MESSAGE_LENGTH = 300;

/** Entry types returned to non-admin group members. */
const MEMBER_VISIBLE_TYPES: ChatEntryType[] = ['LOG', 'GEN'];

const CREATE_ENTRY_MAX_ATTEMPTS = 3;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Read ────────────────────────────────────────────────────────────────────

  async getEntriesForGroup(
    groupId: number,
    userId: number,
  ): Promise<GroupChatEntry[]> {
    await this.requireGroupExists(groupId);
    const role = await this.requireMembership(userId, groupId);

    const entries = await this.prisma.groupChatEntry.findMany({
      where: {
        groupId,
        ...(role === GroupRole.ADMIN
          ? {}
          : { type: { in: MEMBER_VISIBLE_TYPES } }),
      },
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
    await this.requireGroupExists(groupId);
    const role = await this.requireMembership(authorId, groupId);
    const trimmed = content.trim();

    if (!trimmed) {
      throw new BadRequestException('Message content cannot be empty');
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    if (type === 'ADM' || type === 'GEN') {
      if (role !== GroupRole.ADMIN) {
        throw new ForbiddenException('Only admins can post this message type');
      }
    } else if (type === 'MEM') {
      if (role !== GroupRole.MEMBER) {
        throw new ForbiddenException('Only members can post this message type');
      }
    }

    const authorName = await this.resolveUserName(authorId);
    return this.createEntry({
      groupId,
      authorId,
      authorName,
      type,
      content: trimmed,
    });
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

  private async requireGroupExists(groupId: number): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
  }

  private async requireMembership(
    userId: number,
    groupId: number,
  ): Promise<GroupRole> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { role: true },
    });
    if (!membership) {
      throw new ForbiddenException('User is not a member of this group');
    }
    return membership.role;
  }

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
   * Uses a per-group advisory lock inside the transaction so concurrent writers
   * cannot allocate the same entryNumber. Retries on unique-constraint conflicts
   * as a fallback.
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
    for (let attempt = 1; attempt <= CREATE_ENTRY_MAX_ATTEMPTS; attempt++) {
      try {
        const entry = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(${data.groupId})`,
          );

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
      } catch (error) {
        if (
          attempt < CREATE_ENTRY_MAX_ATTEMPTS &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to allocate chat entry number');
  }
}
