# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-11

### Added

- Initial open-source release of `env-doctor`.
- Zero-runtime-dependency CLI with ANSI color support and custom env parser.
- Scanner supporting `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.vue`, and `.svelte`.
- Detection for `process.env.VAR`, `process.env["VAR"]`, `import.meta.env.VAR`, and destructuring assignments (`const { A, B } = process.env`).
- Health report categories:
  - **MISSING**: Variables used in source code but missing from `.env` files.
  - **UNUSED**: Variables defined in `.env` but never used in source code.
  - **UNDOCUMENTED**: Variables defined in `.env` but missing from `.env.example`.
  - **TYPOS**: Levenshtein distance typo detection with smart "did you mean" hints.
- Interactive and automated `--fix` flag to append missing/undocumented keys to `.env.example`.
- `--strict` flag for CI exit code enforcement.
- `--json`, `--dir`, `--env`, `--example`, `--ignore`, and `--no-color` flags.
- Comprehensive test suite with Vitest.
