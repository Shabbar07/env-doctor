import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('CLI flags', () => {
  const cliPath = path.resolve(process.cwd(), 'dist/cli.js');
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/sample-project');

  it('outputs JSON format when --json is provided', async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      '--dir',
      fixtureDir,
      '--json',
    ]);

    const parsed = JSON.parse(stdout);
    expect(parsed.missing).toBeInstanceOf(Array);
    expect(parsed.unused).toBeInstanceOf(Array);
    expect(parsed.undocumented).toBeInstanceOf(Array);
    expect(parsed.summary.missingCount).toBeGreaterThan(0);
  });

  it('exits with code 1 when --strict is provided and issues exist', async () => {
    try {
      await execFileAsync(process.execPath, [cliPath, '--dir', fixtureDir, '--strict']);
      expect.unreachable('Should have thrown exit code 1');
    } catch (err: any) {
      expect(err.code).toBe(1);
    }
  });

  it('displays version with --version', async () => {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, '--version']);
    expect(stdout.trim()).toBe('v0.1.0');
  });

  it('displays help with --help', async () => {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, '--help']);
    expect(stdout).toContain('env-doctor v0.1.0');
    expect(stdout).toContain('--strict');
    expect(stdout).toContain('--fix');
  });
});
