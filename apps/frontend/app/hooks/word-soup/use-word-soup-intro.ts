'use client';

import {
  useGameIntro,
  type UseGameIntroProps,
} from '@/app/hooks/game/use-game-intro';
import { gamesApi } from '@/lib/api';

type UseWordSoupIntroProps = Omit<UseGameIntroProps, 'markIntroShown'>;

function markIntroShown(gameId: number): Promise<unknown> {
  return gamesApi.markIntroShown({ gameId });
}

export function useWordSoupIntro(props: UseWordSoupIntroProps) {
  return useGameIntro({
    ...props,
    markIntroShown,
  });
}
