// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { ActionResults } from '../types';

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

/**
 * Supported notification channels
 */
export enum NotificationChannelType {
    SLACK = 'slack',
    DISCORD = 'discord',
    TEAMS = 'teams',
    GOOGLE_CHAT = 'google_chat',
    WEBHOOK = 'webhook',
    EMAIL = 'email',
    PAGERDUTY = 'pagerduty',
}

/**
 * Notification message field
 */
export interface NotificationField {
    name: string;
    value: string;
    inline?: boolean;
}

/**
 * Generic notification message structure
 */
export interface NotificationMessage {
    title: string;
    summary: string;
    severity: NotificationSeverity;
    fields: NotificationField[];
    timestamp: Date;
    repository?: string;
    runUrl?: string;
    color?: string;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannelConfig {
    type: NotificationChannelType;
    enabled: boolean;
    webhookUrl?: string;
    apiKey?: string;
    options?: Record<string, unknown>;
}

/**
 * Notification filter configuration
 */
export interface NotificationFilters {
    onlyOnEol: boolean;
    includeApproachingEol: boolean;
    thresholdDays: number;
    minSeverity: NotificationSeverity;
}

/**
 * Complete notification configuration
 */
export interface NotificationConfig {
    enabled: boolean;
    channels: NotificationChannelConfig[];
    filters: NotificationFilters;
    template?: string;
    retryAttempts: number;
    retryDelayMs: number;
}

/**
 * Notification channel interface
 */
export interface INotificationChannel {
    readonly name: string;
    readonly type: NotificationChannelType;

    /**
     * Send notification to the channel
     */
    send(message: NotificationMessage): Promise<void>;

    /**
     * Format action results into a notification message
     */
    formatMessage(results: ActionResults): NotificationMessage;

    /**
     * Validate channel configuration
     */
    validate(): boolean;
}

/**
 * Notification send result
 */
export interface NotificationResult {
    channel: NotificationChannelType;
    success: boolean;
    error?: Error;
    timestamp: Date;
}

/**
 * Template variables for custom messages
 */
export interface TemplateVariables {
    repository: string;
    totalProducts: number;
    totalCycles: number;
    eolCount: number;
    approachingEolCount: number;
    activeCount: number;
    runUrl: string;
    timestamp: string;
    products: Array<{
        product: string;
        cycle: string;
        status: string;
        eolDate: string | null;
        daysUntilEol: number | null;
    }>;
}
