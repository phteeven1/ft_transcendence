export type ThemeFigureProps = {
  /** XP rank stage 0–4 (drives cosmetic upgrades). */
  stage: number;
  /** Animal species 0–4 (rabbit → lion). Ignored for classic. */
  animal?: number;
  outfit: string;
  outfitLight: string;
  shadow: string;
  presentation?: boolean;
};

export function clampStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.max(0, Math.min(4, Math.floor(stage)));
}

export function clampAnimal(animal: number): number {
  if (!Number.isFinite(animal)) return 0;
  return Math.max(0, Math.min(4, Math.floor(animal)));
}
