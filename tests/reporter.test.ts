import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { loadProjectEnvs } from '../src/envParser.js';
import { scanProject } from '../src/scanner.js';
import { analyze, formatTerminalReport } from '../src/reporter.js';

describe('Reporter and Analyzer', () => {
  it('reports MISSING, UNUSED, UNDOCUMENTED, and TYPOS correctly', () => {
    const fixtureDir = path.resolve(process.cwd(), 'fixtures/sample-project');
    const projectEnvs = loadProjectEnvs(fixtureDir, '.env', '.env.example');
    const usages = scanProject({ rootDir: fixtureDir });
    const report = analyze(usages, projectEnvs, fixtureDir);

    // Missing: MISSING_TOKEN and PORTT
    const missingNames = report.missing.map((m) => m.varName);
    expect(missingNames).toContain('MISSING_TOKEN');
    expect(missingNames).toContain('PORTT');

    // Typos: PORTT should suggest PORT and POT
    const typoProblem = report.typos.find((t) => t.varName === 'PORTT');
    expect(typoProblem).toBeDefined();
    expect(typoProblem?.suggestions).toContain('PORT');

    // Unused: UNUSED_SECRET and POT
    const unusedNames = report.unused.map((u) => u.varName);
    expect(unusedNames).toContain('UNUSED_SECRET');
    expect(unusedNames).toContain('POT');

    // Undocumented: UNUSED_SECRET, POT, LOCAL_OVERRIDE
    const undocumentedNames = report.undocumented.map((u) => u.varName);
    expect(undocumentedNames).toContain('UNUSED_SECRET');
    expect(undocumentedNames).toContain('POT');
    expect(undocumentedNames).toContain('LOCAL_OVERRIDE');

    const formatted = formatTerminalReport(report, false);
    expect(formatted).toContain('MISSING');
    expect(formatted).toContain('UNUSED');
    expect(formatted).toContain('UNDOCUMENTED');
    expect(formatted).toContain('did you mean');
    expect(formatted).toContain('Summary:');
  });
});
