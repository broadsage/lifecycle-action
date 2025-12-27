// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import {
    INotificationChannel,
    NotificationConfig,
    NotificationResult,
} from './types';
import { ActionResults } from '../types';

/**
 * Notification Manager
 * Orchestrates sending notifications to multiple channels
 */
export class NotificationManager {
    private channels: INotificationChannel[] = [];
    private config: NotificationConfig;

    constructor(config: NotificationConfig) {
        this.config = config;
    }

    /**
     * Add a notification channel
     */
    addChannel(channel: INotificationChannel): void {
        if (channel.validate()) {
            this.channels.push(channel);
            core.info(`[NotificationManager] Added channel: ${channel.name}`);
        } else {
            core.warning(
                `[NotificationManager] Skipped invalid channel: ${channel.name}`
            );
        }
    }

    /**
     * Send notifications to all configured channels
     */
    async sendAll(results: ActionResults): Promise<NotificationResult[]> {
        if (!this.config.enabled) {
            core.info('[NotificationManager] Notifications are disabled');
            return [];
        }

        if (this.channels.length === 0) {
            core.info('[NotificationManager] No notification channels configured');
            return [];
        }

        // Check if we should send notifications based on filters
        if (!this.shouldNotify(results)) {
            core.info(
                '[NotificationManager] Skipping notifications based on filter criteria'
            );
            return [];
        }

        core.info(
            `[NotificationManager] Sending notifications to ${this.channels.length} channel(s)`
        );

        const notificationResults: NotificationResult[] = [];

        // Send to all channels in parallel
        const promises = this.channels.map(async (channel) => {
            const result: NotificationResult = {
                channel: channel.type,
                success: false,
                timestamp: new Date(),
            };

            try {
                const message = channel.formatMessage(results);
                await channel.send(message);
                result.success = true;
                core.info(`[NotificationManager] ✓ ${channel.name} notification sent`);
            } catch (error) {
                result.error = error instanceof Error ? error : new Error(String(error));
                core.error(
                    `[NotificationManager] ✗ ${channel.name} notification failed: ${result.error.message}`
                );
            }

            return result;
        });

        const results_array = await Promise.allSettled(promises);

        results_array.forEach((result) => {
            if (result.status === 'fulfilled') {
                notificationResults.push(result.value);
            } else {
                core.error(
                    `[NotificationManager] Unexpected error: ${result.reason}`
                );
            }
        });

        // Summary
        const successful = notificationResults.filter((r) => r.success).length;
        const failed = notificationResults.filter((r) => !r.success).length;

        core.info(
            `[NotificationManager] Notification summary: ${successful} successful, ${failed} failed`
        );

        return notificationResults;
    }

    /**
     * Determine if notifications should be sent based on filters
     */
    private shouldNotify(results: ActionResults): boolean {
        const { filters } = this.config;

        // If only notify on EOL and no EOL detected, skip
        if (filters.onlyOnEol && !results.eolDetected) {
            core.debug('[NotificationManager] No EOL detected, skipping notification');
            return false;
        }

        // If not including approaching EOL and only approaching EOL detected, skip
        if (
            !filters.includeApproachingEol &&
            results.approachingEol &&
            !results.eolDetected
        ) {
            core.debug(
                '[NotificationManager] Only approaching EOL detected, skipping notification'
            );
            return false;
        }

        return true;
    }

    /**
     * Get configured channels count
     */
    getChannelCount(): number {
        return this.channels.length;
    }

    /**
     * Get list of configured channel names
     */
    getChannelNames(): string[] {
        return this.channels.map((c) => c.name);
    }
}
