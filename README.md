# EndOfLife Action

[![CI](https://github.com/broadsage/endoflife-action/workflows/CI/badge.svg)](https://github.com/broadsage/endoflife-action/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/broadsage/endoflife-action.svg)](https://github.com/broadsage/endoflife-action/releases)

> **Enterprise-ready GitHub Action for tracking software versions and End-of-Life dates using the [endoflife.date](https://endoflife.date) API**

Automatically detect end-of-life software in your projects, get notified about approaching EOL dates, and maintain secure, up-to-date dependencies with zero manual effort.

## ✨ Features

- 🔍 **Comprehensive Version Tracking** - Monitor 380+ products including Python, Node.js, Ubuntu, PostgreSQL, and more
- ⚡ **Smart Caching** - Built-in HTTP caching with configurable TTL to minimize API calls
- 🎯 **Flexible Filtering** - Track all versions or specific cycles per product
- 📊 **Multiple Output Formats** - JSON, Markdown, or GitHub Step Summary
- 🚨 **Automated Alerts** - Create GitHub issues automatically when EOL is detected
- ✅ **CI/CD Integration** - Fail builds on EOL or approaching EOL versions
- 🔒 **Type-Safe** - Built with TypeScript and runtime validation using Zod
- 🧪 **Well-Tested** - 80%+ code coverage with comprehensive test suite
- 📈 **Production-Ready** - Error handling, retry logic, and detailed logging

## 🚀 Quick Start

### Basic Usage

```yaml
name: Check EOL Status

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v1
        with:
          products: 'python,nodejs,ubuntu'
```

### Advanced Usage

```yaml
name: EOL Monitoring

on:
  schedule:
    - cron: '0 0 * * *' # Daily
  workflow_dispatch:

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v1
        with:
          # Track specific versions
          products: 'python,nodejs,postgresql,redis'
          cycles: |
            {
              "python": ["3.11", "3.12"],
              "nodejs": ["20", "21"],
              "postgresql": ["15", "16"]
            }
          
          # Alert configuration
          eol-threshold-days: 90
          fail-on-eol: true
          fail-on-approaching-eol: false
          
          # GitHub integration
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          issue-labels: 'dependencies,security,eol'
          
          # Output configuration
          output-format: 'summary'
          output-file: 'eol-report.md'
```

## 📋 Inputs

### Core Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `products` | Comma-separated list of products to track. Use `"all"` for all products | Yes | - |
| `cycles` | JSON object mapping products to specific cycles | No | `{}` |
| `check-eol` | Check if any tracked versions are end-of-life | No | `true` |
| `eol-threshold-days` | Days before EOL to trigger warning | No | `90` |
| `fail-on-eol` | Fail the action if any version is EOL | No | `false` |
| `fail-on-approaching-eol` | Fail if any version is approaching EOL | No | `false` |

### Version Extraction Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `file-path` | Path to file containing version (e.g., `helm/values.yaml`) | No | `''` |
| `file-key` | Nested key path for YAML/JSON (e.g., `image.tag`) | No | `''` |
| `file-format` | File format: `yaml`, `json`, or `text` | No | `yaml` |
| `version-regex` | Regex to extract version (e.g., `v([0-9.]+)`) | No | `''` |
| `version` | Manually specify version (alternative to file extraction) | No | `''` |
| `semantic-version-fallback` | Enable semantic version fallback (1.2.3 → 1.2 → 1) | No | `true` |

### Output & Integration Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `output-format` | Output format: `json`, `markdown`, or `summary` | No | `summary` |
| `output-file` | Path to write output file | No | `''` |
| `cache-ttl` | Cache TTL in seconds | No | `3600` |
| `github-token` | GitHub token for creating issues/PRs | No | `''` |
| `create-issue-on-eol` | Create GitHub issue when EOL detected | No | `false` |
| `issue-labels` | Comma-separated labels for created issues | No | `dependencies,eol,security` |
| `include-latest-version` | Include latest version info in output | No | `true` |
| `include-support-info` | Include support status in output | No | `true` |
| `custom-api-url` | Custom API URL (for testing) | No | `https://endoflife.date` |

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `eol-detected` | Boolean indicating if any EOL versions were detected |
| `version` | Extracted version from file (if file-path was provided) |
| `approaching-eol` | Boolean indicating if any versions are approaching EOL |
| `results` | JSON string containing all version information |
| `eol-products` | JSON array of products that are end-of-life |
| `approaching-eol-products` | JSON array of products approaching EOL |
| `latest-versions` | JSON object mapping products to their latest versions |
| `summary` | Human-readable summary of findings |
| `total-products-checked` | Total number of products checked |
| `total-cycles-checked` | Total number of cycles checked |

## 💡 Use Cases

### 1. Extract Version from Helm Values

```yaml
name: Check Helm Chart Versions

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly

jobs:
  check-prometheus:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: broadsage/endoflife-action@v2
        with:
          products: 'prometheus'
          file-path: 'helm/values.yaml'
          file-key: 'image.tag'
          fail-on-eol: true
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Extract Version from package.json

```yaml
name: Check Node.js Version

on: [push, pull_request]

jobs:
  check-nodejs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: broadsage/endoflife-action@v2
        with:
          products: 'nodejs'
          file-path: 'package.json'
          file-key: 'engines.node'
          file-format: 'json'
          fail-on-eol: true
```

### 3. Extract Version from Dockerfile with Regex

```yaml
name: Check Docker Base Images

on:
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  check-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: broadsage/endoflife-action@v2
        with:
          products: 'python'
          file-path: 'Dockerfile'
          version-regex: 'FROM python:([0-9.]+)'
          semantic-version-fallback: true
          fail-on-eol: true
```

### 4. Manual Version Input

```yaml
name: Check Specific Version

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Python version to check'
        required: true
        default: '3.11.7'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v2
        with:
          products: 'python'
          version: ${{ github.event.inputs.version }}
          semantic-version-fallback: true
          fail-on-eol: true
```

### 5. Multi-Product Tracking (Bulk Mode)

```yaml
name: Docker Base Image EOL Check

on:
  schedule:
    - cron: '0 0 * * 1'

jobs:
  check-base-images:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v1
        with:
          products: 'ubuntu,alpine,debian,python,nodejs'
          cycles: |
            {
              "ubuntu": ["22.04", "20.04"],
              "alpine": ["3.19", "3.18"],
              "python": ["3.11", "3.12"],
              "nodejs": ["20"]
            }
          fail-on-eol: true
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Dependency Monitoring with PR Creation

```yaml
name: Dependency EOL Monitor

on:
  schedule:
    - cron: '0 9 * * 1' # Monday 9 AM

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: broadsage/endoflife-action@v1
        id: eol-check
        with:
          products: 'python,nodejs,postgresql,redis,nginx'
          eol-threshold-days: 180
          output-format: 'markdown'
          output-file: 'eol-report.md'
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Create PR if EOL detected
        if: steps.eol-check.outputs.eol-detected == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          title: '🚨 EOL Software Detected - Update Required'
          body-path: 'eol-report.md'
          branch: 'automated/eol-updates'
          labels: 'dependencies,security,automated'
```

### 3. CI/CD Pipeline Integration

```yaml
name: CI

on: [push, pull_request]

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: broadsage/endoflife-action@v1
        with:
          products: 'python,nodejs'
          fail-on-eol: true
          fail-on-approaching-eol: true
          eol-threshold-days: 30
```

### 4. Multi-Project Monitoring

```yaml
name: Organization-wide EOL Check

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  check-all:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project:
          - name: 'Backend Services'
            products: 'python,postgresql,redis,nginx'
          - name: 'Frontend Apps'
            products: 'nodejs,nginx'
          - name: 'Infrastructure'
            products: 'ubuntu,kubernetes,docker'
    
    steps:
      - uses: broadsage/endoflife-action@v1
        with:
          products: ${{ matrix.project.products }}
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          issue-labels: 'eol,${{ matrix.project.name }}'
```

## 🔧 Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/broadsage/endoflife-action.git
cd endoflife-action

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Check coverage
npm test -- --coverage
```

### Project Structure

```
endoflife-action/
├── src/
│   ├── index.ts          # Main entry point
│   ├── client.ts         # API client with caching
│   ├── analyzer.ts       # EOL analysis logic
│   ├── inputs.ts         # Input parsing & validation
│   ├── outputs.ts        # Output formatting
│   ├── github.ts         # GitHub integration
│   └── types.ts          # Type definitions
├── tests/
│   ├── client.test.ts
│   ├── analyzer.test.ts
│   ├── inputs.test.ts
│   └── outputs.test.ts
├── .github/
│   └── workflows/
│       ├── ci.yml        # CI pipeline
│       └── release.yml   # Release automation
├── action.yml            # Action metadata
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 📊 Example Output

### GitHub Step Summary

![Example Summary](https://via.placeholder.com/800x400?text=GitHub+Step+Summary+Example)

### Markdown Report

```markdown
# 📊 EndOfLife Analysis Report

**Total Products Checked:** 3
**Total Cycles Checked:** 5

## ❌ End-of-Life Detected

| Product | Cycle | EOL Date | Latest Version | LTS |
|---------|-------|----------|----------------|-----|
| python | 2.7 | 2020-01-01 | 2.7.18 | ✗ |

## ⚠️ Approaching End-of-Life

| Product | Cycle | Days Until EOL | EOL Date | Latest Version | LTS |
|---------|-------|----------------|----------|----------------|-----|
| python | 3.9 | 45 | 2025-10-05 | 3.9.18 | ✗ |

## ✅ Active Support

| Product | Cycle | EOL Date | Latest Version | LTS |
|---------|-------|----------|----------------|-----|
| python | 3.11 | 2027-10-24 | 3.11.7 | ✗ |
| python | 3.12 | 2028-10-02 | 3.12.1 | ✗ |
| nodejs | 20 | 2026-04-30 | 20.10.0 | ✓ |
```

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Write tests for new features
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated releases:

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance tasks
```

See [Release Process](docs/RELEASE_PROCESS.md) for details.

### Dependency Management

We use [Renovate](https://docs.renovatebot.com/) for automated dependency updates. See [Dependency Management](docs/DEPENDENCY_MANAGEMENT.md) for details.

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [endoflife.date](https://endoflife.date) for providing the comprehensive EOL API
- GitHub Actions team for the excellent platform

## 📞 Support

- 📧 Email: support@broadsage.com
- 🐛 Issues: [GitHub Issues](https://github.com/broadsage/endoflife-action/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/broadsage/endoflife-action/discussions)

## 🗺️ Roadmap

- [ ] Support for custom EOL policies
- [ ] Slack/Teams notifications
- [ ] Automated PR creation with version updates
- [ ] Historical EOL tracking and trends
- [ ] Integration with dependency management tools
- [ ] Support for private/self-hosted endoflife.date instances

---

**Made with ❤️ by [BroadSage](https://broadsage.com)**
