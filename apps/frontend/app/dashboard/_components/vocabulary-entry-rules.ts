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

export function isEntryComplete(entry: VocabularyEntry): boolean {
  return entry.word.trim() !== '' && entry.meaning.trim() !== '';
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

export function canAddVocabularyEntry(entries: VocabularyEntry[]): boolean {
  const last = entries[entries.length - 1];
  if (!last) return true;
  return isEntryComplete(last);
}

export function duplicateFieldKeys(entries: VocabularyEntry[]): {
  words: Set<string>;
  meanings: Set<string>;
} {
  const wordCounts = new Map<string, number>();
  const meaningCounts = new Map<string, number>();
  for (const entry of entries) {
    const word = fieldKey(entry.word);
    const meaning = fieldKey(entry.meaning);
    if (word) wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    if (meaning) {
      meaningCounts.set(meaning, (meaningCounts.get(meaning) ?? 0) + 1);
    }
  }

  const words = new Set<string>();
  const meanings = new Set<string>();
  for (const [key, count] of wordCounts) {
    if (count > 1) words.add(key);
  }
  for (const [key, count] of meaningCounts) {
    if (count > 1) meanings.add(key);
  }
  return { words, meanings };
}

export function hasDuplicateWordOrMeaning(
  entries: VocabularyEntry[],
): boolean {
  const keys = duplicateFieldKeys(entries);
  return keys.words.size > 0 || keys.meanings.size > 0;
}

export function areVocabularyEntriesValid(
  entries: VocabularyEntry[],
): boolean {
  if (entries.length < MIN_VOCAB_PAIRS) return false;
  if (!entries.every(isEntryComplete)) return false;
  if (hasDuplicateWordOrMeaning(entries)) return false;
  return entries.every(
    (entry) =>
      entry.word.trim().length <= MAX_VOCAB_ENTRY_CHARS &&
      entry.meaning.trim().length <= MAX_VOCAB_ENTRY_CHARS &&
      !/\s/.test(entry.word.trim()) &&
      !/\s/.test(entry.meaning.trim()),
  );
}
