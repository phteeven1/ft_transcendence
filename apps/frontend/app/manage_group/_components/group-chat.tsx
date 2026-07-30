'use client';
/*
  Group Chat panel — displayed inside ActionWindow under the 'Group Chat' tab.

  Shows a scrollable, chronological log of chat entries for the current group.
  Entries can be filtered by type using the toggle buttons at the top.

  LOG entries are rendered from structured fields (eventKey + authorName + targetName).
  ADM / GEN / MEM entries display the author name and message content.

  Author and target names are stored at write time in the DB, so they remain
  correct even after a user leaves the group. If the user is still a member,
  their name is rendered normally. If they have left, it is italicized.

  Visibility rules:
  - Admins see all four types (LOG, ADM, GEN, MEM) and all four filter buttons.
  - Non-admins see only LOG and GEN entries and only those two filter buttons.

  Chat entries are fetched and refreshed by manage_group/page.tsx on its 5s polling
  cycle and passed down as a prop — no separate fetch or polling here.
*/

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ChatEntryType, GroupChatEntryDto } from '@/lib/api/chat';
import type { Member } from '../../types';
import { Chip, Panel } from '../../components/ui';

// ─── Log entry rendering ──────────────────────────────────────────────────────

const EVENT_KEY_TO_I18N: Record<string, string> = {
  CREATE_GROUP: 'createGroup',
  JOIN_GROUP: 'joinGroup',
  LEAVE_GROUP: 'leaveGroup',
  PROMOTE_ADMIN: 'promoteAdmin',
  RESIGN_ADMIN: 'resignAdmin',
  RENAME_GROUP: 'renameGroup',
  EXPEL_MEMBER: 'expelMember',
  DELETE_GROUP: 'deleteGroup',
  UPLOAD_VOCABULARY: 'uploadVocabulary',
  SET_ACTIVE_VOCABULARY: 'setActiveVocabulary',
  RENAME_VOCABULARY: 'renameVocabulary',
  DELETE_VOCABULARY: 'deleteVocabulary',
  SEND_INVITE: 'sendInvite',
};

/**
 * Converts a LOG entry's eventKey into a human-readable sentence.
 * authorEl and targetEl are pre-rendered spans (normal or italic).
 */
function renderLogSentence(
  entry: GroupChatEntryDto,
  authorEl: React.ReactNode,
  targetEl: React.ReactNode,
  t: ReturnType<typeof useTranslations>,
): React.ReactNode {
  const content = entry.content ?? '?';
  const i18nKey = EVENT_KEY_TO_I18N[entry.eventKey ?? ''] ?? 'unknown';
  const key = `logEvents.${i18nKey}` as const;

  const authorTag = () => authorEl;
  const targetTag = () => targetEl;

  if (entry.eventKey === 'PROMOTE_ADMIN' || entry.eventKey === 'EXPEL_MEMBER') {
    return t.rich(key, {
      author: authorTag,
      target: targetTag,
    });
  }

  if (
    entry.eventKey === 'RENAME_GROUP' ||
    entry.eventKey === 'UPLOAD_VOCABULARY' ||
    entry.eventKey === 'SET_ACTIVE_VOCABULARY' ||
    entry.eventKey === 'RENAME_VOCABULARY' ||
    entry.eventKey === 'DELETE_VOCABULARY'
  ) {
    return t.rich(key, {
      author: authorTag,
      content,
    });
  }

  return t.rich(key, {
    author: authorTag,
  });
}

// ─── Timestamp formatting ─────────────────────────────────────────────────────

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  const hh   = String(date.getHours()).padStart(2, '0');
  const min  = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}|${hh}:${min}`;
}

const TYPE_COLOURS: Record<ChatEntryType, { active: string; inactive: string }> = {
  LOG: { active: 'bg-foreground text-background', inactive: 'clay-chip-inactive' },
  ADM: { active: 'bg-destructive text-on-primary border-destructive', inactive: 'clay-chip-inactive' },
  GEN: { active: 'bg-primary text-on-primary border-primary', inactive: 'clay-chip-inactive' },
  MEM: { active: 'bg-secondary text-foreground border-border-dark', inactive: 'clay-chip-inactive' },
};

// Types visible to admins vs members
const ADMIN_TYPES: ChatEntryType[] = ['LOG', 'ADM', 'GEN', 'MEM'];
const MEMBER_TYPES: ChatEntryType[] = ['LOG', 'GEN'];

const FILTER_KEYS: Record<ChatEntryType, 'log' | 'adm' | 'gen' | 'mem'> = {
  LOG: 'log',
  ADM: 'adm',
  GEN: 'gen',
  MEM: 'mem',
};

// ─── Single chat entry row ────────────────────────────────────────────────────

function ChatEntryRow({
  entry,
  memberIds,
}: {
  entry: GroupChatEntryDto;
  memberIds: Set<number>;
}) {
  const t = useTranslations('chat');
  const colours = TYPE_COLOURS[entry.type];
  const isLog   = entry.type === 'LOG';

  // Render a name — italic if the user is no longer a member
  function nameEl(id: number, name: string): React.ReactNode {
    const isCurrent = memberIds.has(id);
    return isCurrent
      ? <span className="font-semibold">{name}</span>
      : <span className="font-semibold italic text-muted-foreground">{name}</span>;
  }

  const authorEl = nameEl(entry.authorId, entry.authorName);
  const targetEl = entry.targetId !== undefined && entry.targetName
    ? nameEl(entry.targetId, entry.targetName)
    : null;

  return (
    <div className="flex items-start gap-2 py-1 text-sm font-mono">
      {/* Timestamp */}
      <span className="text-muted-foreground shrink-0">{formatTimestamp(entry.createdAt)}</span>

      {/* Type badge */}
      <span className={`shrink-0 rounded px-1 text-xs font-bold ${colours.active}`}>
        {t(`filters.${FILTER_KEYS[entry.type]}`)}
      </span>

      {/* Content */}
      {isLog ? (
        <span className="text-foreground">
          {renderLogSentence(entry, authorEl, targetEl, t)}
        </span>
      ) : (
        <span className="text-foreground">
          {authorEl}{': '}
          {entry.content}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  members:     Member[];
  chatEntries: GroupChatEntryDto[];
  isAdmin:     boolean;
};

export default function GroupChat({ members, chatEntries, isAdmin }: Props) {
  const t = useTranslations('chat');
  const visibleTypes = isAdmin ? ADMIN_TYPES : MEMBER_TYPES;

  const [activeFilters, setFilters] = useState<Set<ChatEntryType>>(
    new Set(visibleTypes),
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Set of ids of current members — used to decide italic vs normal rendering
  const memberIds = new Set<number>(members.map((m) => m.id));

  // ── Scroll to bottom when entries update ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatEntries]);

  // ── Filter toggle ───────────────────────────────────────────────────────────
  function toggleFilter(type: ChatEntryType) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // Entries are filtered by both role visibility and active filter toggles
  const visibleEntries = chatEntries.filter(
    (e) => visibleTypes.includes(e.type) && activeFilters.has(e.type),
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">

      {/* Filter toggles — only show types the current user is allowed to see */}
      <div className="flex gap-2">
        {visibleTypes.map((type) => {
          const isActive = activeFilters.has(type);
          const colours  = TYPE_COLOURS[type];
          return (
            <Chip
              key={type}
              active={isActive}
              onClick={() => toggleFilter(type)}
              className={isActive ? colours.active : colours.inactive}
            >
              {t(`filters.${FILTER_KEYS[type]}`)}
            </Chip>
          );
        })}
      </div>

      {/* Chat scroll area */}
      <Panel className="h-48 overflow-y-auto p-2 bg-muted">
        {visibleEntries.length === 0 && (
          <p className="text-sm text-muted-foreground italic">{t('noEntries')}</p>
        )}
        {visibleEntries.map((entry) => (
          <ChatEntryRow
            key={`${entry.groupId}-${entry.entryNumber}`}
            entry={entry}
            memberIds={memberIds}
          />
        ))}
        <div ref={bottomRef} />
      </Panel>

    </div>
  );
}
