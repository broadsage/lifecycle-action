// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as core from '@actions/core';
import {
  cleanVersion,
  getSemanticFallbacks,
  isSemanticVersion,
} from './utils/version-utils';

/**
 * Supported file formats for version extraction
 */
export enum FileFormat {
  YAML = 'yaml',
  JSON = 'json',
  TEXT = 'text',
}

/**
 * Result of version extraction
 */
export interface VersionExtractionResult {
  version: string;
  source: 'file' | 'manual';
  filePath?: string;
  extractionMethod?: 'yaml' | 'json' | 'regex';
}

/**
 * Abstract base class for version extraction strategies
 */
abstract class ExtractionStrategy {
  abstract extract(content: string, options?: unknown): string;
}

/**
 * YAML extraction strategy
 */
class YamlExtractionStrategy extends ExtractionStrategy {
  extract(content: string, keyPath?: string): string {
    if (!keyPath) {
      throw new Error('file-key is required for YAML extraction');
    }

    const data = yaml.load(content);
    return this.extractNestedValue(data, keyPath);
  }

  private extractNestedValue(data: unknown, keyPath: string): string {
    const keys = keyPath.split('.');
    let value: unknown = data;

    for (const key of keys) {
      if (value === null || value === undefined) {
        throw new Error(`Key path "${keyPath}" not found in YAML file`);
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Cannot access key "${key}" on non-object value`);
      }

      value = (value as Record<string, unknown>)[key];
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(
        `Value at "${keyPath}" is not a string or number: ${typeof value}`
      );
    }

    return String(value);
  }
}

/**
 * JSON extraction strategy
 */
class JsonExtractionStrategy extends ExtractionStrategy {
  extract(content: string, keyPath?: string): string {
    if (!keyPath) {
      throw new Error('file-key is required for JSON extraction');
    }

    const data: unknown = JSON.parse(content);
    return this.extractNestedValue(data, keyPath);
  }

  private extractNestedValue(data: unknown, keyPath: string): string {
    const keys = keyPath.split('.');
    let value: unknown = data;

    for (const key of keys) {
      if (value === null || value === undefined) {
        throw new Error(`Key path "${keyPath}" not found in JSON file`);
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Cannot access key "${key}" on non-object value`);
      }

      value = (value as Record<string, unknown>)[key];
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(
        `Value at "${keyPath}" is not a string or number: ${typeof value}`
      );
    }

    return String(value);
  }
}

/**
 * Regex extraction strategy
 */
class RegexExtractionStrategy extends ExtractionStrategy {
  extract(content: string, pattern?: string): string {
    if (!pattern) {
      throw new Error('version-regex is required for regex extraction');
    }

    const regex = new RegExp(pattern);
    const match = content.match(regex);

    if (!match) {
      throw new Error(`No match found for regex pattern: ${pattern}`);
    }

    // Return first capture group if exists, otherwise full match
    return match[1] || match[0];
  }
}

/**
 * Version extractor with semantic version support
 */
export class VersionExtractor {
  private strategies: Map<FileFormat, ExtractionStrategy>;

  constructor() {
    this.strategies = new Map([
      [FileFormat.YAML, new YamlExtractionStrategy()],
      [FileFormat.JSON, new JsonExtractionStrategy()],
      [FileFormat.TEXT, new RegexExtractionStrategy()],
    ]);
  }

  /**
   * Extract version from a file
   */
  extractFromFile(
    filePath: string,
    fileFormat: FileFormat,
    fileKey?: string,
    versionRegex?: string
  ): VersionExtractionResult {
    core.debug(`Extracting version from ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // If regex is provided, use regex strategy regardless of format
    let version: string;
    let extractionMethod: 'yaml' | 'json' | 'regex';

    if (versionRegex) {
      const strategy = this.strategies.get(FileFormat.TEXT);
      if (!strategy) {
        throw new Error('Regex extraction strategy not found');
      }
      version = strategy.extract(content, versionRegex);
      extractionMethod = 'regex';
    } else {
      const strategy = this.strategies.get(fileFormat);
      if (!strategy) {
        throw new Error(`Unsupported file format: ${fileFormat}`);
      }
      version = strategy.extract(content, fileKey);
      extractionMethod = fileFormat === FileFormat.YAML ? 'yaml' : 'json';
    }

    const cleanedVersion = cleanVersion(version);

    core.info(`✓ Extracted version: ${cleanedVersion} from ${filePath}`);

    return {
      version: cleanedVersion,
      source: 'file',
      filePath,
      extractionMethod,
    };
  }

  /**
   * Clean version string (delegated to shared utility)
   */
  cleanVersion(version: string): string {
    return cleanVersion(version);
  }

  /**
   * Generate semantic version fallback options (delegated to shared utility)
   */
  getSemanticFallbacks(version: string): string[] {
    return getSemanticFallbacks(version);
  }

  /**
   * Check if version is semantic (delegated to shared utility)
   */
  isSemanticVersion(version: string): boolean {
    return isSemanticVersion(version);
  }
}
