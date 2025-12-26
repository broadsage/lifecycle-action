# Contributing to EndOfLife Action

Thank you for your interest in contributing to the EndOfLife Action! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Relevant logs or screenshots**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case**
- **Proposed solution**
- **Alternative solutions considered**
- **Additional context**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Ensure all tests pass** (`npm test`)
5. **Update documentation** as needed
6. **Follow commit message conventions**
7. **Submit a pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/endoflife-action.git
cd endoflife-action

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Coding Standards

### TypeScript

- Use TypeScript for all source code
- Enable strict mode
- Provide type annotations for public APIs
- Avoid `any` types when possible

### Code Style

- Follow the ESLint configuration
- Use Prettier for formatting
- Run `npm run format` before committing
- Maximum line length: 80 characters

### Testing

- Write unit tests for all new functionality
- Maintain minimum 80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(analyzer): add support for custom EOL thresholds

Add ability to specify different EOL thresholds per product.
This allows more granular control over EOL warnings.

Closes #123
```

## Project Structure

```
src/
├── index.ts       # Main entry point
├── client.ts      # API client
├── analyzer.ts    # EOL analysis logic
├── inputs.ts      # Input handling
├── outputs.ts     # Output formatting
├── github.ts      # GitHub integration
└── types.ts       # Type definitions

tests/
├── client.test.ts
├── analyzer.test.ts
├── inputs.test.ts
└── outputs.test.ts
```

## Testing Guidelines

### Unit Tests

```typescript
describe('MyFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid');
    expect(result).toBe('expected');
  });

  it('should throw error for invalid input', () => {
    expect(() => myFunction('invalid')).toThrow();
  });
});
```

### Integration Tests

Integration tests should test the action end-to-end with real API calls (using nock for mocking).

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update examples for new features
- Keep CHANGELOG.md updated

## Release Process

This project uses [Release Please](https://github.com/googleapis/release-please) to automate releases.

1. When you merge a pull request to `main`, Release Please will create or update a Release PR.
2. The Release PR contains the version bump (following [Conventional Commits](https://www.conventionalcommits.org/)) and updated `CHANGELOG.md`.
3. When the Release PR is merged:
   - A GitHub Release is created.
   - A git tag is created (e.g., `v1.2.3`).
   - The major version tag (e.g., `v1`) is updated.
   - Build artifacts are automatically bundled and pushed to the tag.
   - The action is automatically updated in the [GitHub Marketplace](https://github.com/marketplace).

## Questions?

Feel free to open a discussion or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
