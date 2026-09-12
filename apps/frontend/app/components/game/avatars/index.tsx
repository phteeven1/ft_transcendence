'use client';

import { AnimalsFigure } from './animals';
import { ClassicFigure } from './classic';
import type { ThemeFigureProps } from './types';
import { clampStage } from './types';

export type AvatarThemeKey = 'classic' | 'animals';

export function ThemeFigure({
  theme,
  ...props
}: ThemeFigureProps & { theme: string }) {
  const stage = clampStage(props.stage);
  const figureProps = { ...props, stage };

  switch (theme) {
    case 'animals':
      return <AnimalsFigure {...figureProps} />;
    case 'classic':
    default:
      return <ClassicFigure {...figureProps} />;
  }
}

export { AnimalsFigure } from './animals';
export { ClassicFigure } from './classic';
export { clampAnimal, clampStage } from './types';
export type { ThemeFigureProps } from './types';
