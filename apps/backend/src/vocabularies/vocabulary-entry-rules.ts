import { BadRequestException } from '@nestjs/common';

export const MAX_VOCAB_ENTRY_CHARS = 18;

const WHITESPACE = /\s/;

export function normalizeVocabularyEntries(
  words: string[],
  meanings: string[],
): { words: string[]; meanings: string[] } {
  if (words.length !== meanings.length) {
    throw new BadRequestException(
      'Words and meanings must have the same number of entries.',
    );
  }

  const normalizedWords: string[] = [];
  const normalizedMeanings: string[] = [];
  const seenWords = new Set<string>();
  const seenMeanings = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i]?.trim() ?? '';
    const meaning = meanings[i]?.trim() ?? '';
    if (!word || !meaning) {
      throw new BadRequestException('Each entry needs a word and a meaning.');
    }
    if (WHITESPACE.test(word) || WHITESPACE.test(meaning)) {
      throw new BadRequestException(
        'Words and meanings cannot contain spaces or other whitespace.',
      );
    }
    if (
      word.length > MAX_VOCAB_ENTRY_CHARS ||
      meaning.length > MAX_VOCAB_ENTRY_CHARS
    ) {
      throw new BadRequestException(
        `Words and meanings must be at most ${MAX_VOCAB_ENTRY_CHARS} characters.`,
      );
    }
    const wordKey = word.toLowerCase();
    const meaningKey = meaning.toLowerCase();
    if (seenWords.has(wordKey) || seenMeanings.has(meaningKey)) {
      throw new BadRequestException(
        'Each word and each meaning must be unique.',
      );
    }
    seenWords.add(wordKey);
    seenMeanings.add(meaningKey);
    normalizedWords.push(word);
    normalizedMeanings.push(meaning);
  }

  return { words: normalizedWords, meanings: normalizedMeanings };
}
