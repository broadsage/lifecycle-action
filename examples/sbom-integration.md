# SBOM Integration Example

This example demonstrates how to use the SBOM integration feature to automatically track EOL status for all components in your Software Bill of Materials.

## Supported Formats

- **CycloneDX** (JSON)
- **SPDX** (JSON)
- **Auto-detection** (default)

## Basic Usage

### 1. CycloneDX SBOM

```yaml
name: EOL Check from SBOM

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  eol-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check EOL status from SBOM
        uses: broadsage/endoflife-action@v4
        with:
          sbom-file: 'sbom.json'
          sbom-format: 'cyclonedx'  # or 'auto' for auto-detection
          fail-on-eol: true
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. SPDX SBOM

```yaml
- name: Check EOL from SPDX
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'spdx.json'
    sbom-format: 'spdx'
    output-format: 'markdown'
    output-file: 'eol-report.md'
```

### 3. Custom Component Mapping

If your SBOM uses custom component names that don't match endoflife.date products:

```yaml
- name: Check EOL with custom mapping
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'
    sbom-component-mapping: |
      {
        "my-custom-python": "python",
        "internal-nodejs": "nodejs",
        "company-postgres": "postgresql"
      }
```

## Complete Example with Matrix Generation

```yaml
name: Multi-Version Testing from SBOM

on: [push, pull_request]

jobs:
  extract-versions:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.eol.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate SBOM
        run: |
          # Example: Generate SBOM using your preferred tool
          # cyclonedx-cli, syft, trivy, etc.
          cyclonedx-cli generate -o sbom.json
      
      - name: Extract versions from SBOM
        id: eol
        uses: broadsage/endoflife-action@v4
        with:
          sbom-file: 'sbom.json'
          output-matrix: true
          exclude-eol-from-matrix: true
          fail-on-eol: false  # Don't fail, just generate matrix
  
  test:
    needs: extract-versions
    strategy:
      matrix: ${{ fromJson(needs.extract-versions.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test with ${{ matrix.product }} ${{ matrix.version }}
        run: |
          echo "Testing with ${{ matrix.product }} version ${{ matrix.version }}"
          # Your test commands here
```

## Integration with SBOM Generation Tools

### Syft (Anchore)

```yaml
- name: Generate SBOM with Syft
  uses: anchore/sbom-action@v0
  with:
    format: cyclonedx-json
    output-file: sbom.json

- name: Check EOL
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'
```

### Trivy

```yaml
- name: Generate SBOM with Trivy
  run: |
    trivy image --format cyclonedx \
      --output sbom.json \
      myimage:latest

- name: Check EOL
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'
```

### CycloneDX CLI

```yaml
- name: Generate SBOM
  run: cyclonedx-cli generate -o sbom.json

- name: Check EOL
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'
```

## SBOM Statistics

Get statistics about your SBOM:

```yaml
- name: Analyze SBOM
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'
    output-format: 'json'
    output-file: 'eol-analysis.json'

- name: Display statistics
  run: |
    echo "Total products: $(jq '.totalProductsChecked' eol-analysis.json)"
    echo "Total releases: $(jq '.totalReleasesChecked' eol-analysis.json)"
    echo "EOL detected: $(jq '.eolDetected' eol-analysis.json)"
```

## Component Mapping

The action automatically maps common component names to endoflife.date products:

| SBOM Component | Mapped Product |
|----------------|----------------|
| `python`, `python3` | `python` |
| `node`, `nodejs`, `node.js` | `nodejs` |
| `postgresql`, `postgres` | `postgresql` |
| `openjdk`, `java` | `java` |
| `golang`, `go` | `go` |
| `ubuntu` | `ubuntu` |
| `debian` | `debian` |
| `alpine` | `alpine` |
| `nginx` | `nginx` |
| `redis` | `redis` |
| `mongodb` | `mongodb` |
| `mysql` | `mysql` |
| `mariadb` | `mariadb` |
| `docker` | `docker-engine` |
| `kubernetes`, `kubectl` | `kubernetes` |

For components not in this list, provide custom mapping using `sbom-component-mapping`.

## Outputs

When using SBOM integration, all standard outputs are available:

```yaml
- name: Check EOL from SBOM
  id: eol-check
  uses: broadsage/endoflife-action@v4
  with:
    sbom-file: 'sbom.json'

- name: Use outputs
  run: |
    echo "EOL detected: ${{ steps.eol-check.outputs.eol-detected }}"
    echo "Total products: ${{ steps.eol-check.outputs.total-products-checked }}"
    echo "EOL products: ${{ steps.eol-check.outputs.eol-products }}"
```

## Best Practices

1. **Generate SBOM in CI/CD**: Always generate fresh SBOM in your pipeline
2. **Store SBOM as artifact**: Keep SBOM for audit trail
3. **Schedule regular checks**: Run EOL checks weekly
4. **Use custom mapping**: Map internal component names
5. **Combine with notifications**: Alert team when EOL detected

## Troubleshooting

### Component not detected

If a component from your SBOM is not being checked:

1. Check if the component name matches endoflife.date products
2. Add custom mapping using `sbom-component-mapping`
3. Check action logs for "Extracted X components" message

### Invalid SBOM format

Ensure your SBOM is valid JSON in CycloneDX or SPDX format:

```bash
# Validate CycloneDX
cyclonedx-cli validate --input-file sbom.json

# Validate SPDX
spdx-tools validate sbom.json
```

## Example SBOM Files

See the `examples/sbom/` directory for sample SBOM files:
- `cyclonedx-example.json`
- `spdx-example.json`
