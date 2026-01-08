// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { differenceInDays, parseISO, isValid } from 'date-fns';
import * as core from '@actions/core';
import pLimit from 'p-limit';
import { getErrorMessage } from './utils/error-utils';
import { Release, EolStatus, ProductVersionInfo, ActionResults } from './types';
import { EndOfLifeClient } from './client';

/**
 * Analyzer for EOL status and version information
 */
export class EolAnalyzer {
  constructor(
    private client: EndOfLifeClient,
    private eolThresholdDays: number,
    private stalenessThresholdDays: number = 365
  ) {}

  /**
   * Parse date from various formats
   */
  private parseDate(
    value: string | boolean | number | null | undefined
  ): Date | null {
    if (!value || typeof value === 'boolean' || typeof value === 'number')
      return null;

    try {
      const date = parseISO(value);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Determine EOL status for a release
   */
  private determineEolStatus(release: Release): EolStatus {
    const eolDate = this.parseDate(release.eolFrom);

    if (!eolDate) {
      if (release.isEol === true) return EolStatus.END_OF_LIFE;
      if (release.isEol === false) return EolStatus.ACTIVE;
      return EolStatus.UNKNOWN;
    }

    const now = new Date();
    const daysUntilEol = differenceInDays(eolDate, now);

    if (daysUntilEol < 0) {
      return EolStatus.END_OF_LIFE;
    } else if (daysUntilEol <= this.eolThresholdDays) {
      return EolStatus.APPROACHING_EOL;
    } else {
      return EolStatus.ACTIVE;
    }
  }

  /**
   * Calculate days until EOL
   */
  private calculateDaysUntilEol(release: Release): number | null {
    const eolDate = this.parseDate(release.eolFrom);
    if (!eolDate) return null;

    return differenceInDays(eolDate, new Date());
  }

  /**
   * Check if release is LTS
   */
  private isLts(release: Release): boolean {
    if (release.isLts === true) return true;
    if (typeof release.ltsFrom === 'string') return true;
    return false;
  }

  /**
   * Check if product is discontinued
   */
  private isDiscontinued(release: Release): boolean {
    if (release.discontinued === true) return true;
    if (typeof release.discontinued === 'string') {
      const date = this.parseDate(release.discontinued);
      if (date) {
        return date <= new Date();
      }
      return true;
    }
    return false;
  }

  /**
   * Check if release has extended support
   */
  private hasExtendedSupport(release: Release): boolean {
    if (release.isEoas === true) return true;
    if (typeof release.eoasFrom === 'string') return true;
    return false;
  }

  /**
   * Calculate days since latest version release
   */
  private calculateDaysSinceLatestRelease(release: Release): number | null {
    if (!release.latest?.date) return null;

    try {
      const latestRelease = parseISO(release.latest.date);
      if (!isValid(latestRelease)) return null;
      return differenceInDays(new Date(), latestRelease);
    } catch {
      return null;
    }
  }

  /**
   * Analyze a single product release
   */
  analyzeProductRelease(product: string, release: Release): ProductVersionInfo {
    const status = this.determineEolStatus(release);
    const eolDate = this.parseDate(release.eolFrom);
    const supportDate = release.isMaintained ? new Date() : null;
    const releaseDate = release.releaseDate
      ? parseISO(release.releaseDate)
      : null;
    const discontinuedDate = this.parseDate(release.discontinued);
    const extendedSupportDate = this.parseDate(release.eoasFrom);

    return {
      product,
      release: String(release.name),
      status,
      eolDate: eolDate ? eolDate.toISOString().split('T')[0] : null,
      daysUntilEol: this.calculateDaysUntilEol(release),
      releaseDate: releaseDate ? releaseDate.toISOString().split('T')[0] : null,
      latestVersion: release.latest?.name ? String(release.latest.name) : null,
      isLts: this.isLts(release),
      supportDate: supportDate ? supportDate.toISOString().split('T')[0] : null,
      link: release.link ? String(release.link) : null,
      discontinuedDate: discontinuedDate
        ? discontinuedDate.toISOString().split('T')[0]
        : null,
      isDiscontinued: this.isDiscontinued(release),
      extendedSupportDate: extendedSupportDate
        ? extendedSupportDate.toISOString().split('T')[0]
        : null,
      hasExtendedSupport: this.hasExtendedSupport(release),
      latestReleaseDate: release.latest?.date || null,
      daysSinceLatestRelease: this.calculateDaysSinceLatestRelease(release),
      rawData: release,
    };
  }

  /**
   * Filter releases by release date
   */
  private filterReleasesByDate(
    releases: Release[],
    minDate?: string,
    maxDate?: string
  ): Release[] {
    let filtered = [...releases];

    if (minDate) {
      const min = parseISO(minDate.replace(/^[><]=?/, ''));
      filtered = filtered.filter((r) => {
        if (!r.releaseDate) return false;
        const releaseDate = parseISO(r.releaseDate);
        return releaseDate >= min;
      });
    }

    if (maxDate) {
      const max = parseISO(maxDate.replace(/^[><]=?/, ''));
      filtered = filtered.filter((r) => {
        if (!r.releaseDate) return false;
        const releaseDate = parseISO(r.releaseDate);
        return releaseDate <= max;
      });
    }

    return filtered;
  }

  /**
   * Analyze multiple products and releases
   */
  async analyzeMany(
    products: string[],
    releasesMap: Record<string, string[]>,
    options: {
      includeDiscontinued?: boolean;
      minReleaseDate?: string;
      maxReleaseDate?: string;
      maxVersions?: number | null;
      versionSortOrder?: 'newest-first' | 'oldest-first';
      apiConcurrency?: number;
    } = {}
  ): Promise<ActionResults> {
    const limit = pLimit(options.apiConcurrency || 5);
    const results: ProductVersionInfo[] = [];
    const analysisErrors: { product: string; message: string }[] = [];

    const tasks = products.map((product) =>
      limit(async () => {
        try {
          const productReleases = await this.client.getProductReleases(product);
          if (!productReleases || productReleases.length === 0) {
            core.debug(`No releases found for ${product}`);
            return;
          }

          let targetReleases = productReleases;

          // Filter by explicit release versions if provided
          if (releasesMap[product] && releasesMap[product].length > 0) {
            targetReleases = productReleases.filter((r) =>
              releasesMap[product].includes(String(r.name))
            );
          }

          // Apply date filters
          targetReleases = this.filterReleasesByDate(
            targetReleases,
            options.minReleaseDate,
            options.maxReleaseDate
          );

          // Sort releases
          targetReleases.sort((a, b) => {
            const dateA = a.releaseDate ? parseISO(a.releaseDate).getTime() : 0;
            const dateB = b.releaseDate ? parseISO(b.releaseDate).getTime() : 0;
            return options.versionSortOrder === 'oldest-first'
              ? dateA - dateB
              : dateB - dateA;
          });

          // Limit number of versions
          if (options.maxVersions) {
            targetReleases = targetReleases.slice(0, options.maxVersions);
          }

          for (const release of targetReleases) {
            if (!options.includeDiscontinued && this.isDiscontinued(release)) {
              continue;
            }
            results.push(this.analyzeProductRelease(product, release));
          }
        } catch (error) {
          const message = getErrorMessage(error);
          analysisErrors.push({ product, message });
        }
      })
    );

    await Promise.all(tasks);

    // Report analysis errors together as per best practices
    if (analysisErrors.length > 0) {
      core.startGroup(`⚠️ Product Analysis Issues (${analysisErrors.length})`);
      for (const err of analysisErrors) {
        core.warning(`[${err.product}] ${err.message}`);
      }
      core.endGroup();
    }

    return this.generateSummary(results);
  }

  /**
   * Generate results summary
   */
  generateSummary(products: ProductVersionInfo[]): ActionResults {
    const eolProducts = products.filter(
      (p) => p.status === EolStatus.END_OF_LIFE
    );
    const approachingEolProducts = products.filter(
      (p) => p.status === EolStatus.APPROACHING_EOL
    );
    const discontinuedProducts = products.filter((p) => p.isDiscontinued);
    // Stale is determined by days since latest release (e.g., > 1 year)
    const staleProducts = products.filter(
      (p) =>
        p.daysSinceLatestRelease !== null &&
        p.daysSinceLatestRelease > this.stalenessThresholdDays
    );

    const latestVersions: Record<string, string> = {};
    for (const p of products) {
      if (p.latestVersion) {
        if (
          !latestVersions[p.product] ||
          p.status === EolStatus.ACTIVE ||
          p.status === EolStatus.APPROACHING_EOL
        ) {
          latestVersions[p.product] = p.latestVersion;
        }
      }
    }

    return {
      eolDetected: eolProducts.length > 0,
      approachingEol: approachingEolProducts.length > 0,
      staleDetected: staleProducts.length > 0,
      discontinuedDetected: discontinuedProducts.length > 0,
      totalProductsChecked: new Set(products.map((p) => p.product)).size,
      totalReleasesChecked: products.length,
      products,
      eolProducts,
      approachingEolProducts,
      staleProducts,
      discontinuedProducts,
      extendedSupportProducts: products.filter((p) => p.hasExtendedSupport),
      latestVersions,
      summary: `Analyzed ${products.length} releases for ${new Set(products.map((p) => p.product)).size} products. Found ${eolProducts.length} EOL and ${approachingEolProducts.length} approaching EOL.`,
    };
  }
}
