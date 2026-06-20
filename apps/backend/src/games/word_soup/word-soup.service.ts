import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CourtCell = { char: string };

// ── Grid dimensions — must match COURT_COLS / COURT_ROWS in game-court.tsx ──
const COURT_COLS = 18;
const COURT_ROWS = 10;
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class WordSoupService {
  constructor(private readonly prisma: PrismaService) {}

  async initCourt(gameId: number): Promise<{
    trueCourt: CourtCell[][];
    visibleCourt: CourtCell[][];
  }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { group: { include: { currentVocabulary: true } } },
    });
    if (!game) throw new Error(`Game ${gameId} not found`);

    const empty = (): CourtCell[][] =>
      Array.from({ length: COURT_ROWS }, () =>
        Array.from({ length: COURT_COLS }, () => ({ char: '' })),
      );

    const trueCourt = empty();
    const visibleCourt = empty();

    // Placeholder: teammate replaces this with the real word soup algorithm.
    if (game.group.currentVocabulary) {
      const text = game.group.currentVocabulary.words.join(' ').toUpperCase();
      const totalCells = COURT_ROWS * COURT_COLS;
      for (let i = 0; i < totalCells; i++) {
        const row = Math.floor(i / COURT_COLS);
        const col = i % COURT_COLS;
        trueCourt[row][col] = { char: text[i % text.length] ?? '' };
      }
    }

    // Placeholder: teammate replaces this with the real clutter algorithm.
    for (let row = 0; row < COURT_ROWS; row++) {
      for (let col = 0; col < COURT_COLS; col++) {
        visibleCourt[row][col] = { char: 'S' };
      }
    }

    return { trueCourt, visibleCourt };
  }
}