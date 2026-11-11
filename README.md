<p align="center">
  <h1 align="center">🩺 env-doctor</h1>
  <p align="center"><strong>Because debugging a typo at 2:00 AM isn't a personality trait.</strong></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@with_ezz/env-doctor"><img src="https://img.shields.io/npm/v/@with_ezz/env-doctor?color=blue&style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@with_ezz/env-doctor"><img src="https://img.shields.io/npm/dm/@with_ezz/env-doctor?color=purple&style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/with_ezz/env-doctor"><img src="https://img.shields.io/github/stars/with_ezz/env-doctor?style=flat-square" alt="GitHub stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@with_ezz/env-doctor?style=flat-square" alt="license" /></a>
</p>

---

### Why this exists

We've all lived this movie:

1. You deploy a new feature on Friday afternoon.
2. It crashes immediately with `TypeError: Cannot read properties of undefined`.
3. You spend 45 minutes digging through server logs, questioning your career choices, and swearing at your bundler.
4. Turns out someone wrote `process.env.DATABSE_URL` instead of `process.env.DATABASE_URL`. Or added an API key to their local `.env` and forgot to put it in `.env.example`, so staging blew up.

**env-doctor** is a tiny, zero-dependency CLI that acts as a sanity check for your environment variables. It scans your codebase, cross-examines your `.env` files, points out missing variables, flags dead ones, and catches typos before your users do.

---

### Terminal Diagnosis Preview

```text
$ npx env-doctor

🩺 Env Doctor Diagnosis:

🔴 MISSING (2) - Used in code but missing from .env files:
  ✖ DATABSE_URL (did you mean DATABASE_URL?)
    at src/db/client.ts:14
  ✖ STRIPE_WEBHOOK_SECRET
    at src/api/webhook.ts:8

🟡 UNUSED (1) - Defined in env files but never referenced in code:
  ▲ LEGACY_ANALYTICS_KEY
    defined in .env:22

🔵 UNDOCUMENTED (1) - Present in .env but missing from .env.example:
  ℹ REDIS_PASSWORD
    defined in .env:9

Summary: 2 missing (1 typo), 1 unused, 1 undocumented.
```

---

### Quick Start

No installation necessary—just run it directly in any project folder:

```bash
npx @with_ezz/env-doctor
```

Or install globally if you want it everywhere:

```bash
npm install -g @with_ezz/env-doctor
env-doctor
```

---

### CLI Options

| Flag                   | Default        | Description                                                        |
| :--------------------- | :------------- | :----------------------------------------------------------------- |
| `--dir <path>`         | `.`            | Target project root to scan                                        |
| `--env <file>`         | `.env`         | Path to your environment file                                      |
| `--example <file>`     | `.env.example` | Path to your example environment file                              |
| `--ignore <glob,glob>` | `""`           | Extra glob patterns to ignore (comma-separated)                    |
| `--json`               | `false`        | Output pure JSON (for scripting and piping)                        |
| `--strict`             | `false`        | Exits with code `1` if any issues are detected (ideal for CI)      |
| `--fix`                | `false`        | Interactively appends missing/undocumented keys to `.env.example`  |
| `--yes`, `-y`          | `false`        | Automatically confirms prompts (e.g. for `--fix` in CI or scripts) |
| `--no-color`           | `false`        | Disables ANSI colors (respects `NO_COLOR` env var as well)         |
| `--help`, `-h`         |                | Show help screen                                                   |
| `--version`, `-v`      |                | Print current version                                              |

> **Note:** By default, `node_modules`, `dist`, `build`, `.next`, `.git`, and `coverage` directories are always ignored.

---

### Auto-Fix Your `.env.example`

Tired of manually copying keys to `.env.example`? Let the doctor write the prescription:

```bash
npx env-doctor --fix
```

It lists all undocumented keys and offers to append them formatted with blank values (`KEY=`), ready for your team.

---

### CI / GitHub Actions

Fail pull requests before they break staging:

```yaml
# .github/workflows/env-check.yml
name: Env Doctor

on: [push, pull_request]

jobs:
  check-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx env-doctor --strict
```

---

### How it works

1. **Fast source scan**: Searches `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.vue`, and `.svelte` files without spinning up heavy AST parsers.
2. **Flexible detection**: Matches `process.env.VAR`, `process.env["VAR"]`, Vite's `import.meta.env.VAR`, and object destructuring (`const { FOO, BAR } = process.env`).
3. **Smart matching**: Compares detected keys with your `.env` and `.env.example` using Levenshtein distance to catch obvious spelling slips.
4. **Zero runtime bloat**: Built from scratch with zero runtime dependencies. No bloated tree in your `node_modules`.

---

### FAQ

**Does this send my env values anywhere?**  
Never. `env-doctor` runs entirely on your local machine and only inspects the variable **names** (keys), never their secret values.

**Does it support Next.js / Vite / SvelteKit / Nuxt?**  
Yes! It understands Node's `process.env` as well as Vite's `import.meta.env` and parses `.vue` and `.svelte` single-file components out of the box.

**What if I intentionally have unused variables?**  
You can use `--ignore` to skip specific files or directories where config templates reside, or pass `--strict` only when gating production builds.

---

### Roadmap

- [x] Zero-dependency AST-free regex parser
- [x] Support for Vite `import.meta.env` & destructuring
- [x] Levenshtein typo suggestion engine
- [x] `--fix` flag to automatically update `.env.example`
- [ ] Support for schema validators (Zod / Joi / Envalid schemas)
- [ ] Multi-environment profile diffing (`.env.production` vs `.env.staging`)

---

### Contributing

Pull requests are always welcome! Take a look at [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

### License

[MIT](./LICENSE) © 2026

Keep your envs healthy and your weekends quiet! 🩺✨
