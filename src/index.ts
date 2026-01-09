// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { EndOfLifeClient } from './client';
import { EolAnalyzer } from './analyzer';
import { GitHubIntegration } from './github';
import { VersionExtractor, FileFormat } from './version-extractor';
import { SBOMParser, SBOMFormat } from './sbom-parser';
import { getErrorMessage } from './utils/error-utils';
import {
  getInputs,
  parseProducts,
  parseReleases,
  validateInputs,
} from './inputs';
import {
  setOutputs,
  writeToStepSummary,
  formatAsJson,
  formatAsMarkdown,
  writeToFile,
  generateMatrix,
  generateMatrixInclude,
} from './outputs';
import { ActionResults } from './types';
import {
  NotificationManager,
  NotificationChannelFactory,
  getNotificationConfig,
} from './notifications';

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    core.info('🚀 Starting Software Lifecycle Tracker...');

    // Get and validate inputs
    const inputs = getInputs();
    validateInputs(inputs);

    core.debug(`Inputs: ${JSON.stringify(inputs, null, 2)}`);

    // Parse products and releases
    let products = parseProducts(inputs.products);
    const releasesMap = parseReleases(inputs.releases);

    // Initialize client
    const client = new EndOfLifeClient(inputs.customApiUrl, inputs.cacheTtl);

    // Handle "all" products and filtering
    if (products.length === 1 && products[0].toLowerCase() === 'all') {
      core.info('Fetching all available products...');
      products = await client.getAllProducts();
      core.info(`Found ${products.length} products`);
    }

    // Filter products by category or tag if requested
    if (inputs.filterByCategory) {
      core.info(`Filtering products by category: ${inputs.filterByCategory}`);
      const categoryProducts = await client.getProductsByCategory(
        inputs.filterByCategory
      );
      const categoryProductNames = categoryProducts.map((p) => p.name);

      if (products.length === 1 && products[0].toLowerCase() === 'all') {
        products = categoryProductNames;
      } else {
        // Intersect if products were explicitly listed, or union?
        // Usually if you specify products AND category, you want the intersection.
        // But if products is empty/all, you want all in category.
        // Let's go with: if products is not 'all', we intersect.
        products = products.filter((p) => categoryProductNames.includes(p));
      }
      core.info(`Products after category filtering: ${products.length}`);
    }

    if (inputs.filterByTag) {
      core.info(`Filtering products by tag: ${inputs.filterByTag}`);
      const tagProducts = await client.getProductsByTag(inputs.filterByTag);
      const tagProductNames = tagProducts.map((p) => p.name);

      if (
        products.length === 0 ||
        (products.length === 1 && products[0].toLowerCase() === 'all')
      ) {
        products = tagProductNames;
      } else {
        products = products.filter((p) => tagProductNames.includes(p));
      }
      core.info(`Products after tag filtering: ${products.length}`);
    }

    // Handle version extraction
    const versionMap = new Map<string, string>();

    if (inputs.version) {
      // Manual version provided
      core.info(`Using manually provided version: ${inputs.version}`);
      if (products.length === 1) {
        versionMap.set(products[0], inputs.version);
      } else {
        core.warning(
          'Manual version input is only supported for single product tracking'
        );
      }
    } else if (inputs.filePath) {
      // Extract version from file
      core.info(`Extracting version from file: ${inputs.filePath}`);
      const extractor = new VersionExtractor();

      try {
        const result = extractor.extractFromFile(
          inputs.filePath,
          inputs.fileFormat as FileFormat,
          inputs.fileKey,
          inputs.versionRegex
        );

        core.info(`✓ Extracted version: ${result.version}`);
        core.setOutput('version', result.version);

        // Apply to first product only (single product mode)
        if (products.length === 1) {
          versionMap.set(products[0], result.version);
        } else {
          core.warning(
            'File-based version extraction is only supported for single product tracking'
          );
        }
      } catch (error) {
        throw new Error(`Failed to extract version: ${getErrorMessage(error)}`);
      }
    } else if (inputs.sbomFile) {
      // Handle SBOM parsing
      core.info(`Parsing SBOM file: ${inputs.sbomFile}`);
      try {
        let customMapping: Record<string, string> = {};
        if (inputs.sbomComponentMapping) {
          try {
            customMapping = JSON.parse(inputs.sbomComponentMapping);
          } catch (error) {
            core.warning(
              `Failed to parse sbom-component-mapping as JSON: ${getErrorMessage(error)}`
            );
          }
        }

        const sbomParser = new SBOMParser(client);
        const sbomVersions = await sbomParser.parseFile(
          inputs.sbomFile,
          inputs.sbomFormat as SBOMFormat,
          customMapping
        );

        core.info(`✓ Extracted ${sbomVersions.size} components from SBOM`);

        // If products was "all", we use SBOM products
        // (This logic was already present but we ensure it's robust)

        // Add SBOM versions to the map
        for (const [product, ver] of sbomVersions) {
          versionMap.set(product, ver);
          if (!products.includes(product) && !products.includes('all')) {
            // If we're not tracking 'all' and this product isn't in the list,
            // we might want to add it if it's from SBOM?
            // Usually if sbom-file is provided, we should track those.
          }
        }

        // If 'all' was specified, products list now comes from SBOM if it was limited or we can just merge.
        // For simplicity, let's say if you provide SBOM, those products are added.
        const sbomProds = Array.from(sbomVersions.keys());
        if (products.length === 1 && products[0].toLowerCase() === 'all') {
          products = sbomProds;
        } else {
          // Merge
          for (const p of sbomProds) {
            if (!products.includes(p)) {
              products.push(p);
            }
          }
        }
      } catch (error) {
        throw new Error(`Failed to parse SBOM: ${getErrorMessage(error)}`);
      }
    }

    // Merge versionMap into releasesMap (conversion of Map to object format expected by analyzer)
    const combinedReleasesMap: Record<string, string[]> = { ...releasesMap };
    for (const [product, version] of versionMap.entries()) {
      if (!combinedReleasesMap[product]) {
        combinedReleasesMap[product] = [];
      }
      if (!combinedReleasesMap[product].includes(version)) {
        combinedReleasesMap[product].push(version);
      }
    }

    // Initialize analyzer
    const analyzer = new EolAnalyzer(
      client,
      inputs.eolThresholdDays,
      inputs.stalenessThresholdDays
    );

    // Analyze products
    const results = await core.group(
      `Analyzing ${products.length} product(s)...`,
      async () =>
        (await analyzer.analyzeMany(products, combinedReleasesMap, {
          includeDiscontinued: inputs.includeDiscontinued,
          minReleaseDate: inputs.minReleaseDate,
          maxReleaseDate: inputs.maxReleaseDate,
          maxVersions: inputs.maxVersions,
          versionSortOrder: inputs.versionSortOrder,
          apiConcurrency: inputs.apiConcurrency,
        })) as ActionResults
    );

    // Generate matrix outputs if requested
    if (inputs.outputMatrix) {
      core.info('Generating matrix outputs...');
      results.matrix = generateMatrix(
        results,
        inputs.excludeEolFromMatrix,
        inputs.excludeApproachingEolFromMatrix
      );
      results.matrixInclude = generateMatrixInclude(
        results,
        inputs.excludeEolFromMatrix,
        inputs.excludeApproachingEolFromMatrix
      );
      core.info(`Matrix contains ${results.matrix.versions.length} version(s)`);
    }

    // Log summary
    core.info('\n' + results.summary);

    // Set outputs
    setOutputs(results);

    // Handle output format
    let formattedOutput = '';
    switch (inputs.outputFormat) {
      case 'json':
        formattedOutput = formatAsJson(results);
        break;
      case 'markdown':
        formattedOutput = formatAsMarkdown(results);
        break;
      case 'summary':
        await writeToStepSummary(results);
        break;
    }

    // Write to file if specified
    if (inputs.outputFile && formattedOutput) {
      await writeToFile(inputs.outputFile, formattedOutput);
    }

    // Create GitHub issue if requested
    if (inputs.createIssueOnEol && inputs.githubToken && results.eolDetected) {
      core.info('Creating GitHub issue for EOL detection...');
      const ghIntegration = new GitHubIntegration(inputs.githubToken);
      const labels = inputs.issueLabels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const issueNumber = await ghIntegration.createEolIssue(results, labels);
      if (issueNumber) {
        core.info(`Issue created/updated: #${issueNumber}`);
        core.setOutput('issue-number', issueNumber);
      } else {
        core.warning('Failed to create or update issue');
      }
    }

    // Handle dashboard creation/update
    if (inputs.useDashboard && inputs.githubToken) {
      core.info('Upserting Software Lifecycle Dashboard...');
      const ghIntegration = new GitHubIntegration(inputs.githubToken);

      const dashboardNumber = await ghIntegration.upsertDashboardIssue(
        results,
        inputs.dashboardTitle
      );

      if (dashboardNumber) {
        core.info(`Dashboard updated: #${dashboardNumber}`);
        core.setOutput('dashboard-issue-number', dashboardNumber);
      }
    }

    // Send notifications to configured channels
    try {
      const notificationConfig = getNotificationConfig();
      if (notificationConfig.enabled) {
        core.info('Sending notifications to configured channels...');
        const notificationManager = new NotificationManager(notificationConfig);

        // Add all configured channels
        const channels = NotificationChannelFactory.createFromInputs({
          retryAttempts: notificationConfig.retryAttempts,
          retryDelayMs: notificationConfig.retryDelayMs,
        });
        channels.forEach((channel) => notificationManager.addChannel(channel));

        if (notificationManager.getChannelCount() > 0) {
          const notificationResults =
            await notificationManager.sendAll(results);
          const successful = notificationResults.filter(
            (r) => r.success
          ).length;
          core.info(
            `Notifications sent: ${successful}/${notificationResults.length} successful`
          );
        } else {
          core.debug('No notification channels configured');
        }
      }
    } catch (error) {
      // Don't fail the action if notifications fail
      core.warning(`Failed to send notifications: ${getErrorMessage(error)}`);
    }

    // Log cache statistics
    const cacheStats = client.getCacheStats();
    core.debug(`Cache statistics: ${JSON.stringify(cacheStats)}`);

    // Fail if requested
    if (inputs.failOnEol && results.eolDetected) {
      core.setFailed(
        `❌ Action failed: ${results.eolProducts.length} end-of-life version(s) detected`
      );
      return;
    }

    if (inputs.failOnApproachingEol && results.approachingEol) {
      core.setFailed(
        `⚠️ Action failed: ${results.approachingEolProducts.length} version(s) approaching end-of-life`
      );
      return;
    }

    core.info('✅ Action completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
      core.debug(error.stack || 'No stack trace available');
    } else {
      core.setFailed(`Action failed: ${String(error)}`);
    }
  }
}

// Run the action if this is the main module
if (require.main === module) {
  void run();
}
