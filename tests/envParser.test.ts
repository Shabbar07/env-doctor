import { describe, it, expect } from 'vitest';
import { parseEnvContent } from '../src/envParser.js';

describe('Env parser', () => {
  it('parses basic variables, quotes, and inline comments', () => {
    const raw = `
# System Config
PORT=3000
HOST="localhost"
API_KEY='secret_123' # inline comment
DATABASE_URL=postgres://user:pass@localhost:5432/mydb # unquoted with comment
export JWT_SECRET="super-secret"
EMPTY_VAL=
`;

    const parsed = parseEnvContent(raw, '.env');
    expect(parsed.variables.get('PORT')).toBe('3000');
    expect(parsed.variables.get('HOST')).toBe('localhost');
    expect(parsed.variables.get('API_KEY')).toBe('secret_123');
    expect(parsed.variables.get('DATABASE_URL')).toBe(
      'postgres://user:pass@localhost:5432/mydb',
    );
    expect(parsed.variables.get('JWT_SECRET')).toBe('super-secret');
    expect(parsed.variables.get('EMPTY_VAL')).toBe('');
    expect(parsed.lines.get('PORT')).toBe(3);
    expect(parsed.lines.get('HOST')).toBe(4);
  });

  it('ignores invalid variable names and comments', () => {
    const raw = `
# Comment
123INVALID=value
VALID_ONE=ok
`;
    const parsed = parseEnvContent(raw);
    expect(parsed.variables.has('VALID_ONE')).toBe(true);
    expect(parsed.variables.has('123INVALID')).toBe(false);
  });
});
