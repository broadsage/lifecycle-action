// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { HttpClient } from '@actions/http-client';
import { BaseNotificationChannel } from '../base-channel';
import { NotificationChannelType, NotificationMessage } from '../types';

/**
 * Generic webhook payload
 */
interface WebhookPayload {
    event: string;
    timestamp: string;
    repository: string;
    severity: string;
    title: string;
    summary: string;
    fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    runUrl?: string;
    metadata: {
        action: string;
        version: string;
    };
}

/**
 * Generic webhook notification channel
 * Sends a standardized JSON payload that can be consumed by any webhook endpoint
 */
export class WebhookChannel extends BaseNotificationChannel {
    readonly name = 'Generic Webhook';
    readonly type = NotificationChannelType.WEBHOOK;

    private customHeaders: Record<string, string>;

    constructor(
        webhookUrl: string,
        customHeaders: Record<string, string> = {},
        retryAttempts: number = 3,
        retryDelayMs: number = 1000
    ) {
        super(webhookUrl, retryAttempts, retryDelayMs);
        this.customHeaders = customHeaders;
    }

    /**
     * Build generic webhook payload
     */
    protected buildPayload(message: NotificationMessage): WebhookPayload {
        return {
            event: 'eol_check_completed',
            timestamp: message.timestamp.toISOString(),
            repository: message.repository || 'unknown',
            severity: message.severity,
            title: message.title,
            summary: message.summary,
            fields: message.fields,
            runUrl: message.runUrl,
            metadata: {
                action: 'broadsage-eol-action',
                version: '3.0.0',
            },
        };
    }

    /**
     * Override sendRequest to include custom headers
     */
    protected async sendRequest(payload: unknown): Promise<void> {
        try {
            const client = new HttpClient('Broadsage-EOL-Action/1.0');
            const response = await client.postJson(this.webhookUrl, payload, {
                'Content-Type': 'application/json',
                ...this.customHeaders,
            });

            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                throw new Error(`HTTP ${response.statusCode || 'unknown'}: Request failed`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Webhook request failed: ${errorMessage}`);
        }
    }
}
