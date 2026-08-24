'use client';
/*
Scramble puzzle: player drags letter tiles to reconstruct a word from its meaning.
- Picks a random entry with word length >= 3 from the vocabulary on mount.
- Space characters in multi-word entries (e.g. "DIE KATZE") are blank tiles,
  treated as draggable letters, not as gaps.
- All letters are uppercased to avoid giving away word start.
- Drag works via pointer events (mouse + touch unified).
- When a dragged tile's center passes a neighbor's center, that neighbor shifts
  into the gap. Letters are clamped to the word bounds.
- On correct arrangement: tiles blink orange three times, then "SUCCESS!" appears
  and Skip becomes Next.
*/
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';
import { Button } from '../../components/ui/button';

interface Props {
  vocabulary: VocabularyDto;
  onSkip: () => void;
}

// Each tile has a stable id, a display character, and its current slot index
interface Tile {
  id: number;
  char: string; // ' ' for blank tiles
  slot: number;
}

// creates an array of Tiles from a word
function buildTiles(word: string): Tile[] {
  return word
    .toUpperCase()
    .split('')
    .map((char, i) => ({ id: i, char, slot: i }));
}

// shuffles the array of Tiles using Fisher-Yates shuffle
// This is a generic function that could be used by other pages
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// the wrapper that calls shuffle on the array of Tile
function scramble(tiles: Tile[]): Tile[] {
  const slots = tiles.map((_, i) => i);
  const shuffledSlots = shuffle(slots);
  return tiles.map((tile, i) => ({ ...tile, slot: shuffledSlots[i] }));
}

// Checks correctness by character at each slot, not by tile identity.
// This means duplicate letters (e.g. three E's) are interchangeable.
function isCorrect(tiles: Tile[], word: string): boolean {
  const upper = word.toUpperCase();
  return upper.split('').every((char, slot) => {
    const tile = tiles.find((t) => t.slot === slot);
    return tile?.char === char;
  });
}

// Pick a random vocabulary entry whose word has >= 3 non-space characters.
// Returns [word, meaning] or null if none qualify.
function pickEntry(vocabulary: VocabularyDto): [string, string] | null {
  const pairs = vocabulary.words
    .map((w, i) => [w, vocabulary.meanings[i]] as [string, string])
    .filter(([w]) => w.replace(/ /g, '').length >= 3);
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
}

const TILE_SIZE = 48; // px, base tile width/height
const TILE_GAP = 4;   // px between tiles
// clay-panel draws a 4px bottom lip plus a soft drop shadow outside the box
const TILE_SHADOW_CLEARANCE = 8;
const BLINK_DURATION_MS = 900;

// components sho
export default function ScramblePuzzle({ vocabulary, onSkip }: Props) {
  const t = useTranslations('games.puzzle');
  const tCommon = useTranslations('common');
  const basePuzzle = useMemo(() => {
    const picked = pickEntry(vocabulary);
    if (!picked) return null;
    const [w, m] = picked;
    const upper = w.toUpperCase();
    return {
      word: upper,
      meaning: m,
      tiles: scramble(buildTiles(w)),
    };
  }, [vocabulary]);

  const [tileOverride, setTileOverride] = useState<{
    word: string;
    tiles: Tile[];
  } | null>(null);
  const [success, setSuccess] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const wordRef = useRef('');

  const puzzleWord = basePuzzle?.word ?? '';
  const activeTiles =
    tileOverride?.word === puzzleWord
      ? tileOverride.tiles
      : (basePuzzle?.tiles ?? []);
  const meaning = basePuzzle?.meaning ?? '';
  const tilesRef = useRef<Tile[]>(activeTiles);
  tilesRef.current = activeTiles;
  const successTriggeredRef = useRef(false);

  useEffect(() => {
    if (!basePuzzle) return;
    wordRef.current = basePuzzle.word;
    successTriggeredRef.current = false;
  }, [basePuzzle]);

  const updateTiles = useCallback(
    (updater: (prev: Tile[]) => Tile[]) => {
      if (!puzzleWord) return;
      setTileOverride((prev) => {
        const current =
          prev?.word === puzzleWord
            ? prev.tiles
            : (basePuzzle?.tiles ?? []);
        const next = updater(current);
        tilesRef.current = next;
        return { word: puzzleWord, tiles: next };
      });
    },
    [basePuzzle?.tiles, puzzleWord],
  );

  const dragging = useRef<{
    tileId: number;
    startX: number;
    currentX: number;
    originSlot: number;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    tileId: number;
    offsetX: number;
    originSlot: number;
  } | null>(null);

  const triggerSuccess = useCallback(() => {
    if (successTriggeredRef.current) return;
    successTriggeredRef.current = true;
    setBlinking(true);
    window.setTimeout(() => setBlinking(false), BLINK_DURATION_MS);
    window.setTimeout(() => setSuccess(true), BLINK_DURATION_MS);
  }, []);


  // tells browser that this element owns all future pointer events.
  // records the drag start position and the tile's slot at the start (originSlot)
  // setDragState triggers the one re-render needed to switch tile to "grabbed" visual state
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, tileId: number) => {
    if (success) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const tile = activeTiles.find((t) => t.id === tileId)!;
    dragging.current = {
      tileId,
      startX: e.clientX,
      currentX: e.clientX,
      originSlot: tile.slot,
    };
    setDragState({ tileId, offsetX: 0, originSlot: tile.slot });
  };

  // Runs every frame while a tile is being dragged. Figures out how far the tile has moved,
  // clamps the movement to x axis, snaps to nearest slot, and shuffles other tiles away
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    e.preventDefault();
    const d = dragging.current; // shorthand that holds relevant info
    const rawOffset = e.clientX - d.startX; // e.clientX is current mouse/finger X position, d,startX is start of drag
    const tileCount = activeTiles.length;
    const step = TILE_SIZE + TILE_GAP;  // one 'unit' of movement

    // Clamp offset so tile can't go past first or last slot
    const minOffset = (0 - d.originSlot) * step;
    const maxOffset = (tileCount - 1 - d.originSlot) * step;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, rawOffset));

    d.currentX = d.startX + clampedOffset;  // updates ref with tile's current x position

    // Which slot is the dragged tile's center currently over? Converts pixels back into slot numbers
    const floatSlot = d.originSlot + clampedOffset / step;  // gives fractional slot count
    const targetSlot = Math.round(floatSlot); // rounds to nearest whole, so 'snaps' in place

    updateTiles((prev) => {
      const draggedTile = prev.find((t) => t.id === d.tileId)!;
      const currentSlot = draggedTile.slot;
      if (currentSlot === targetSlot) {
        setDragState({ tileId: d.tileId, offsetX: clampedOffset, originSlot: d.originSlot });
        return prev;
      }

      const direction = targetSlot > currentSlot ? 1 : -1;
      const updated = prev.map((tile) => {
        if (tile.id === d.tileId) return { ...tile, slot: targetSlot };
        if (direction === 1 && tile.slot > currentSlot && tile.slot <= targetSlot)
          return { ...tile, slot: tile.slot - 1 };
        if (direction === -1 && tile.slot < currentSlot && tile.slot >= targetSlot)
          return { ...tile, slot: tile.slot + 1 };
        return tile;
      });
      setDragState({ tileId: d.tileId, offsetX: clampedOffset, originSlot: d.originSlot });
      return updated;
    });
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || success || successTriggeredRef.current) return;
    dragging.current = null;
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragState(null);
    if (isCorrect(tilesRef.current, wordRef.current)) {
      triggerSuccess();
    }
  };

  const step = TILE_SIZE + TILE_GAP;
  const totalWidth =
    activeTiles.length * TILE_SIZE + (activeTiles.length - 1) * TILE_GAP;

  if (!basePuzzle || activeTiles.length === 0) return null;

  return (
    <div className="flex h-full touch-none select-none flex-col px-4 py-3">

      {/* Instruction + meaning */}
      <p className="text-sm text-muted-foreground mb-3 leading-snug">
        {t('scrambleInstruction')}{' '}
        <span className="font-semibold text-foreground">{meaning}</span>
      </p>

      {/* Tile row */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto overscroll-x-contain">
        <div
          className="relative"
          style={{
            width: totalWidth,
            height: TILE_SIZE + TILE_SHADOW_CLEARANCE,
          }}
        >
          {activeTiles.map((tile) => {
            const isDragging = dragState?.tileId === tile.id;

            const visualX = tile.slot * step;

            const dragOffset =
              isDragging && dragState
                ? dragState.offsetX - (tile.slot - dragState.originSlot) * step
                : 0;

            return (
              <div
                key={tile.id}
                onPointerDown={(e) => handlePointerDown(e, tile.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                  position: 'absolute',
                  left: visualX + dragOffset,
                  top: 0,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  transition: isDragging ? 'none' : 'left 0.12s ease',
                  zIndex: isDragging ? 10 : 1,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                className={[
                  'flex touch-none items-center justify-center rounded-lg text-lg font-bold leading-none clay-panel',
                  blinking
                    ? 'animate-blink-orange'
                    : tile.char === ' '
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-surface text-foreground',
                  isDragging ? 'scale-105 shadow-lg' : '',
                ].join(' ')}
              >
                {tile.char === ' ' ? ' ' : tile.char}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar: success label + skip/next button */}
      <div className="flex items-center justify-between mt-3">
        <span
          className={[
            'text-sm font-semibold text-primary transition-opacity duration-300',
            success ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {t('success')}
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {success ? tCommon('next') : tCommon('skip')}
        </Button>
      </div>
    </div>
  );
}