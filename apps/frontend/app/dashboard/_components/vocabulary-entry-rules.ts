export const MAX_VOCAB_ENTRY_CHARS = 18;
export const MIN_VOCAB_PAIRS = 5;

type VocabularyEntry = {
  word: string;
  meaning: string;
};

export function stripEntryWhitespace(value: string): string {
  return value.replace(/\s/g, '').slice(0, MAX_VOCAB_ENTRY_CHARS);
}

function fieldKey(value: string): string {
  return value.trim().toLowerCase();
}

export function completeEntries(
  entries: VocabularyEntry[],
): VocabularyEntry[] {
  return entries
    .map((entry) => ({
      word: entry.word.trim(),
      meaning: entry.meaning.trim(),
    }))
    .filter((entry) => entry.word !== '' && entry.meaning !== '');
}

export function hasDuplicateWordOrMeaning(
  entries: VocabularyEntry[],
): boolean {
  const words = new Set<string>();
  const meanings = new Set<string>();
  for (const entry of entries) {
    const word = fieldKey(entry.word);
    const meaning = fieldKey(entry.meaning);
    if (word) {
      if (words.has(word)) return true;
      words.add(word);
    }
    if (meaning) {
      if (meanings.has(meaning)) return true;
      meanings.add(meaning);
    }
  }
  return false;
}

export function areVocabularyEntriesValid(
  entries: VocabularyEntry[],
): boolean {
  const complete = completeEntries(entries);
  if (complete.length < MIN_VOCAB_PAIRS) return false;
  if (hasDuplicateWordOrMeaning(entries)) return false;
  return complete.every(
    (entry) =>
      entry.word.length <= MAX_VOCAB_ENTRY_CHARS &&
      entry.meaning.length <= MAX_VOCAB_ENTRY_CHARS &&
      !/\s/.test(entry.word) &&
      !/\s/.test(entry.meaning),
  );
}
