'use client';

import {
  useGameOver,
  type UseGameOverProps,
} from '@/app/hooks/game/use-game-over';
import { GAME_OVER_COURT_HOLD_MS } from '@/app/word_soup/_lib/word-soup-constants';

type UseWordSoupGameOverProps = Omit<UseGameOverProps, 'holdDurationMs'>;

export function useWordSoupGameOver(props: UseWordSoupGameOverProps) {
  return useGameOver({
    ...props,
    holdDurationMs: GAME_OVER_COURT_HOLD_MS,
  });
}
