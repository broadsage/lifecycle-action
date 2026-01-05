// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { NotificationChannelFactory, getNotificationConfig } from '../../src/notifications/factory';
import { NotificationChannelType, NotificationSeverity } from '../../src/notifications/types';
import { SlackChannel } from '../../src/notifications/channels/slack';
import { DiscordChannel } from '../../src/notifications/channels/discord';
import { TeamsChannel } from '../../src/notifications/channels/teams';
import { GoogleChatChannel } from '../../src/notifications/channels/google-chat';
import { WebhookChannel } from '../../src/notifications/channels/webhook';

jest.mock('@actions/core');

describe('NotificationChannelFactory', () => {
    describe('create', () => {
        it('should create Slack channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.SLACK,
                'https://hooks.slack.com/test'
            );

            expect(channel).toBeInstanceOf(SlackChannel);
            expect(channel.name).toBe('Slack');
            expect(channel.type).toBe(NotificationChannelType.SLACK);
        });

        it('should create Discord channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.DISCORD,
                'https://discord.com/api/webhooks/test'
            );

            expect(channel).toBeInstanceOf(DiscordChannel);
            expect(channel.name).toBe('Discord');
        });

        it('should create Teams channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.TEAMS,
                'https://outlook.office.com/webhook/test'
            );

            expect(channel).toBeInstanceOf(TeamsChannel);
            expect(channel.name).toBe('Microsoft Teams');
        });

        it('should create Google Chat channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.GOOGLE_CHAT,
                'https://chat.googleapis.com/v1/spaces/test'
            );

            expect(channel).toBeInstanceOf(GoogleChatChannel);
            expect(channel.name).toBe('Google Chat');
        });

        it('should create Webhook channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.WEBHOOK,
                'https://example.com/webhook'
            );

            expect(channel).toBeInstanceOf(WebhookChannel);
            expect(channel.name).toBe('Generic Webhook');
        });

        it('should pass retry options to channel', () => {
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.SLACK,
                'https://hooks.slack.com/test',
                {
                    retryAttempts: 5,
                    retryDelayMs: 2000,
                }
            );

            // Access private properties for testing
            expect((channel as any).retryAttempts).toBe(5);
            expect((channel as any).retryDelayMs).toBe(2000);
        });

        it('should pass custom headers to webhook channel', () => {
            const headers = { Authorization: 'Bearer token' };
            const channel = NotificationChannelFactory.create(
                NotificationChannelType.WEBHOOK,
                'https://example.com/webhook',
                { customHeaders: headers }
            ) as WebhookChannel;

            expect(channel['customHeaders']).toEqual(headers);
        });

        it('should throw error for unsupported channel type', () => {
            expect(() => {
                NotificationChannelFactory.create('invalid' as NotificationChannelType, 'https://test.com');
            }).toThrow('Unsupported notification channel type');
        });
    });

    describe('createFromInputs', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            (core.getInput as jest.Mock).mockReturnValue('');
        });

        it('should create Slack channel from input', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'slack-webhook-url') return 'https://hooks.slack.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(SlackChannel);
        });

        it('should create Discord channel from input', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'discord-webhook-url') return 'https://discord.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(DiscordChannel);
        });

        it('should create Teams channel from input', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'teams-webhook-url') return 'https://outlook.office.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(TeamsChannel);
        });

        it('should create Google Chat channel from input', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'google-chat-webhook-url') return 'https://chat.googleapis.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(GoogleChatChannel);
        });

        it('should create webhook channel from input', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'custom-webhook-url') return 'https://example.com/webhook';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(WebhookChannel);
        });

        it('should create webhook channel with custom headers', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'custom-webhook-url') return 'https://example.com/webhook';
                if (name === 'custom-webhook-headers') return '{"Authorization": "Bearer token"}';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect(channels[0]).toBeInstanceOf(WebhookChannel);
            expect((channels[0] as any).customHeaders).toEqual({
                Authorization: 'Bearer token',
            });
        });

        it('should handle invalid JSON in custom headers', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'custom-webhook-url') return 'https://example.com/webhook';
                if (name === 'custom-webhook-headers') return 'invalid-json';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(1);
            expect((channels[0] as any).customHeaders).toEqual({});
        });

        it('should create multiple channels from inputs', () => {
            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'slack-webhook-url') return 'https://hooks.slack.com/test';
                if (name === 'discord-webhook-url') return 'https://discord.com/test';
                if (name === 'teams-webhook-url') return 'https://outlook.office.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(3);
            expect(channels[0]).toBeInstanceOf(SlackChannel);
            expect(channels[1]).toBeInstanceOf(DiscordChannel);
            expect(channels[2]).toBeInstanceOf(TeamsChannel);
        });

        it('should pass retry options to created channels', () => {
            const options = {
                retryAttempts: 10,
                retryDelayMs: 3000,
            };

            (core.getInput as jest.Mock).mockImplementation((name: string) => {
                if (name === 'slack-webhook-url') return 'https://hooks.slack.com/test';
                return '';
            });

            const channels = NotificationChannelFactory.createFromInputs(options);

            expect(channels).toHaveLength(1);
            expect((channels[0] as any).retryAttempts).toBe(10);
            expect((channels[0] as any).retryDelayMs).toBe(3000);
        });

        it('should return empty array when no webhooks configured', () => {
            const channels = NotificationChannelFactory.createFromInputs();

            expect(channels).toHaveLength(0);
        });
    });
});

describe('getNotificationConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (core.getInput as jest.Mock).mockReturnValue('');
        (core.getBooleanInput as jest.Mock).mockReturnValue(false);
    });

    it('should return config with enabled=true when enable-notifications is true', () => {
        (core.getBooleanInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'enable-notifications') return true;
            return false;
        });

        const config = getNotificationConfig();

        expect(config.enabled).toBe(true);
    });

    it('should auto-enable when slack webhook provided', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'slack-webhook-url') return 'https://hooks.slack.com/test';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.enabled).toBe(true);
    });

    it('should auto-enable when any webhook provided', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'custom-webhook-url') return 'https://example.com/webhook';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.enabled).toBe(true);
    });

    it('should parse filter settings', () => {
        (core.getBooleanInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'notify-on-eol-only') return true;
            if (name === 'notify-on-approaching-eol') return false;
            return false;
        });

        const config = getNotificationConfig();

        expect(config.filters.onlyOnEol).toBe(true);
        expect(config.filters.includeApproachingEol).toBe(false);
    });

    it('should parse threshold days', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'notification-threshold-days') return '60';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.filters.thresholdDays).toBe(60);
    });

    it('should use default threshold days', () => {
        const config = getNotificationConfig();

        expect(config.filters.thresholdDays).toBe(90);
    });

    it('should parse min severity', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'notification-min-severity') return 'warning';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.filters.minSeverity).toBe('warning');
    });

    it('should use default min severity', () => {
        const config = getNotificationConfig();

        expect(config.filters.minSeverity).toBe(NotificationSeverity.INFO);
    });

    it('should parse retry attempts', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'notification-retry-attempts') return '5';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.retryAttempts).toBe(5);
    });

    it('should parse retry delay', () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            if (name === 'notification-retry-delay-ms') return '2000';
            return '';
        });

        const config = getNotificationConfig();

        expect(config.retryDelayMs).toBe(2000);
    });
});
