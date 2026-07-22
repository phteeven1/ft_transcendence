'use client';

import { Button } from '../../components/ui/button';

type Props = {
  onSkip: () => void;
};

export default function CorrectionPuzzle({ onSkip }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-lg font-semibold font-heading text-foreground">Correction Puzzle</p>
      <p className="text-sm text-muted-foreground">Find and fix the mistake</p>
      <Button variant="ghost" size="sm" onClick={onSkip} className="mt-4">
        Skip
      </Button>
    </div>
  );
}
