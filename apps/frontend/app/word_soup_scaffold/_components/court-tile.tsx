'use client';

import { useTranslations } from 'next-intl';

export type CourtCell = {
  char: string;
};

interface Props {
  cell: CourtCell;
  row: number;
  col: number;
  tileSize: number;
  fontSize: number;
  onClick: (row: number, col: number) => void;
}

export default function CourtTile({ cell, row, col, tileSize, fontSize, onClick }: Props) {
  const t = useTranslations('games.wordSoup');

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      title={t('cellTitle', { row: row + 1, col: col + 1 })}
      className="flex items-center justify-center rounded-lg clay-panel text-foreground font-bold leading-none transition-transform hover:scale-[1.02]"
      style={{
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
