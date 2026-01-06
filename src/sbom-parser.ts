// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

/**
 * SBOM (Software Bill of Materials) parser
 * Supports CycloneDX and SPDX formats
 */

import * as fs from 'fs';
import * as core from '@actions/core';
import { getErrorMessage } from './utils/error-utils';
import { EndOfLifeClient } from './client';

/**
 * Component extracted from SBOM
 */
export interface SBOMComponent {
  name: string;
  version: string;
  purl?: string;
  cpe?: string;
  type?: string;
}

/**
 * SBOM format types
 */
export enum SBOMFormat {
  CYCLONEDX = 'cyclonedx',
  SPDX = 'spdx',
  AUTO = 'auto',
}

/**
 * CycloneDX component structure
 */
interface CycloneDXComponent {
  name: string;
  version?: string;
  purl?: string;
  cpe?: string;
  type?: string;
  components?: CycloneDXComponent[];
}

/**
 * CycloneDX BOM structure
 */
interface CycloneDXBOM {
  bomFormat?: string;
  specVersion?: string;
  components?: CycloneDXComponent[];
  dependencies?: unknown[];
}

/**
 * SPDX package structure
 */
interface SPDXPackage {
  name: string;
  versionInfo?: string;
  externalRefs?: Array<{
    referenceCategory: string;
    referenceType: string;
    referenceLocator: string;
  }>;
}

/**
 * SPDX document structure
 */
interface SPDXDocument {
  spdxVersion?: string;
  packages?: SPDXPackage[];
}

/**
 * SBOM Parser class
 */
export class SBOMParser {
  constructor(private client?: EndOfLifeClient) {}

  /**
   * Parse SBOM file and extract components
   * @param filePath - Path to SBOM file
   * @param format - SBOM format (auto-detect if not specified)
   * @returns Map of product name to version
   */
  async parseFile(
    filePath: string,
    format: SBOMFormat = SBOMFormat.AUTO,
    customMapping: Record<string, string> = {}
  ): Promise<Map<string, string>> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Auto-detect format if needed
      if (format === SBOMFormat.AUTO) {
        format = this.detectFormat(data);
      }

      core.info(`Parsing SBOM file: ${filePath} (format: ${format})`);

      switch (format) {
        case SBOMFormat.CYCLONEDX:
          return await this.parseCycloneDX(data as CycloneDXBOM, customMapping);
        case SBOMFormat.SPDX:
          return await this.parseSPDX(data as SPDXDocument, customMapping);
        default:
          throw new Error(`Unsupported SBOM format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse SBOM file: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Parse SBOM and extract components with full metadata
   * @param filePath - Path to SBOM file
   * @param format - SBOM format
   * @returns Array of components with metadata
   */
  parseComponents(
    filePath: string,
    format: SBOMFormat = SBOMFormat.AUTO
  ): SBOMComponent[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (format === SBOMFormat.AUTO) {
        format = this.detectFormat(data);
      }

      switch (format) {
        case SBOMFormat.CYCLONEDX:
          return this.extractCycloneDXComponents(data as CycloneDXBOM);
        case SBOMFormat.SPDX:
          return this.extractSPDXComponents(data as SPDXDocument);
        default:
          throw new Error(`Unsupported SBOM format: ${format}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to parse SBOM components: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Detect SBOM format from content
   */
  private detectFormat(data: unknown): SBOMFormat {
    const obj = data as Record<string, unknown>;

    // Check for CycloneDX
    if (obj.bomFormat === 'CycloneDX' || typeof obj.specVersion === 'string') {
      return SBOMFormat.CYCLONEDX;
    }

    // Check for SPDX
    if (
      typeof obj.spdxVersion === 'string' &&
      obj.spdxVersion.startsWith('SPDX-')
    ) {
      return SBOMFormat.SPDX;
    }

    throw new Error(
      'Unable to detect SBOM format. Please specify format explicitly.'
    );
  }

  /**
   * Parse CycloneDX BOM
   */
  private async parseCycloneDX(
    bom: CycloneDXBOM,
    customMapping: Record<string, string> = {}
  ): Promise<Map<string, string>> {
    const components = new Map<string, string>();

    if (!bom.components || bom.components.length === 0) {
      core.info('No components found in CycloneDX BOM');
      return components;
    }

    // Recursively extract components
    const extractComponents = async (comps: CycloneDXComponent[]) => {
      for (const component of comps) {
        if (component.name && component.version) {
          // 1. Try custom mapping
          let productName =
            customMapping[component.name] ||
            customMapping[component.name.toLowerCase()] ||
            null;

          // 2. Try API identifier resolution if available
          if (!productName && this.client) {
            if (component.purl) {
              productName = await this.client.resolveProductFromIdentifier(
                component.purl
              );
            }
            if (!productName && component.cpe) {
              productName = await this.client.resolveProductFromIdentifier(
                component.cpe
              );
            }
          }

          // 3. Fallback to hardcoded mapping
          if (!productName) {
            productName = this.mapComponentToProduct(component.name, {});
          }

          if (productName) {
            components.set(productName, component.version);
            core.debug(
              `Extracted: ${productName} ${component.version} (from ${component.name})`
            );
          }
        }

        // Process nested components
        if (component.components && component.components.length > 0) {
          await extractComponents(component.components);
        }
      }
    };

    await extractComponents(bom.components);

    core.info(`Extracted ${components.size} components from CycloneDX BOM`);
    return components;
  }

  /**
   * Parse SPDX document
   */
  private async parseSPDX(
    doc: SPDXDocument,
    customMapping: Record<string, string> = {}
  ): Promise<Map<string, string>> {
    const components = new Map<string, string>();

    if (!doc.packages || doc.packages.length === 0) {
      core.info('No packages found in SPDX document');
      return components;
    }

    for (const pkg of doc.packages) {
      if (pkg.name && pkg.versionInfo) {
        // 1. Try custom mapping
        let productName =
          customMapping[pkg.name] ||
          customMapping[pkg.name.toLowerCase()] ||
          null;

        // 2. Try API identifier resolution if available
        if (!productName && this.client && pkg.externalRefs) {
          for (const ref of pkg.externalRefs) {
            if (
              ref.referenceType === 'purl' ||
              ref.referenceType.startsWith('cpe')
            ) {
              productName = await this.client.resolveProductFromIdentifier(
                ref.referenceLocator
              );
              if (productName) break;
            }
          }
        }

        // 3. Fallback to hardcoded mapping
        if (!productName) {
          productName = this.mapComponentToProduct(pkg.name, {});
        }

        if (productName) {
          components.set(productName, pkg.versionInfo);
          core.debug(
            `Extracted: ${productName} ${pkg.versionInfo} (from ${pkg.name})`
          );
        }
      }
    }

    core.info(`Extracted ${components.size} packages from SPDX document`);
    return components;
  }

  /**
   * Extract CycloneDX components with full metadata
   */
  private extractCycloneDXComponents(bom: CycloneDXBOM): SBOMComponent[] {
    const components: SBOMComponent[] = [];

    if (!bom.components) {
      return components;
    }

    const extractComponents = (comps: CycloneDXComponent[]) => {
      for (const component of comps) {
        if (component.name) {
          components.push({
            name: component.name,
            version: component.version || 'unknown',
            purl: component.purl,
            cpe: component.cpe,
            type: component.type,
          });
        }

        if (component.components) {
          extractComponents(component.components);
        }
      }
    };

    extractComponents(bom.components);
    return components;
  }

  /**
   * Extract SPDX components with full metadata
   */
  private extractSPDXComponents(doc: SPDXDocument): SBOMComponent[] {
    const components: SBOMComponent[] = [];

    if (!doc.packages) {
      return components;
    }

    for (const pkg of doc.packages) {
      const component: SBOMComponent = {
        name: pkg.name,
        version: pkg.versionInfo || 'unknown',
      };

      // Extract PURL and CPE from external refs
      if (pkg.externalRefs) {
        for (const ref of pkg.externalRefs) {
          if (ref.referenceType === 'purl') {
            component.purl = ref.referenceLocator;
          } else if (ref.referenceType.startsWith('cpe')) {
            component.cpe = ref.referenceLocator;
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  /**
   * Map component name to endoflife.date product name
   * This is a best-effort mapping based on common naming patterns
   */
  private mapComponentToProduct(
    componentName: string,
    customMapping: Record<string, string> = {}
  ): string | null {
    const name = componentName.toLowerCase();

    // Check custom mapping first
    if (customMapping[componentName]) {
      return customMapping[componentName];
    }
    if (customMapping[name]) {
      return customMapping[name];
    }

    // Common mappings
    const mappings: Record<string, string> = {
      // Languages
      python: 'python',
      python3: 'python',
      node: 'nodejs',
      nodejs: 'nodejs',
      'node.js': 'nodejs',
      java: 'java',
      openjdk: 'java',
      go: 'go',
      golang: 'go',
      ruby: 'ruby',
      php: 'php',
      dotnet: 'dotnet',
      '.net': 'dotnet',

      // Databases
      postgresql: 'postgresql',
      postgres: 'postgresql',
      mysql: 'mysql',
      mariadb: 'mariadb',
      mongodb: 'mongodb',
      redis: 'redis',
      elasticsearch: 'elasticsearch',

      // Operating Systems
      ubuntu: 'ubuntu',
      debian: 'debian',
      alpine: 'alpine',
      centos: 'centos',
      rhel: 'rhel',
      'red hat enterprise linux': 'rhel',

      // Frameworks
      django: 'django',
      flask: 'flask',
      express: 'nodejs', // Express versions follow Node.js
      react: 'react',
      vue: 'vue',
      angular: 'angular',

      // Tools
      docker: 'docker-engine',
      kubernetes: 'kubernetes',
      kubectl: 'kubernetes',
      nginx: 'nginx',
      apache: 'apache',
      'apache httpd': 'apache',
    };

    // Direct mapping
    if (mappings[name]) {
      return mappings[name];
    }

    // Check if component name contains a known product
    for (const [key, value] of Object.entries(mappings)) {
      if (name.includes(key)) {
        return value;
      }
    }

    // Return null if no mapping found
    // This allows the caller to decide whether to skip or use the original name
    return null;
  }

  /**
   * Get statistics about SBOM
   */
  async getStatistics(filePath: string): Promise<{
    format: string;
    totalComponents: number;
    mappedComponents: number;
    unmappedComponents: string[];
  }> {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const format = this.detectFormat(data);

    const components = this.parseComponents(filePath, format);
    const versionMap = await this.parseFile(filePath, format);

    const unmappedComponents = components
      .filter((c) => !versionMap.has(c.name))
      .map((c) => c.name);

    return {
      format,
      totalComponents: components.length,
      mappedComponents: versionMap.size,
      unmappedComponents,
    };
  }
}
