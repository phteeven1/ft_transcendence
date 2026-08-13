/** 
 * Longest word in the game vocabulary (used to size the intro bubble). 
 */
export function longestSolutionWord(words: string[]): string {
  if (words.length === 0) return '';
  return words.reduce((longest, word) =>
    word.length > longest.length ? word : longest,
  );
}

/** 
 * Horizontal space inside the bubble beyond the word text (padding, border, caret). 
 */
export function introBubbleHorizontalInset(compact: boolean): number {
  // px-* + border-[3px] on each side + caret
  return compact ? 24 + 6 + 10 : 40 + 6 + 12;
}
