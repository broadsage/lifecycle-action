// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as github from '@actions/github';
import { ActionResults } from './types';
import { createIssueBody, formatAsDashboard } from './outputs';
import { getErrorMessage } from './utils/error-utils';

/**
 * GitHub integration for creating issues and PRs
 */
export class GitHubIntegration {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Create an issue for EOL detection
   */
  async createEolIssue(
    results: ActionResults,
    labels: string[]
  ): Promise<number | null> {
    const { owner, repo } = this.context.repo;

    const title = `🚨 End-of-Life Software Detected - ${new Date().toISOString().split('T')[0]}`;
    const body = createIssueBody(results);

    try {
      // Check if similar issue already exists
      const existingIssues = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        labels: labels.join(','),
        per_page: 10,
      });

      const similarIssue = existingIssues.data.find((issue) =>
        issue.title.includes('End-of-Life Software Detected')
      );

      if (similarIssue) {
        core.info(
          `Similar issue already exists: #${similarIssue.number}. Adding comment instead.`
        );

        await this.octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: similarIssue.number,
          body: `## Updated EOL Detection\n\n${body}`,
        });

        return similarIssue.number;
      }

      // Create new issue
      const issue = await this.octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
      });

      core.info(`Created issue #${issue.data.number}`);
      return issue.data.number;
    } catch (error) {
      // Log error but don't fail the action if issue creation fails
      core.error(
        `Failed to create or update GitHub issue: ${getErrorMessage(error)}`
      );
      return null;
    }
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    const { owner, repo } = this.context.repo;

    try {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels,
      });
    } catch (error) {
      core.warning(`Failed to add labels: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<void> {
    const { owner, repo } = this.context.repo;

    try {
      if (comment) {
        await this.octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body: comment,
        });
      }

      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      core.info(`Closed issue #${issueNumber}`);
    } catch (error) {
      core.error(`Failed to close issue: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Create or update the Lifecycle Dashboard issue
   */
  async upsertDashboardIssue(
    results: ActionResults,
    title: string
  ): Promise<number | null> {
    const { owner, repo } = this.context.repo;
    const body = formatAsDashboard(results);
    const dashboardLabel = 'lifecycle-dashboard';
    const allLabels = [dashboardLabel];

    // Ensure the dashboard label exists with a professional description
    await this.ensureLabelExists(
      dashboardLabel,
      'Persistent dashboard for tracking software end-of-life (EOL) status and lifecycle updates.',
      'fbca04' // Yellow color to make it stand out
    );

    try {
      // Find existing dashboard issue
      const issues = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        labels: dashboardLabel,
        per_page: 5,
      });

      const existingDashboard = issues.data[0];

      if (existingDashboard) {
        core.info(
          `Updating existing dashboard issue #${existingDashboard.number}`
        );
        await this.octokit.rest.issues.update({
          owner,
          repo,
          issue_number: existingDashboard.number,
          title, // Update title in case it changed
          body,
        });
        return existingDashboard.number;
      }

      // Create new dashboard issue
      core.info('Creating new dashboard issue');
      const newIssue = await this.octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels: allLabels,
      });

      core.info(`Created dashboard issue #${newIssue.data.number}`);
      return newIssue.data.number;
    } catch (error) {
      core.error(`Failed to upsert dashboard: ${getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Ensure a label exists in the repository
   */
  async ensureLabelExists(
    name: string,
    description: string,
    color: string = '0e8a16'
  ): Promise<void> {
    const { owner, repo } = this.context.repo;

    try {
      const { data: existingLabel } = await this.octokit.rest.issues.getLabel({
        owner,
        repo,
        name,
      });

      // Check if description or color needs updating
      if (
        existingLabel.description !== description ||
        existingLabel.color.toLowerCase() !== color.toLowerCase()
      ) {
        core.info(
          `Updating label '${name}' with correct description and color...`
        );
        await this.octokit.rest.issues.updateLabel({
          owner,
          repo,
          name,
          new_name: name,
          description,
          color,
        });
      }
      core.debug(`Label '${name}' is up to date.`);
    } catch (error: any) {
      // GitHub API returns 404 if the label doesn't exist
      if (error && error.status === 404) {
        core.info(`Label '${name}' not found. Creating it...`);
        try {
          await this.octokit.rest.issues.createLabel({
            owner,
            repo,
            name,
            description,
            color,
          });
          core.info(`Successfully created label: ${name}`);
        } catch (createError) {
          core.warning(
            `Failed to create label '${name}': ${getErrorMessage(createError)}`
          );
        }
      } else {
        core.debug(
          `Unexpected error while checking for label '${name}': ${getErrorMessage(error)}`
        );
      }
    }
  }
}
