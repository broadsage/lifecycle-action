// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

/**
 * Notification System
 * 
 * This module provides a comprehensive notification system for sending
 * EOL alerts to multiple messaging platforms including Slack, Discord,
 * Microsoft Teams, Google Chat, and custom webhooks.
 * 
 * @example
 * ```typescript
 * import { NotificationManager, NotificationChannelFactory, getNotificationConfig } from './notifications';
 * 
 * const config = getNotificationConfig();
 * const manager = new NotificationManager(config);
 * 
 * const channels = NotificationChannelFactory.createFromInputs();
 * channels.forEach(channel => manager.addChannel(channel));
 * 
 * await manager.sendAll(results);
 * ```
 */

// Types
export * from './types';

// Base classes
export { BaseNotificationChannel } from './base-channel';

// Channels
export { SlackChannel } from './channels/slack';
export { DiscordChannel } from './channels/discord';
export { TeamsChannel } from './channels/teams';
export { GoogleChatChannel } from './channels/google-chat';
export { WebhookChannel } from './channels/webhook';

// Manager and Factory
export { NotificationManager } from './manager';
export { NotificationChannelFactory, getNotificationConfig } from './factory';
