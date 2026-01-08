// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { ActionInputs, ProductReleases, NotificationSeverity } from './types';
import { getErrorMessage } from './utils/error-utils';

/**
 * Get and validate action inputs
 */
export function getInputs(): ActionInputs {
  const products = core.getInput('products', { required: true });
  const releases = core.getInput('releases') || '{}';
  const checkEol = core.getBooleanInput('check-eol');
  const eolThresholdDays = parseInt(
    core.getInput('eol-threshold-days') || '90',
    10
  );
  const failOnEol = core.getBooleanInput('fail-on-eol');
  const failOnApproachingEol = core.getBooleanInput('fail-on-approaching-eol');
  const failOnStale = core.getBooleanInput('fail-on-stale');
  const stalenessThresholdDays = parseInt(
    core.getInput('staleness-threshold-days') || '365',
    10
  );
  const includeDiscontinued = core.getBooleanInput('include-discontinued');
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
    core.getInput('custom-api-url') || 'https://endoflife.date/api/v1';
  const useDashboard = core.getBooleanInput('use-dashboard');
  const dashboardTitle =
    core.getInput('dashboard-title') || 'Software Lifecycle Dashboard 🛡️';

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
  const filterByCategory = core.getInput('filter-by-category') || undefined;
  const filterByTag = core.getInput('filter-by-tag') || undefined;
  const enableNotifications = core.getBooleanInput('enable-notifications');
  const notifyOnEolOnly = core.getBooleanInput('notify-on-eol-only');
  const notifyOnApproachingEol = core.getBooleanInput(
    'notify-on-approaching-eol'
  );
  const notificationThresholdDays = parseInt(
    core.getInput('notification-threshold-days') || '90',
    10
  );

  // Notification inputs
  const notificationRetryAttempts = parseInt(
    core.getInput('notification-retry-attempts') || '3',
    10
  );
  const notificationRetryDelay = parseInt(
    core.getInput('notification-retry-delay-ms') || '1000',
    10
  );

  // Webhook inputs
  const webhookUrl = core.getInput('custom-webhook-url') || undefined;
  const webhookMinSeverity = (core.getInput('webhook-min-severity') ||
    'info') as NotificationSeverity;
  const webhookCustomHeaders =
    core.getInput('custom-webhook-headers') || undefined;

  // Teams inputs
  const teamsUrl = core.getInput('teams-webhook-url') || undefined;
  const teamsMinSeverity = (core.getInput('teams-min-severity') ||
    'info') as NotificationSeverity;

  // Google Chat inputs
  const googleChatUrl = core.getInput('google-chat-webhook-url') || undefined;
  const googleChatMinSeverity = (core.getInput('google-chat-min-severity') ||
    'info') as NotificationSeverity;

  // Discord inputs
  const discordUrl = core.getInput('discord-webhook-url') || undefined;
  const discordMinSeverity = (core.getInput('discord-min-severity') ||
    'info') as NotificationSeverity;
  // Slack inputs
  const slackUrl = core.getInput('slack-webhook-url') || undefined;
  const slackMinSeverity = (core.getInput('slack-min-severity') ||
    'info') as NotificationSeverity;

  // SBOM inputs
  const sbomFile = core.getInput('sbom-file') || undefined;
  const sbomFormat = (core.getInput('sbom-format') ||
    'auto') as ActionInputs['sbomFormat'];
  const sbomComponentMapping =
    core.getInput('sbom-component-mapping') || undefined;

  return {
    products,
    releases,
    checkEol,
    eolThresholdDays,
    failOnEol,
    failOnApproachingEol,
    failOnStale,
    stalenessThresholdDays,
    includeDiscontinued,
    outputFormat,
    outputFile,
    cacheTtl,
    githubToken,
    createIssueOnEol,
    issueLabels,
    includeLatestVersion,
    includeSupportInfo,
    customApiUrl,
    useDashboard,
    dashboardTitle,
    filePath,
    fileKey,
    fileFormat,
    versionRegex,
    version,
    filterByCategory,
    filterByTag,
    enableNotifications,
    notifyOnEolOnly,
    notifyOnApproachingEol,
    notificationThresholdDays,
    sbomFile,
    sbomFormat,
    sbomComponentMapping,
    semanticVersionFallback,
    outputMatrix,
    excludeEolFromMatrix,
    excludeApproachingEolFromMatrix,
    apiConcurrency: parseInt(core.getInput('api-concurrency') || '5', 10),
    minReleaseDate,
    maxReleaseDate,
    maxVersions,
    versionSortOrder,
    notificationRetryAttempts,
    notificationRetryDelayMs: notificationRetryDelay,
    webhookUrl,
    webhookMinSeverity,
    webhookCustomHeaders,
    teamsUrl,
    teamsMinSeverity,
    googleChatUrl,
    googleChatMinSeverity,
    discordUrl,
    discordMinSeverity,
    slackUrl,
    slackMinSeverity,
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
 * Parse releases input
 */
export function parseReleases(releasesInput: string): ProductReleases {
  if (!releasesInput || releasesInput.trim() === '{}') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(releasesInput);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Releases must be a JSON object');
    }
    return parsed as ProductReleases;
  } catch (error) {
    throw new Error(`Invalid releases JSON: ${getErrorMessage(error)}`);
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

  if (inputs.useDashboard && !inputs.githubToken) {
    throw new Error('GitHub token is required when use-dashboard is enabled');
  }

  // Validate releases JSON
  try {
    parseReleases(inputs.releases);
  } catch (error) {
    throw new Error(`Invalid releases input: ${getErrorMessage(error)}`);
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
 * Parse date filter string into operator and date
 */
export function parseDateFilter(dateStr: string): {
  operator: string;
  date: Date;
} {
  let operator = '=';
  let cleanDate = dateStr.trim();

  if (dateStr.startsWith('>=')) {
    operator = '>=';
    cleanDate = dateStr.substring(2).trim();
  } else if (dateStr.startsWith('<=')) {
    operator = '<=';
    cleanDate = dateStr.substring(2).trim();
  } else if (dateStr.startsWith('>')) {
    operator = '>';
    cleanDate = dateStr.substring(1).trim();
  } else if (dateStr.startsWith('<')) {
    operator = '<';
    cleanDate = dateStr.substring(1).trim();
  }

  // Handle year-only format
  if (/^\d{4}$/.test(cleanDate)) {
    if (operator === '<=') {
      return { operator, date: new Date(`${cleanDate}-12-31`) };
    }
    return { operator, date: new Date(`${cleanDate}-01-01`) };
  }

  return { operator, date: new Date(cleanDate) };
}

/**
 * Validate date filter format
 */
export function validateDateFilter(dateStr: string, fieldName: string): void {
  // Remove operators
  const cleanDate = dateStr.replace(/^(>=|<=|>|<)/, '');

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

  throw new Error(`${fieldName}: Invalid date format. Use YYYY or YYYY-MM-DD`);
}
