// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { BaseNotificationChannel } from '../base-channel';
import { NotificationChannelType, NotificationMessage, NotificationField } from '../types';

/**
 * Slack message block
 */
interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    fields?: Array<{
        type: string;
        text: string;
    }>;
    accessory?: {
        type: string;
        text: {
            type: string;
            text: string;
        };
        url: string;
    };
}

/**
 * Slack message payload
 */
interface SlackPayload {
    text?: string;
    blocks?: SlackBlock[];
    attachments?: Array<{
        color: string;
        blocks: SlackBlock[];
    }>;
}

/**
 * Slack notification channel
 */
export class SlackChannel extends BaseNotificationChannel {
    readonly name = 'Slack';
    readonly type = NotificationChannelType.SLACK;

    /**
     * Build Slack-specific payload
     */
    protected buildPayload(message: NotificationMessage): SlackPayload {
        const blocks: SlackBlock[] = [];

        // Header block
        blocks.push({
            type: 'header',
            text: {
                type: 'plain_text',
                text: message.title,
                emoji: true,
            },
        });

        // Context block with repository and timestamp
        if (message.repository) {
            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `📦 *Repository:* ${message.repository}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `🕐 ${message.timestamp.toLocaleString()}`,
                    },
                ],
            } as any);
        }

        // Summary section
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: message.summary,
            },
        });

        // Fields section (2 columns)
        if (message.fields.length > 0) {
            const inlineFields = message.fields
                .filter((f: NotificationField) => f.inline !== false)
                .slice(0, 10); // Slack limit

            if (inlineFields.length > 0) {
                blocks.push({
                    type: 'section',
                    fields: inlineFields.map((field: NotificationField) => ({
                        type: 'mrkdwn',
                        text: `*${field.name}*\n${field.value}`,
                    })),
                });
            }

            // Non-inline fields
            const nonInlineFields = message.fields.filter((f: NotificationField) => f.inline === false);
            nonInlineFields.forEach((field: NotificationField) => {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${field.name}*\n${field.value}`,
                    },
                });
            });
        }

        // Divider
        blocks.push({
            type: 'divider',
        });

        // Action button to view workflow run
        if (message.runUrl) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'View the full report in GitHub Actions:',
                },
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'View Workflow Run',
                    },
                    url: message.runUrl,
                },
            });
        }

        return {
            text: message.title, // Fallback text for notifications
            blocks,
        };
    }
}
