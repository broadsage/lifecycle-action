// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { differenceInDays, parseISO, isValid } from 'date-fns';
import * as core from '@actions/core';
import { getErrorMessage } from './utils/error-utils';
import {
  Cycle,
  EolStatus,
  ProductVersionInfo,
  ActionResults,
  ProductCycles,
} from './types';
import { EndOfLifeClient } from './client';

/**
 * Analyzer for EOL status and version information
 */
export class EolAnalyzer {
  constructor(
    private client: EndOfLifeClient,
    private eolThresholdDays: number
  ) {}

  /**
   * Parse EOL date from various formats
   */
  private parseEolDate(eol: string | boolean | undefined): Date | null {
    if (!eol) return null;
    if (typeof eol === 'boolean') return null; // true = still supported, false = no EOL date

    try {
      const date = parseISO(eol);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse support date from various formats
   */
  private parseSupportDate(support: string | boolean | undefined): Date | null {
    if (!support) return null;
    if (typeof support === 'boolean') return null; // true = still supported, false = no support date

    try {
      const date = parseISO(support);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Determine EOL status for a cycle
   */
  private determineEolStatus(cycle: Cycle): EolStatus {
    const eolDate = this.parseEolDate(cycle.eol);

    if (!eolDate) {
      // Check if eol is explicitly true (still supported)
      if (cycle.eol === true) return EolStatus.ACTIVE;
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
  private calculateDaysUntilEol(cycle: Cycle): number | null {
    const eolDate = this.parseEolDate(cycle.eol);
    if (!eolDate) return null;

    return differenceInDays(eolDate, new Date());
  }

  /**
   * Check if cycle is LTS
   */
  private isLts(cycle: Cycle): boolean {
    if (cycle.lts === true) return true;
    if (typeof cycle.lts === 'string') return true;
    return false;
  }

  /**
   * Analyze a single product cycle
   */
  analyzeProductCycle(product: string, cycle: Cycle): ProductVersionInfo {
    const status = this.determineEolStatus(cycle);
    const eolDate = this.parseEolDate(cycle.eol);
    const supportDate = this.parseSupportDate(cycle.support);
    const releaseDate = cycle.releaseDate ? parseISO(cycle.releaseDate) : null;

    return {
      product,
      cycle: String(cycle.cycle),
      status,
      eolDate: eolDate ? eolDate.toISOString().split('T')[0] : null,
      daysUntilEol: this.calculateDaysUntilEol(cycle),
      releaseDate: releaseDate ? releaseDate.toISOString().split('T')[0] : null,
      latestVersion: cycle.latest || null,
      isLts: this.isLts(cycle),
      supportDate: supportDate ? supportDate.toISOString().split('T')[0] : null,
      link: cycle.link || null,
      rawData: cycle,
    };
  }

  /**
   * Filter cycles by release date
   */
  filterByReleaseDate(
    cycles: Cycle[],
    minDate?: Date,
    maxDate?: Date
  ): Cycle[] {
    if (!minDate && !maxDate) return cycles;

    return cycles.filter((cycle) => {
      if (!cycle.releaseDate) return false;

      try {
        const releaseDate = parseISO(cycle.releaseDate);
        if (!isValid(releaseDate)) return false;

        if (minDate && releaseDate < minDate) return false;
        if (maxDate && releaseDate > maxDate) return false;

        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Sort and limit versions
   */
  limitVersions(
    cycles: Cycle[],
    maxVersions: number | null,
    sortOrder: 'newest-first' | 'oldest-first'
  ): Cycle[] {
    if (!maxVersions) return cycles;

    // Sort cycles by release date
    const sorted = [...cycles].sort((a, b) => {
      const dateA = a.releaseDate ? parseISO(a.releaseDate) : new Date(0);
      const dateB = b.releaseDate ? parseISO(b.releaseDate) : new Date(0);

      if (sortOrder === 'newest-first') {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });

    return sorted.slice(0, maxVersions);
  }

  /**
   * Analyze all cycles for a product
   */
  async analyzeProduct(
    product: string,
    specificCycles?: string[],
    minReleaseDate?: Date,
    maxReleaseDate?: Date,
    maxVersions?: number | null,
    versionSortOrder: 'newest-first' | 'oldest-first' = 'newest-first'
  ): Promise<ProductVersionInfo[]> {
    core.info(`Analyzing product: ${product}`);

    try {
      let cycles = await this.client.getProductCycles(product);

      if (specificCycles && specificCycles.length > 0) {
        // Filter to specific cycles
        cycles = cycles.filter((cycle) =>
          specificCycles.includes(String(cycle.cycle))
        );

        if (cycles.length === 0) {
          core.warning(
            `No matching cycles found for ${product}. Requested: ${specificCycles.join(', ')}`
          );
        }
      }

      // Apply date filtering
      cycles = this.filterByReleaseDate(cycles, minReleaseDate, maxReleaseDate);

      // Apply version limiting
      cycles = this.limitVersions(
        cycles,
        maxVersions ?? null,
        versionSortOrder
      );

      return cycles.map((cycle) => this.analyzeProductCycle(product, cycle));
    } catch (error) {
      core.error(
        `Failed to analyze product ${product}: ${getErrorMessage(error)}`
      );
      throw error;
    }
  }

  /**
   * Analyze multiple products
   */
  async analyzeProducts(
    products: string[],
    cyclesMap?: ProductCycles,
    versionMap?: Map<string, string>,
    semanticFallback = true,
    minReleaseDate?: Date,
    maxReleaseDate?: Date,
    maxVersions?: number | null,
    versionSortOrder: 'newest-first' | 'oldest-first' = 'newest-first'
  ): Promise<ActionResults> {
    const allResults: ProductVersionInfo[] = [];

    for (const product of products) {
      try {
        // Check if specific version is provided for this product
        const specificVersion = versionMap?.get(product);

        if (specificVersion) {
          // Single version mode - check only this version
          core.info(`Analyzing ${product} version ${specificVersion}`);

          const cycleInfo = await this.client.getCycleInfoWithFallback(
            product,
            specificVersion,
            semanticFallback
          );

          if (cycleInfo) {
            const analyzed = this.analyzeProductCycle(product, cycleInfo);
            allResults.push(analyzed);
          } else {
            core.warning(
              `No cycle information found for ${product} version ${specificVersion}`
            );
          }
        } else {
          // Multi-cycle mode - existing logic
          const specificCycles = cyclesMap?.[product];
          const results = await this.analyzeProduct(
            product,
            specificCycles,
            minReleaseDate,
            maxReleaseDate,
            maxVersions,
            versionSortOrder
          );
          allResults.push(...results);
        }
      } catch (error) {
        core.warning(
          `Skipping product ${product} due to error: ${getErrorMessage(error)}`
        );
      }
    }

    const eolProducts = allResults.filter(
      (r) => r.status === EolStatus.END_OF_LIFE
    );
    const approachingEolProducts = allResults.filter(
      (r) => r.status === EolStatus.APPROACHING_EOL
    );

    const latestVersions: Record<string, string> = {};
    for (const result of allResults) {
      if (result.latestVersion && !latestVersions[result.product]) {
        latestVersions[result.product] = result.latestVersion;
      }
    }

    const summary = this.generateSummary(
      allResults,
      eolProducts,
      approachingEolProducts
    );

    return {
      eolDetected: eolProducts.length > 0,
      approachingEol: approachingEolProducts.length > 0,
      totalProductsChecked: new Set(allResults.map((r) => r.product)).size,
      totalCyclesChecked: allResults.length,
      products: allResults,
      eolProducts,
      approachingEolProducts,
      latestVersions,
      summary,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    allProducts: ProductVersionInfo[],
    eolProducts: ProductVersionInfo[],
    approachingEolProducts: ProductVersionInfo[]
  ): string {
    const lines: string[] = [];

    lines.push(`📊 EndOfLife Analysis Summary`);
    lines.push(`================================`);
    lines.push(
      `Total Products Checked: ${new Set(allProducts.map((p) => p.product)).size}`
    );
    lines.push(`Total Cycles Checked: ${allProducts.length}`);
    lines.push('');

    if (eolProducts.length > 0) {
      lines.push(`❌ End-of-Life Detected (${eolProducts.length}):`);
      for (const product of eolProducts) {
        lines.push(
          `  - ${product.product} ${product.cycle} (EOL: ${product.eolDate})`
        );
      }
      lines.push('');
    }

    if (approachingEolProducts.length > 0) {
      lines.push(`⚠️  Approaching EOL (${approachingEolProducts.length}):`);
      for (const product of approachingEolProducts) {
        lines.push(
          `  - ${product.product} ${product.cycle} (${product.daysUntilEol} days until EOL: ${product.eolDate})`
        );
      }
      lines.push('');
    }

    if (eolProducts.length === 0 && approachingEolProducts.length === 0) {
      lines.push('✅ All tracked versions are actively supported!');
    }

    return lines.join('\n');
  }
}
