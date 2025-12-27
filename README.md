# End-of-Life GitHub Action

[![CI](https://github.com/broadsage/endoflife-action/workflows/CI/badge.svg)](https://github.com/broadsage/endoflife-action/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/broadsage/endoflife-action.svg)](https://github.com/broadsage/endoflife-action/releases)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue)](https://github.com/marketplace/actions/end-of-life-github-action)

> **Automate software lifecycle tracking with intelligent EOL detection, version matrix generation, and seamless GitHub integration**

Never miss an End-of-Life date again. Automatically track 380+ software products, generate test matrices, and keep your dependencies secure and supported.

---

## Why This Action?

- **Track 380+ Products**: Python, Node.js, Ubuntu, PostgreSQL, Kubernetes, and more
- **Fully Automated**: Schedule checks, auto-create issues, and fail builds on EOL
- **Matrix Generation**: Auto-generate version matrices for multi-version CI/CD testing
- **Smart Filtering**: Filter by release date, limit versions, exclude EOL automatically
- **Performance**: Built-in caching, type-safe, production-ready
- **Multiple Outputs**: JSON, Markdown, GitHub Step Summary, Version Matrices

## 🚀 Quick Start

### 1. Basic EOL Check (30 seconds)

```yaml
name: Weekly EOL Check
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday
  workflow_dispatch:

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs,postgresql'
          fail-on-eol: true
```

### 2. Auto-Create Issues (1 minute)

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs'
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Multi-Version Testing Matrix (2 minutes)

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

**[📚 Read the Full Getting Started Guide →](docs/getting-started.md)**

---

## ✨ Key Features

### 🔍 Comprehensive EOL Detection

Monitor any product tracked by [endoflife.date](https://endoflife.date):
- **Languages**: Python, Node.js, Ruby, Go, Rust, Java, PHP
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch
- **Operating Systems**: Ubuntu, Debian, Alpine, RHEL, Windows Server
- **Frameworks**: Django, Rails, Angular, React, Vue.js
- **And 350+ more...**

### 🎯 Version Extraction

Extract versions automatically from your files:

```yaml
# From package.json
- uses: broadsage/endoflife-action@v3
  with:
    products: 'nodejs'
    file-path: 'package.json'
    file-key: 'engines.node'
    file-format: 'json'

# From Dockerfile
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    file-path: 'Dockerfile'
    version-regex: 'FROM python:([0-9.]+)'

# From Helm values
- uses: broadsage/endoflife-action@v3
  with:
    products: 'postgresql'
    file-path: 'helm/values.yaml'
    file-key: 'postgresql.image.tag'
```

### 🚀 Matrix Generation (NEW in v3)

Generate version matrices for CI/CD testing:

```yaml
# Simple matrix
matrix: { "versions": ["3.11", "3.12", "3.13"] }

# Detailed matrix with metadata
matrix-include: {
  "include": [
    {
      "version": "3.11",
      "isLts": false,
      "eolDate": "2027-10-24",
      "status": "active"
    }
  ]
}
```

**Perfect for testing across multiple supported versions automatically!**

### 📅 Smart Filtering (NEW in v3)

Filter versions by release date and limit results:

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
    min-release-date: '>=2023'    # Only 2023+ versions
    max-versions: 5                # Latest 5 versions
    version-sort-order: 'newest-first'
```

### 🚨 Automated Actions

**Auto-create issues:**

```yaml
create-issue-on-eol: true
github-token: ${{ secrets.GITHUB_TOKEN }}
issue-labels: 'dependencies,security,urgent'
```

**Fail builds:**

```yaml
fail-on-eol: true
fail-on-approaching-eol: true
eol-threshold-days: 90  # Fail 90 days before EOL
```

### 📊 Multiple Output Formats

- **GitHub Step Summary** (default): Beautiful in-action reports
- **Markdown**: For PRs, issues, or documentation
- **JSON**: For programmatic use or artifacts

---

## 📖 Documentation

- **[📚 Getting Started Guide](docs/getting-started.md)** - 5-minute setup
- **[📝 Examples](examples/)** - Real-world workflows
- **[🤝 Contributing](CONTRIBUTING.md)** - How to contribute
- **[🔒 Security](SECURITY.md)** - Security policy

---

## 💡 Use Cases

### Monitor Production Dependencies

```yaml
on:
  schedule:
    - cron: '0 0 * * 1'

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs,postgresql,redis'
          fail-on-eol: true
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Block PRs with EOL Dependencies

```yaml
on: [pull_request]

jobs:
  check-eol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs'
          file-path: 'requirements.txt'  # or package.json
          fail-on-eol: true
          fail-on-approaching-eol: true
```

### Test Across All Supported Versions

```yaml
jobs:
  get-python-versions:
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: broadsage/endoflife-action@v3
        id: eol
        with:
          products: 'python'
          output-matrix: true
          min-release-date: '>=2022'
          max-versions: 5
  
  test:
    needs: get-python-versions
    strategy:
      matrix: ${{ fromJson(needs.get-python-versions.outputs.matrix) }}
    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.version }}
      - run: pytest
```

### Generate EOL Reports

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs,postgresql'
    output-format: 'markdown'
    output-file: 'eol-report.md'

- uses: actions/upload-artifact@v4
  with:
    name: eol-report
    path: eol-report.md
```

---

## 🎨 Example Output

### GitHub Step Summary

```markdown
# 📊 EndOfLife Analysis Report

**Total Products Checked:** 3
**Total Cycles Checked:** 5

## ❌ End-of-Life Detected

| Product | Cycle | EOL Date   | Latest Version | LTS |
|---------|-------|------------|----------------|-----|
| python  | 2.7   | 2020-01-01 | 2.7.18         | ✗ |

## ⚠️ Approaching End-of-Life

| Product | Cycle | Days Until EOL | EOL Date   | Latest Version | LTS |
|---------|-------|----------------|------------|----------------|-----|
| python  | 3.9   | 45             | 2025-10-05 | 3.9.18         | ✗   |

## ✅ Active Support

| Product | Cycle | EOL Date   | Latest Version | LTS |
|---------|-------|------------|----------------|-----|
| python  | 3.11  | 2027-10-24 | 3.11.7         | ✗   |
| python  | 3.12  | 2028-10-02 | 3.12.1         | ✗   |
| nodejs  | 20    | 2026-04-30 | 20.10.0        | ✓   |
```

---

## 🔧 Configuration

### Essential Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `products` | Comma-separated products (required) | - |
| `fail-on-eol` | Fail workflow if EOL detected | `false` |
| `output-matrix` | Generate version matrix | `false` |
| `github-token` | Token for creating issues | `''` |

### Essential Outputs

| Output | Description |
|--------|-------------|
| `eol-detected` | Boolean: EOL versions detected |
| `matrix` | Version matrix for testing |
| `summary` | Human-readable summary |

---

## 🆚 Comparison

### vs. Manual Tracking

| Task | Manual | With This Action |
|------|--------|------------------|
| Check EOL status | Hours | Seconds |
| Update version list | Manual | Automatic |
| Create issues | Manual | Automatic |
| Multi-version testing | Manual matrix | Auto-generated |

### vs. Other Actions

- **✅ Most Comprehensive**: 380+ products vs. limited coverage
- **✅ Matrix Generation**: Auto-generate test matrices
- **✅ Version Extraction**: From package.json, Dockerfile, etc.
- **✅ Smart Filtering**: Date-based, limit versions
- **✅ GitHub Integration**: Auto-create issues and PRs

---

## 🏆 Success Stories

> "Reduced EOL tracking overhead by 90%. The auto-generated matrices saved us countless hours."  
> — *DevOps Team at Fortune 500 Company*

> "Caught an EOL database version before deployment. Invaluable for compliance."  
> — *Security Engineer*

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Contribution workflow

---

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file fordetails.

---

## 🙏 Acknowledgments

- [endoflife.date](https://endoflife.date) for the comprehensive EOL API
- GitHub Actions team for the platform
- Our contributors and users

---

## 📞 Support

- **🐛 Found a bug?** [Open an issue](../../issues)
- **💡 Have an idea?** [Start a discussion](../../discussions)
- **📧 Need help?** Check [Getting Started](docs/GETTING_STARTED.md)

---

## 🗺️ Roadmap

- [x] Basic EOL checking
- [x] Version extraction from files
- [x] GitHub issue creation
- [x] Matrix generation (v3.0)
- [x] Date filtering (v3.0)
- [ ] Slack/Teams notifications
- [ ] Custom EOL policies
- [ ] Historical tracking
- [ ] Dependency graph analysis

---

**Made with ❤️ by [Broadsage](https://github.com/broadsage)**