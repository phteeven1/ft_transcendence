'use client';

export type CourtCell = {
  char: string;
  revealed: boolean;
  highlightedByPlayerId?: number;
};

interface Props {
  cell: CourtCell;
  row: number;
  col: number;
  tileSize: number;
  fontSize: number;
  playerColours: Record<number, string>;
  foundWordGroups: Array<{ playerId: number; cells: Array<{ row: number; col: number }> ; direction?: [number, number] }>;
  isSelected: boolean;
  peristalticStatus?: 'none' | 'leading' | 'trail';
  onSelectionStart: (row: number, col: number) => void;
  onSelectionContinue: (row: number, col: number) => void;
}

// Lighten a hex color by a percentage
function lightenHexColor(hex: string, percent: number = 40): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lighten = (val: number) => Math.round(Math.min(255, val + (255 - val) * (percent / 100)));

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
  peristalticStatus = 'none',
  onSelectionStart,
  onSelectionContinue,
}: Props) {
  const borderColor = cell.highlightedByPlayerId !== undefined
    ? playerColours[cell.highlightedByPlayerId] ?? '#F59E0B'
    : isSelected
      ? '#10B981'
      : '#E5E7EB';

  // Find all words that contain this cell
  const containingWords = foundWordGroups.filter((group) =>
    group.cells.some((cellPosition) => cellPosition.row === row && cellPosition.col === col),
  );

  // During celebration, defer permanent found-word styling until the wave finishes.
  const showFoundWordStyle = containingWords.length > 0 && peristalticStatus === 'none';

  // Determine the background: lighter color(s) for found words
  let finalBackgroundColor = 'white';
  let backgroundImage = 'none';

  if (showFoundWordStyle) {
    if (containingWords.length === 1) {
      // Single word: use lighter shade of player's color
      const playerColor = playerColours[containingWords[0].playerId] ?? '#F59E0B';
      finalBackgroundColor = lightenHexColor(playerColor, 50);
    } else {
      // Multiple words: create multicolor gradient with lighter shades
      const lightColors = containingWords.map((word) => {
        const playerColor = playerColours[word.playerId] ?? '#F59E0B';
        return lightenHexColor(playerColor, 50);
      });

      // Use conic gradient to show all colors in sections
      const gradientStops = lightColors.map((color, idx) => {
        const start = (idx / lightColors.length) * 100;
        const end = ((idx + 1) / lightColors.length) * 100;
        return `${color} ${start}% ${end}%`;
      });
      backgroundImage = `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
      finalBackgroundColor = 'white';
    }
  }

  let borderTop = 'none';
  let borderRight = 'none';
  let borderBottom = 'none';
  let borderLeft = 'none';
  let borderTopLeftRadius = '0.5rem';
  let borderTopRightRadius = '0.5rem';
  let borderBottomLeftRadius = '0.5rem';
  let borderBottomRightRadius = '0.5rem';

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

  // Selection outline should always show while selecting, even for found words
  const selectionOutline = isSelected ? '2px solid #10B981' : undefined;

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
        'flex items-center justify-center rounded-lg border border-gray-200 bg-white font-bold leading-none text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.02]',
        peristalticStatus === 'leading' ? 'word-soup-tile-peristaltic-leading' : '',
        peristalticStatus === 'trail' ? 'word-soup-tile-peristaltic-trail' : '',
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
        borderTopLeftRadius,
        borderTopRightRadius,
        borderBottomLeftRadius,
        borderBottomRightRadius,
        outline: selectionOutline,
        outlineOffset: selectionOutline ? '-2px' : undefined,
        boxSizing: 'border-box',
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        fontSize: `${fontSize}px`,
        flexShrink: 0,
      }}
    >
      {cell.char}
    </button>
  );
}