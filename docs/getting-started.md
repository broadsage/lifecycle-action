# Getting Started with End-of-Life GitHub Action

Welcome! This guide will help you get started with the End-of-Life GitHub Action in just a few minutes.

## 🎯 What Does This Action Do?

The End-of-Life Action helps you:
- **Track** software End-of-Life (EOL) dates automatically
- **Alert** you when dependencies are approaching or past EOL
- **Generate** version matrices for multi-version testing
- **Prevent** security issues from using unsupported software

## 🚀 Quick Start (5 Minutes)

### Step 1: Basic EOL Check

Create `.github/workflows/eol-check.yml`:

```yaml
name: EOL Check

on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  check-eol:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs,postgresql'
```

That's it! This will check Python, Node.js, and PostgreSQL for EOL status weekly.

### Step 2: Make It Actionable

Add automatic issue creation when EOL is detected:

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs,postgresql'
    fail-on-eol: true
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Step 3: Check Specific Versions

Check if your specific versions are EOL:

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    cycles: |
      {
        "python": ["3.9", "3.11", "3.12"]
      }
    fail-on-eol: true
```

## 📖 Common Use Cases

### Use Case 1: Extract Version from package.json

```yaml
- uses: actions/checkout@v4

- uses: broadsage/endoflife-action@v3
  with:
    products: 'nodejs'
    file-path: 'package.json'
    file-key: 'engines.node'
    file-format: 'json'
    fail-on-eol: true
```

### Use Case 2: Extract Version from Dockerfile

```yaml
- uses: actions/checkout@v4

- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    file-path: 'Dockerfile'
    version-regex: 'FROM python:([0-9.]+)'
    fail-on-eol: true
```

### Use Case 3: Multi-Version Testing Matrix

```yaml
jobs:
  get-versions:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: broadsage/endoflife-action@v3
        id: eol
        with:
          products: 'python'
          output-matrix: true
          exclude-eol-from-matrix: true
          max-versions: 3

  test:
    needs: get-versions
    strategy:
      matrix: ${{ fromJson(needs.get-versions.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.version }}
      - run: python --version
```

### Use Case 4: Check Recent Versions Only

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'nodejs'
    min-release-date: '>=2023'
    max-versions: 5
    fail-on-approaching-eol: true
```

## 🎨 Output Formats

### JSON Output

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    output-format: 'json'
    output-file: 'eol-report.json'

- uses: actions/upload-artifact@v4
  with:
    name: eol-report
    path: eol-report.json
```

### Markdown Report

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs'
    output-format: 'markdown'
    output-file: 'eol-report.md'

- name: Comment PR
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const report = fs.readFileSync('eol-report.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: report
      });
```

### GitHub Step Summary (Default)

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    output-format: 'summary'  # Default
```

## 🔧 Configuration Examples

### Minimal Configuration

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
```

### Recommended Configuration

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs'
    eol-threshold-days: 90
    fail-on-eol: true
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
    output-format: 'summary'
```

### Advanced Configuration

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    # Products to track
    products: 'python,nodejs,postgresql'
    
    # Specific versions (optional)
    cycles: |
      {
        "python": ["3.11", "3.12"],
        "nodejs": ["20", "21"]
      }
    
    # Filtering
    min-release-date: '>=2022'
    max-versions: 5
    version-sort-order: 'newest-first'
    
    # Thresholds
    eol-threshold-days: 90
    fail-on-eol: true
    fail-on-approaching-eol: false
    
    # GitHub Integration
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
    issue-labels: 'dependencies,security,eol'
    
    # Output
    output-format: 'summary'
    output-matrix: false
```

## 🎯 Best Practices

### 1. Run Regularly

Use scheduled workflows to check EOL status weekly:

```yaml
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday at midnight
  workflow_dispatch:      # Allow manual runs
```

### 2. Fail Early

Fail builds when EOL is detected:

```yaml
fail-on-eol: true
fail-on-approaching-eol: true  # Optional but safer
eol-threshold-days: 30         # 30 days before EOL
```

### 3. Automate Notifications

Create issues automatically:

```yaml
create-issue-on-eol: true
github-token: ${{ secrets.GITHUB_TOKEN }}
issue-labels: 'dependencies,security,high-priority'
```

### 4. Use Caching

The action caches API responses automatically (default: 1 hour):

```yaml
cache-ttl: 3600  # 1 hour (default)
```

### 5. Combine with Dependabot

Use alongside Dependabot for automated updates:

```yaml
# .github/workflows/eol-check.yml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs'
    fail-on-approaching-eol: true
    eol-threshold-days: 90
```

## 🐛 Troubleshooting

### No Products Found

**Problem:** Action reports "no products found"

**Solution:** Check product names at https://endoflife.date/api/all.json

```yaml
# ✅ Correct
products: 'python,nodejs,postgresql'

# ❌ Wrong
products: 'Python,Node.js,PostgreSQL'
```

### Version Not Detected

**Problem:** Version extraction fails

**Solution:** Check file path and format:

```yaml
# For JSON files
file-path: 'package.json'
file-key: 'engines.node'
file-format: 'json'

# For text files with regex
file-path: 'Dockerfile'
version-regex: 'FROM python:([0-9.]+)'
file-format: 'text'
```

### API Rate Limits

**Problem:** Too many API calls

**Solution:** Increase cache TTL:

```yaml
cache-ttl: 7200  # 2 hours
```

### Empty Matrix

**Problem:** Matrix output is empty

**Solution:** Check filters:

```yaml
output-matrix: true
exclude-eol-from-matrix: false  # Try temporarily
min-release-date: ''            # Remove date filter
```

## 📚 Next Steps

1. **Explore Examples**: Check `examples/` directory for more workflows
2. **Read Full Documentation**: See [README.md](../README.md) for all options
3. **Customize**: Adapt examples to your specific needs
4. **Contribute**: Found a bug? [Open an issue](../../issues)

## 🆘 Getting Help

- **Documentation**: [README.md](../README.md)
- **Examples**: [examples/](../examples/)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

## 📝 Quick Reference

### Essential Inputs

| Input | Example | Description |
|-------|---------|-------------|
| `products` | `'python,nodejs'` | Products to track (required) |
| `fail-on-eol` | `true` | Fail if EOL detected |
| `github-token` | `${{ secrets.GITHUB_TOKEN }}` | For creating issues |
| `output-matrix` | `true` | Generate version matrix |

### Essential Outputs

| Output | Usage | Description |
|--------|-------|-------------|
| `eol-detected` | `${{ steps.eol.outputs.eol-detected }}` | Boolean: EOL found? |
| `matrix` | `${{ steps.eol.outputs.matrix }}` | Version matrix |
| `summary` | `${{ steps.eol.outputs.summary }}` | Human-readable summary |

---

**Ready to get started?** Copy one of the examples above and customize it for your project!
