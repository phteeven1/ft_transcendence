function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseHex(
  hex: string,
): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g)
    .toString(16)
    .padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
}

/** `amount` is 0–1 (fraction toward white). */
export function lighten(hex: string, amount = 0.45): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

/** `amount` is 0–1 (fraction toward black). */
export function darken(hex: string, amount = 0.22): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
}
