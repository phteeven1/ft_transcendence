'use client';

import { useState, useEffect } from 'react';
import { crosswordApi, type WordBuildingDifficulty } from '@/lib/api';
import type { CrosswordPuzzle } from '../../types';

interface CrosswordBoardProps {
  gameId: number;
  playerId: number;
  onComplete?: () => void;
}

interface GridState {
  [key: string]: string;
}

/**
 * crossword-logic Addition: Crossword puzzle board component
 * Displays difficulty selector before generating puzzle, then shows interactive grid
 */
export default function CrosswordBoard({ gameId, playerId, onComplete }: CrosswordBoardProps) {
  // Puzzle data and state
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [gridState, setGridState] = useState<GridState>({});
  const [solved, setSolved] = useState(false);
  const [wrongCells, setWrongCells] = useState<Array<{ row: number; col: number }>>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<WordBuildingDifficulty>('medium');
  const [hasSelectedDifficulty, setHasSelectedDifficulty] = useState(false);
  
  // Clue number mapping for grid display
  const [clueNumberMap, setClueNumberMap] = useState<Map<string, number>>(new Map());

  /**
   * crossword-logic Addition: Generate new puzzle when difficulty is selected
   * Calls init endpoint with selected difficulty to create fresh puzzle
   */
  useEffect(() => {
    // Only fetch puzzle after difficulty has been selected
    if (!hasSelectedDifficulty) return;

    const fetchPuzzle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize puzzle with selected difficulty (forceRegenerate = true for new puzzle each time)
        const data = await crosswordApi.init(gameId, difficulty, true);
        setPuzzle(data);
        
        // Build map of clue numbers for grid cell display
        const numberMap = new Map<string, number>();
        [...data.clues.across, ...data.clues.down].forEach((clue) => {
          const key = `${clue.row},${clue.col}`;
          // Only set if not already set (same cell can start both across and down)
          if (!numberMap.has(key)) {
            numberMap.set(key, clue.number || 0);
          }
        });
        setClueNumberMap(numberMap);
        
        // Initialize empty grid state for player input
        const initial: GridState = {};
        for (let r = 0; r < data.playerGrid.length; r++) {
          for (let c = 0; c < data.playerGrid[r].length; c++) {
            const cell = data.playerGrid[r][c];
            if (cell !== null) {
              initial[`${r},${c}`] = cell || '';
            }
          }
        }
        setGridState(initial);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load crossword');
        setLoading(false);
      }
    };

    fetchPuzzle();
  }, [gameId, difficulty, hasSelectedDifficulty]);

  /**
   * crossword-logic Addition: Handle player input in grid cell
   * Updates local state optimistically, then syncs with server
   */
  const handleCellInput = async (row: number, col: number, value: string) => {
    // Extract single uppercase letter
    const letter = value.toUpperCase().slice(0, 1);

    // Update local grid state immediately for responsive UI
    setGridState((prev) => ({
      ...prev,
      [`${row},${col}`]: letter,
    }));

    // If letter entered, sync with server
    if (letter) {
      try {
        const updated = await crosswordApi.updateCell(gameId, row, col, letter);
        
        // Update grid state with server response
        const newState: GridState = {};
        for (let r = 0; r < updated.playerGrid.length; r++) {
          for (let c = 0; c < updated.playerGrid[r].length; c++) {
            const cell = updated.playerGrid[r][c];
            if (cell !== null) {
              newState[`${r},${c}`] = cell || '';
            }
          }
        }
        setGridState(newState);
      } catch (err) {
        console.error('Error updating cell:', err);
      }
    }
  };

  /**
   * crossword-logic Addition: Check player's solution against correct answers
   * Highlights incorrect cells in red
   */
  const handleCheck = async () => {
    try {
      const result = await crosswordApi.check(gameId);
      setSolved(result.solved);
      setWrongCells(result.wrongCells || []);
      
      // Call completion callback if puzzle solved
      if (result.solved && onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check solution');
    }
  };

  /**
   * crossword-logic Addition: Render difficulty selector if not yet selected
   * User must choose difficulty before puzzle generates
   */
  if (!hasSelectedDifficulty) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <h3 className="text-xl font-bold">Select Difficulty Level</h3>
        <p className="text-gray-600">Choose a difficulty to generate your crossword puzzle</p>
        <div className="grid grid-cols-3 gap-4 max-w-md">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              onClick={() => {
                setDifficulty(level);
                setHasSelectedDifficulty(true);
              }}
              className="py-3 px-6 rounded-lg font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show loading state while puzzle generates
  if (loading) return <div className="text-center py-4">Generating puzzle...</div>;
  
  // Show error if puzzle generation failed
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  
  // Show message if puzzle not loaded yet
  // Show message if puzzle not loaded yet
  if (!puzzle) return <div className="text-center py-4">No crossword available</div>;

  /**
   * crossword-logic Addition: Helper to check if cell has wrong answer
   */
  const isWrongCell = (row: number, col: number) =>
    wrongCells.some((w) => w.row === row && w.col === col);

  // Grid dimensions for rendering
  const numRows = puzzle.rows;
  const numCols = puzzle.cols;
  const cellSize = 40;

  /**
   * crossword-logic Addition: Main puzzle UI with grid and clues
   */
  return (
    <div className="space-y-4">
      {/* Puzzle header with selected difficulty */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Crossword Puzzle - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h3>
        <button
          onClick={() => {
            setHasSelectedDifficulty(false);
            setPuzzle(null);
          }}
          className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Change Difficulty
        </button>
      </div>

      {/* Crossword grid with interactive cells */}
      <div>
        <div
          className="inline-block border-2 border-gray-800 mb-4"
          style={{
            display: 'inline-grid',
            gridTemplateColumns: `repeat(${numCols}, ${cellSize}px)`,
            gap: '1px',
            backgroundColor: '#333',
          }}
        >
          {/* Render each cell in the grid */}
          {puzzle.playerGrid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const isPlayable = cell !== null; // Playable cells are not null
              const value = gridState[key] || ''; // Get player's current letter
              const isWrong = isWrongCell(r, c); // Check if marked wrong after check
              const clueNumber = clueNumberMap.get(key); // Get clue number if cell starts a word

              return (
                <div
                  key={key}
                  style={{
                    position: 'relative',
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                  }}
                >
                  {/* Clue number overlay in top-left corner */}
                  {isPlayable && clueNumber && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: '#0066cc',
                        lineHeight: '1',
                        zIndex: 10,
                      }}
                    >
                      {clueNumber}
                    </div>
                  )}
                  {/* Input field for letter entry */}
                  <input
                    type="text"
                    maxLength={1}
                    value={value}
                    onChange={(e) => isPlayable && handleCellInput(r, c, e.target.value)}
                    disabled={!isPlayable}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      // White for playable, red for wrong answers, black for blocked
                      backgroundColor: isPlayable ? (isWrong ? '#fecaca' : 'white') : '#333',
                      color: isPlayable ? 'black' : 'transparent',
                      border: 'none',
                      cursor: isPlayable ? 'text' : 'default',
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Clues sections for across and down */}
        <div className="mt-6 space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Across</h4>
            <ul className="text-xs space-y-1">
              {puzzle.clues.across.map((c, idx) => (
                <li key={idx}>
                  <span className="font-medium">{c.number}.</span> {c.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Down</h4>
            <ul className="text-xs space-y-1">
              {puzzle.clues.down.map((c, idx) => (
                <li key={idx}>
                  <span className="font-medium">{c.number}.</span> {c.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Success message when puzzle is solved */}
        {solved && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded text-green-800 font-medium text-center">
            Crossword Complete!
          </div>
        )}
        {wrongCells.length > 0 && !solved && (
          <div className="mt-2 text-sm text-gray-600">
            {wrongCells.length} cell(s) need correction (highlighted in red)
          </div>
        )}

        <button
          onClick={handleCheck}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded transition-colors"
        >
          Check Solution
        </button>
      </div>
    </div>
  );
}
