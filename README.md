# EOL GitHub Action

[![CI](https://github.com/broadsage/endoflife-action/workflows/CI/badge.svg)](https://github.com/broadsage/endoflife-action/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/broadsage/endoflife-action.svg)](https://github.com/broadsage/endoflife-action/releases)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue)](https://github.com/marketplace/actions/broadsage-eol-github-action)

> **Automate software lifecycle tracking with intelligent EOL detection, multi-channel notifications, and seamless CI/CD integration**

Never miss an End-of-Life date again. Automatically track 380+ software products, send alerts to Slack/Discord/Teams, generate test matrices, and keep your dependencies secure.

## ✨ Features

- 🔍 **Track 380+ Products** - Python, Node.js, Ubuntu, PostgreSQL, Kubernetes, and more
- 📢 **Multi-Channel Notifications** - Slack, Discord, Teams, Google Chat, custom webhooks
- 🤖 **Fully Automated** - Schedule checks, auto-create issues, fail builds on EOL
- 📊 **Matrix Generation** - Auto-generate version matrices for multi-version CI/CD testing
- 🎯 **Version Extraction** - Extract versions from package.json, Dockerfile, Helm charts, etc.
- 📅 **Smart Filtering** - Filter by release date, limit versions, exclude EOL automatically
- ⚡ **Production Ready** - Built-in caching, type-safe, comprehensive test coverage
- 🚀 **Modern API v1** - Full support for endoflife.date API v1 with all endpoints

## 🚀 Quick Start

### Basic EOL Check

```yaml
- uses: broadsage/endoflife-action@v4
  with:
    products: 'python,nodejs,postgresql'
    fail-on-eol: true
```

### With Slack Notifications

```yaml
- uses: broadsage/endoflife-action@v4
  with:
    products: 'python,nodejs'
    slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    notify-on-eol-only: true
    fail-on-eol: true
```

### Multi-Channel Notifications

```yaml
- uses: broadsage/endoflife-action@v4
  with:
    products: 'python,nodejs,postgresql'
    slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    teams-webhook-url: ${{ secrets.TEAMS_WEBHOOK }}
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Generate Test Matrix

```yaml
jobs:
  get-versions:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: broadsage/endoflife-action@v4
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
```

## 📖 Documentation

### Inputs

<details>
<summary><b>Core Settings</b></summary>

| Input                       | Description                                              | Default      |
| --------------------------- | -------------------------------------------------------- | ------------ |
| `products`                  | Comma-separated list of products (e.g., "python,nodejs") | **Required** |
| `releases`                  | JSON object mapping products to specific releases        | `{}`         |
| `check-eol`                 | Check if any tracked versions are end-of-life            | `true`       |
| `fail-on-eol`               | Fail workflow if EOL detected                            | `false`      |
| `fail-on-approaching-eol`   | Fail if version approaching EOL                          | `false`      |
| `fail-on-stale`             | Fail if version has no recent updates                    | `false`      |
| `eol-threshold-days`        | Days before EOL to trigger warning                       | `90`         |
| `staleness-threshold-days`  | Days since last release to consider stale                | `365`        |
| `include-discontinued`      | Include discontinued products/devices                    | `true`       |
| `semantic-version-fallback` | Enable semantic version fallback (1.2.3 → 1.2 → 1)       | `true`       |

</details>

<details>
<summary><b>Output Settings</b></summary>

| Input                                 | Description                              | Default                         |
| ------------------------------------- | ---------------------------------------- | ------------------------------- |
| `output-format`                       | Format: `json`, `markdown`, or `summary` | `summary`                       |
| `output-file`                         | Path to write output file                | `''`                            |
| `output-matrix`                       | Generate version matrix for testing      | `false`                         |
| `exclude-eol-from-matrix`             | Exclude EOL versions from matrix         | `true`                          |
| `exclude-approaching-eol-from-matrix` | Exclude approaching EOL from matrix      | `false`                         |
| `cache-ttl`                           | Cache TTL in seconds for API responses   | `3600`                          |
| `include-latest-version`              | Include latest version information       | `true`                          |
| `include-support-info`                | Include support status information       | `true`                          |
| `custom-api-url`                      | Custom API URL (for testing)             | `https://endoflife.date/api/v1` |

</details>

<details>
<summary><b>Version Extraction</b></summary>

| Input           | Description                              | Default |
| --------------- | ---------------------------------------- | ------- |
| `file-path`     | Path to file containing version info     | `''`    |
| `file-key`      | Nested key path for YAML/JSON extraction | `''`    |
| `file-format`   | File format: `yaml`, `json`, or `text`   | `yaml`  |
| `version-regex` | Regex to extract version from file       | `''`    |
| `version`       | Manually specify version                 | `''`    |

</details>

<details>
<summary><b>Filtering & Sorting</b></summary>

| Input                | Description                                  | DefaultSource |
| -------------------- | -------------------------------------------- | -------------- |
| `min-release-date`   | Minimum release date (YYYY-MM-DD or YYYY)    | `''`           |
| `max-release-date`   | Maximum release date (YYYY-MM-DD or YYYY)    | `''`           |
| `max-versions`       | Maximum number of releases to check          | `''`           |
| `version-sort-order` | Sort order for versions: `newest-first` or `oldest-first` | `newest-first` |
| `filter-by-category` | Filter products by category (e.g. `os`)      | `''`           |
| `filter-by-tag`      | Filter products by tag (e.g. `linux`)        | `''`           |

</details>

<details>
<summary><b>GitHub Integration</b></summary>

| Input                 | Description                           | Default                     |
| --------------------- | ------------------------------------- | --------------------------- |
| `github-token`        | GitHub token for creating issues      | `''`                        |
| `create-issue-on-eol` | Create GitHub issue when EOL detected | `false`                     |
| `issue-labels`        | Comma-separated labels for issues     | `dependencies,eol,security` |

</details>

<details>
<summary><b>Notification Settings</b></summary>

| Input                         | Description                                             | Default |
| ----------------------------- | ------------------------------------------------------- | ------- |
| `enable-notifications`        | Enable notifications (auto-enabled if webhook provided) | `false` |
| `slack-webhook-url`           | Slack webhook URL                                       | `''`    |
| `discord-webhook-url`         | Discord webhook URL                                     | `''`    |
| `teams-webhook-url`           | Microsoft Teams webhook URL                             | `''`    |
| `google-chat-webhook-url`     | Google Chat webhook URL                                 | `''`    |
| `custom-webhook-url`          | Custom webhook URL (JSON payload)                       | `''`    |
| `custom-webhook-headers`      | Custom headers (JSON format)                            | `''`    |
| `notify-on-eol-only`          | Only notify when EOL detected                           | `false` |
| `notify-on-approaching-eol`   | Notify for approaching EOL                              | `true`  |
| `notification-threshold-days` | Days before EOL to notify                               | `90`    |
| `notification-min-severity`   | Minimum severity: info, warning, error, critical        | `info`  |
| `notification-retry-attempts` | Retry attempts for notifications                        | `3`     |
| `notification-retry-delay-ms` | Delay in ms between retries                             | `1000`  |

</details>

### Outputs

| Output                      | Description                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `eol-detected`              | Boolean indicating if EOL versions detected                         |
| `version`                   | Extracted version from file (if file-path provided)                 |
| `approaching-eol`           | Boolean indicating if versions approaching EOL                      |
| `results`                   | JSON string containing all version information                      |
| `eol-products`              | JSON array of EOL products                                          |
| `approaching-eol-products`  | JSON array of products approaching EOL                              |
| `latest-versions`           | JSON object mapping products to latest versions                     |
| `summary`                   | Human-readable summary                                              |
| `total-products-checked`    | Total number of products checked                                    |
| `total-releases-checked`    | Total number of releases checked                                    |
| `matrix`                    | Version matrix for GitHub Actions (format: `{ "versions": [...] }`) |
| `matrix-include`            | Detailed matrix with metadata (format: `{ "include": [...] }`)      |
| `stale-detected`            | Boolean indicating if stale versions detected                       |
| `stale-products`            | JSON array of products with stale versions                          |
| `discontinued-detected`     | Boolean indicating if discontinued products detected                |
| `discontinued-products`     | JSON array of discontinued products/devices                         |
| `extended-support-products` | JSON array of products with extended support                        |

## 📚 Examples & Guides

- **[Examples Directory](examples/)** - Complete workflow examples for all features
  - [Slack Notifications](examples/slack-notifications.yml)
  - [Discord Notifications](examples/discord-notifications.yml)
  - [Multi-Channel Setup](examples/multi-channel-notifications.yml)
  - [Custom Webhooks](examples/custom-webhook.yml)
  - [Matrix Generation](examples/matrix-generation.yml)

- **[Supported Products](https://endoflife.date/api)** - Full list of 380+ trackable products

## 🔔 Notification Setup

<details>
<summary><b>Slack</b></summary>

1. Create webhook: https://api.slack.com/messaging/webhooks
2. Add to secrets: `SLACK_WEBHOOK`
3. Use in workflow:

```yaml
slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

</details>

<details>
<summary><b>Discord</b></summary>

1. Server Settings → Integrations → Webhooks → New Webhook
2. Add to secrets: `DISCORD_WEBHOOK`
3. Use in workflow:

```yaml
discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
```

</details>

<details>
<summary><b>Microsoft Teams</b></summary>

1. Channel → Connectors → Incoming Webhook
2. Add to secrets: `TEAMS_WEBHOOK`
3. Use in workflow:

```yaml
teams-webhook-url: ${{ secrets.TEAMS_WEBHOOK }}
```

</details>

<details>
<summary><b>Custom Webhook</b></summary>

Receives standardized JSON payload:

```json
{
  "event": "eol_check_completed",
  "severity": "error",
  "title": "🚨 End-of-Life Detected",
  "summary": "2 version(s) have reached end-of-life",
  "repository": "owner/repo",
  "runUrl": "https://github.com/owner/repo/actions/runs/123"
}
```

</details>

## 🏆 Why Choose This Action?

| Feature            | This Action    | Others  |
| ------------------ | -------------- | ------- |
| Products Supported | **380+**       | 5-50    |
| Notifications      | **5 channels** | 0-3     |
| Version Extraction | ✅             | ❌      |
| Matrix Generation  | ✅             | ❌      |
| Test Coverage      | **87%**        | Unknown |
| Active Maintenance | ✅             | Varies  |

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [endoflife.date](https://endoflife.date) for the comprehensive EOL API
- All our contributors and users

---

**Made with ❤️ by [Broadsage](https://github.com/broadsage)**
