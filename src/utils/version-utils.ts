// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

/**
 * Utility functions for version string manipulation
 */

/**
 * Clean version string (remove 'v' prefix, whitespace, etc.)
 */
export function cleanVersion(version: string): string {
  return version.trim().replace(/^v/, '');
}

/**
 * Generate semantic version fallback options
 * Example: "1.2.3" → ["1.2.3", "1.2", "1"]
 */
export function getSemanticFallbacks(version: string): string[] {
  const cleaned = cleanVersion(version);
  const parts = cleaned.split('.');
  const fallbacks: string[] = [cleaned];

  // Generate fallbacks from most specific to least
  for (let i = parts.length - 1; i > 0; i--) {
    fallbacks.push(parts.slice(0, i).join('.'));
  }

  return fallbacks;
}

/**
 * Check if version follows semantic versioning pattern
 */
export function isSemanticVersion(version: string): boolean {
  const cleaned = cleanVersion(version);
  const semverPattern = /^\d+(\.\d+){0,2}$/;
  return semverPattern.test(cleaned);
}

/**
 * Parse version string to components
 */
export interface VersionComponents {
  major: number;
  minor?: number;
  patch?: number;
  prerelease?: string;
  build?: string;
}

/**
 * Parse semantic version into components
 */
export function parseSemanticVersion(
  version: string
): VersionComponents | null {
  const cleaned = cleanVersion(version);
  const parts = cleaned.split('.');

  if (parts.length === 0) {
    return null;
  }

  const major = parseInt(parts[0], 10);
  if (isNaN(major)) {
    return null;
  }

  const result: VersionComponents = { major };

  if (parts.length > 1) {
    const minor = parseInt(parts[1], 10);
    if (!isNaN(minor)) {
      result.minor = minor;
    }
  }

  if (parts.length > 2) {
    const patch = parseInt(parts[2], 10);
    if (!isNaN(patch)) {
      result.patch = patch;
    }
  }

  return result;
}
