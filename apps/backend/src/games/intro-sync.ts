/**
 * Shared intro timeline duration estimation for Word Soup and Word Building.
 * Keep timing constants in sync with apps/frontend/app/hooks/game/game-timing.constants.ts
 * (verified by intro-sync.constants.spec.ts).
 *
 * Clients unlock at `playStartedAt` (not when their local typewriter ends), so
 * English-default estimates here only need to be a stable shared target. Use a
 * generous name placeholder so personalized welcomes rarely run longer than the
 * estimate; shorter locales simply hold on GO until play starts.
 */

const INTRO_CHAR_MS = 42;
const INTRO_WORD_CHAR_MS = 70;
const INTRO_HOLD_AFTER_TYPE_MS = 900;
const INTRO_GAP_DURATION_MS = 380 + 420;
const INTRO_COUNTDOWN_STEP_MS = 750;
const INTRO_GO_HOLD_MS = 900;

/** Padded stand-in so personalized "Hello {name}!" estimates cover long names. */
const INTRO_ESTIMATE_PLAYER_NAME = 'XXXXXXXXXXXXXXXX';

export type IntroDurationTexts = {
  welcome: string;
  briefing: string;
  wordsIntro?: string;
  letsGo: string;
};

/** English defaults used only for server-side play-clock estimation. */
export const WORD_SOUP_INTRO_TEXTS: IntroDurationTexts = {
  welcome: 'Welcome to Word Soup!',
  briefing: 'In this game, you have to find words in the grid.',
  wordsIntro: 'Here are the words...',
  letsGo: "OK, let's go!",
};

export const WORD_BUILDING_INTRO_TEXTS: IntroDurationTexts = {
  welcome: `Hello ${INTRO_ESTIMATE_PLAYER_NAME}! Ready to build some words?`,
  briefing:
    'Fill in the crossword grid — click a cell and type, or drag letter tiles from the rack below.',
  letsGo: "OK, let's go!",
};

export type IntroSyncFields = {
  hasPlayerSeenIntro: boolean;
  introStartedAt: number;
  playStartedAt: number;
};

function introSpeechBlockMs(text: string, charMs: number): number {
  return text.length * charMs + INTRO_HOLD_AFTER_TYPE_MS;
}

/**
 * Wall-clock length of the shared intro timeline through GO!, so the play
 * clock can start in sync for all clients.
 */
export function estimateIntroDurationMs(
  texts: IntroDurationTexts,
  solutionWords: string[] = [],
): number {
  let total =
    introSpeechBlockMs(texts.welcome, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS +
    introSpeechBlockMs(texts.briefing, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS;

  if (solutionWords.length > 0) {
    const wordsIntro = texts.wordsIntro ?? 'Here are the words...';
    total +=
      introSpeechBlockMs(wordsIntro, INTRO_CHAR_MS) + INTRO_GAP_DURATION_MS;

    for (const word of solutionWords) {
      total +=
        introSpeechBlockMs(word, INTRO_WORD_CHAR_MS) + INTRO_GAP_DURATION_MS;
    }
  }

  total +=
    introSpeechBlockMs(texts.letsGo, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS +
    INTRO_COUNTDOWN_STEP_MS * 3 +
    INTRO_GO_HOLD_MS;

  return total;
}
