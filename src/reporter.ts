import * as path from 'node:path';
import { EnvUsage } from './scanner.js';
import { ProjectEnvs } from './envParser.js';
import { findTypoSuggestions } from './typo.js';

export interface UsageLocation {
  filePath: string;
  line: number;
}

export interface MissingIssue {
  varName: string;
  usages: UsageLocation[];
  suggestions: string[];
}

export interface UnusedIssue {
  varName: string;
  definedIn: { filePath: string; line: number }[];
}

export interface UndocumentedIssue {
  varName: string;
  definedIn: { filePath: string; line: number }[];
}

export interface TypoIssue {
  varName: string;
  suggestions: string[];
  usages: UsageLocation[];
}

export interface AnalysisSummary {
  missingCount: number;
  unusedCount: number;
  undocumentedCount: number;
  typoCount: number;
  totalIssues: number;
}

export interface AnalysisReport {
  missing: MissingIssue[];
  unused: UnusedIssue[];
  undocumented: UndocumentedIssue[];
  typos: TypoIssue[];
  summary: AnalysisSummary;
}

export interface AnsiColors {
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  blue: (s: string) => string;
  magenta: (s: string) => string;
  cyan: (s: string) => string;
  gray: (s: string) => string;
  bold: (s: string) => string;
}

export function createColorStyler(enabled: boolean): AnsiColors {
  if (!enabled) {
    const id = (s: string) => s;
    return {
      red: id,
      green: id,
      yellow: id,
      blue: id,
      magenta: id,
      cyan: id,
      gray: id,
      bold: id,
    };
  }

  return {
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
    green: (s: string) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
    blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
    magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
    gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
    bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  };
}

/**
 * Analyzes env usages against project .env and .env.example definitions.
 */
export function analyze(
  usages: EnvUsage[],
  projectEnvs: ProjectEnvs,
  rootDir = '.',
): AnalysisReport {
  // 1. Group usages by variable name
  const usageMap = new Map<string, UsageLocation[]>();
  for (const u of usages) {
    const list = usageMap.get(u.varName) || [];
    const relFile = path.relative(rootDir, u.filePath).replace(/\\/g, '/');
    list.push({ filePath: relFile || u.filePath, line: u.line });
    usageMap.set(u.varName, list);
  }

  // Combine keys from both .env and .env.example for known definitions
  const allKnownKeys = new Set<string>(projectEnvs.allDefinedKeys);
  if (projectEnvs.exampleEnv) {
    for (const k of projectEnvs.exampleEnv.variables.keys()) {
      allKnownKeys.add(k);
    }
  }

  // 2. MISSING: used in code but not defined in .env / .env.example
  const missing: MissingIssue[] = [];
  const typos: TypoIssue[] = [];

  for (const [varName, locs] of usageMap.entries()) {
    if (!allKnownKeys.has(varName)) {
      const suggestions = findTypoSuggestions(varName, allKnownKeys, 2);
      missing.push({
        varName,
        usages: locs,
        suggestions,
      });

      if (suggestions.length > 0) {
        typos.push({
          varName,
          suggestions,
          usages: locs,
        });
      }
    }
  }
  missing.sort((a, b) => a.varName.localeCompare(b.varName));
  typos.sort((a, b) => a.varName.localeCompare(b.varName));

  // 3. UNUSED: defined in .env / .env.example but never used in code
  const unused: UnusedIssue[] = [];
  const envSources = [
    projectEnvs.envFile,
    projectEnvs.envLocalFile,
    projectEnvs.exampleEnv,
  ].filter(Boolean);

  for (const ef of envSources) {
    if (!ef) continue;
    for (const [key] of ef.variables) {
      if (!usageMap.has(key)) {
        let entry = unused.find((u) => u.varName === key);
        const rel = path.relative(rootDir, ef.filePath).replace(/\\/g, '/');
        const line = ef.lines.get(key) || 1;
        if (!entry) {
          entry = { varName: key, definedIn: [] };
          unused.push(entry);
        }
        if (!entry.definedIn.some((d) => d.filePath === rel && d.line === line)) {
          entry.definedIn.push({ filePath: rel || ef.filePath, line });
        }
      }
    }
  }
  unused.sort((a, b) => a.varName.localeCompare(b.varName));

  // 4. UNDOCUMENTED: present in .env but missing from .env.example
  const undocumented: UndocumentedIssue[] = [];
  if (projectEnvs.exampleEnv) {
    const exampleKeys = new Set(projectEnvs.exampleEnv.variables.keys());
    const actualEnvs = [projectEnvs.envFile, projectEnvs.envLocalFile].filter(Boolean);

    for (const ef of actualEnvs) {
      if (!ef) continue;
      for (const [key] of ef.variables) {
        if (!exampleKeys.has(key)) {
          let entry = undocumented.find((u) => u.varName === key);
          const rel = path.relative(rootDir, ef.filePath).replace(/\\/g, '/');
          const line = ef.lines.get(key) || 1;
          if (!entry) {
            entry = { varName: key, definedIn: [] };
            undocumented.push(entry);
          }
          if (!entry.definedIn.some((d) => d.filePath === rel && d.line === line)) {
            entry.definedIn.push({ filePath: rel || ef.filePath, line });
          }
        }
      }
    }
  }
  undocumented.sort((a, b) => a.varName.localeCompare(b.varName));

  const totalIssues = missing.length + unused.length + undocumented.length;

  return {
    missing,
    unused,
    undocumented,
    typos,
    summary: {
      missingCount: missing.length,
      unusedCount: unused.length,
      undocumentedCount: undocumented.length,
      typoCount: typos.length,
      totalIssues,
    },
  };
}

/**
 * Formats a terminal-friendly string report with colors and witty, clear messages.
 */
export function formatTerminalReport(
  report: AnalysisReport,
  colorsEnabled = true,
): string {
  const c = createColorStyler(colorsEnabled);
  const out: string[] = [];

  if (report.summary.totalIssues === 0) {
    out.push(
      c.green(
        '🩺 Clean bill of health! All environment variables are accounted for and documented.',
      ),
    );
    return out.join('\n');
  }

  out.push(c.bold('🩺 Env Doctor Diagnosis:'));
  out.push('');

  // 1. MISSING
  if (report.missing.length > 0) {
    out.push(
      c.bold(c.red('🔴 MISSING')) +
        c.gray(` (${report.missing.length})`) +
        c.gray(' - Used in code but missing from .env files:'),
    );

    for (const item of report.missing) {
      let line = `  ${c.red('✖')} ${c.bold(item.varName)}`;
      if (item.suggestions.length > 0) {
        line += ` ${c.yellow(`(did you mean ${item.suggestions.map((s) => c.bold(s)).join(' or ')}?)`)}`;
      }
      out.push(line);

      for (const loc of item.usages) {
        out.push(c.gray(`    at ${loc.filePath}:${loc.line}`));
      }
    }
    out.push('');
  }

  // 2. UNUSED
  if (report.unused.length > 0) {
    out.push(
      c.bold(c.yellow('🟡 UNUSED')) +
        c.gray(` (${report.unused.length})`) +
        c.gray(' - Defined in env files but never referenced in code:'),
    );

    for (const item of report.unused) {
      out.push(`  ${c.yellow('▲')} ${c.bold(item.varName)}`);
      for (const def of item.definedIn) {
        out.push(c.gray(`    defined in ${def.filePath}:${def.line}`));
      }
    }
    out.push('');
  }

  // 3. UNDOCUMENTED
  if (report.undocumented.length > 0) {
    out.push(
      c.bold(c.cyan('🔵 UNDOCUMENTED')) +
        c.gray(` (${report.undocumented.length})`) +
        c.gray(' - Present in .env but missing from .env.example:'),
    );

    for (const item of report.undocumented) {
      out.push(`  ${c.cyan('ℹ')} ${c.bold(item.varName)}`);
      for (const def of item.definedIn) {
        out.push(c.gray(`    defined in ${def.filePath}:${def.line}`));
      }
    }
    out.push('');
  }

  // Short summary line
  const summaryParts: string[] = [];
  if (report.summary.missingCount > 0) {
    summaryParts.push(
      `${report.summary.missingCount} missing${report.summary.typoCount > 0 ? ` (${report.summary.typoCount} typo${report.summary.typoCount === 1 ? '' : 's'})` : ''}`,
    );
  }
  if (report.summary.unusedCount > 0) {
    summaryParts.push(`${report.summary.unusedCount} unused`);
  }
  if (report.summary.undocumentedCount > 0) {
    summaryParts.push(`${report.summary.undocumentedCount} undocumented`);
  }

  out.push(c.bold(`Summary: ${summaryParts.join(', ')}.`));

  return out.join('\n');
}

export function formatJsonReport(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}
