// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { ActionResults, EolStatus, ProductVersionInfo } from './types';
import { getErrorMessage } from './utils/error-utils';

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

  lines.push('# 📊 Software Lifecycle Analysis Report');
  lines.push('');
  lines.push(`**Total Products Checked:** ${results.totalProductsChecked}`);
  lines.push(`**Total Releases Checked:** ${results.totalReleasesChecked}`);
  lines.push('');

  if (results.eolProducts.length > 0) {
    lines.push('## ❌ End-of-Life Detected');
    lines.push('');
    lines.push('| Product | Release | EOL Date | Latest Version | LTS |');
    lines.push('|---------|---------|----------|----------------|-----|');
    for (const product of results.eolProducts) {
      lines.push(
        `| ${product.product} | ${product.release} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
      );
    }
    lines.push('');
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push('## ⚠️ Approaching End-of-Life');
    lines.push('');
    lines.push(
      '| Product | Release | Days Until EOL | EOL Date | Latest Version | LTS |'
    );
    lines.push(
      '|---------|---------|----------------|----------|----------------|-----|'
    );
    for (const product of results.approachingEolProducts) {
      lines.push(
        `| ${product.product} | ${product.release} | ${product.daysUntilEol || 'N/A'} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
      );
    }
    lines.push('');
  }

  if (results.staleProducts.length > 0) {
    lines.push('## ⏰ Stale Versions');
    lines.push('');
    lines.push('| Product | Release | Last Release Date | Days Since Latest |');
    lines.push('|---------|---------|-------------------|-------------------|');
    for (const product of results.staleProducts) {
      lines.push(
        `| ${product.product} | ${product.release} | ${product.latestReleaseDate || 'N/A'} | ${product.daysSinceLatestRelease || 'N/A'} |`
      );
    }
    lines.push('');
  }

  if (results.discontinuedProducts.length > 0) {
    lines.push('## 🚫 Discontinued Products');
    lines.push('');
    lines.push('| Product | Release | Discontinued Date |');
    lines.push('|---------|---------|-------------------|');
    for (const product of results.discontinuedProducts) {
      lines.push(
        `| ${product.product} | ${product.release} | ${product.discontinuedDate || 'N/A'} |`
      );
    }
    lines.push('');
  }

  const activeProducts = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  );
  if (activeProducts.length > 0) {
    lines.push('## ✅ Active Support');
    lines.push('');
    lines.push('| Product | Release | EOL Date | Latest Version | LTS |');
    lines.push('|---------|---------|----------|----------------|-----|');
    for (const product of activeProducts) {
      lines.push(
        `| ${product.product} | ${product.release} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
      );
    }
    lines.push('');
  }

  if (
    results.eolProducts.length === 0 &&
    results.approachingEolProducts.length === 0
  ) {
    lines.push('## ✅ All Clear!');
    lines.push('');
    lines.push('All tracked versions are actively supported.');
    lines.push('');
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

  // Filter based on EOL status
  if (excludeEol) {
    products = products.filter((p) => p.status !== EolStatus.END_OF_LIFE);
  }
  if (excludeApproachingEol) {
    products = products.filter((p) => p.status !== EolStatus.APPROACHING_EOL);
  }

  // Extract unique releases/versions
  const versions = products.map((p) => p.release);

  return { versions };
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

  // Filter based on EOL status
  if (excludeEol) {
    products = products.filter((p) => p.status !== EolStatus.END_OF_LIFE);
  }
  if (excludeApproachingEol) {
    products = products.filter((p) => p.status !== EolStatus.APPROACHING_EOL);
  }

  // Map to detailed matrix items
  const include = products.map((p) => ({
    version: p.release,
    release: p.release,
    isLts: p.isLts,
    eolDate: p.eolDate,
    status: p.status,
    releaseDate: p.releaseDate,
  }));

  return { include };
}

/**
 * Set action outputs
 */
export function setOutputs(results: ActionResults): void {
  core.setOutput('eol-detected', results.eolDetected);
  core.setOutput('approaching-eol', results.approachingEol);
  core.setOutput('results', JSON.stringify(results));
  core.setOutput('eol-products', JSON.stringify(results.eolProducts));
  core.setOutput(
    'approaching-eol-products',
    JSON.stringify(results.approachingEolProducts)
  );
  core.setOutput('latest-versions', JSON.stringify(results.latestVersions));
  core.setOutput('summary', results.summary);
  core.setOutput('total-products-checked', results.totalProductsChecked);
  core.setOutput('total-releases-checked', results.totalReleasesChecked);
  core.setOutput('stale-detected', results.staleDetected);
  core.setOutput('stale-products', JSON.stringify(results.staleProducts));
  core.setOutput('discontinued-detected', results.discontinuedDetected);
  core.setOutput(
    'discontinued-products',
    JSON.stringify(results.discontinuedProducts)
  );
  core.setOutput(
    'extended-support-products',
    JSON.stringify(results.extendedSupportProducts)
  );

  // Matrix outputs (if generated)
  if (results.matrix) {
    core.setOutput('matrix', JSON.stringify(results.matrix));
  }
  if (results.matrixInclude) {
    core.setOutput('matrix-include', JSON.stringify(results.matrixInclude));
  }
}

/**
 * Create issue body for EOL detection
 */
export function createIssueBody(results: ActionResults): string {
  const lines: string[] = [];

  lines.push('# 🚨 End-of-Life Software Detected');
  lines.push('');
  lines.push(
    'This issue was automatically created by the Software Lifecycle Tracker because end-of-life software versions were detected.'
  );
  lines.push('');

  if (results.eolProducts.length > 0) {
    lines.push('## ❌ End-of-Life Versions');
    lines.push('');
    for (const product of results.eolProducts) {
      lines.push(`### ${product.product} ${product.release}`);
      lines.push('');
      lines.push(`- **EOL Date:** ${product.eolDate}`);
      lines.push(`- **Latest Version:** ${product.latestVersion || 'N/A'}`);
      lines.push(`- **LTS:** ${product.isLts ? 'Yes' : 'No'}`);
      if (product.link) {
        lines.push(`- **More Info:** ${product.link}`);
      }
      lines.push('');
    }
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push('## ⚠️ Approaching End-of-Life');
    lines.push('');
    for (const product of results.approachingEolProducts) {
      lines.push(`### ${product.product} ${product.release}`);
      lines.push('');
      lines.push(`- **Days Until EOL:** ${product.daysUntilEol}`);
      lines.push(`- **EOL Date:** ${product.eolDate}`);
      lines.push(`- **Latest Version:** ${product.latestVersion || 'N/A'}`);
      lines.push(`- **LTS:** ${product.isLts ? 'Yes' : 'No'}`);
      if (product.link) {
        lines.push(`- **More Info:** ${product.link}`);
      }
      lines.push('');
    }
  }

  if (results.staleProducts.length > 0) {
    lines.push('## ⏰ Stale Versions');
    lines.push('');
    for (const product of results.staleProducts) {
      lines.push(`### ${product.product} ${product.release}`);
      lines.push('');
      lines.push(
        `- **Days Since Latest Release:** ${product.daysSinceLatestRelease}`
      );
      lines.push(
        `- **Last Release Date:** ${product.latestReleaseDate || 'N/A'}`
      );
      lines.push(`- **Latest Version:** ${product.latestVersion || 'N/A'}`);
      lines.push('');
    }
  }

  if (results.discontinuedProducts.length > 0) {
    lines.push('## 🚫 Discontinued Products');
    lines.push('');
    for (const product of results.discontinuedProducts) {
      lines.push(`### ${product.product} ${product.release}`);
      lines.push('');
      if (product.discontinuedDate) {
        lines.push(`- **Discontinued Date:** ${product.discontinuedDate}`);
      }
      lines.push(`- **Latest Version:** ${product.latestVersion || 'N/A'}`);
      lines.push('');
    }
  }

  lines.push('## 📋 Recommended Actions');
  lines.push('');
  lines.push('1. Review the affected software versions');
  lines.push('2. Plan migration to supported versions');
  lines.push('3. Update dependencies and configurations');
  lines.push('4. Test thoroughly before deploying');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(
    '*This issue was created automatically by [Software Lifecycle Tracker](https://github.com/broadsage/lifecycle-action)*'
  );

  return lines.join('\n');
}

/**
 * Create a modern lifecycle dashboard body
 */
export function formatAsDashboard(results: ActionResults): string {
  const lines: string[] = [];

  lines.push('# 🛡️ Software Lifecycle Dashboard');
  lines.push('');
  lines.push(
    'This dashboard provides a live overview of the support status for all tracked software dependencies. It is automatically updated by the [Software Lifecycle Tracker](https://github.com/broadsage/lifecycle-action).'
  );
  lines.push('');

  // Status Summary Cards
  const eolCount = results.eolProducts.length;
  const approachingCount = results.approachingEolProducts.length;
  const healthyCount = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  ).length;

  lines.push('### 📊 Status Overview');
  lines.push(
    `> 🔴 **${eolCount}** End-of-Life | 🟠 **${approachingCount}** Warning | 🟢 **${healthyCount}** Healthy`
  );
  lines.push('');

  // Define "Recent" as within the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentEol: ProductVersionInfo[] = [];
  const legacyEol: ProductVersionInfo[] = [];

  for (const p of results.eolProducts) {
    if (p.eolDate) {
      const eolDate = new Date(p.eolDate);
      if (eolDate >= ninetyDaysAgo) {
        recentEol.push(p);
      } else {
        legacyEol.push(p);
      }
    } else {
      // If no date but marked as EOL, consider it legacy/unknown
      legacyEol.push(p);
    }
  }

  // 1. Critical Attention (Recent EOL)
  if (recentEol.length > 0) {
    lines.push('## 🔴 Critical: Recent End-of-Life');
    lines.push(
      'The following versions have reached End-of-Life within the last 90 days. immediate action is highly recommended.'
    );
    lines.push('');
    lines.push('| Product | Version | EOL Date | Recommended |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const p of recentEol) {
      lines.push(
        `| **${p.product}** | \`${p.release}\` | ${p.eolDate} | Update to \`${p.latestVersion || 'latest'}\` |`
      );
    }
    lines.push('');
  }

  // 2. Upcoming Risks (Approaching EOL)
  if (results.approachingEolProducts.length > 0) {
    lines.push('## 🟠 Upcoming Risks');
    lines.push('These versions are approaching EOL soon. Plan your migration.');
    lines.push('');
    lines.push('| Product | Version | EOL Date | Days Left |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const p of results.approachingEolProducts) {
      lines.push(
        `| **${p.product}** | \`${p.release}\` | ${p.eolDate} | \`${p.daysUntilEol}\` days |`
      );
    }
    lines.push('');
  }

  // 3. Legacy EOL (Collapsed)
  if (legacyEol.length > 0) {
    lines.push('## 💾 Legacy End-of-Life');
    lines.push(
      '<details><summary>Click to view products that have been EOL for more than 90 days</summary>'
    );
    lines.push('');
    lines.push('| Product | Version | EOL Date | Latest Version |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const p of legacyEol) {
      lines.push(
        `| ${p.product} | \`${p.release}\` | ${p.eolDate || 'N/A'} | \`${p.latestVersion || 'N/A'}\` |`
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // 4. Stale (Maintenance)
  if (results.staleProducts.length > 0) {
    lines.push('## ⏰ Maintenance Required');
    lines.push(
      'No updates have been released for these versions in over a year.'
    );
    lines.push('');
    lines.push('| Product | Version | Last Update | Status |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const p of results.staleProducts) {
      lines.push(
        `| **${p.product}** | \`${p.release}\` | ${p.latestReleaseDate || 'N/A'} | \`${p.daysSinceLatestRelease}\` days stale |`
      );
    }
    lines.push('');
  }

  // 5. Active (Collapsed)
  const activeProducts = results.products.filter(
    (p) => p.status === EolStatus.ACTIVE
  );
  if (activeProducts.length > 0) {
    lines.push('## 🟢 Healthy & Supported');
    lines.push('<details>');
    lines.push('<summary>Click to view all healthy dependencies</summary>');
    lines.push('');
    lines.push('| Product | Version | EOL Date | Latest |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const p of activeProducts) {
      lines.push(
        `| ${p.product} | \`${p.release}\` | ${p.eolDate || 'N/A'} | \`${p.latestVersion || 'N/A'}\` |`
      );
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push(
    `*Last updated: ${new Date().toUTCString()} | [Report Link](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})*`
  );

  return lines.join('\n');
}
