# 🛡️ Software Lifecycle Tracker

[![CI](https://github.com/broadsage/lifecycle-action/workflows/CI/badge.svg)](https://github.com/broadsage/lifecycle-action/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/broadsage/lifecycle-action.svg)](https://github.com/broadsage/lifecycle-action/releases)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue)](https://github.com/marketplace/actions/software-lifecycle-tracker)

> **Automate software lifecycle tracking with intelligent EOL detection, multi-channel notifications, and seamless CI/CD integration.**

Never miss an End-of-Life date again. Automatically track **380+ software products**, send alerts to **Slack/Discord/Teams**, generate **test matrices**, and keep your dependencies secure and up-to-date.

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🔍 **Track 380+ Products** | Native support for Python, Node.js, Ubuntu, PostgreSQL, Kubernetes, and many more via [endoflife.date](https://endoflife.date). |
| 📢 **Smart Notifications** | Instant alerts via **Slack, Discord, Teams, Google Chat**, or custom webhooks. |
| 🤖 **Autonomous Security** | Schedule regular checks and **auto-create GitHub Issues** when EOL is detected. |
| 📊 **Dynamic Matrices** | Automatically build version matrices for multi-version CI/CD testing strategies. |
| 🎯 **Universal Extraction** | Extract versions directly from `package.json`, `Dockerfile`, `Helm charts`, or custom regex. |
| ⚡ **Enterprise Ready** | Feature-rich with **built-in caching**, SSRF protection, and 85%+ test coverage. |

## 🚀 Quick Start

### 1. Simple EOL Check
Stop your build if a dependency is no longer supported.

```yaml
- uses: broadsage/lifecycle-action@v4
  with:
    products: 'python,nodejs,postgresql'
    fail-on-eol: true
```

### 2. Multi-Channel Monitoring
Keep your team informed across multiple platforms.

```yaml
- uses: broadsage/lifecycle-action@v4
  with:
    products: 'python,nodejs'
    slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Automated Test Matrix
Run tests against all supported (non-EOL) versions of a product.

```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: broadsage/lifecycle-action@v4
        id: set-matrix
        with:
          products: 'python'
          output-matrix: true
          exclude-eol-from-matrix: true

  test:
    needs: prepare
    strategy:
      matrix: ${{ fromJson(needs.prepare.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.version }}
      - run: pytest
```

## 📖 Complete Documentation

<details>
<summary><b>🛠️ Core Configuration</b></summary>

| Input | Description | Default |
| :--- | :--- | :--- |
| `products` | **Required.** Comma-separated list of products (e.g., `python,nodejs`). | — |
| `releases` | JSON mapping of products to specific releases to track. | `{}` |
| `check-eol` | Enable/disable EOL status checks. | `true` |
| `fail-on-eol` | Fail the workflow if an EOL version is detected. | `false` |
| `eol-threshold-days` | Buffer period (in days) to warn before actual EOL. | `90` |
| `fail-on-stale` | Fail if a version hasn't received updates in a long time. | `false` |

</details>

<details>
<summary><b>📤 Outputs & Reporting</b></summary>

| Input | Description | Default |
| :--- | :--- | :--- |
| `output-format` | Format for reports: `summary`, `json`, or `markdown`. | `summary` |
| `output-matrix` | Generate a JSON matrix for GitHub Actions jobs. | `false` |
| `cache-ttl` | How long to cache API responses (in seconds). | `3600` |
| `include-support-info` | Include detailed support/LTS status in outputs. | `true` |

</details>

<details>
<summary><b>🔗 Integration & Advanced</b></summary>

| Category | Features |
| :--- | :--- |
| **Version Extraction** | Extract from files (`yaml`, `json`, `text`) using `file-path` and `file-key`. |
| **SBOM Support** | Parse CycloneDX or SPDX files to identify all components. |
| **GitHub Issues** | Auto-generate issues with labels like `security`, `eol`. |

</details>

<details>
<summary><b>📖 Full Reference</b></summary>

For a complete list of all available inputs and outputs, please refer to our **[Inputs & Outputs Documentation](docs/inputs-outputs.md)**.

</details>

## 🏆 Why Choose This Action?

| Feature | Software Lifecycle Tracker | Industry Average |
| :--- | :---: | :---: |
| **Product Database** | **380+** (via endoflife.date) | ~20-50 |
| **Native Notifications** | **5+ Channels** | 0-1 |
| **Version Detection** | Native Regex & File Parsing | ❌ |
| **Matrix Automation** | Native Support | ❌ |
| **Active Maintenance** | ✅ Verified | Varies |

## 🤝 Contributing & Support

We love community contributions! Check out our [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

*   **Bugs/Features**: [Open an issue](https://github.com/broadsage/lifecycle-action/issues)
*   **Discussions**: [Join the conversation](https://github.com/broadsage/lifecycle-action/discussions)
*   **Data Source**: Powered by the amazing [endoflife.date](https://endoflife.date) API.

<p align="center">
  <b>Made with ❤️ by <a href="https://github.com/broadsage">Broadsage Open Source</a></b><br>
  <i>Securing the software lifecycle, one commit at a time.</i>
</p>
