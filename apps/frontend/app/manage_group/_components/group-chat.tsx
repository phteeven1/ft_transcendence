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
import type { ChatEntryType, GroupChatEntryDto } from '@/lib/api/chat';
import type { Member } from '../../types';

// ─── Log entry rendering ──────────────────────────────────────────────────────

/**
 * Converts a LOG entry's eventKey into a human-readable sentence.
 * authorEl and targetEl are pre-rendered spans (normal or italic).
 */
function renderLogSentence(
  entry: GroupChatEntryDto,
  authorEl: React.ReactNode,
  targetEl: React.ReactNode,
): React.ReactNode {
  switch (entry.eventKey) {
    case 'CREATE_GROUP':          return <>{authorEl} created the group</>;
    case 'JOIN_GROUP':            return <>{authorEl} joined the group</>;
    case 'LEAVE_GROUP':           return <>{authorEl} left the group</>;
    case 'PROMOTE_ADMIN':         return <>{authorEl} promoted {targetEl} to Admin</>;
    case 'RESIGN_ADMIN':          return <>{authorEl} resigned as Admin</>;
    case 'RENAME_GROUP':          return <>{authorEl} renamed the group to &quot;{entry.content ?? '?'}&quot;</>;
    case 'EXPEL_MEMBER':          return <>{authorEl} expelled {targetEl}</>;
    case 'DELETE_GROUP':          return <>{authorEl} deleted the group</>;
    case 'UPLOAD_VOCABULARY':     return <>{authorEl} uploaded vocabulary &quot;{entry.content ?? '?'}&quot;</>;
    case 'SET_ACTIVE_VOCABULARY': return <>{authorEl} set &quot;{entry.content ?? '?'}&quot; as the active vocabulary</>;
    case 'RENAME_VOCABULARY':     return <>{authorEl} renamed a vocabulary to &quot;{entry.content ?? '?'}&quot;</>;
    case 'DELETE_VOCABULARY':     return <>{authorEl} deleted vocabulary &quot;{entry.content ?? '?'}&quot;</>;
    case 'SEND_INVITE':           return <>{authorEl} sent an invitation</>;
    default:                      return <>{authorEl} performed an unknown action</>;
  }
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

// ─── Type filter colours and labels ──────────────────────────────────────────

const TYPE_LABELS: Record<ChatEntryType, string> = {
  LOG: 'Log',
  ADM: 'Adm',
  GEN: 'Gen',
  MEM: 'Mem',
};

const TYPE_COLOURS: Record<ChatEntryType, { active: string; inactive: string }> = {
  LOG: { active: 'bg-gray-700 text-white',     inactive: 'bg-gray-100 text-gray-400' },
  ADM: { active: 'bg-red-600 text-white',       inactive: 'bg-red-50 text-red-300' },
  GEN: { active: 'bg-emerald-600 text-white',   inactive: 'bg-emerald-50 text-emerald-300' },
  MEM: { active: 'bg-blue-600 text-white',      inactive: 'bg-blue-50 text-blue-300' },
};

// Types visible to admins vs members
const ADMIN_TYPES: ChatEntryType[] = ['LOG', 'ADM', 'GEN', 'MEM'];
const MEMBER_TYPES: ChatEntryType[] = ['LOG', 'GEN'];

// ─── Single chat entry row ────────────────────────────────────────────────────

function ChatEntryRow({
  entry,
  memberIds,
}: {
  entry: GroupChatEntryDto;
  memberIds: Set<number>;
}) {
  const colours = TYPE_COLOURS[entry.type];
  const isLog   = entry.type === 'LOG';

  // Render a name — italic if the user is no longer a member
  function nameEl(id: number, name: string): React.ReactNode {
    const isCurrent = memberIds.has(id);
    return isCurrent
      ? <span className="font-semibold">{name}</span>
      : <span className="font-semibold italic text-gray-500">{name}</span>;
  }

  const authorEl = nameEl(entry.authorId, entry.authorName);
  const targetEl = entry.targetId !== undefined && entry.targetName
    ? nameEl(entry.targetId, entry.targetName)
    : null;

  return (
    <div className="flex items-start gap-2 py-1 text-sm font-mono">
      {/* Timestamp */}
      <span className="text-gray-400 shrink-0">{formatTimestamp(entry.createdAt)}</span>

      {/* Type badge */}
      <span className={`shrink-0 rounded px-1 text-xs font-bold ${colours.active}`}>
        {TYPE_LABELS[entry.type]}
      </span>

      {/* Content */}
      {isLog ? (
        <span className="text-gray-700">
          {renderLogSentence(entry, authorEl, targetEl)}
        </span>
      ) : (
        <span className="text-gray-800">
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
      next.has(type) ? next.delete(type) : next.add(type);
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
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                isActive ? colours.active : colours.inactive
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Chat scroll area */}
      <div className="h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
        {visibleEntries.length === 0 && (
          <p className="text-sm text-gray-400 italic">No entries to show.</p>
        )}
        {visibleEntries.map((entry) => (
          <ChatEntryRow
            key={`${entry.groupId}-${entry.entryNumber}`}
            entry={entry}
            memberIds={memberIds}
          />
        ))}
        <div ref={bottomRef} />
      </div>

    </div>
  );
}
