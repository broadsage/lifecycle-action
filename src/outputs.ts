// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { ActionResults, EolStatus, ProductVersionInfo } from './types';
import { getErrorMessage } from './utils/error-utils';

/**
 * Helper class for generating Markdown components
 */
class MarkdownHelper {
  /**
   * Format a product version row for a table
   */
  static formatProductRow(
    p: ProductVersionInfo,
    type: 'standard' | 'dashboard' | 'stale' | 'discontinued'
  ): string {
    switch (type) {
      case 'dashboard':
        return `| **${p.product}** | \`${p.release}\` | ${p.eolDate || 'N/A'} | Update to \`${p.latestVersion || 'latest'}\` |`;
      case 'stale':
        return `| **${p.product}** | \`${p.release}\` | ${p.latestReleaseDate || 'N/A'} | \`${p.daysSinceLatestRelease}\` days stale |`;
      case 'discontinued':
        return `| **${p.product}** | \`${p.release}\` | ${p.discontinuedDate || 'N/A'} |`;
      default:
        return `| ${p.product} | ${p.release} | ${p.eolDate || 'N/A'} | ${p.latestVersion || 'N/A'} | ${p.isLts ? '✓' : '✗'} |`;
    }
  }

  /**
   * Create a Markdown table
   */
  static createTable(headers: string[], rows: string[]): string {
    if (rows.length === 0) return '';
    const alignment = headers.map(() => '---').join(' | ');
    return [`| ${headers.join(' | ')} |`, `| ${alignment} |`, ...rows, ''].join(
      '\n'
    );
  }

  /**
   * Create a section header with optional description
   */
  static createSection(
    title: string,
    description?: string,
    level: number = 2
  ): string {
    const prefix = '#'.repeat(level);
    return description
      ? `${prefix} ${title}\n\n${description}\n`
      : `${prefix} ${title}\n`;
  }

  /**
   * Create a collapsed details section
   */
  static createDetails(summary: string, content: string): string {
    return `<details><summary>${summary}</summary>\n\n${content}\n</details>\n`;
  }
}

/**
 * Format results as JSON
 */
export function formatAsJson(results: ActionResults): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Format results as Markdown
 */
export function formatAsMarkdown(results: ActionResults): string {
  const lines: string[] = [];

  lines.push('# 📊 Software Lifecycle Analysis Report\n');
  lines.push(`**Total Products Checked:** ${results.totalProductsChecked}`);
  lines.push(`**Total Releases Checked:** ${results.totalReleasesChecked}\n`);

  if (results.eolProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('❌ End-of-Life Detected'));
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Release', 'EOL Date', 'Latest Version', 'LTS'],
        results.eolProducts.map((p) =>
          MarkdownHelper.formatProductRow(p, 'standard')
        )
      )
    );
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('⚠️ Approaching End-of-Life'));
    lines.push(
      MarkdownHelper.createTable(
        [
          'Product',
          'Release',
          'Days Until EOL',
          'EOL Date',
          'Latest Version',
          'LTS',
        ],
        results.approachingEolProducts.map(
          (p) =>
            `| ${p.product} | ${p.release} | ${p.daysUntilEol || 'N/A'} | ${p.eolDate || 'N/A'} | ${p.latestVersion || 'N/A'} | ${p.isLts ? '✓' : '✗'} |`
        )
      )
    );
  }

  if (results.staleProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('⏰ Stale Versions'));
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Release', 'Last Release Date', 'Days Since Latest'],
        results.staleProducts.map((p) =>
          MarkdownHelper.formatProductRow(p, 'stale')
        )
      )
    );
  }

  if (results.discontinuedProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('🚫 Discontinued Products'));
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Release', 'Discontinued Date'],
        results.discontinuedProducts.map((p) =>
          MarkdownHelper.formatProductRow(p, 'discontinued')
        )
      )
    );
  }

  const activeProducts = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  );
  if (activeProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('✅ Active Support'));
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Release', 'EOL Date', 'Latest Version', 'LTS'],
        activeProducts.map((p) =>
          MarkdownHelper.formatProductRow(p, 'standard')
        )
      )
    );
  }

  if (
    results.eolProducts.length === 0 &&
    results.approachingEolProducts.length === 0
  ) {
    lines.push('## ✅ All Clear!');
    lines.push('All tracked versions are actively supported.\n');
  }

  return lines.join('\n');
}

/**
 * Write results to GitHub Step Summary
 */
export async function writeToStepSummary(
  results: ActionResults
): Promise<void> {
  const markdown = formatAsMarkdown(results);
  await core.summary.addRaw(markdown).write();
}

/**
 * Write results to file
 */
export async function writeToFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    core.info(`Results written to ${filePath}`);
  } catch (error) {
    core.error(
      `Failed to write to file ${filePath}: ${getErrorMessage(error)}`
    );
    throw error;
  }
}

/**
 * Generate simple matrix output for GitHub Actions
 */
export function generateMatrix(
  results: ActionResults,
  excludeEol = true,
  excludeApproachingEol = false
): { versions: string[] } {
  let products = results.products;
  if (excludeEol)
    products = products.filter((p) => p.status !== EolStatus.END_OF_LIFE);
  if (excludeApproachingEol)
    products = products.filter((p) => p.status !== EolStatus.APPROACHING_EOL);
  return { versions: products.map((p) => p.release) };
}

/**
 * Generate detailed matrix output with metadata
 */
export function generateMatrixInclude(
  results: ActionResults,
  excludeEol = true,
  excludeApproachingEol = false
): {
  include: Array<{
    version: string;
    release: string;
    isLts: boolean;
    eolDate: string | null;
    status: string;
    releaseDate: string | null;
  }>;
} {
  let products = results.products;
  if (excludeEol)
    products = products.filter((p) => p.status !== EolStatus.END_OF_LIFE);
  if (excludeApproachingEol)
    products = products.filter((p) => p.status !== EolStatus.APPROACHING_EOL);
  return {
    include: products.map((p) => ({
      version: p.release,
      release: p.release,
      isLts: p.isLts,
      eolDate: p.eolDate,
      status: p.status,
      releaseDate: p.releaseDate,
    })),
  };
}

/**
 * Set action outputs
 */
export function setOutputs(results: ActionResults): void {
  const outputs = {
    'eol-detected': results.eolDetected,
    'approaching-eol': results.approachingEol,
    results: JSON.stringify(results),
    'eol-products': JSON.stringify(results.eolProducts),
    'approaching-eol-products': JSON.stringify(results.approachingEolProducts),
    'latest-versions': JSON.stringify(results.latestVersions),
    summary: results.summary,
    'total-products-checked': results.totalProductsChecked,
    'total-releases-checked': results.totalReleasesChecked,
    'stale-detected': results.staleDetected,
    'stale-products': JSON.stringify(results.staleProducts),
    'discontinued-detected': results.discontinuedDetected,
    'discontinued-products': JSON.stringify(results.discontinuedProducts),
    'extended-support-products': JSON.stringify(
      results.extendedSupportProducts
    ),
    matrix: results.matrix ? JSON.stringify(results.matrix) : undefined,
    'matrix-include': results.matrixInclude
      ? JSON.stringify(results.matrixInclude)
      : undefined,
  };

  for (const [key, value] of Object.entries(outputs)) {
    if (value !== undefined) core.setOutput(key, value);
  }
}

/**
 * Create issue body for EOL detection
 */
export function createIssueBody(results: ActionResults): string {
  const lines: string[] = [
    '# 🚨 End-of-Life Software Detected\n',
    'This issue was automatically created by the Software Lifecycle Tracker because end-of-life software versions were detected.\n',
  ];

  if (results.eolProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('❌ End-of-Life Versions'));
    lines.push(
      results.eolProducts
        .map((p) => {
          const parts = [
            `### ${p.product} ${p.release}`,
            `- **EOL Date:** ${p.eolDate || 'N/A'}`,
            `- **Latest Version:** ${p.latestVersion || 'N/A'}`,
            `- **LTS:** ${p.isLts ? 'Yes' : 'No'}`,
          ];
          if (p.link) parts.push(`- **More Info:** ${p.link}`);
          return parts.join('\n');
        })
        .join('\n\n')
    );
    lines.push('');
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('⚠️ Approaching End-of-Life'));
    lines.push(
      results.approachingEolProducts
        .map((p) => {
          const parts = [
            `### ${p.product} ${p.release}`,
            `- **Days Until EOL:** ${p.daysUntilEol}`,
            `- **EOL Date:** ${p.eolDate || 'N/A'}`,
            `- **Latest Version:** ${p.latestVersion || 'N/A'}`,
            `- **LTS:** ${p.isLts ? 'Yes' : 'No'}`,
          ];
          if (p.link) parts.push(`- **More Info:** ${p.link}`);
          return parts.join('\n');
        })
        .join('\n\n')
    );
    lines.push('');
  }

  if (results.staleProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('⏰ Stale Versions'));
    lines.push(
      results.staleProducts
        .map((p) => {
          return [
            `### ${p.product} ${p.release}`,
            `- **Days Since Latest Release:** ${p.daysSinceLatestRelease}`,
            `- **Last Release Date:** ${p.latestReleaseDate || 'N/A'}`,
            `- **Latest Version:** ${p.latestVersion || 'N/A'}`,
          ].join('\n');
        })
        .join('\n\n')
    );
    lines.push('');
  }

  if (results.discontinuedProducts.length > 0) {
    lines.push(MarkdownHelper.createSection('🚫 Discontinued Products'));
    lines.push(
      results.discontinuedProducts
        .map((p) => {
          const parts = [
            `### ${p.product} ${p.release}`,
            `- **Latest Version:** ${p.latestVersion || 'N/A'}`,
          ];
          if (p.discontinuedDate)
            parts.push(`- **Discontinued Date:** ${p.discontinuedDate}`);
          return parts.join('\n');
        })
        .join('\n\n')
    );
    lines.push('');
  }

  lines.push('## 📋 Recommended Actions\n');
  lines.push('1. Review the affected software versions');
  lines.push('2. Plan migration to supported versions');
  lines.push('3. Update dependencies and configurations');
  lines.push('4. Test thoroughly before deploying\n');
  lines.push(
    '---\n*This issue was created automatically by [Software Lifecycle Tracker](https://github.com/broadsage/lifecycle-action)*'
  );

  return lines.join('\n');
}

/**
 * Create a modern lifecycle dashboard body
 */
export function formatAsDashboard(results: ActionResults): string {
  const lines: string[] = [
    '# 🛡️ Software Lifecycle Dashboard\n',
    'This dashboard provides a live overview of the support status for your software dependencies. It is automatically updated.\n',
  ];

  const eolCount = results.eolProducts.length;
  const approachingCount = results.approachingEolProducts.length;
  const healthyCount = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  ).length;

  lines.push('### 📊 Status Overview');
  lines.push(
    `> 🔴 **${eolCount}** End-of-Life | 🟠 **${approachingCount}** Warning | 🟢 **${healthyCount}** Healthy\n`
  );

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentEol = results.eolProducts.filter(
    (p) => p.eolDate && new Date(p.eolDate) >= ninetyDaysAgo
  );
  const legacyEol = results.eolProducts.filter(
    (p) => !p.eolDate || new Date(p.eolDate) < ninetyDaysAgo
  );

  if (recentEol.length > 0) {
    lines.push(
      MarkdownHelper.createSection(
        '🔴 Critical: Recent End-of-Life',
        'Immediate action recommended (EOL within last 90 days).'
      )
    );
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Version', 'EOL Date', 'Recommended'],
        recentEol.map((p) => MarkdownHelper.formatProductRow(p, 'dashboard'))
      )
    );
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push(
      MarkdownHelper.createSection(
        '🟠 Upcoming Risks',
        'Plan migration before these versions reach End-of-Life.'
      )
    );
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Version', 'EOL Date', 'Days Left'],
        results.approachingEolProducts.map(
          (p) =>
            `| **${p.product}** | \`${p.release}\` | ${p.eolDate} | \`${p.daysUntilEol}\` days |`
        )
      )
    );
  }

  if (legacyEol.length > 0) {
    lines.push('## 💾 Legacy End-of-Life');
    lines.push(
      MarkdownHelper.createDetails(
        'Click to view products EOL for > 90 days',
        MarkdownHelper.createTable(
          ['Product', 'Version', 'EOL Date', 'Latest'],
          legacyEol.map(
            (p) =>
              `| ${p.product} | \`${p.release}\` | ${p.eolDate || 'N/A'} | \`${p.latestVersion || 'N/A'}\` |`
          )
        )
      )
    );
  }

  if (results.staleProducts.length > 0) {
    lines.push(
      MarkdownHelper.createSection(
        '⏰ Maintenance Required',
        'No updates released for over a year.'
      )
    );
    lines.push(
      MarkdownHelper.createTable(
        ['Product', 'Version', 'Last Update', 'Status'],
        results.staleProducts.map((p) =>
          MarkdownHelper.formatProductRow(p, 'stale')
        )
      )
    );
  }

  const activeProducts = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  );
  if (activeProducts.length > 0) {
    lines.push('## 🟢 Healthy & Supported');
    lines.push(
      MarkdownHelper.createDetails(
        'Click to view all healthy dependencies',
        MarkdownHelper.createTable(
          ['Product', 'Version', 'EOL Date', 'Latest'],
          activeProducts.map(
            (p) =>
              `| ${p.product} | \`${p.release}\` | ${p.eolDate || 'N/A'} | \`${p.latestVersion || 'N/A'}\` |`
          )
        )
      )
    );
  }

  lines.push(
    '---\n' +
      `*Last updated: ${new Date().toUTCString()} | [Report Link](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})*`
  );

  return lines.join('\n');
}
