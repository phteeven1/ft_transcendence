'use client';
/*
  TileRack — a row of draggable letter tiles for the Word Building crossword game.

  Interaction model (HTML5 DnD):
    - Each tile has draggable="true".
    - onDragStart sets dataTransfer with the uppercase letter.
    - CourtTile cells call e.dataTransfer.getData('text/plain') in their onDrop handler.

  Visual language reuses the tile style from scramble-puzzle.tsx:
    bg-white · border · inset shadow · rounded-lg · font-bold
  so both input surfaces feel consistent to players.

  Props:
    letters   — array of unique uppercase letters derived from the puzzle vocabulary.
    disabled  — disables all tiles (e.g., once puzzle is solved).
*/

interface Props {
  letters: string[];
  disabled?: boolean;
}

/**
 * Renders a set of draggable letter tiles dynamically derived from the puzzle's vocabulary.
 * Supports any language (French, German, etc.) by extracting unique characters from the solution.
 *
 * @param letters Array of unique uppercase letters to render (e.g., ['A', 'B', 'É', 'Ü']).
 * @param disabled When true all tiles are non-draggable (used after puzzle is solved).
 */
export default function TileRack({ letters, disabled = false }: Props) {
  return (
    <div className="flex flex-wrap gap-1 justify-center py-2 px-1">
      {letters.map((letter) => (
        <div
          key={letter}
          draggable={!disabled}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', letter);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className={[
            'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold select-none',
            'border border-gray-200',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)]',
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-white text-gray-800 cursor-grab hover:bg-blue-50 hover:border-blue-300 active:cursor-grabbing',
          ].join(' ')}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
