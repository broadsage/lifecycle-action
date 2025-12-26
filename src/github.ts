// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as github from '@actions/github';
import { ActionResults } from './types';
import { createIssueBody } from './outputs';
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
      core.error(
        `Failed to search for existing issues: ${getErrorMessage(error)}`
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
}
