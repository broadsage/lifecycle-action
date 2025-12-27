// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { BaseNotificationChannel } from '../base-channel';
import { NotificationChannelType, NotificationMessage } from '../types';

/**
 * Discord embed field
 */
interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

/**
 * Discord embed
 */
interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields: DiscordEmbedField[];
    timestamp: string;
    footer?: {
        text: string;
    };
    author?: {
        name: string;
        url?: string;
    };
}

/**
 * Discord webhook payload
 */
interface DiscordPayload {
    content?: string;
    embeds: DiscordEmbed[];
}

/**
 * Discord notification channel
 */
export class DiscordChannel extends BaseNotificationChannel {
    readonly name = 'Discord';
    readonly type = NotificationChannelType.DISCORD;

    /**
     * Build Discord-specific payload
     */
    protected buildPayload(message: NotificationMessage): DiscordPayload {
        const embed: DiscordEmbed = {
            title: message.title,
            description: this.truncate(message.summary, 4096),
            color: this.hexToDecimal(message.color || '#808080'),
            fields: message.fields
                .slice(0, 25) // Discord limit
                .map((field) => ({
                    name: this.truncate(field.name, 256),
                    value: this.truncate(field.value, 1024),
                    inline: field.inline !== false,
                })),
            timestamp: message.timestamp.toISOString(),
        };

        // Add repository as author
        if (message.repository) {
            embed.author = {
                name: message.repository,
                url: `https://github.com/${message.repository}`,
            };
        }

        // Add footer with run URL
        if (message.runUrl) {
            embed.footer = {
                text: 'Click to view workflow run',
            };
        }

        return {
            content: message.runUrl
                ? `🔗 [View Workflow Run](${message.runUrl})`
                : undefined,
            embeds: [embed],
        };
    }

    /**
     * Convert hex color to decimal for Discord
     */
    private hexToDecimal(hex: string): number {
        return parseInt(hex.replace('#', ''), 16);
    }
}
