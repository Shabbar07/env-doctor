import * as fs from 'node:fs';
import * as path from 'node:path';

export interface EnvParseResult {
  filePath: string;
  variables: Map<string, string>;
  lines: Map<string, number>;
}

/**
 * Parses raw .env file string content into key-value pairs with line numbers.
 * Supports:
 * - Comments starting with #
 * - Inline comments for unquoted values
 * - Single/double quoted values preserving spaces/quotes
 * - `export VAR=VAL` prefix
 * - Blank lines & whitespace
 */
export function parseEnvContent(content: string, filePath = '.env'): EnvParseResult {
  const variables = new Map<string, string>();
  const lines = new Map<string, number>();

  const splitLines = content.split(/\r?\n/);

  for (let i = 0; i < splitLines.length; i++) {
    const rawLine = splitLines[i];
    const lineNumber = i + 1;
    let line = rawLine.trim();

    // Ignore empty lines and full line comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Support `export VAR=VALUE`
    if (line.startsWith('export ') || line.startsWith('export\t')) {
      line = line.replace(/^export\s+/, '').trim();
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();

    // Validate identifier (must start with letter or underscore, followed by alphanumeric/underscore)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    // Strip quotes or inline comments
    if (val.startsWith('"')) {
      const endQuote = val.indexOf('"', 1);
      if (endQuote !== -1) {
        val = val.slice(1, endQuote);
      } else {
        val = val.slice(1);
      }
    } else if (val.startsWith("'")) {
      const endQuote = val.indexOf("'", 1);
      if (endQuote !== -1) {
        val = val.slice(1, endQuote);
      } else {
        val = val.slice(1);
      }
    } else {
      const commentIdx = val.indexOf('#');
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }

    variables.set(key, val);
    if (!lines.has(key)) {
      lines.set(key, lineNumber);
    }
  }

  return { filePath, variables, lines };
}

/**
 * Safely loads and parses an env file from disk.
 * Returns null if the file does not exist or cannot be read.
 */
export function loadEnvFile(filePath: string): EnvParseResult | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseEnvContent(content, filePath);
  } catch (err: any) {
    process.stderr.write(
      `Warning: Could not read env file ${filePath}: ${err?.message || err}\n`,
    );
    return null;
  }
}

export interface ProjectEnvs {
  envFile: EnvParseResult | null;
  envLocalFile: EnvParseResult | null;
  exampleEnv: EnvParseResult | null;
  allDefinedKeys: Set<string>;
}

/**
 * Loads project env files according to custom or default paths.
 */
export function loadProjectEnvs(
  rootDir: string,
  envFileName = '.env',
  exampleFileName = '.env.example',
): ProjectEnvs {
  const envPath = path.isAbsolute(envFileName)
    ? envFileName
    : path.resolve(rootDir, envFileName);

  const localEnvPath = path.resolve(rootDir, '.env.local');

  const examplePath = path.isAbsolute(exampleFileName)
    ? exampleFileName
    : path.resolve(rootDir, exampleFileName);

  const envFile = loadEnvFile(envPath);
  const envLocalFile = loadEnvFile(localEnvPath);
  const exampleEnv = loadEnvFile(examplePath);

  const allDefinedKeys = new Set<string>();

  if (envFile) {
    for (const key of envFile.variables.keys()) {
      allDefinedKeys.add(key);
    }
  }

  if (envLocalFile) {
    for (const key of envLocalFile.variables.keys()) {
      allDefinedKeys.add(key);
    }
  }

  return {
    envFile,
    envLocalFile,
    exampleEnv,
    allDefinedKeys,
  };
}

/**
 * Append missing keys to the example env file.
 */
export function appendKeysToExample(examplePath: string, keys: string[]): boolean {
  if (keys.length === 0) return true;

  try {
    let content = '';
    if (fs.existsSync(examplePath)) {
      content = fs.readFileSync(examplePath, 'utf-8');
    }

    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }

    content += '\n# Added by env-doctor --fix\n';
    for (const key of keys) {
      content += `${key}=\n`;
    }

    fs.writeFileSync(examplePath, content, 'utf-8');
    return true;
  } catch (err: any) {
    process.stderr.write(`Error writing to ${examplePath}: ${err?.message || err}\n`);
    return false;
  }
}
