# Contributing to env-doctor

Thank you for your interest in contributing to **env-doctor**! 🩺

We want to keep this tool fast, zero-runtime-dependency, reliable, and delightful to use.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run tests in watch mode:
   ```bash
   npm test
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Check linting and formatting:
   ```bash
   npm run lint
   npm run format:check
   ```

## Pull Request Guidelines

- Ensure all existing and new tests pass (`npm test`).
- Keep runtime dependencies at **zero**. All parsing, ANSI formatting, and file-walking logic should remain internal and lightweight.
- Add test coverage for any new detection patterns or flags in `tests/`.
- Format code before pushing: `npm run format`.
- Be friendly, respectful, and constructive in discussions and reviews!
