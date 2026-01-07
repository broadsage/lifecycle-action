# Release Process

This document describes the automated release process for the lifecycle-action using **release-please**.

## Overview

We use [release-please](https://github.com/googleapis/release-please) to automate our release process. This tool:
- Automatically generates changelogs based on [Conventional Commits](https://www.conventionalcommits.org/)
- Creates release PRs with version bumps
- Publishes GitHub releases when PRs are merged
- Manages semantic versioning automatically

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (triggers MINOR version bump)
- **fix**: A bug fix (triggers PATCH version bump)
- **perf**: Performance improvement
- **refactor**: Code refactoring
- **docs**: Documentation changes
- **chore**: Maintenance tasks
- **test**: Test changes
- **build**: Build system changes
- **ci**: CI/CD changes

### Breaking Changes

To trigger a MAJOR version bump, add `BREAKING CHANGE:` in the commit footer or add `!` after the type:

```
feat!: remove support for Node.js 18

BREAKING CHANGE: Node.js 18 is no longer supported. Minimum version is now 20.
```

### Examples

```bash
# Feature (MINOR bump)
git commit -m "feat: add file-based version extraction from YAML files"

# Bug fix (PATCH bump)
git commit -m "fix: improve error handling in version extraction"

# Breaking change (MAJOR bump)
git commit -m "feat!: change API input format

BREAKING CHANGE: The 'products' input now requires JSON format instead of comma-separated values."

# With scope
git commit -m "feat(extractor): add regex-based version extraction"

# Chore (no version bump)
git commit -m "chore(deps): update dependencies"
```

## Release Workflow

### 1. Development

1. Create a feature branch from `main`
2. Make your changes
3. Write tests
4. Commit using conventional commit messages
5. Push and create a PR

### 2. Automated Release PR

When commits are pushed to `main`:

1. **release-please** analyzes commit messages
2. Determines the next version based on commit types
3. Creates/updates a release PR with:
   - Updated `package.json` version
   - Updated `CHANGELOG.md`
   - Updated `action.yml` version (if applicable)

### 3. Review and Merge

1. Review the release PR
2. Verify the changelog and version bump
3. Merge the PR when ready to release

### 4. Automated Release

When the release PR is merged:

1. **release-please** creates a GitHub release
2. Tags the commit with the version (e.g., `v2.0.0`)
3. Publishes the release notes
4. Updates major version tag (e.g., `v2`)
5. Runs build and tests
6. Uploads build artifacts

## Version Bumping Rules

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | MINOR | 1.0.0 → 1.1.0 |
| `fix:` | PATCH | 1.0.0 → 1.0.1 |
| `feat!:` or `BREAKING CHANGE:` | MAJOR | 1.0.0 → 2.0.0 |
| `chore:`, `docs:`, etc. | None | No release |

## Manual Release

If you need to manually trigger a release:

1. Ensure all changes are committed with conventional commit messages
2. Push to `main` branch
3. Wait for release-please to create/update the release PR
4. Merge the release PR

## Skipping Release

To skip creating a release for certain commits, use these types:
- `chore:`
- `docs:`
- `test:`
- `ci:`
- `build:` (unless it affects the build output)

## Troubleshooting

### Release PR not created

- Ensure commits follow conventional commit format
- Check that commits include release-worthy types (`feat`, `fix`, etc.)
- Verify the GitHub Actions workflow is enabled

### Wrong version bump

- Review commit messages for correct types
- Check for `BREAKING CHANGE:` in commit footers
- Ensure `!` is used correctly for breaking changes

### Release failed

- Check GitHub Actions logs
- Verify all tests pass
- Ensure build completes successfully

## Configuration Files

- `.release-please-manifest.json` - Tracks current version
- `.release-please-config.json` - Configuration for release-please
- `.github/workflows/release-please.yml` - GitHub Actions workflow
- `CHANGELOG.md` - Auto-generated changelog

## Best Practices

1. **Write clear commit messages** - They become your changelog
2. **Use scopes** - Help organize changes (e.g., `feat(extractor):`)
3. **Document breaking changes** - Always explain in the footer
4. **Keep commits atomic** - One logical change per commit
5. **Review release PRs** - Verify changelog and version before merging

## References

- [release-please Documentation](https://github.com/googleapis/release-please)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
