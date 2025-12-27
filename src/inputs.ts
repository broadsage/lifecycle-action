// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { ActionInputs, ProductCycles } from './types';
import { getErrorMessage } from './utils/error-utils';

/**
 * Get and validate action inputs
 */
export function getInputs(): ActionInputs {
  const products = core.getInput('products', { required: true });
  const cycles = core.getInput('cycles') || '{}';
  const checkEol = core.getBooleanInput('check-eol');
  const eolThresholdDays = parseInt(
    core.getInput('eol-threshold-days') || '90',
    10
  );
  const failOnEol = core.getBooleanInput('fail-on-eol');
  const failOnApproachingEol = core.getBooleanInput('fail-on-approaching-eol');
  const outputFormat = (core.getInput('output-format') ||
    'summary') as ActionInputs['outputFormat'];
  const outputFile = core.getInput('output-file') || '';
  const cacheTtl = parseInt(core.getInput('cache-ttl') || '3600', 10);
  const githubToken = core.getInput('github-token') || '';
  const createIssueOnEol = core.getBooleanInput('create-issue-on-eol');
  const issueLabels =
    core.getInput('issue-labels') || 'dependencies,eol,security';
  const includeLatestVersion = core.getBooleanInput('include-latest-version');
  const includeSupportInfo = core.getBooleanInput('include-support-info');
  const customApiUrl =
    core.getInput('custom-api-url') || 'https://endoflife.date';

  // File extraction inputs
  const filePath = core.getInput('file-path') || '';
  const fileKey = core.getInput('file-key') || '';
  const fileFormat = (core.getInput('file-format') ||
    'yaml') as ActionInputs['fileFormat'];
  const versionRegex = core.getInput('version-regex') || '';
  const version = core.getInput('version') || '';
  const semanticVersionFallback = core.getBooleanInput(
    'semantic-version-fallback'
  );

  // Matrix output inputs
  const outputMatrix = core.getBooleanInput('output-matrix');
  const excludeEolFromMatrix = core.getBooleanInput('exclude-eol-from-matrix');
  const excludeApproachingEolFromMatrix = core.getBooleanInput(
    'exclude-approaching-eol-from-matrix'
  );

  // Filtering inputs
  const minReleaseDate = core.getInput('min-release-date') || '';
  const maxReleaseDate = core.getInput('max-release-date') || '';
  const maxVersionsInput = core.getInput('max-versions') || '';
  const maxVersions = maxVersionsInput ? parseInt(maxVersionsInput, 10) : null;
  const versionSortOrder = (core.getInput('version-sort-order') ||
    'newest-first') as ActionInputs['versionSortOrder'];

  return {
    products,
    cycles,
    checkEol,
    eolThresholdDays,
    failOnEol,
    failOnApproachingEol,
    outputFormat,
    outputFile,
    cacheTtl,
    githubToken,
    createIssueOnEol,
    issueLabels,
    includeLatestVersion,
    includeSupportInfo,
    customApiUrl,
    filePath,
    fileKey,
    fileFormat,
    versionRegex,
    version,
    semanticVersionFallback,
    outputMatrix,
    excludeEolFromMatrix,
    excludeApproachingEolFromMatrix,
    minReleaseDate,
    maxReleaseDate,
    maxVersions,
    versionSortOrder,
  };
}

/**
 * Parse products input
 */
export function parseProducts(productsInput: string): string[] {
  return productsInput
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Parse cycles input
 */
export function parseCycles(cyclesInput: string): ProductCycles {
  if (!cyclesInput || cyclesInput.trim() === '{}') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(cyclesInput);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Cycles must be a JSON object');
    }
    return parsed as ProductCycles;
  } catch (error) {
    throw new Error(`Invalid cycles JSON: ${getErrorMessage(error)}`);
  }
}

/**
 * Validate inputs
 */
export function validateInputs(inputs: ActionInputs): void {
  if (!inputs.products || inputs.products.trim() === '') {
    throw new Error('Products input is required');
  }

  if (inputs.eolThresholdDays < 0) {
    throw new Error('EOL threshold days must be positive');
  }

  if (inputs.cacheTtl < 0) {
    throw new Error('Cache TTL must be positive');
  }

  if (!['json', 'markdown', 'summary'].includes(inputs.outputFormat)) {
    throw new Error('Output format must be json, markdown, or summary');
  }

  if (inputs.createIssueOnEol && !inputs.githubToken) {
    throw new Error(
      'GitHub token is required when create-issue-on-eol is enabled'
    );
  }

  // Validate cycles JSON
  try {
    parseCycles(inputs.cycles);
  } catch (error) {
    throw new Error(`Invalid cycles input: ${getErrorMessage(error)}`);
  }

  // Validate file extraction inputs
  if (inputs.filePath) {
    if (!inputs.fileKey && !inputs.versionRegex) {
      throw new Error(
        'Either file-key or version-regex is required when file-path is specified'
      );
    }

    if (!['yaml', 'json', 'text'].includes(inputs.fileFormat)) {
      throw new Error('File format must be yaml, json, or text');
    }

    if (inputs.fileFormat === 'text' && !inputs.versionRegex) {
      throw new Error('version-regex is required when file-format is text');
    }
  }

  // Validate that file-path, version, or cycles is provided
  if (!inputs.filePath && !inputs.version && inputs.cycles === '{}') {
    const products = parseProducts(inputs.products);
    if (products.length === 1 && products[0].toLowerCase() !== 'all') {
      throw new Error(
        'For single product tracking, either file-path, version, or cycles must be specified'
      );
    }
  }

  // Validate date filtering inputs
  if (inputs.minReleaseDate) {
    validateDateFilter(inputs.minReleaseDate, 'min-release-date');
  }
  if (inputs.maxReleaseDate) {
    validateDateFilter(inputs.maxReleaseDate, 'max-release-date');
  }

  // Validate max-versions
  if (
    inputs.maxVersions !== null &&
    inputs.maxVersions !== undefined &&
    inputs.maxVersions <= 0
  ) {
    throw new Error('max-versions must be a positive integer');
  }

  // Validate version-sort-order
  if (!['newest-first', 'oldest-first'].includes(inputs.versionSortOrder)) {
    throw new Error('version-sort-order must be newest-first or oldest-first');
  }
}

/**
 * Validate date filter format
 */
export function validateDateFilter(dateStr: string, fieldName: string): void {
  // Remove operators
  const cleanDate = dateStr.replace(/^(>=|<=)/, '');

  // Check if it's a year (YYYY)
  if (/^\d{4}$/.test(cleanDate)) {
    const year = parseInt(cleanDate, 10);
    if (year < 1900 || year > 2100) {
      throw new Error(`${fieldName}: Year must be between 1900 and 2100`);
    }
    return;
  }

  // Check if it's a full date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const date = new Date(cleanDate);
    if (isNaN(date.getTime())) {
      throw new Error(`${fieldName}: Invalid date format. Use YYYY-MM-DD`);
    }
    return;
  }

  throw new Error(
    `${fieldName}: Invalid date format. Use YYYY, YYYY-MM-DD, >=YYYY, or <=YYYY`
  );
}

/**
 * Parse date filter with operators
 */
export function parseDateFilter(dateStr: string): {
  operator: '>=' | '<=' | '=';
  date: Date;
} {
  let operator: '>=' | '<=' | '=' = '=';
  let cleanDate = dateStr;

  if (dateStr.startsWith('>=')) {
    operator = '>=';
    cleanDate = dateStr.substring(2);
  } else if (dateStr.startsWith('<=')) {
    operator = '<=';
    cleanDate = dateStr.substring(2);
  }

  // If it's just a year, convert to full date
  if (/^\d{4}$/.test(cleanDate)) {
    // For >= use start of year, for <= use end of year
    if (operator === '>=') {
      cleanDate = `${cleanDate}-01-01`;
    } else if (operator === '<=') {
      cleanDate = `${cleanDate}-12-31`;
    } else {
      cleanDate = `${cleanDate}-01-01`;
    }
  }

  return {
    operator,
    date: new Date(cleanDate),
  };
}
