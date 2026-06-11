'use client';

type Props = {
  onSkip: () => void;
};

export default function MeansWhatPuzzle({ onSkip }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-lg font-semibold text-gray-700">Means What Puzzle</p>
      <p className="text-sm text-gray-500">What does this word mean?</p>
      <button
        onClick={onSkip}
        className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-1 px-4 rounded transition-colors"
      >
        Skip
      </button>
    </div>
  );
}