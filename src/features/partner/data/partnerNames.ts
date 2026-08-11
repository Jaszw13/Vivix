export const CAT_DEFAULT_NAMES = ['Mochi', 'Latte', 'Yuzu'];
export const DOG_DEFAULT_NAMES = ['Bao', 'Biscuit', 'Toast'];

export function getDefaultNames(species: 'cat' | 'dog'): string[] {
  return species === 'cat' ? CAT_DEFAULT_NAMES : DOG_DEFAULT_NAMES;
}
