// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { EndOfLifeClient } from './client';
import { EolAnalyzer } from './analyzer';
import { GitHubIntegration } from './github';
import { VersionExtractor, FileFormat } from './version-extractor';
import { getErrorMessage } from './utils/error-utils';
import {
  getInputs,
  parseProducts,
  parseCycles,
  validateInputs,
} from './inputs';
import {
  setOutputs,
  writeToStepSummary,
  formatAsJson,
  formatAsMarkdown,
  writeToFile,
} from './outputs';

/**
 * Main action entry point
 */
async function run(): Promise<void> {
  try {
    core.info('🚀 Starting EndOfLife Action...');

    // Get and validate inputs
    const inputs = getInputs();
    validateInputs(inputs);

    core.debug(`Inputs: ${JSON.stringify(inputs, null, 2)}`);

    // Parse products and cycles
    let products = parseProducts(inputs.products);
    const cyclesMap = parseCycles(inputs.cycles);

    // Initialize client
    const client = new EndOfLifeClient(inputs.customApiUrl, inputs.cacheTtl);

    // Handle "all" products
    if (products.length === 1 && products[0].toLowerCase() === 'all') {
      core.info('Fetching all available products...');
      products = await client.getAllProducts();
      core.info(`Found ${products.length} products`);
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
    }

    core.info(`Analyzing ${products.length} product(s)...`);

    // Initialize analyzer
    const analyzer = new EolAnalyzer(client, inputs.eolThresholdDays);

    // Analyze products
    const results = await analyzer.analyzeProducts(
      products,
      cyclesMap,
      versionMap,
      inputs.semanticVersionFallback
    );

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
      } else {
        core.warning('Failed to create or update issue');
      }
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

// Run the action
void run();
