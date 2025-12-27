// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { BaseNotificationChannel } from '../base-channel';
import { NotificationChannelType, NotificationMessage } from '../types';

/**
 * Teams Adaptive Card fact
 */
interface TeamsFact {
    title: string;
    value: string;
}

/**
 * Teams Adaptive Card action
 */
interface TeamsAction {
    type: string;
    title: string;
    url: string;
}

/**
 * Teams Message Card (legacy format for better compatibility)
 */
interface TeamsMessageCard {
    '@type': string;
    '@context': string;
    summary: string;
    themeColor: string;
    title: string;
    sections: Array<{
        activityTitle?: string;
        activitySubtitle?: string;
        activityImage?: string;
        facts?: TeamsFact[];
        text?: string;
    }>;
    potentialAction?: TeamsAction[];
}

/**
 * Microsoft Teams notification channel
 */
export class TeamsChannel extends BaseNotificationChannel {
    readonly name = 'Microsoft Teams';
    readonly type = NotificationChannelType.TEAMS;

    /**
     * Build Teams-specific payload
     */
    protected buildPayload(message: NotificationMessage): TeamsMessageCard {
        const facts: TeamsFact[] = message.fields.map((field) => ({
            title: field.name,
            value: field.value,
        }));

        const sections: TeamsMessageCard['sections'] = [
            {
                activityTitle: message.title,
                activitySubtitle: message.repository || 'EOL Check',
                text: message.summary,
            },
        ];

        // Add facts section if we have fields
        if (facts.length > 0) {
            sections.push({
                facts: facts.slice(0, 10), // Limit to prevent message being too large
            });
        }

        const card: TeamsMessageCard = {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: message.title,
            themeColor: this.getTeamsColor(message.color || '#808080'),
            title: message.title,
            sections,
        };

        // Add action button if run URL is available
        if (message.runUrl) {
            card.potentialAction = [
                {
                    type: 'OpenUri',
                    title: 'View Workflow Run',
                    url: message.runUrl,
                },
            ];
        }

        return card;
    }

    /**
     * Convert hex color to Teams-compatible format
     */
    private getTeamsColor(hex: string): string {
        // Teams expects hex without the # prefix
        return hex.replace('#', '');
    }
}
