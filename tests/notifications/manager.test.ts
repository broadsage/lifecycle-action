// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { NotificationManager } from '../../src/notifications/manager';
import {
    INotificationChannel as NotificationChannel,
    NotificationChannelType,
    NotificationMessage,
    NotificationSeverity,
    NotificationConfig,
} from '../../src/notifications/types';
import { ActionResults, EolStatus } from '../../src/types';

// Mock NotificationChannel for testing
class MockChannel implements NotificationChannel {
    public isValid = true;
    public sendCount = 0;
    public lastMessage: NotificationMessage | null = null;
    public shouldFail = false;

    constructor(
        public name: string,
        public type: NotificationChannelType
    ) { }

    validate(): boolean {
        return this.isValid;
    }

    async send(message: NotificationMessage): Promise<void> {
        this.sendCount++;
        this.lastMessage = message;
        if (this.shouldFail) {
            throw new Error('Mock send failed');
        }
    }

    formatMessage(results: ActionResults): NotificationMessage {
        return {
            title: results.eolDetected ? 'EOL Detected' : 'All Clear',
            summary: results.summary,
            severity: results.eolDetected
                ? NotificationSeverity.ERROR
                : NotificationSeverity.INFO,
            fields: [],
            timestamp: new Date(),
        };
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
            staleDetected: false,
            discontinuedDetected: false,
            eolProducts: [
                {
                    product: 'python',
                    release: '2.7',
                    status: EolStatus.END_OF_LIFE,
                    eolDate: '2020-01-01',
                    daysUntilEol: -1000,
                    releaseDate: '2010-07-03',
                    latestVersion: '2.7.18',
                    isLts: false,
                    supportDate: null,
                    link: null,
                    discontinuedDate: null,
                    isDiscontinued: false,
                    extendedSupportDate: null,
                    hasExtendedSupport: false,
                    latestReleaseDate: null,
                    daysSinceLatestRelease: null,
                    rawData: {
                        name: '2.7',
                        eolFrom: '2020-01-01',
                        releaseDate: '2010-07-03',
                        latest: { name: '2.7.18' },
                        isLts: false,
                    },
                },
            ],
            approachingEolProducts: [],
            staleProducts: [],
            discontinuedProducts: [],
            extendedSupportProducts: [],
            products: [],
            totalProductsChecked: 1,
            totalReleasesChecked: 1,
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
    });

    describe('sendAll', () => {
        it('should send to all channels successfully', async () => {
            const manager = new NotificationManager(config);
            const slack = new MockChannel('Slack', NotificationChannelType.SLACK);
            const discord = new MockChannel('Discord', NotificationChannelType.DISCORD);

            manager.addChannel(slack);
            manager.addChannel(discord);

            await manager.sendAll(mockResults);

            expect(slack.sendCount).toBe(1);
            expect(discord.sendCount).toBe(1);
        });

        it('should respect enabled: false', async () => {
            config.enabled = false;
            const manager = new NotificationManager(config);
            const channel = new MockChannel('Test', NotificationChannelType.SLACK);

            manager.addChannel(channel);
            await manager.sendAll(mockResults);

            expect(channel.sendCount).toBe(0);
        });
    });
});
