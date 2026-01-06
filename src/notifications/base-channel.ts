// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import {
  INotificationChannel,
  NotificationChannelType,
  NotificationMessage,
  NotificationSeverity,
} from './types';
import { ActionResults } from '../types';

/**
 * Base class for notification channels with common functionality
 */
export abstract class BaseNotificationChannel implements INotificationChannel {
  abstract readonly name: string;
  abstract readonly type: NotificationChannelType;

  protected webhookUrl: string;
  protected retryAttempts: number;
  protected retryDelayMs: number;

  constructor(
    webhookUrl: string,
    retryAttempts: number = 3,
    retryDelayMs: number = 1000
  ) {
    this.webhookUrl = webhookUrl;
    this.retryAttempts = retryAttempts;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Send notification with retry logic
   */
  async send(message: NotificationMessage): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        core.debug(
          `[${this.name}] Sending notification (attempt ${attempt}/${this.retryAttempts})`
        );

        const payload = this.buildPayload(message);
        await this.sendRequest(payload);

        core.info(`[${this.name}] Notification sent successfully`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        core.warning(
          `[${this.name}] Attempt ${attempt} failed: ${lastError.message}`
        );

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          core.debug(`[${this.name}] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `[${this.name}] Failed to send notification after ${this.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Format action results into notification message
   */
  formatMessage(results: ActionResults): NotificationMessage {
    const severity = this.determineSeverity(results);
    const repository = process.env.GITHUB_REPOSITORY || 'Unknown';
    const runId = process.env.GITHUB_RUN_ID || '';
    const runUrl = runId
      ? `https://github.com/${repository}/actions/runs/${runId}`
      : '';

    return {
      title: this.buildTitle(results),
      summary: this.buildSummary(results),
      severity,
      fields: this.buildFields(results),
      timestamp: new Date(),
      repository,
      runUrl,
      color: this.getColorForSeverity(severity),
    };
  }

  /**
   * Validate channel configuration with security checks
   * Prevents SSRF attacks by blocking internal/private IP addresses
   */
  validate(): boolean {
    if (!this.webhookUrl) {
      core.warning(`[${this.name}] Webhook URL is not configured`);
      return false;
    }

    try {
      const url = new URL(this.webhookUrl);

      // Block internal/private IP addresses to prevent SSRF
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '169.254.169.254', // AWS metadata service
        '169.254.169.253', // AWS metadata service (secondary)
        'metadata.google.internal', // GCP metadata service
      ];

      const hostname = url.hostname.toLowerCase();

      // Check exact matches
      if (blockedHosts.includes(hostname)) {
        core.warning(
          `[${this.name}] Blocked internal/private URL: ${hostname}`
        );
        return false;
      }

      // Check for private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      if (this.isPrivateIP(hostname)) {
        core.warning(`[${this.name}] Blocked private IP address: ${hostname}`);
        return false;
      }

      // Require HTTPS in production (allow HTTP for testing)
      const isProduction = process.env.NODE_ENV === 'production';
      const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

      if ((isProduction || isGitHubActions) && url.protocol !== 'https:') {
        core.warning(
          `[${this.name}] HTTPS required for webhook URLs in production`
        );
        return false;
      }

      return true;
    } catch {
      core.warning(`[${this.name}] Invalid webhook URL: ${this.webhookUrl}`);
      return false;
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const privateIPv4Patterns = [
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^127\./, // 127.0.0.0/8 (loopback)
      /^169\.254\./, // 169.254.0.0/16 (link-local)
    ];

    return privateIPv4Patterns.some((pattern) => pattern.test(hostname));
  }

  /**
   * Build channel-specific payload (to be implemented by subclasses)
   */
  protected abstract buildPayload(message: NotificationMessage): unknown;

  /**
   * Send HTTP request to webhook
   */
  protected async sendRequest(payload: unknown): Promise<void> {
    try {
      const client = new HttpClient('Broadsage-EOL-Action/1.0');
      const response = await client.postJson(this.webhookUrl, payload, {
        'Content-Type': 'application/json',
      });

      if (
        !response.statusCode ||
        response.statusCode < 200 ||
        response.statusCode >= 300
      ) {
        throw new Error(
          `HTTP ${response.statusCode || 'unknown'}: Request failed`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Webhook request failed: ${errorMessage}`);
    }
  }

  /**
   * Determine notification severity based on results
   */
  protected determineSeverity(results: ActionResults): NotificationSeverity {
    if (results.eolDetected) {
      return NotificationSeverity.ERROR;
    }
    if (results.approachingEol) {
      return NotificationSeverity.WARNING;
    }
    return NotificationSeverity.INFO;
  }

  /**
   * Build notification title
   */
  protected buildTitle(results: ActionResults): string {
    if (results.eolDetected) {
      return '🚨 End-of-Life Detected';
    }
    if (results.approachingEol) {
      return '⚠️ Versions Approaching End-of-Life';
    }
    return '✅ All Versions Supported';
  }

  /**
   * Build notification summary
   */
  protected buildSummary(results: ActionResults): string {
    const parts: string[] = [];

    if (results.eolDetected) {
      parts.push(
        `${results.eolProducts.length} version(s) have reached end-of-life`
      );
    }

    if (results.approachingEol) {
      parts.push(
        `${results.approachingEolProducts.length} version(s) approaching end-of-life`
      );
    }

    if (parts.length === 0) {
      parts.push('All tracked versions are currently supported');
    }

    return parts.join('. ');
  }

  /**
   * Build notification fields
   */
  protected buildFields(results: ActionResults): Array<{
    name: string;
    value: string;
    inline?: boolean;
  }> {
    const fields = [
      {
        name: 'Products Checked',
        value: results.totalProductsChecked.toString(),
        inline: true,
      },
      {
        name: 'Releases Checked',
        value: results.totalReleasesChecked.toString(),
        inline: true,
      },
    ];

    if (results.eolDetected) {
      fields.push({
        name: 'EOL Versions',
        value: results.eolProducts.length.toString(),
        inline: true,
      });
    }

    if (results.approachingEol) {
      fields.push({
        name: 'Approaching EOL',
        value: results.approachingEolProducts.length.toString(),
        inline: true,
      });
    }

    // Add top EOL products
    if (results.eolProducts.length > 0) {
      const topEol = results.eolProducts
        .slice(0, 3)
        .map((p) => `• ${p.product} ${p.release}`)
        .join('\n');
      fields.push({
        name: 'EOL Products',
        value: topEol,
        inline: false,
      });
    }

    return fields;
  }

  /**
   * Get color code for severity
   */
  protected getColorForSeverity(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.CRITICAL:
        return '#8B0000'; // Dark red
      case NotificationSeverity.ERROR:
        return '#FF0000'; // Red
      case NotificationSeverity.WARNING:
        return '#FFA500'; // Orange
      case NotificationSeverity.INFO:
        return '#00FF00'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Truncate text to maximum length
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert color to platform-specific format
   * @param hex - Hex color code (e.g., '#FF0000')
   * @param format - Target format ('hex', 'teams', 'discord', 'decimal')
   * @returns Converted color value
   * @example
   * convertColorFormat('#FF0000', 'teams') // Returns 'FF0000'
   * convertColorFormat('#FF0000', 'discord') // Returns 16711680
   */
  protected convertColorFormat(
    hex: string,
    format: 'hex' | 'teams' | 'discord' | 'decimal'
  ): string | number {
    const cleanHex = hex.replace('#', '');

    switch (format) {
      case 'teams':
        return cleanHex;
      case 'discord':
      case 'decimal':
        return parseInt(cleanHex, 16);
      case 'hex':
      default:
        return hex;
    }
  }
}
