export const TEST_VOCABULARY = {
  name: 'English - German Test List',
  words: ['hello', 'cat', 'house', 'water', 'book'],
  meanings: ['Hallo', 'Katze', 'Haus', 'Wasser', 'Buch'],
};

export function isStarterVocabulary(name: string): boolean {
  return name === TEST_VOCABULARY.name;
}
