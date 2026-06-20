'use client';

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
  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      title={`Row ${row + 1}, Column ${col + 1}`}
      className="flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900 font-bold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.02]"
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
