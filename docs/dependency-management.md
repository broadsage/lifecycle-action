# Dependency Management with Renovate

This document describes how we manage dependencies using **Renovate** instead of Dependabot.

## Overview

We use [Renovate](https://docs.renovatebot.com/) for automated dependency updates. Renovate is configured at the organization level and provides:

- Automated dependency updates
- Intelligent grouping of related updates
- Automerge for safe updates
- Security vulnerability detection
- Better customization than Dependabot

## Configuration

Our Renovate configuration is in `renovate.json` at the repository root.

### Key Features

#### 1. **Automatic Grouping**

Related dependencies are grouped into single PRs:

- **GitHub Actions** - All action updates together
- **GitHub Actions SDK** - `@actions/*` packages
- **TypeScript** - TypeScript and `@types/*` packages
- **ESLint** - All ESLint-related packages
- **Jest** - Jest and testing packages

#### 2. **Automerge**

Safe updates are automatically merged:
- ✅ Patch and minor updates for dev dependencies
- ✅ GitHub Actions updates (pinned to SHA)
- ✅ Grouped dependency updates
- ❌ Major updates (require manual review)

#### 3. **Security Updates**

Security vulnerabilities are:
- Labeled with `security` tag
- Assigned to maintainers
- Auto-merged if safe
- Processed immediately (not on schedule)

#### 4. **Scheduling**

- **Regular updates**: Monday mornings (before 10am IST)
- **Security updates**: Immediate
- **Lockfile maintenance**: First day of each month
- **Rate limiting**: Max 5 concurrent PRs, 2 per hour

## How It Works

### 1. Renovate Scans Dependencies

Renovate automatically scans:
- `package.json` (npm dependencies)
- `.github/workflows/*.yml` (GitHub Actions)
- Other supported package managers

### 2. Creates Pull Requests

For each update, Renovate:
1. Creates a branch
2. Updates dependencies
3. Runs tests (via CI)
4. Creates a PR with changelog

### 3. Automerge (if enabled)

For safe updates:
1. Waits for CI to pass
2. Checks automerge rules
3. Automatically merges if all checks pass
4. Deletes the branch

### 4. Manual Review (for major updates)

Major version updates:
1. Create a PR
2. Assign to maintainers
3. Wait for manual review
4. Merge when approved

## Dependency Update Types

### Patch Updates (1.0.0 → 1.0.1)
- **Automerge**: ✅ Yes (for dev dependencies)
- **Review**: Optional
- **Risk**: Very low

### Minor Updates (1.0.0 → 1.1.0)
- **Automerge**: ✅ Yes (for dev dependencies)
- **Review**: Optional
- **Risk**: Low

### Major Updates (1.0.0 → 2.0.0)
- **Automerge**: ❌ No
- **Review**: Required
- **Risk**: Medium to High

## Customizing Renovate

### Disable Automerge for a Dependency

Add to `renovate.json`:

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["specific-package"],
      "automerge": false
    }
  ]
}
```

### Change Update Schedule

```json
{
  "schedule": ["before 10am on monday"]
}
```

### Pin a Dependency Version

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["package-name"],
      "allowedVersions": "< 2.0.0"
    }
  ]
}
```

## Renovate Dashboard

Renovate creates an issue called "Dependency Dashboard" that shows:
- ✅ Pending updates
- ⏸️ Rate-limited updates
- ❌ Failed updates
- 📅 Scheduled updates

## Comparing with Dependabot

| Feature | Dependabot | Renovate |
|---------|-----------|----------|
| Grouping | Limited | Excellent |
| Automerge | Basic | Advanced |
| Customization | Limited | Extensive |
| Scheduling | Basic | Flexible |
| Org-level config | No | Yes ✅ |
| Lockfile maintenance | No | Yes ✅ |
| Monorepo support | Limited | Excellent |
| Dashboard | No | Yes ✅ |

## Best Practices

### 1. Review Major Updates

Always review major version updates:
- Check changelog for breaking changes
- Run tests locally if needed
- Update code if required

### 2. Monitor Automerge

Occasionally check auto-merged PRs:
- Verify CI passed
- Check for unexpected changes
- Review security updates

### 3. Keep Configuration Updated

Update `renovate.json` when:
- Adding new dependency groups
- Changing automerge rules
- Adjusting schedules

### 4. Use Dependency Dashboard

Check the dashboard regularly:
- See pending updates
- Identify blocked updates
- Monitor rate limits

## Troubleshooting

### Updates Not Creating PRs

1. Check Renovate dashboard issue
2. Verify schedule configuration
3. Check rate limits
4. Review package rules

### Automerge Not Working

1. Verify CI is passing
2. Check automerge rules
3. Ensure branch protection allows automerge
4. Review PR labels

### Too Many PRs

1. Adjust `prConcurrentLimit`
2. Increase grouping
3. Change schedule
4. Enable more automerge rules

## Migration from Dependabot

We've migrated from Dependabot to Renovate:

### Removed Files
- `.github/dependabot.yml`
- `.github/workflows/dependabot-auto-merge.yml`

### Added Files
- `renovate.json` (repository config)
- Organization-level Renovate configuration

### Benefits
- Better grouping of related updates
- More intelligent automerge
- Lockfile maintenance
- Better monorepo support
- Org-level consistency

## References

- [Renovate Documentation](https://docs.renovatebot.com/)
- [Configuration Options](https://docs.renovatebot.com/configuration-options/)
- [Automerge Guide](https://docs.renovatebot.com/key-concepts/automerge/)
- [Package Rules](https://docs.renovatebot.com/configuration-options/#packagerules)
