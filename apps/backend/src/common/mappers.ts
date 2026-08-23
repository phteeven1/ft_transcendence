import {
  Game as DbGame,
  Group as DbGroup,
  GroupMembership,
  GroupRole,
  Player as DbPlayer,
  PlayerSession as DbPlayerSession,
  User as DbUser,
  Vocabulary as DbVocabulary,
} from '@ft-transcendence/database';
import type { Game } from '../games/games.service';
import type { Group } from '../groups/groups.service';
import type { Player } from '../players/players.service';
import type { User } from '../users/users.service';
import type { Vocabulary } from '../vocabularies/vocabularies.service';

type UserWithMemberships = DbUser & { memberships: GroupMembership[] };
type GroupWithMemberships = DbGroup & { memberships: GroupMembership[] };
type GameWithPlayers = DbGame & {
  gamePlayers: { playerId: number; leftAt?: Date | null }[];
};
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
    email: user.email,
    isMemberOf,
    isAdminOf,
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

export function toSafePlayer(player: PlayerWithSession): Player {
  return {
    id: player.id,
    inGroup: player.inGroupId,
    ofUser: player.ofUserId,
    name: player.name,
    currentGameId: player.currentGameId,
    sessionExpiresAt: player.session?.expiresAt.toISOString() ?? null,
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
    // Active roster only — early leavers keep a GamePlayer row (leftAt) for
    // scores / progression but are no longer "in" the match.
    players: game.gamePlayers
      .filter((gp) => gp.leftAt == null)
      .map((gp) => gp.playerId),
    isActive: game.isActive,
    isFinished: game.isFinished,
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
