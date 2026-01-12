# 📖 Action Inputs & Outputs

This document provides a comprehensive reference for all available configuration options (inputs) and data results (outputs) for the **Software Lifecycle Tracker** GitHub Action.

---

## 📥 Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `products` | Comma-separated list of products to track (e.g., `python,nodejs,ubuntu`). Use `all` to fetch all products. | **Yes** | — |
| `releases` | JSON object mapping products to specific releases to track (e.g., `{"python": ["3.11", "3.12"]}`). | No | `{}` |
| `check-eol` | Whether to check if tracked versions are end-of-life. | No | `true` |
| `eol-threshold-days` | Buffer period (in days) to warn before actual EOL. | No | `90` |
| `fail-on-eol` | Fail the action if any version is end-of-life. | No | `false` |
| `fail-on-approaching-eol` | Fail the action if any version is approaching EOL within threshold. | No | `false` |
| `fail-on-stale` | Fail the action if any version has not received updates within staleness threshold. | No | `false` |
| `staleness-threshold-days` | Number of days since last release to consider a version stale. | No | `365` |
| `include-discontinued` | Include discontinued products/devices in the analysis. | No | `true` |
| `output-format` | Output format: `json`, `markdown`, or `summary` (GitHub Step Summary). | No | `summary` |
| `output-file` | Path to write output file (optional, in addition to step outputs). | No | — |
| `cache-ttl` | Cache TTL in seconds for API responses. | No | `3600` |
| `github-token` | GitHub token for creating issues/PRs (optional). | No | — |

| `use-dashboard` | Maintain a single persistent dashboard issue (Phase 6). | No | `false` |
| `dashboard-title`| Title for the lifecycle dashboard issue. | No | `Software Lifecycle Dashboard 🛡️` |
| `include-latest-version` | Include latest version information in output. | No | `true` |
| `include-support-info` | Include support status information in output. | No | `true` |
| `custom-api-url` | Custom API URL (for testing or self-hosted instances). | No | `https://endoflife.date/api/v1` |

### 🔍 Version Extraction

Use these inputs to automatically extract versions from your project files.

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `file-path` | Path to file containing version information (e.g., `package.json`). | No | — |
| `file-key` | Nested key path for YAML/JSON extraction (e.g., `image.tag`). | No | — |
| `file-format` | File format for extraction: `yaml`, `json`, or `text`. | No | `yaml` |
| `version-regex` | Regex to extract version from any file (e.g., `v([0-9.]+)`). | No | — |
| `version` | Manually specify a version (skips file extraction). | No | — |

### 📦 SBOM Integration

Inputs for Software Bill of Materials integration.

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `sbom-file` | Path to SBOM file (CycloneDX or SPDX format). | No | — |
| `sbom-format` | SBOM format: `cyclonedx`, `spdx`, or `auto`. | No | `auto` |
| `sbom-component-mapping`| Custom JSON mapping of SBOM component names to API names. | No | — |
| `semantic-version-fallback`| Enable semantic version fallback matching (`1.2.3` → `1.2` → `1`).| No | `true` |

### 📢 Notifications

Configure alerts for different communication channels.

| Input | Description | Default |
| :--- | :--- | :--- |
| `enable-notifications` | Enable notifications (auto-enabled if any webhook is provided). | `false` |
| `slack-webhook-url` | Slack webhook URL for EOL notifications. | — |
| `discord-webhook-url` | Discord webhook URL for EOL notifications. | — |
| `teams-webhook-url` | Microsoft Teams webhook URL for EOL notifications. | — |
| `google-chat-webhook-url`| Google Chat webhook URL for EOL notifications. | — |
| `custom-webhook-url` | Custom webhook URL (receives JSON payload). | — |
| `custom-webhook-headers` | Custom headers for webhook (JSON format). | — |
| `notify-on-eol-only` | Only send notifications when EOL is detected (not approaching). | `false` |
| `notify-on-approaching-eol`| Send notifications for versions approaching EOL. | `true` |
| `notification-threshold-days`| Days before EOL to trigger notifications. | `90` |
| `notification-min-severity`| Minimum severity: `info`, `warning`, `error`, `critical`. | `info` |
| `notification-retry-attempts`| Number of retry attempts for failed notifications. | `3` |
| `notification-retry-delay-ms`| Delay in milliseconds between retries. | `1000` |

### ⚡ Performance & CI/CD

| Input | Description | Default |
| :--- | :--- | :--- |
| `api-concurrency` | Maximum number of concurrent API requests (1-10). | `5` |
| `output-matrix` | Enable matrix generation for GitHub Actions strategies. | `false` |
| `exclude-eol-from-matrix`| Exclude end-of-life versions from matrix output. | `true` |
| `exclude-approaching-eol-from-matrix`| Exclude versions approaching EOL from matrix output. | `false` |
| `min-release-date` | Minimum release date filter (`YYYY-MM-DD`). | — |
| `max-release-date` | Maximum release date filter (`YYYY-MM-DD`). | — |
| `max-versions` | Maximum number of releases to check per product. | — |
| `version-sort-order` | Sort order: `newest-first` or `oldest-first`. | `newest-first` |
| `filter-by-category` | Filter products by category (e.g., `os`, `lang`, `db`). | — |
| `filter-by-tag` | Filter products by tag (e.g., `linux`, `microsoft`). | — |

---

## 📤 Outputs

| Output | Description |
| :--- | :--- |
| `eol-detected` | Boolean indicating if any EOL versions were detected. |
| `version` | Extracted version from file (if `file-path` was provided). |
| `approaching-eol` | Boolean indicating if any versions are approaching EOL. |
| `results` | JSON string containing all version information. |
| `eol-products` | JSON array of products that are end-of-life. |
| `approaching-eol-products` | JSON array of products approaching end-of-life. |
| `latest-versions` | JSON object mapping products to their latest versions. |
| `summary` | Human-readable summary of findings. |
| `total-products-checked` | Total number of products checked. |
| `total-releases-checked` | Total number of releases checked. |
| `matrix` | JSON matrix for GitHub Actions (`{ "versions": [...] }`). |
| `matrix-include` | Detailed JSON matrix (`{ "include": [...] }`). |
| `stale-detected` | Boolean indicating if any stale versions were detected. |
| `stale-products` | JSON array of products with stale versions. |
| `discontinued-detected` | Boolean indicating if any discontinued products were detected. |
| `discontinued-products` | JSON array of discontinued products/devices. |
| `extended-support-products`| JSON array of products with extended support available. |

| `dashboard-issue-number` | The number of the created or updated Dashboard issue. |
