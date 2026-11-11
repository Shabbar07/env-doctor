import * as path from 'node:path';
import * as process from 'node:process';
import * as readline from 'node:readline';
import { loadProjectEnvs, appendKeysToExample } from './envParser.js';
import { scanProject } from './scanner.js';
import {
  analyze,
  formatTerminalReport,
  formatJsonReport,
  createColorStyler,
} from './reporter.js';

export interface CliArgs {
  dir: string;
  env: string;
  example: string;
  ignore: string[];
  json: boolean;
  strict: boolean;
  fix: boolean;
  yes: boolean;
  noColor: boolean;
  help: boolean;
  version: boolean;
}

export function parseCliArgs(rawArgs: string[]): CliArgs {
  const result: CliArgs = {
    dir: '.',
    env: '.env',
    example: '.env.example',
    ignore: [],
    json: false,
    strict: false,
    fix: false,
    yes: false,
    noColor: false,
    help: false,
    version: false,
  };

  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
    result.noColor = true;
  }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--strict') {
      result.strict = true;
    } else if (arg === '--fix') {
      result.fix = true;
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (arg === '--no-color') {
      result.noColor = true;
    } else if (arg === '--dir') {
      if (i + 1 < rawArgs.length) {
        result.dir = rawArgs[++i];
      }
    } else if (arg.startsWith('--dir=')) {
      result.dir = arg.slice('--dir='.length);
    } else if (arg === '--env') {
      if (i + 1 < rawArgs.length) {
        result.env = rawArgs[++i];
      }
    } else if (arg.startsWith('--env=')) {
      result.env = arg.slice('--env='.length);
    } else if (arg === '--example') {
      if (i + 1 < rawArgs.length) {
        result.example = rawArgs[++i];
      }
    } else if (arg.startsWith('--example=')) {
      result.example = arg.slice('--example='.length);
    } else if (arg === '--ignore') {
      if (i + 1 < rawArgs.length) {
        const patterns = rawArgs[++i]
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        result.ignore.push(...patterns);
      }
    } else if (arg.startsWith('--ignore=')) {
      const patterns = arg
        .slice('--ignore='.length)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      result.ignore.push(...patterns);
    }
  }

  return result;
}

const VERSION = '0.1.0';

export function showHelp(): void {
  const helpText = `
🩺 env-doctor v${VERSION}
Find environment variable problems in your JS/TS projects before production does.

USAGE:
  $ npx env-doctor [options]

OPTIONS:
  --dir <path>          Project root directory to scan (default: ".")
  --env <file>          Path to .env file (default: ".env")
  --example <file>      Path to example file (default: ".env.example")
  --ignore <glob,glob>  Additional glob patterns to ignore
  --json                Output analysis report in JSON format
  --strict              Exit with code 1 if any issue is detected (ideal for CI)
  --fix                 Append missing / undocumented keys to .env.example (with confirmation)
  --yes, -y             Automatically confirm prompts (e.g. for --fix in non-interactive mode)
  --no-color            Disable ANSI terminal colors
  --help, -h            Show this help documentation
  --version, -v         Show version number

DEFAULT IGNORES:
  node_modules, dist, build, .next, .git, coverage

SUPPORTED EXTENSIONS:
  .js, .jsx, .ts, .tsx, .mjs, .cjs, .vue, .svelte
`;
  console.log(helpText.trim());
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(
        answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes',
      );
    });
  });
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  try {
    const args = parseCliArgs(argv);

    if (args.help) {
      showHelp();
      process.exit(0);
    }

    if (args.version) {
      console.log(`v${VERSION}`);
      process.exit(0);
    }

    const targetDir = path.resolve(process.cwd(), args.dir);
    const colorsEnabled = !args.noColor;
    const c = createColorStyler(colorsEnabled);

    // 1. Load env files
    const projectEnvs = loadProjectEnvs(targetDir, args.env, args.example);

    // 2. Scan source files
    const usages = scanProject({
      rootDir: targetDir,
      ignorePatterns: args.ignore,
    });

    // 3. Analyze
    const report = analyze(usages, projectEnvs, targetDir);

    // 4. Output results
    if (args.json) {
      console.log(formatJsonReport(report));
    } else {
      console.log(formatTerminalReport(report, colorsEnabled));
    }

    // 5. Handle --fix
    if (args.fix) {
      const keysToAdd = new Set<string>();
      for (const m of report.missing) {
        keysToAdd.add(m.varName);
      }
      for (const u of report.undocumented) {
        keysToAdd.add(u.varName);
      }

      if (keysToAdd.size === 0) {
        console.log(c.green('\n✨ Nothing to fix in .env.example!'));
      } else {
        const examplePath = path.isAbsolute(args.example)
          ? args.example
          : path.resolve(targetDir, args.example);

        const keyList = Array.from(keysToAdd).sort();
        console.log(
          `\n${c.bold('Keys to append to ' + path.basename(examplePath) + ':')}`,
        );
        for (const k of keyList) {
          console.log(`  + ${k}=`);
        }

        let shouldProceed = args.yes;
        if (!shouldProceed) {
          shouldProceed = await promptConfirm(
            `\nDo you want to append these ${keyList.length} key(s) to ${path.basename(examplePath)}?`,
          );
        }

        if (shouldProceed) {
          const success = appendKeysToExample(examplePath, keyList);
          if (success) {
            console.log(c.green(`✔ Successfully updated ${path.basename(examplePath)}!`));
          }
        } else {
          console.log(c.gray('Fix aborted.'));
        }
      }
    }

    // 6. Strict exit code check
    if (args.strict && report.summary.totalIssues > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (err: any) {
    process.stderr.write(`Error: ${err?.message || err}\n`);
    process.exit(1);
  }
}

// Auto run when invoked directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.js') ||
    process.argv[1].endsWith('env-doctor'))
) {
  runCli();
}
