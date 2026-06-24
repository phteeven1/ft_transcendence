'use client';
/*
  Group Chat panel — displayed inside ActionWindow under the 'Group Chat' tab.

  Shows a scrollable, chronological log of chat entries for the current group.
  Entries can be filtered by type using the toggle buttons at the top.

  LOG entries are rendered from structured fields (eventKey + authorId + targetId).
  ADM / GEN / MEM entries display the author name and message content.

  Author names are resolved from the members list passed down from manage_group,
  so no extra API call is needed per entry.
*/

import { useEffect, useRef, useState } from 'react';
import { chatApi } from '@/lib/api/chat';
import type { ChatEntryType, GroupChatEntryDto } from '@/lib/api/chat';
import type { Member } from '../../types';

// ─── Log entry rendering ──────────────────────────────────────────────────────

/**
 * Converts a LOG entry's eventKey into a human-readable sentence.
 * authorName is always the person who triggered the event.
 * targetName is resolved by the caller from targetId + eventKey context.
 */
function renderLogSentence(
  entry: GroupChatEntryDto,
  authorName: string,
  targetName: string | undefined,
): string {
  switch (entry.eventKey) {
    case 'CREATE_GROUP':      return `${authorName} created the group`;
    case 'JOIN_GROUP':        return `${authorName} joined the group`;
    case 'LEAVE_GROUP':       return `${authorName} left the group`;
    case 'PROMOTE_ADMIN':     return `${authorName} promoted ${targetName ?? '?'} to Admin`;
    case 'RESIGN_ADMIN':      return `${authorName} resigned as Admin`;
    case 'RENAME_GROUP':      return `${authorName} renamed the group to "${targetName ?? '?'}"`;
    case 'EXPEL_MEMBER':      return `${authorName} expelled ${targetName ?? '?'}`;
    case 'DELETE_GROUP':      return `${authorName} deleted the group`;
    case 'UPLOAD_VOCABULARY': return `${authorName} uploaded vocabulary "${targetName ?? '?'}"`;
    case 'RENAME_VOCABULARY': return `${authorName} renamed a vocabulary to "${targetName ?? '?'}"`;
    case 'DELETE_VOCABULARY': return `${authorName} deleted vocabulary "${targetName ?? '?'}"`;
    case 'SET_ACTIVE_VOCABULARY': return `${authorName} set "${targetName ?? '?'}" as the active vocabulary`;
    case 'SEND_INVITE':       return `${authorName} sent an invitation`;
    default:                  return `${authorName} performed an unknown action`;
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

// ─── Type filter toggle button ────────────────────────────────────────────────

const TYPE_LABELS: Record<ChatEntryType, string> = {
  LOG: 'Log',
  ADM: 'Adm',
  GEN: 'Gen',
  MEM: 'Mem',
};

const TYPE_COLOURS: Record<ChatEntryType, { active: string; inactive: string }> = {
  LOG: { active: 'bg-gray-700 text-white',        inactive: 'bg-gray-100 text-gray-400' },
  ADM: { active: 'bg-red-600 text-white',          inactive: 'bg-red-50 text-red-300' },
  GEN: { active: 'bg-emerald-600 text-white',      inactive: 'bg-emerald-50 text-emerald-300' },
  MEM: { active: 'bg-blue-600 text-white',         inactive: 'bg-blue-50 text-blue-300' },
};

// ─── Single chat entry row ────────────────────────────────────────────────────

function ChatEntryRow({
  entry,
  authorName,
  targetName,
}: {
  entry: GroupChatEntryDto;
  authorName: string;
  targetName: string | undefined;
}) {
  const colours = TYPE_COLOURS[entry.type];
  const isLog   = entry.type === 'LOG';

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
          {renderLogSentence(entry, authorName, targetName)}
        </span>
      ) : (
        <span className="text-gray-800">
          <span className="font-semibold">{authorName}:</span>{' '}
          {entry.content}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  groupId: number;
  members: Member[]; // passed from manage_group — used to resolve authorId → name
};

export default function GroupChat({ groupId, members }: Props) {
  const [entries, setEntries]         = useState<GroupChatEntryDto[]>([]);
  const [activeFilters, setFilters]   = useState<Set<ChatEntryType>>(
    new Set(['LOG', 'ADM', 'GEN', 'MEM']),
  );
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  // ── Resolve authorId → display name ────────────────────────────────────────
  const memberMap = new Map<number, string>(members.map((m) => [m.id, m.name]));

  function resolveName(userId: number): string {
    return memberMap.get(userId) ?? `User #${userId}`;
  }

  // ── For now, targetName is not resolved (needs vocabulary/group lookup).
  // Pass undefined — renderLogSentence shows '?' for unknown targets.
  // Wire this up once the backend returns target names or a lookup API exists.
  function resolveTargetName(_entry: GroupChatEntryDto): string | undefined {
    return undefined;
  }

  // ── Fetch entries on mount ──────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    chatApi
      .getEntries(groupId)
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch(() => setError('Could not load chat.'))
      .finally(() => setIsLoading(false));
  }, [groupId]);

  // ── Scroll to bottom when entries load ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // ── Filter toggle ───────────────────────────────────────────────────────────
  function toggleFilter(type: ChatEntryType) {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  const visibleEntries = entries.filter((e) => activeFilters.has(e.type));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">

      {/* Filter toggles */}
      <div className="flex gap-2">
        {(['LOG', 'ADM', 'GEN', 'MEM'] as ChatEntryType[]).map((type) => {
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
        {isLoading && (
          <p className="text-sm text-gray-400 italic">Loading chat…</p>
        )}
        {error && (
          <p className="text-sm text-red-400 italic">{error}</p>
        )}
        {!isLoading && !error && visibleEntries.length === 0 && (
          <p className="text-sm text-gray-400 italic">No entries to show.</p>
        )}
        {!isLoading && !error && visibleEntries.map((entry) => (
          <ChatEntryRow
            key={`${entry.groupId}-${entry.entryNumber}`}
            entry={entry}
            authorName={resolveName(entry.authorId)}
            targetName={resolveTargetName(entry)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

    </div>
  );
}