'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { WordSoupCourtCell } from '@/lib/api/games/word-soup/types';

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g)
    .toString(16)
    .padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
}

function lightenHexColor(hex: string, percent = 40): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const amount = percent / 100;
  const lightened = toHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
  return lightened.toUpperCase();
}

type CourtCell = WordSoupCourtCell;

interface Props {
  cell: CourtCell;
  row: number;
  col: number;
  playerColours: Record<number, string>;
  foundWordGroups: Array<{
    playerId: number;
    cells: Array<{ row: number; col: number }>;
    direction?: [number, number];
  }>;
  isSelected: boolean;
  hideLetter?: boolean;
  celebrationHighlight?: {
    playerId: number;
    status: 'filled' | 'leading';
  };
  onSelectionStart: (row: number, col: number) => void;
  onSelectionContinue: (row: number, col: number) => void;
}

export default function CourtTile({
  cell,
  row,
  col,
  playerColours,
  foundWordGroups,
  isSelected,
  hideLetter = false,
  celebrationHighlight,
  onSelectionStart,
  onSelectionContinue,
}: Props) {
  const t = useTranslations('games.wordSoup');
  const borderColor =
    cell.highlightedByPlayerId !== undefined
     ? playerColours[cell.highlightedByPlayerId] ?? '#F59E0B'
     : isSelected
       ? '#10B981'
       : '#E5E7EB';

  const containingWords = foundWordGroups.filter((group) =>
    group.cells.some(
      (cellPosition) => cellPosition.row === row && cellPosition.col === col,
    ),
  );

  // Permanent found-word style only when not mid-celebration on this cell.
  const showFoundWordStyle =
    containingWords.length > 0 && celebrationHighlight === undefined;

  const celebrationPlayerColor =
    celebrationHighlight !== undefined
      ? playerColours[celebrationHighlight.playerId] ?? '#F59E0B'
      : undefined;

  let finalBackgroundColor = 'white';
  let backgroundImage = 'none';

  if (showFoundWordStyle) {
    if (containingWords.length === 1) {
      const playerColor =
        playerColours[containingWords[0].playerId] ?? '#F59E0B';
      finalBackgroundColor = lightenHexColor(playerColor, 50);
    } else {
      const lightColors = containingWords.map((word) => {
        const playerColor = playerColours[word.playerId] ?? '#F59E0B';
        return lightenHexColor(playerColor, 50);
      });

      const gradientStops = lightColors.map((color, idx) => {
        const start = (idx / lightColors.length) * 100;
        const end = ((idx + 1) / lightColors.length) * 100;
        return `${color} ${start}% ${end}%`;
      });
      backgroundImage = `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
      finalBackgroundColor = 'white';
    }
  } else if (celebrationPlayerColor) {
    finalBackgroundColor = lightenHexColor(celebrationPlayerColor, 50);
  }

  const selectionOutline = isSelected ? '2px solid #10B981' : undefined;
  const isLeading = celebrationHighlight?.status === 'leading';
  const letterLabel = hideLetter
    ? t('cellHidden')
    : cell.char || t('cellEmpty');

  // Found-word tiles keep the tinted background only. A per-side black outline
  // used to be set in code but was overridden by borderWidth: 0 — keep that look.
  // Use one border API at a time so React does not warn about shorthand conflicts.
  const borderStyle: CSSProperties = showFoundWordStyle
    ? { borderStyle: 'solid', borderWidth: 0, borderColor: 'transparent' }
    : {
        borderStyle: 'solid',
        borderColor,
        borderWidth:
          cell.highlightedByPlayerId !== undefined ? 3 : isSelected ? 2 : 1,
      };

  return (
    <button
      type="button"
      aria-label={`${t('cellTitle', { row: row + 1, col: col + 1 })}, ${letterLabel}`}
      aria-pressed={isSelected}
      data-court-tile
      data-row={row}
      data-col={col}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelectionStart(row, col);
      }}
      onMouseEnter={() => onSelectionContinue(row, col)}
      onTouchStart={() => {
        onSelectionStart(row, col);
      }}
      className={[
        'aspect-square flex w-full min-w-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-0 font-bold leading-none text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)]',
        'text-[clamp(0.625rem,3.6cqw,1.375rem)]',
        isLeading
          ? 'word-soup-tile-ripple'
          : 'transition-[transform,background-color] duration-150 hover:scale-[1.02]',
      ].join(' ')}
      style={{
        backgroundColor: finalBackgroundColor,
        backgroundImage,
        ...borderStyle,
        outline: selectionOutline,
        outlineOffset: selectionOutline ? '-2px' : undefined,
        boxSizing: 'border-box',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {hideLetter ? '' : cell.char}
    </button>
  );
}
