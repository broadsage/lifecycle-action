# Workflow Examples

This directory contains complete, ready-to-use workflow examples for the Broadsage EOL GitHub Action.

## Notification Examples

### [Slack Notifications](slack-notifications.yml)
Send EOL alerts to Slack channels using webhooks.

**Features:**
- Slack Block Kit formatting
- Rich message with repository context
- Configurable retry logic

**Setup:**
1. Create a Slack Incoming Webhook: https://api.slack.com/messaging/webhooks
2. Add webhook URL to GitHub Secrets as `SLACK_WEBHOOK`
3. Use the example workflow

---

### [Discord Notifications](discord-notifications.yml)
Send rich embeds to Discord channels.

**Features:**
- Color-coded embeds based on severity
- Field support for detailed information
- Automatic retry on failure

**Setup:**
1. Go to Discord Server Settings → Integrations → Webhooks
2. Create a new webhook
3. Add webhook URL to GitHub Secrets as `DISCORD_WEBHOOK`

---

### [Microsoft Teams Notifications](teams-notifications.yml)
Send MessageCard notifications to Teams channels.

**Features:**
- Adaptive card formatting
- Action buttons for workflow runs
- Optimized for .NET ecosystem

**Setup:**
1. In Teams channel, go to Connectors → Incoming Webhook
2. Configure and create webhook
3. Add webhook URL to GitHub Secrets as `TEAMS_WEBHOOK`

---

### [Multi-Channel Notifications](multi-channel-notifications.yml)
Send notifications to multiple platforms simultaneously.

**Features:**
- Slack, Discord, Teams, and Google Chat
- Parallel sending for performance
- Comprehensive configuration example
- GitHub issue integration

**Use Case:** Enterprise environments requiring notifications across multiple teams

---

### [Custom Webhook](custom-webhook.yml)
Integrate with any webhook endpoint using standardized JSON payload.

**Features:**
- Custom headers support (authentication, etc.)
- Standardized JSON payload format
- Retry logic with exponential backoff

**Payload Format:**
```json
{
  "event": "eol_check_completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "repository": "owner/repo",
  "severity": "error",
  "title": "🚨 End-of-Life Detected",
  "summary": "2 version(s) have reached end-of-life",
  "fields": [...],
  "runUrl": "https://github.com/owner/repo/actions/runs/123",
  "metadata": {...}
}
```

---

## Other Examples

### [Version Extraction](extract-from-file.yml)
Extract versions from package.json, Dockerfile, or other files.

**Supported Formats:**
- YAML (package.json, docker-compose.yml)
- JSON (package.json, composer.json)
- Text (Dockerfile, requirements.txt)

---

### [Matrix Generation](matrix-generation.yml)
Auto-generate test matrices for multi-version testing.

**Features:**
- Exclude EOL versions automatically
- Filter by release date
- Limit number of versions
- Custom sort order

---

### [Scheduled EOL Check](scheduled-eol-check.yml)
Weekly monitoring with comprehensive reporting.

**Features:**
- Scheduled runs (cron)
- Multiple output formats
- Artifact upload
- Issue creation

---

## Quick Start

1. **Choose an example** that matches your use case
2. **Copy the workflow** to `.github/workflows/` in your repository
3. **Add secrets** (webhook URLs, tokens) to GitHub repository settings
4. **Customize** the `products` list and other settings
5. **Test** using workflow_dispatch or wait for the schedule

## Common Patterns

### Notify Only on EOL
```yaml
notify-on-eol-only: true
notify-on-approaching-eol: false
```

### Custom Threshold
```yaml
notification-threshold-days: 30  # 30 days before EOL
```

### Retry Configuration
```yaml
notification-retry-attempts: 5
notification-retry-delay-ms: 2000
```

## Need Help?

- 📖 [Main README](../README.md)
- 🐛 [Report Issues](https://github.com/broadsage/endoflife-action/issues)
- 💬 [Discussions](https://github.com/broadsage/endoflife-action/discussions)
