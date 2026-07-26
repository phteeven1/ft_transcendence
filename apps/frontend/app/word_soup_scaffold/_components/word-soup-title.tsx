'use client';

type WordSoupTitleProps = {
  wordsFound: number;
  totalWords: number;
};

/** Compact brand title for the top-left corner above the player rail. */
export default function WordSoupTitle({ wordsFound, totalWords }: WordSoupTitleProps) {
  const progress = totalWords > 0 ? Math.min(1, wordsFound / totalWords) : 0;

  return (
    <header className="flex h-full w-full flex-col justify-center gap-1.5">
      <div className="rounded-2xl border border-emerald-200 bg-white/90 px-2.5 py-2 shadow-sm sm:px-3">
        <h1 className="font-heading text-center text-lg font-black leading-none tracking-tight text-emerald-800 sm:text-xl">
          Word Soup
        </h1>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalWords}
        aria-valuenow={wordsFound}
        aria-label="Words found"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </header>
  );
}
