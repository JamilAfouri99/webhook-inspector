# Contributing to Webhook Tester

Thanks for your interest in contributing! This document covers the essentials.

## Getting Started

See the [README](README.md) for instructions on setting up the development environment.

## Reporting Issues

- Search existing issues before opening a new one.
- Use the appropriate issue template (bug report or feature request).
- Provide as much detail as possible, including steps to reproduce for bugs.

## Submitting Pull Requests

1. Fork the repository and create a branch from `main`.
2. Make your changes in a focused, single-purpose branch.
3. Ensure your code passes linting and any existing tests.
4. Fill out the pull request template when submitting.
5. Keep pull requests small and reviewable when possible.

## Code Style

This project includes an ESLint configuration (`eslint.config.mjs`). Run the linter before submitting:

```bash
npm run lint
```

Follow the existing code patterns and conventions you see in the codebase.

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Format your commit messages as:

```
<type>(<optional scope>): <description>

[optional body]
```

Common types:

- `feat` -- a new feature
- `fix` -- a bug fix
- `docs` -- documentation changes
- `style` -- formatting, no code change
- `refactor` -- code restructuring without behavior change
- `test` -- adding or updating tests
- `chore` -- maintenance tasks

Examples:

```
feat(api): add webhook retry endpoint
fix(ui): correct timestamp display in request list
docs: update setup instructions in README
```

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
