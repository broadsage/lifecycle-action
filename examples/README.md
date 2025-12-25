# Examples

This directory contains example workflows demonstrating various use cases for the EndOfLife Action.

## Available Examples

### 1. Basic EOL Check (`basic-eol-check.yml`)
Simple weekly check for common products.

### 2. Docker Image Monitoring (`docker-image-monitoring.yml`)
Monitor base images used in Docker containers.

### 3. Dependency Monitoring with PR (`dependency-pr-automation.yml`)
Automatically create PRs when EOL is detected.

### 4. CI/CD Integration (`ci-integration.yml`)
Integrate EOL checks into your CI/CD pipeline.

### 5. Multi-Project Monitoring (`multi-project-monitoring.yml`)
Monitor multiple projects with different tech stacks.

### 6. Custom Notifications (`custom-notifications.yml`)
Send notifications to Slack, Teams, or email.

## Usage

Copy any example to your `.github/workflows/` directory and customize as needed.

```bash
# Copy an example
cp examples/basic-eol-check.yml .github/workflows/eol-check.yml

# Edit and customize
vim .github/workflows/eol-check.yml

# Commit and push
git add .github/workflows/eol-check.yml
git commit -m "Add EOL monitoring workflow"
git push
```

## Customization Tips

1. **Adjust Schedule**: Modify the `cron` expression to match your needs
2. **Filter Products**: Specify only the products relevant to your project
3. **Set Thresholds**: Adjust `eol-threshold-days` based on your update cycle
4. **Configure Outputs**: Choose the output format that works best for you
5. **Enable Automation**: Use `create-issue-on-eol` for automatic issue creation

## Need Help?

- Check the [main README](../README.md) for detailed documentation
- Open an [issue](https://github.com/broadsage/endoflife-action/issues) if you need assistance
- Join our [discussions](https://github.com/broadsage/endoflife-action/discussions)
