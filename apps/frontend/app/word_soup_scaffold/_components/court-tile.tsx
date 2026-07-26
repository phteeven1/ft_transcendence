'use client';

import { useTranslations } from 'next-intl';
import type { WordSoup } from '@/lib/api/games/word-soup/types';

type CourtCell = WordSoup.CourtCell;

interface Props {
  cell: CourtCell;
  row: number;
  col: number;
  tileSize: number;
  fontSize: number;
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

function lightenHexColor(hex: string, percent: number = 40): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lighten = (val: number) =>
    Math.round(Math.min(255, val + (255 - val) * (percent / 100)));

  const lr = lighten(r);
  const lg = lighten(g);
  const lb = lighten(b);

  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`.toUpperCase();
}

type BorderSide = 'top' | 'right' | 'bottom' | 'left';

function getBorderSidesForWord(
  row: number,
  col: number,
  wordCells: Array<{ row: number; col: number }>,
  direction?: [number, number],
): BorderSide[] {
  if (!direction) {
    return [];
  }

  const [dr, dc] = direction;
  const projection = row * dr + col * dc;
  const projections = wordCells.map((cell) => cell.row * dr + cell.col * dc);
  const minProjection = Math.min(...projections);
  const maxProjection = Math.max(...projections);
  const isStart = projection === minProjection;
  const isEnd = projection === maxProjection;

  if (dr === 0) {
    const sides: BorderSide[] = ['top', 'bottom'];
    if (isStart) sides.push('left');
    if (isEnd) sides.push('right');
    return sides;
  }

  if (dc === 0) {
    const sides: BorderSide[] = ['left', 'right'];
    if (isStart) sides.push('top');
    if (isEnd) sides.push('bottom');
    return sides;
  }

  return [];
}

export default function CourtTile({
  cell,
  row,
  col,
  tileSize,
  fontSize,
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

  let borderTop = 'none';
  let borderRight = 'none';
  let borderBottom = 'none';
  let borderLeft = 'none';

  if (showFoundWordStyle) {
    const sides = containingWords.flatMap((word) =>
      getBorderSidesForWord(row, col, word.cells, word.direction),
    );

    const uniqueSides = Array.from(new Set(sides));
    if (uniqueSides.includes('top')) borderTop = '3px solid black';
    if (uniqueSides.includes('right')) borderRight = '3px solid black';
    if (uniqueSides.includes('bottom')) borderBottom = '3px solid black';
    if (uniqueSides.includes('left')) borderLeft = '3px solid black';
  }

  const selectionOutline = isSelected ? '2px solid #10B981' : undefined;
  const isLeading = celebrationHighlight?.status === 'leading';


  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onSelectionStart(row, col);
      }}
      onMouseEnter={() => onSelectionContinue(row, col)}
      title={`Row ${row + 1}, Column ${col + 1}`}
      className={[
        'flex items-center justify-center rounded-lg border border-gray-200 bg-white font-bold leading-none text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)]',
        isLeading
          ? 'word-soup-tile-ripple'
          : 'transition-[transform,background-color] duration-150 hover:scale-[1.02]',
      ].join(' ')}
      style={{
        backgroundColor: finalBackgroundColor,
        backgroundImage,
        borderTop,
        borderRight,
        borderBottom,
        borderLeft,
        borderColor: !showFoundWordStyle ? borderColor : undefined,
        borderWidth:
          !showFoundWordStyle && cell.highlightedByPlayerId !== undefined
            ? 3
            : !showFoundWordStyle && isSelected
              ? 2
              : !showFoundWordStyle
                ? 1
                : 0,
        outline: selectionOutline,
        outlineOffset: selectionOutline ? '-2px' : undefined,
        boxSizing: 'border-box',
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${fontSize}px`,
        flexShrink: 0,
      }}
    >
      {hideLetter ? '' : cell.char}
    </button>
  );
}
