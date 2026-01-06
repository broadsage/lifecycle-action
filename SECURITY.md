# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 4.x.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

We take the security of EndOfLife Action seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

1. **Email us directly** at security@broadsage.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

2. **Allow us time** to respond and address the issue before public disclosure

### What to expect:

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Updates**: We will provide regular updates on our progress
- **Timeline**: We aim to address critical vulnerabilities within 7 days
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using this action:

### 1. GitHub Token Permissions

Use minimal permissions for `GITHUB_TOKEN`:

```yaml
permissions:
  contents: read
  issues: write  # Only if using create-issue-on-eol
```

### 2. Secrets Management

- Never hardcode sensitive data in workflows
- Use GitHub Secrets for tokens and credentials
- Rotate tokens regularly

### 3. Dependency Security

- Keep the action updated to the latest version
- Review the action's dependencies regularly
- Enable Dependabot alerts

### 4. Input Validation

- Validate all inputs in your workflows
- Use specific version tags (e.g., `@v1.0.0`) instead of `@main`
- Review changes before updating versions

### 5. API Security

- Use the default API URL unless you have a specific need
- If using a custom API URL, ensure it's HTTPS
- Implement rate limiting in your workflows

## Known Security Considerations

### API Rate Limiting

The action implements caching to minimize API calls. Default cache TTL is 1 hour.

### Data Privacy

- No sensitive data is sent to external services
- All API calls are to endoflife.date (or your custom URL)
- GitHub tokens are only used for GitHub API operations

### Network Security

- All API calls use HTTPS
- No data is stored persistently
- Cache is in-memory only

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- Email to security@broadsage.com subscribers

## Compliance

This action is designed to help maintain security compliance by:

- Tracking EOL software
- Alerting on unsupported versions
- Automating dependency updates

## Additional Resources

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [EndOfLife.date Privacy Policy](https://endoflife.date/privacy)

## Contact

For security concerns, contact: security@broadsage.com

For general questions, open a [GitHub Discussion](https://github.com/broadsage/endoflife-action/discussions)
