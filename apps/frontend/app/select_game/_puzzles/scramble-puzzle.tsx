'use client';
/*
Scramble puzzle: player drags letter tiles to reconstruct a word from its meaning.
- Picks a random entry with word length >= 3 from the vocabulary on mount.
  If none exists, calls onSkip immediately.
- Space characters in multi-word entries (e.g. "DIE KATZE") are blank tiles,
  treated as draggable letters, not as gaps.
- All letters are uppercased to avoid giving away word start.
- Drag works via pointer events (mouse + touch unified).
- When a dragged tile's center passes a neighbor's center, that neighbor shifts
  into the gap. Letters are clamped to the word bounds.
- On correct arrangement: tiles blink orange three times, then "SUCCESS!" appears
  and Skip becomes Next.
*/
import { useState, useRef, useEffect, useCallback } from 'react';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';

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
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

export default function ScramblePuzzle({ vocabulary, onSkip }: Props) {
  const entry = useRef<[string, string] | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [meaning, setMeaning] = useState('');
  const [word, setWord] = useState('');
  // wordRef keeps word accessible inside pointer-event closures without stale capture
  const wordRef = useRef('');
  const [success, setSuccess] = useState(false);
  const [blinking, setBlinking] = useState(false);

  // dragging state — kept in refs to avoid re-renders during drag
  const dragging = useRef<{
    tileId: number;
    startX: number;
    currentX: number;
    originSlot: number;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    tileId: number;
    offsetX: number;
  } | null>(null);

  // Skip immediately if no valid entry
  useEffect(() => {
    const picked = pickEntry(vocabulary);
    if (!picked) {
      onSkip();
      return;
    }
    entry.current = picked;
    const [w, m] = picked;
    const upper = w.toUpperCase();
    setWord(upper);
    wordRef.current = upper;
    setMeaning(m);
    const base = buildTiles(w);
    setTiles(scramble(base));
  }, []);

  const triggerSuccess = useCallback(() => {
    setBlinking(true);
    setTimeout(() => setBlinking(false), 900);
    setTimeout(() => setSuccess(true), 900);
  }, []);

  const handlePointerDown = (e: React.PointerEvent, tileId: number) => {
    if (success) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const tile = tiles.find((t) => t.id === tileId)!;
    dragging.current = {
      tileId,
      startX: e.clientX,
      currentX: e.clientX,
      originSlot: tile.slot,
    };
    setDragState({ tileId, offsetX: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const d = dragging.current;
    const rawOffset = e.clientX - d.startX;
    const tileCount = tiles.length;
    const step = TILE_SIZE + TILE_GAP;

    // Clamp offset so tile can't go past first or last slot
    const minOffset = (0 - d.originSlot) * step;
    const maxOffset = (tileCount - 1 - d.originSlot) * step;
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, rawOffset));

    d.currentX = d.startX + clampedOffset;

    // Which slot is the dragged tile's center currently over?
    const floatSlot = d.originSlot + clampedOffset / step;
    const targetSlot = Math.round(floatSlot);

    setTiles((prev) => {
      const draggedTile = prev.find((t) => t.id === d.tileId)!;
      const currentSlot = draggedTile.slot;
      if (currentSlot === targetSlot) {
        setDragState({ tileId: d.tileId, offsetX: clampedOffset });
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
      setDragState({ tileId: d.tileId, offsetX: clampedOffset });
      return updated;
    });
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = null;
    setDragState(null);
    // Read word from ref — closure-safe, always current
    setTiles((prev) => {
      if (isCorrect(prev, wordRef.current)) triggerSuccess();
      return prev;
    });
  };

  const step = TILE_SIZE + TILE_GAP;
  const totalWidth = tiles.length * TILE_SIZE + (tiles.length - 1) * TILE_GAP;

  return (
    <div className="flex flex-col h-full px-4 py-3 select-none">

      {/* Instruction + meaning */}
      <p className="text-sm text-gray-500 mb-3 leading-snug">
        Move the scrambled letters, to find the word meaning…{' '}
        <span className="font-semibold text-gray-700">{meaning}</span>
      </p>

      {/* Tile row */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="relative"
          style={{ width: totalWidth, height: TILE_SIZE }}
        >
          {tiles.map((tile) => {
            const isDragging = dragState?.tileId === tile.id;

            const visualX = tile.slot * step;

            // Sub-slot offset: keeps the tile tracking the finger exactly
            // between snap points, by measuring how far the finger has moved
            // beyond the last snapped slot position
            const dragOffset =
              isDragging && dragging.current
                ? dragging.current.currentX -
                  dragging.current.startX -
                  (tile.slot - dragging.current.originSlot) * step
                : 0;

            return (
              <div
                key={tile.id}
                onPointerDown={(e) => handlePointerDown(e, tile.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
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
                  'flex items-center justify-center rounded-lg text-lg font-bold',
                  'border border-gray-200',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)]',
                  tile.char === ' '
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-white text-gray-800',
                  isDragging
                    ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_16px_rgba(0,0,0,0.25)] scale-105'
                    : '',
                  blinking ? 'animate-blink-orange' : '',
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
            'text-sm font-semibold text-emerald-500 transition-opacity duration-300',
            success ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          SUCCESS!
        </span>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          {success ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  );
}