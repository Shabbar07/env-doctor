import { describe, it, expect } from 'vitest';
import { scanCodeContent } from '../src/scanner.js';

describe('Scanner', () => {
  it('detects process.env.NAME', () => {
    const code = `
const port = process.env.PORT || 3000;
const host = process.env.HOST;
`;
    const usages = scanCodeContent(code, 'app.ts');
    const names = usages.map((u) => u.varName);
    expect(names).toContain('PORT');
    expect(names).toContain('HOST');
    expect(usages.find((u) => u.varName === 'PORT')?.line).toBe(2);
  });

  it('detects process.env["NAME"] and process.env[\'NAME\']', () => {
    const code = `
const a = process.env['REDIS_URL'];
const b = process.env["AUTH_SECRET"];
`;
    const usages = scanCodeContent(code, 'redis.js');
    const names = usages.map((u) => u.varName);
    expect(names).toContain('REDIS_URL');
    expect(names).toContain('AUTH_SECRET');
  });

  it('detects import.meta.env.NAME (Vite)', () => {
    const code = `
const apiUrl = import.meta.env.VITE_API_URL;
const appTitle = import.meta.env['VITE_APP_TITLE'];
`;
    const usages = scanCodeContent(code, 'App.vue');
    const names = usages.map((u) => u.varName);
    expect(names).toContain('VITE_API_URL');
    expect(names).toContain('VITE_APP_TITLE');
  });

  it('detects destructuring of process.env', () => {
    const code = `
const { PORT, NODE_ENV: mode, DEBUG = false } = process.env;
const { VITE_KEY } = import.meta.env;
`;
    const usages = scanCodeContent(code, 'server.ts');
    const names = usages.map((u) => u.varName);
    expect(names).toContain('PORT');
    expect(names).toContain('NODE_ENV');
    expect(names).toContain('DEBUG');
    expect(names).toContain('VITE_KEY');
  });
});
