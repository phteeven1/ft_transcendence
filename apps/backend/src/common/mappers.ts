import {
  Game as DbGame,
  Group as DbGroup,
  GroupMembership,
  GroupRole,
  Invitation as DbInvitation,
  Player as DbPlayer,
  PlayerSession as DbPlayerSession,
  User as DbUser,
  Vocabulary as DbVocabulary,
  GroupChatEntry as DbGroupChatEntry,
} from '@ft-transcendence/database';
import type { Game } from '../games/games.service';
import type { Group } from '../groups/groups.service';
import type { Invitation } from '../invitations/invitations.service';
import type { Player } from '../players/players.service';
import type { User } from '../users/users.service';
import type { Vocabulary } from '../vocabularies/vocabularies.service';
import type { GroupChatEntry } from '../chat/chat.service';

type UserWithMemberships = DbUser & { memberships: GroupMembership[] };
type GroupWithMemberships = DbGroup & { memberships: GroupMembership[] };
type GameWithPlayers = DbGame & { gamePlayers: { playerId: number }[] };
type PlayerWithSession = DbPlayer & { session: DbPlayerSession | null };

export function toApiUser(user: UserWithMemberships): User {
  const isMemberOf: number[] = [];
  const isAdminOf: number[] = [];
  for (const m of user.memberships) {
    if (m.role === GroupRole.ADMIN) isAdminOf.push(m.groupId);
    else isMemberOf.push(m.groupId);
  }
  return {
    id: user.id,
    name: user.name,
    password: user.password,
    email: user.email,
    isMemberOf,
    isAdminOf,
    realName: user.realName ?? undefined,
    relationshipComment: user.relationshipComment ?? undefined,
    showRealName: user.showRealName,
    showEmail: user.showEmail,
    showRelationshipComment: user.showRelationshipComment,
    ...(user.currentGroupId != null
      ? { currentGroup: user.currentGroupId }
      : {}),
  };
}

export function toApiGroup(group: GroupWithMemberships): Group {
  const admins: number[] = [];
  const members: number[] = [];
  for (const m of group.memberships) {
    if (m.role === GroupRole.ADMIN) admins.push(m.userId);
    else members.push(m.userId);
  }
  return {
    id: group.id,
    name: group.name,
    admins,
    members,
    ...(group.currentVocabularyId != null
      ? { currentVocabulary: group.currentVocabularyId }
      : {}),
  };
}

export function toSafePlayer(player: PlayerWithSession): Omit<Player, 'passAnswer'> {
  const { passAnswer: _, inGroupId, ofUserId, session, ...rest } = player;
  return {
    ...rest,
    inGroup: inGroupId,
    ofUser: ofUserId,
    lastSignout: player.lastSignout.toISOString(),
    sessionExpiresAt: session?.expiresAt.toISOString() ?? null,
  };
}

export function toApiVocabulary(vocabulary: DbVocabulary): Vocabulary {
  return {
    id: vocabulary.id,
    inGroup: vocabulary.inGroupId,
    byUser: vocabulary.byUserId,
    name: vocabulary.name,
    words: vocabulary.words,
    meanings: vocabulary.meanings,
    wordCount: vocabulary.wordCount,
  };
}

export function toApiGame(game: GameWithPlayers): Game {
  return {
    id: game.id,
    name: game.name,
    inGroup: game.inGroupId,
    initiatedBy: game.initiatedById,
    initiatedTime: game.initiatedTime,
    startedTime: game.startedTime,
    players: game.gamePlayers.map((gp) => gp.playerId),
    isActive: game.isActive,
    isFinished: game.isFinished,
  };
}

export function toApiInvitation(invitation: DbInvitation): Invitation {
  return {
    token: invitation.token,
    groupId: invitation.groupId,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    used: invitation.used,
  };
}

export const groupWithMemberships = {
  include: { memberships: true },
} as const;

export const userWithMemberships = {
  include: { memberships: true },
} as const;

export const gameWithPlayers = {
  include: { gamePlayers: true },
} as const;

export const playerWithSession = {
  include: { session: true },
} as const;

export function toApiChatEntry(entry: DbGroupChatEntry): GroupChatEntry {
  return {
    groupId:     entry.groupId,
    entryNumber: entry.entryNumber,
    createdAt:   entry.createdAt.toISOString(),
    type:        entry.type,
    authorId:    entry.authorId,
    authorName:  entry.authorName ?? 'Unknown User',
    targetId:    entry.targetId   ?? undefined,
    targetName:  entry.targetName ?? undefined,
    eventKey:    entry.eventKey   ?? undefined,
    content:     entry.content    ?? undefined,
  };
}