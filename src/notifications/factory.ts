// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { SlackChannel } from './channels/slack';
import { DiscordChannel } from './channels/discord';
import { TeamsChannel } from './channels/teams';
import { GoogleChatChannel } from './channels/google-chat';
import { WebhookChannel } from './channels/webhook';
import {
    INotificationChannel,
    NotificationChannelType,
    NotificationConfig,
    NotificationFilters,
    NotificationSeverity,
} from './types';

/**
 * Factory for creating notification channels
 */
export class NotificationChannelFactory {
    /**
     * Create a notification channel based on type and configuration
     */
    static create(
        type: NotificationChannelType,
        webhookUrl: string,
        options: {
            retryAttempts?: number;
            retryDelayMs?: number;
            customHeaders?: Record<string, string>;
        } = {}
    ): INotificationChannel {
        const { retryAttempts = 3, retryDelayMs = 1000, customHeaders = {} } = options;

        switch (type) {
            case NotificationChannelType.SLACK:
                return new SlackChannel(webhookUrl, retryAttempts, retryDelayMs);

            case NotificationChannelType.DISCORD:
                return new DiscordChannel(webhookUrl, retryAttempts, retryDelayMs);

            case NotificationChannelType.TEAMS:
                return new TeamsChannel(webhookUrl, retryAttempts, retryDelayMs);

            case NotificationChannelType.GOOGLE_CHAT:
                return new GoogleChatChannel(webhookUrl, retryAttempts, retryDelayMs);

            case NotificationChannelType.WEBHOOK:
                return new WebhookChannel(
                    webhookUrl,
                    customHeaders,
                    retryAttempts,
                    retryDelayMs
                );

            default:
                throw new Error(`Unsupported notification channel type: ${type}`);
        }
    }

    /**
     * Create channels from action inputs
     */
    static createFromInputs(): INotificationChannel[] {
        const channels: INotificationChannel[] = [];

        // Slack
        const slackWebhook = core.getInput('slack-webhook-url');
        if (slackWebhook) {
            channels.push(this.create(NotificationChannelType.SLACK, slackWebhook));
        }

        // Discord
        const discordWebhook = core.getInput('discord-webhook-url');
        if (discordWebhook) {
            channels.push(this.create(NotificationChannelType.DISCORD, discordWebhook));
        }

        // Microsoft Teams
        const teamsWebhook = core.getInput('teams-webhook-url');
        if (teamsWebhook) {
            channels.push(this.create(NotificationChannelType.TEAMS, teamsWebhook));
        }

        // Google Chat
        const googleChatWebhook = core.getInput('google-chat-webhook-url');
        if (googleChatWebhook) {
            channels.push(
                this.create(NotificationChannelType.GOOGLE_CHAT, googleChatWebhook)
            );
        }

        // Generic Webhook
        const customWebhook = core.getInput('custom-webhook-url');
        if (customWebhook) {
            const customHeadersInput = core.getInput('custom-webhook-headers');
            let customHeaders = {};

            if (customHeadersInput) {
                try {
                    customHeaders = JSON.parse(customHeadersInput);
                } catch (error) {
                    core.warning(
                        `Failed to parse custom-webhook-headers: ${error}. Using empty headers.`
                    );
                }
            }

            channels.push(
                this.create(NotificationChannelType.WEBHOOK, customWebhook, {
                    customHeaders,
                })
            );
        }

        return channels;
    }
}

/**
 * Get notification configuration from action inputs
 */
export function getNotificationConfig(): NotificationConfig {
    const enabled =
        core.getBooleanInput('enable-notifications') ||
        // Auto-enable if any webhook URL is provided
        !!(
            core.getInput('slack-webhook-url') ||
            core.getInput('discord-webhook-url') ||
            core.getInput('teams-webhook-url') ||
            core.getInput('google-chat-webhook-url') ||
            core.getInput('custom-webhook-url')
        );

    const filters: NotificationFilters = {
        onlyOnEol: core.getBooleanInput('notify-on-eol-only'),
        includeApproachingEol: core.getBooleanInput('notify-on-approaching-eol'),
        thresholdDays: parseInt(
            core.getInput('notification-threshold-days') || '90',
            10
        ),
        minSeverity: (core.getInput('notification-min-severity') ||
            'info') as NotificationSeverity,
    };

    const retryAttempts = parseInt(
        core.getInput('notification-retry-attempts') || '3',
        10
    );

    const retryDelayMs = parseInt(
        core.getInput('notification-retry-delay-ms') || '1000',
        10
    );

    return {
        enabled,
        channels: [],
        filters,
        retryAttempts,
        retryDelayMs,
    };
}
