// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { ActionResults, EolStatus } from './types';
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

  lines.push('# 📊 EndOfLife Analysis Report');
  lines.push('');
  lines.push(`**Total Products Checked:** ${results.totalProductsChecked}`);
  lines.push(`**Total Cycles Checked:** ${results.totalCyclesChecked}`);
  lines.push('');

  if (results.eolProducts.length > 0) {
    lines.push('## ❌ End-of-Life Detected');
    lines.push('');
    lines.push('| Product | Cycle | EOL Date | Latest Version | LTS |');
    lines.push('|---------|-------|----------|----------------|-----|');
    for (const product of results.eolProducts) {
      lines.push(
        `| ${product.product} | ${product.cycle} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
      );
    }
    lines.push('');
  }

  if (results.approachingEolProducts.length > 0) {
    lines.push('## ⚠️ Approaching End-of-Life');
    lines.push('');
    lines.push(
      '| Product | Cycle | Days Until EOL | EOL Date | Latest Version | LTS |'
    );
    lines.push(
      '|---------|-------|----------------|----------|----------------|-----|'
    );
    for (const product of results.approachingEolProducts) {
      lines.push(
        `| ${product.product} | ${product.cycle} | ${product.daysUntilEol || 'N/A'} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
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
    lines.push('| Product | Cycle | EOL Date | Latest Version | LTS |');
    lines.push('|---------|-------|----------|----------------|-----|');
    for (const product of activeProducts) {
      lines.push(
        `| ${product.product} | ${product.cycle} | ${product.eolDate || 'N/A'} | ${product.latestVersion || 'N/A'} | ${product.isLts ? '✓' : '✗'} |`
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
  core.setOutput('total-cycles-checked', results.totalCyclesChecked);
}

/**
 * Create issue body for EOL detection
 */
export function createIssueBody(results: ActionResults): string {
  const lines: string[] = [];

  lines.push('# 🚨 End-of-Life Software Detected');
  lines.push('');
  lines.push(
    'This issue was automatically created by the EndOfLife Action because end-of-life software versions were detected.'
  );
  lines.push('');

  if (results.eolProducts.length > 0) {
    lines.push('## ❌ End-of-Life Versions');
    lines.push('');
    for (const product of results.eolProducts) {
      lines.push(`### ${product.product} ${product.cycle}`);
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
      lines.push(`### ${product.product} ${product.cycle}`);
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
    '*This issue was created automatically by [EndOfLife Action](https://github.com/broadsage/endoflife-action)*'
  );

  return lines.join('\n');
}
