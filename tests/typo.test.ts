import { describe, it, expect } from 'vitest';
import { levenshtein, findTypoSuggestions } from '../src/typo.js';

describe('Typo detector', () => {
  it('calculates levenshtein distance correctly', () => {
    expect(levenshtein('PORT', 'PORT')).toBe(0);
    expect(levenshtein('PORT', 'POST')).toBe(1);
    expect(levenshtein('PORT', 'POT')).toBe(1);
    expect(levenshtein('PORT', 'PORTS')).toBe(1);
    expect(levenshtein('DATABSE_URL', 'DATABASE_URL')).toBe(1);
    expect(levenshtein('DATABASE_URL', 'DB_URL')).toBe(6);
  });

  it('suggests closest match within distance threshold', () => {
    const defined = ['DATABASE_URL', 'PORT', 'API_KEY', 'SESSION_SECRET'];

    expect(findTypoSuggestions('DATABSE_URL', defined, 2)).toEqual(['DATABASE_URL']);
    expect(findTypoSuggestions('POT', defined, 2)).toEqual(['PORT']);
    expect(findTypoSuggestions('API_KYY', defined, 2)).toEqual(['API_KEY']);
    expect(findTypoSuggestions('TOTALLY_UNRELATED', defined, 2)).toEqual([]);
  });
});
