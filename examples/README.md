# Examples

This directory contains real-world examples of using the End-of-Life GitHub Action.

## 📂 Available Examples

### Basic Examples

1. **[basic-check.yml](basic-check.yml)** - Simple EOL checking  
   Perfect for getting started

2. **[multi-product-check.yml](multi-product-check.yml)** - Check multiple products  
   Monitor all your dependencies at once

3. **[specific-versions.yml](specific-versions.yml)** - Track specific versions  
   Check only the versions you care about

### Version Extraction

4. **[dockerfile-extraction.yml](dockerfile-extraction.yml)** - Extract from Dockerfile  
   Monitor Docker base image versions

5. **[package-json-extraction.yml](package-json-extraction.yml)** - Extract from package.json  
   Track Node.js versions automatically

6. **[helm-values-extraction.yml](helm-values-extraction.yml)** - Extract from Helm values  
   Monitor Helm chart dependencies

### Advanced Features

7. **[matrix-generation.yml](matrix-generation.yml)** - Generate version matrices  
   Auto-generate test matrices for CI/CD

8. **[date-filtering.yml](date-filtering.yml)** - Filter by release date  
   Focus on recent versions only

9. **[pr-blocking.yml](pr-blocking.yml)** - Block PRs with EOL dependencies  
   Enforce EOL policies on pull requests

10. **[scheduled-monitoring.yml](scheduled-monitoring.yml)** - Weekly scheduled checks  
    Continuous EOL monitoring

## 🚀 Quick Start

### 1. Basic EOL Check

```yaml
# .github/workflows/eol-check.yml
name: EOL Check

on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs'
```

[**See Full Example →**](basic-check.yml)

---

### 2. Auto-Create Issues

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs,postgresql'
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
    issue-labels: 'dependencies,eol,urgent'
```

[**See Full Example →**](scheduled-monitoring.yml)

---

### 3. Multi-Version Testing

```yaml
jobs:
  get-versions:
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: broadsage/endoflife-action@v3
        id: eol
        with:
          products: 'python'
          output-matrix: true
  
  test:
    needs: get-versions
    strategy:
      matrix: ${{ fromJson(needs.get-versions.outputs.matrix) }}
    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.version }}
```

[**See Full Example →**](matrix-generation.yml)

---

## 📋 Use Case Index

### By Industry/Role

**DevOps Teams**
- [scheduled-monitoring.yml](scheduled-monitoring.yml)
- [multi-product-check.yml](multi-product-check.yml)
- [matrix-generation.yml](matrix-generation.yml)

**Security Teams**
- [pr-blocking.yml](pr-blocking.yml)
- [specific-versions.yml](specific-versions.yml)

**Development Teams**
- [dockerfile-extraction.yml](dockerfile-extraction.yml)
- [package-json-extraction.yml](package-json-extraction.yml)
- [helm-values-extraction.yml](helm-values-extraction.yml)

### By Technology

**Python Projects**
- [basic-check.yml](basic-check.yml)
- [dockerfile-extraction.yml](dockerfile-extraction.yml)

**Node.js Projects**
- [package-json-extraction.yml](package-json-extraction.yml)
- [matrix-generation.yml](matrix-generation.yml)

**Docker/Kubernetes**
- [dockerfile-extraction.yml](dockerfile-extraction.yml)
- [helm-values-extraction.yml](helm-values-extraction.yml)

**Databases**
- [multi-product-check.yml](multi-product-check.yml)
- [date-filtering.yml](date-filtering.yml)

---

## 🎯 Common Patterns

### Pattern 1: Weekly Monitoring + Auto Issues

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM

jobs:
  monitor:
    steps:
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python,nodejs,postgresql'
          eol-threshold-days: 90
          create-issue-on-eol: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Best For**: Continuous monitoring with automatic notifications

---

### Pattern 2: PR Checks + Fail Fast

```yaml
on: [pull_request]

jobs:
  eol-check:
    steps:
      - uses: actions/checkout@v4
      - uses: broadsage/endoflife-action@v3
        with:
          products: 'python'
          file-path: 'requirements.txt'
          fail-on-eol: true
          fail-on-approaching-eol: true
```

**Best For**: Enforcing EOL policies on new code

---

### Pattern 3: Matrix Generation + Testing

```yaml
jobs:
  versions:
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: broadsage/endoflife-action@v3
        id: eol
        with:
          products: 'nodejs'
          output-matrix: true
          min-release-date: '>=2022'
          max-versions: 4
  
  test:
    needs: versions
    strategy:
      matrix: ${{ fromJson(needs.versions.outputs.matrix) }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.version }}
      - run: npm test
```

**Best For**: Testing across multiple supported versions

---

### Pattern 4: Version Extraction + Validation

```yaml
- uses: actions/checkout@v4

- uses: broadsage/endoflife-action@v3
  with:
    products: 'postgresql'
    file-path: 'helm/values.yaml'
    file-key: 'postgresql.image.tag'
    fail-on-eol: true
```

**Best For**: Validating dependency versions in config files

---

## 🔧 Configuration Templates

### Minimal

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python'
```

### Recommended

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    products: 'python,nodejs'
    fail-on-eol: true
    eol-threshold-days: 90
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced

```yaml
- uses: broadsage/endoflife-action@v3
  with:
    # Products
    products: 'python,nodejs,postgresql'
    
    # Version extraction
    file-path: 'requirements.txt'
    file-format: 'text'
    version-regex: 'python==([0-9.]+)'
    
    # Filtering
    min-release-date: '>=2022'
    max-versions: 5
    
    # Matrix
    output-matrix: true
    exclude-eol-from-matrix: true
    
    # Actions
    fail-on-eol: true
    create-issue-on-eol: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
    
    # Output
    output-format: 'markdown'
    output-file: 'eol-report.md'
```

---

## 💡 Tips & Best Practices

### 1. Start Simple

Begin with basic EOL checking, then add features as needed:
```yaml
# Week 1: Basic check
products: 'python'

# Week 2: Add failure
fail-on-eol: true

# Week 3: Add automation
create-issue-on-eol: true

# Week 4: Add filtering
min-release-date: '>=2023'
```

### 2. Use Scheduled Workflows

Check EOL status regularly:
```yaml
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly
  workflow_dispatch:      # Allow manual runs
```

### 3. Combine with Other Actions

```yaml
# Check EOL → Create PR if needed
- uses: broadsage/endoflife-action@v3
  id: eol
  
- if: steps.eol.outputs.eol-detected == 'true'
  uses: peter-evans/create-pull-request@v5
  with:
    title: 'Update EOL dependencies'
```

### 4. Use Matrix for Multi-Version Testing

```yaml
# Don't manually maintain version lists
# ❌ Bad
strategy:
  matrix:
    python: ['3.9', '3.10', '3.11']  # Manual, gets outdated

# ✅ Good
strategy:
  matrix: ${{ fromJson(needs.get-versions.outputs.matrix) }}  # Auto-generated
```

### 5. Filter Aggressively

```yaml
# Reduce API calls and processing time
min-release-date: '>=2022'  # Only recent versions
max-versions: 5              # Limit count
```

---

## 🐛 Troubleshooting

### Issue: No products found

**Solution**: Check product names at https://endoflife.date/api/all.json

```yaml
# ✅ Correct
products: 'python,nodejs'

# ❌ Wrong
products: 'Python,Node.js'
```

### Issue: Version not extracted

**Solution**: Verify file path and format

```yaml
# For JSON
file-format: 'json'
file-key: 'engines.node'

# For regex
file-format: 'text'
version-regex: 'FROM python:([0-9.]+)'
```

### Issue: Empty matrix

**Solution**: Check filters

```yaml
exclude-eol-from-matrix: false  # Temporarily
min-release-date: ''            # Remove filter
```

---

## 🤝 Contributing Examples

Have a great use case? [Submit a PR](../CONTRIBUTING.md) with:

1. Create your workflow file
2. Add description to this README
3. Test it works
4. Submit PR
