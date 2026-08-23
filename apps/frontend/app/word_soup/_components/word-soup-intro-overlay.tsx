'use client';

import { useLayoutEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CountdownBubble,
  GameOverlayShell,
  HostSpeechStack,
  OVERLAY_SCALE,
  SpeechBubble,
} from '@/app/components/game/overlay';
import type {
  IntroCountdownValue,
  IntroPhase,
} from '@/app/hooks/game/use-game-intro';

function longestSolutionWord(words: string[]): string {
  if (words.length === 0) return '';
  return words.reduce((longest, word) =>
    word.length > longest.length ? word : longest,
  );
}

type WordSoupIntroOverlayProps = {
  phase: IntroPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  wordRevealIndex: number;
  totalWords: number;
  countdownValue: IntroCountdownValue;
  solutionWords: string[];
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
};

function useWordFitScale(longestWord: string): {
  wordScale: number;
  setSlotEl: (element: HTMLDivElement | null) => void;
  setMeasureEl: (element: HTMLSpanElement | null) => void;
} {
  const [wordScale, setWordScale] = useState(1);
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);
  const [measureEl, setMeasureEl] = useState<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!longestWord || !slotEl || !measureEl) return;

    const update = () => {
      const available = Math.max(
        0,
        slotEl.clientWidth - OVERLAY_SCALE.bubbleInsetPx,
      );
      const needed = measureEl.getBoundingClientRect().width;
      setWordScale(
        needed > 0 && available > 0 ? Math.min(1, available / needed) : 1,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(slotEl);
    return () => observer.disconnect();
  }, [longestWord, measureEl, slotEl]);

  return { wordScale, setSlotEl, setMeasureEl };
}

export default function WordSoupIntroOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  wordRevealIndex,
  totalWords,
  countdownValue,
  solutionWords = [],
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
}: WordSoupIntroOverlayProps) {
  const t = useTranslations('games.wordSoup.intro');
  const isWordPhase = phase === 'word' || phase === 'word-gap';
  const longestWord = longestSolutionWord(solutionWords);
  const { wordScale, setSlotEl, setMeasureEl } =
    useWordFitScale(longestWord);

  const bubble =
    phase === 'countdown' && countdownValue !== null ? (
      <CountdownBubble
        value={countdownValue}
        startingInLabel={t('startingIn')}
        goLabel={t('go')}
      />
    ) : (
      <SpeechBubble
        text={bubbleText}
        visible={bubbleVisible}
        emphasize={isWordPhase}
        wordScale={wordScale}
      />
    );

  return (
    <GameOverlayShell zIndexClass="z-30" rounded>
      {longestWord ? (
        <span
          ref={setMeasureEl}
          aria-hidden
          className={[
            'pointer-events-none invisible absolute whitespace-nowrap font-bold',
            OVERLAY_SCALE.bubbleWordTextClass,
          ].join(' ')}
        >
          {longestWord}
        </span>
      ) : null}

      <div
        className={[
          'flex h-full w-full flex-col items-center',
          OVERLAY_SCALE.overlayPadClass,
          OVERLAY_SCALE.stackGapClass,
        ].join(' ')}
      >
        <div
          ref={setSlotEl}
          className="flex min-h-0 w-full flex-[1.35] flex-col items-center justify-end"
        >
          <HostSpeechStack
            bubble={bubble}
            hostTier={hostTier}
            hostAnimal={hostAnimal}
            hostClothesColor={hostClothesColor}
          />
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-hidden">
          {totalWords > 0 ? (
            <p
              className={[
                'font-semibold uppercase text-teal-100/80',
                OVERLAY_SCALE.labelClass,
                isWordPhase ? '' : 'invisible',
              ].join(' ')}
              aria-hidden={!isWordPhase}
            >
              {t('wordOf', {
                current: Math.min(wordRevealIndex + 1, totalWords),
                total: totalWords,
              })}
            </p>
          ) : null}
        </div>
      </div>
    </GameOverlayShell>
  );
}
