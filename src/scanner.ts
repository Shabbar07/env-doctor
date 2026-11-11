import * as fs from 'node:fs';
import * as path from 'node:path';

export interface EnvUsage {
  varName: string;
  filePath: string;
  line: number;
  column?: number;
  raw?: string;
}

export interface ScannerOptions {
  rootDir: string;
  ignorePatterns?: string[];
}

export const DEFAULT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
]);

export const DEFAULT_IGNORES = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
  'coverage',
];

/**
 * Converts a simple glob-like pattern to a regular expression.
 */
export function globToRegex(pattern: string): RegExp {
  let normalized = pattern.replace(/\\/g, '/').trim();
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  let p = normalized;
  let anchoredStart = false;

  if (p.startsWith('/')) {
    anchoredStart = true;
    p = p.slice(1);
  }

  let res = '';
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      if (p[i + 2] === '/') {
        res += '(?:.+/)?';
        i += 3;
      } else {
        res += '.*';
        i += 2;
      }
    } else if (c === '*') {
      res += '[^/]*';
      i++;
    } else if (c === '?') {
      res += '[^/]';
      i++;
    } else if (
      ['.', '(', ')', '+', '^', '$', '[', ']', '{', '}', '|', '\\'].includes(c)
    ) {
      res += '\\' + c;
      i++;
    } else {
      res += c;
      i++;
    }
  }

  const startRegex = anchoredStart ? '^' : '(?:^|/)';
  const endRegex = '(?:$|/)';
  return new RegExp(startRegex + res + endRegex, 'i');
}

/**
 * Checks if a relative path matches the default ignore list or custom ignore patterns.
 */
export function shouldIgnore(
  relPath: string,
  fileName: string,
  customIgnores: string[] = [],
): boolean {
  const normRel = relPath.replace(/\\/g, '/');

  // Check default folder ignores
  const segments = normRel.split('/');
  for (const seg of segments) {
    if (DEFAULT_IGNORES.includes(seg)) {
      return true;
    }
  }

  // Check custom ignore patterns
  for (const pattern of customIgnores) {
    if (!pattern) continue;
    const regex = globToRegex(pattern);
    if (regex.test(normRel) || regex.test(fileName)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively find all source code files within rootDir matching supported extensions.
 */
export function findSourceFiles(rootDir: string, customIgnores: string[] = []): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err: any) {
      process.stderr.write(
        `Warning: Could not read directory ${currentDir}: ${err?.message || err}\n`,
      );
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        if (!shouldIgnore(relPath, entry.name, customIgnores)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (DEFAULT_EXTENSIONS.has(ext)) {
          if (!shouldIgnore(relPath, entry.name, customIgnores)) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  walk(rootDir);
  return files;
}

/**
 * Scans a code string for environment variable accesses:
 * 1. process.env.VAR
 * 2. process.env['VAR'] / process.env["VAR"]
 * 3. import.meta.env.VAR / import.meta.env['VAR']
 * 4. Destructuring: const { VAR1, VAR2: alias, VAR3 = default } = process.env (or import.meta.env)
 */
export function scanCodeContent(content: string, filePath: string): EnvUsage[] {
  const usages: EnvUsage[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (!line.includes('env')) {
      continue;
    }

    // 1) Direct property access: process.env.NAME or import.meta.env.NAME
    const dotRegex = /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)/g;
    let match: RegExpExecArray | null;
    while ((match = dotRegex.exec(line)) !== null) {
      usages.push({
        varName: match[1],
        filePath,
        line: lineNum,
        raw: match[0],
      });
    }

    // 2) Bracket access: process.env['NAME'] or import.meta.env["NAME"]
    const bracketRegex =
      /(?:process\.env|import\.meta\.env)\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;
    while ((match = bracketRegex.exec(line)) !== null) {
      usages.push({
        varName: match[1],
        filePath,
        line: lineNum,
        raw: match[0],
      });
    }
  }

  // 3) Destructuring access across entire content (handles single and multi-line)
  const destructureRegex =
    /(?:const|let|var|\()\s*\{([^}]+)\}\s*=\s*(?:process\.env|import\.meta\.env)/g;
  let dMatch: RegExpExecArray | null;
  while ((dMatch = destructureRegex.exec(content)) !== null) {
    const innerPattern = dMatch[1];
    const matchIndex = dMatch.index;
    const lineNum = content.slice(0, matchIndex).split(/\r?\n/).length;

    const parts = innerPattern.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith('...')) {
        continue;
      }

      // Check identifier: `KEY`, `KEY: alias`, or `KEY = default`
      const nameMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed);
      if (nameMatch) {
        usages.push({
          varName: nameMatch[1],
          filePath,
          line: lineNum,
          raw: trimmed,
        });
      }
    }
  }

  return usages;
}

/**
 * Scans a file on disk, returning all env usages.
 */
export function scanFile(filePath: string): EnvUsage[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return scanCodeContent(content, filePath);
  } catch (err: any) {
    process.stderr.write(
      `Warning: Could not read file ${filePath}: ${err?.message || err}\n`,
    );
    return [];
  }
}

/**
 * Scans an entire project directory.
 */
export function scanProject(options: ScannerOptions): EnvUsage[] {
  const files = findSourceFiles(options.rootDir, options.ignorePatterns);
  const allUsages: EnvUsage[] = [];

  for (const file of files) {
    const usages = scanFile(file);
    allUsages.push(...usages);
  }

  return allUsages;
}
