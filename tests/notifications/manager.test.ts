// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { NotificationManager } from '../../src/notifications/manager';
import {
    INotificationChannel,
    NotificationChannelType,
    NotificationConfig,
    NotificationMessage,
    NotificationSeverity,
} from '../../src/notifications/types';
import { ActionResults, EolStatus } from '../../src/types';

// Mock channel implementation
class MockChannel implements INotificationChannel {
    readonly name: string;
    readonly type: NotificationChannelType;
    public sendCalled = false;
    public shouldFail = false;
    public isValid = true;

    constructor(name: string, type: NotificationChannelType) {
        this.name = name;
        this.type = type;
    }

    async send(_message: NotificationMessage): Promise<void> {
        this.sendCalled = true;
        if (this.shouldFail) {
            throw new Error(`${this.name} send failed`);
        }
    }

    formatMessage(_results: ActionResults): NotificationMessage {
        return {
            title: 'Test Title',
            summary: 'Test Summary',
            severity: NotificationSeverity.INFO,
            fields: [],
            timestamp: new Date(),
        };
    }

    validate(): boolean {
        return this.isValid;
    }
}

describe('NotificationManager', () => {
    let config: NotificationConfig;
    let mockResults: ActionResults;

    beforeEach(() => {
        config = {
            enabled: true,
            channels: [],
            filters: {
                onlyOnEol: false,
                includeApproachingEol: true,
                thresholdDays: 90,
                minSeverity: NotificationSeverity.INFO,
            },
            retryAttempts: 3,
            retryDelayMs: 1000,
        };

        mockResults = {
            eolDetected: true,
            approachingEol: false,
            eolProducts: [
                {
                    product: 'python',
                    cycle: '2.7',
                    status: EolStatus.END_OF_LIFE,
                    eolDate: '2020-01-01',
                    daysUntilEol: -1000,
                    releaseDate: '2010-07-03',
                    latestVersion: '2.7.18',
                    isLts: false,
                    supportDate: null,
                    link: null,
                    rawData: {
                        cycle: '2.7',
                        eol: '2020-01-01',
                        releaseDate: '2010-07-03',
                        latest: '2.7.18',
                        lts: false,
                    },
                },
            ],
            approachingEolProducts: [],
            products: [],
            totalProductsChecked: 1,
            totalCyclesChecked: 1,
            latestVersions: {},
            summary: 'Test summary',
        };
    });

    describe('addChannel', () => {
        it('should add valid channel', () => {
            const manager = new NotificationManager(config);
            const channel = new MockChannel('Test', NotificationChannelType.SLACK);

            manager.addChannel(channel);

            expect(manager.getChannelCount()).toBe(1);
            expect(manager.getChannelNames()).toContain('Test');
        });

        it('should skip invalid channel', () => {
            const manager = new NotificationManager(config);
            const channel = new MockChannel('Invalid', NotificationChannelType.SLACK);
            channel.isValid = false;

            manager.addChannel(channel);

            expect(manager.getChannelCount()).toBe(0);
        });

        it('should add multiple channels', () => {
            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            const discord = new MockChannel('Discord', NotificationChannelType.DISCORD);

            manager.addChannel(slack);
            manager.addChannel(discord);

            expect(manager.getChannelCount()).toBe(2);
            expect(manager.getChannelNames()).toEqual(['Slack', 'Discord']);
        });
    });

    describe('sendAll', () => {
        it('should send to all channels successfully', async () => {
            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            const discord = new MockChannel('Discord', NotificationChannelType.DISCORD);

            manager.addChannel(slack);
            manager.addChannel(discord);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(2);
            expect(results.every((r) => r.success)).toBe(true);
            expect(slack.sendCalled).toBe(true);
            expect(discord.sendCalled).toBe(true);
        });

        it('should handle channel failures gracefully', async () => {
            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            const discord = new MockChannel('Discord', NotificationChannelType.DISCORD);
            discord.shouldFail = true;

            manager.addChannel(slack);
            manager.addChannel(discord);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error?.message).toContain('Discord send failed');
        });

        it('should return empty array when notifications disabled', async () => {
            config.enabled = false;
            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            manager.addChannel(slack);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(0);
            expect(slack.sendCalled).toBe(false);
        });

        it('should return empty array when no channels configured', async () => {
            const manager = new NotificationManager(config);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(0);
        });

        it('should skip notifications when onlyOnEol is true and no EOL detected', async () => {
            config.filters.onlyOnEol = true;
            mockResults.eolDetected = false;

            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            manager.addChannel(slack);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(0);
            expect(slack.sendCalled).toBe(false);
        });

        it('should send when onlyOnEol is true and EOL detected', async () => {
            config.filters.onlyOnEol = true;
            mockResults.eolDetected = true;

            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            manager.addChannel(slack);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(1);
            expect(slack.sendCalled).toBe(true);
        });

        it('should skip when not including approaching EOL and only approaching detected', async () => {
            config.filters.includeApproachingEol = false;
            mockResults.eolDetected = false;
            mockResults.approachingEol = true;

            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            manager.addChannel(slack);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(0);
            expect(slack.sendCalled).toBe(false);
        });

        it('should send when both EOL and approaching EOL detected', async () => {
            config.filters.includeApproachingEol = false;
            mockResults.eolDetected = true;
            mockResults.approachingEol = true;

            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            manager.addChannel(slack);

            const results = await manager.sendAll(mockResults);

            expect(results).toHaveLength(1);
            expect(slack.sendCalled).toBe(true);
        });
    });

    describe('getChannelCount', () => {
        it('should return correct channel count', () => {
            const manager = new NotificationManager(config);

            expect(manager.getChannelCount()).toBe(0);

            manager.addChannel(new MockChannel('Slack', NotificationChannelType.SLACK));
            expect(manager.getChannelCount()).toBe(1);

            manager.addChannel(new MockChannel('Discord', NotificationChannelType.DISCORD));
            expect(manager.getChannelCount()).toBe(2);
        });
    });

    describe('getChannelNames', () => {
        it('should return list of channel names', () => {
            const manager = new NotificationManager(config);
            manager.addChannel(new MockChannel('Slack', NotificationChannelType.SLACK));
            manager.addChannel(new MockChannel('Discord', NotificationChannelType.DISCORD));
            manager.addChannel(new MockChannel('Teams', NotificationChannelType.TEAMS));

            const names = manager.getChannelNames();

            expect(names).toEqual(['Slack', 'Discord', 'Teams']);
        });

        it('should return empty array when no channels', () => {
            const manager = new NotificationManager(config);

            expect(manager.getChannelNames()).toEqual([]);
        });
    });
});
