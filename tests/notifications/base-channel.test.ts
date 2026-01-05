// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { BaseNotificationChannel } from '../../src/notifications/base-channel';
import {
    NotificationChannelType,
    NotificationMessage,
    NotificationSeverity,
} from '../../src/notifications/types';
import { ActionResults, EolStatus } from '../../src/types';

// Mock @actions/core to avoid triggering annotations during tests
jest.mock('@actions/core');

// Mock implementation for testing
class MockNotificationChannel extends BaseNotificationChannel {
    readonly name = 'Mock Channel';
    readonly type = NotificationChannelType.WEBHOOK;

    public lastPayload: unknown = null;
    public shouldFail = false;
    public failCount = 0;

    protected buildPayload(message: NotificationMessage): unknown {
        this.lastPayload = {
            title: message.title,
            summary: message.summary,
        };
        return this.lastPayload;
    }

    protected async sendRequest(_payload: unknown): Promise<void> {
        if (this.shouldFail) {
            this.failCount++;
            throw new Error('Mock send failed');
        }
    }
}

describe('BaseNotificationChannel', () => {
    let channel: MockNotificationChannel;
    let mockResults: ActionResults;

    beforeEach(() => {
        channel = new MockNotificationChannel('https://example.com/webhook');
        mockResults = {
            eolDetected: true,
            approachingEol: false,
            staleDetected: false,
            discontinuedDetected: false,
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
                    discontinuedDate: null,
                    isDiscontinued: false,
                    extendedSupportDate: null,
                    hasExtendedSupport: false,
                    latestReleaseDate: null,
                    daysSinceLatestRelease: null,
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
            staleProducts: [],
            discontinuedProducts: [],
            extendedSupportProducts: [],
            products: [],
            totalProductsChecked: 1,
            totalCyclesChecked: 1,
            latestVersions: {},
            summary: 'Test summary',
        };
    });

    describe('formatMessage', () => {
        it('should format message with EOL detected', () => {
            const message = channel.formatMessage(mockResults);

            expect(message.title).toBe('🚨 End-of-Life Detected');
            expect(message.severity).toBe(NotificationSeverity.ERROR);
            expect(message.summary).toContain('1 version(s) have reached end-of-life');
            expect(message.fields).toHaveLength(4); // Products, Cycles, EOL Versions, EOL Products
        });

        it('should format message with approaching EOL', () => {
            mockResults.eolDetected = false;
            mockResults.approachingEol = true;
            mockResults.eolProducts = [];
            mockResults.approachingEolProducts = [mockResults.eolProducts[0]];

            const message = channel.formatMessage(mockResults);

            expect(message.title).toBe('⚠️ Versions Approaching End-of-Life');
            expect(message.severity).toBe(NotificationSeverity.WARNING);
            expect(message.summary).toContain('1 version(s) approaching end-of-life');
        });

        it('should format message with all versions supported', () => {
            mockResults.eolDetected = false;
            mockResults.approachingEol = false;
            mockResults.eolProducts = [];

            const message = channel.formatMessage(mockResults);

            expect(message.title).toBe('✅ All Versions Supported');
            expect(message.severity).toBe(NotificationSeverity.INFO);
            expect(message.summary).toContain('All tracked versions are currently supported');
        });

        it('should include repository and run URL', () => {
            process.env.GITHUB_REPOSITORY = 'test/repo';
            process.env.GITHUB_RUN_ID = '12345';

            const message = channel.formatMessage(mockResults);

            expect(message.repository).toBe('test/repo');
            expect(message.runUrl).toBe('https://github.com/test/repo/actions/runs/12345');

            delete process.env.GITHUB_REPOSITORY;
            delete process.env.GITHUB_RUN_ID;
        });

        it('should include EOL products in fields', () => {
            const message = channel.formatMessage(mockResults);

            const eolField = message.fields.find((f) => f.name === 'EOL Products');
            expect(eolField).toBeDefined();
            expect(eolField?.value).toContain('python 2.7');
        });

        it('should limit EOL products to top 3', () => {
            mockResults.eolProducts = [
                { ...mockResults.eolProducts[0], cycle: '1' },
                { ...mockResults.eolProducts[0], cycle: '2' },
                { ...mockResults.eolProducts[0], cycle: '3' },
                { ...mockResults.eolProducts[0], cycle: '4' },
            ];

            const message = channel.formatMessage(mockResults);
            const eolField = message.fields.find((f) => f.name === 'EOL Products');

            expect(eolField?.value.split('\n')).toHaveLength(3);
        });
    });

    describe('validate', () => {
        it('should validate correct webhook URL', () => {
            const validChannel = new MockNotificationChannel('https://example.com/webhook');
            expect(validChannel.validate()).toBe(true);
        });

        it('should reject invalid webhook URL', () => {
            const invalidChannel = new MockNotificationChannel('not-a-url');
            expect(invalidChannel.validate()).toBe(false);
        });

        it('should reject empty webhook URL', () => {
            const emptyChannel = new MockNotificationChannel('');
            expect(emptyChannel.validate()).toBe(false);
        });
    });

    describe('send', () => {
        it('should send notification successfully', async () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            await expect(channel.send(message)).resolves.not.toThrow();
            expect(channel.lastPayload).toEqual({
                title: 'Test',
                summary: 'Test summary',
            });
        });

        it('should retry on failure', async () => {
            channel.shouldFail = true;
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            await expect(channel.send(message)).rejects.toThrow('Failed to send notification after 3 attempts');
            expect(channel.failCount).toBe(3);
        });

        it('should succeed after retry', async () => {
            let attemptCount = 0;
            const originalSendRequest = channel['sendRequest'].bind(channel);
            channel['sendRequest'] = async (payload: unknown) => {
                attemptCount++;
                if (attemptCount < 2) {
                    throw new Error('Temporary failure');
                }
                return originalSendRequest(payload);
            };

            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            await expect(channel.send(message)).resolves.not.toThrow();
            expect(attemptCount).toBe(2);
        });
    });

    describe('getColorForSeverity', () => {
        it('should return correct colors for each severity', () => {
            expect(channel['getColorForSeverity'](NotificationSeverity.CRITICAL)).toBe('#8B0000');
            expect(channel['getColorForSeverity'](NotificationSeverity.ERROR)).toBe('#FF0000');
            expect(channel['getColorForSeverity'](NotificationSeverity.WARNING)).toBe('#FFA500');
            expect(channel['getColorForSeverity'](NotificationSeverity.INFO)).toBe('#00FF00');
        });

        it('should return default gray color for unknown severity', () => {
            // Test the default case by passing an invalid value
            expect(channel['getColorForSeverity']('unknown' as NotificationSeverity)).toBe('#808080');
        });
    });

    describe('buildFields', () => {
        it('should include approaching EOL field when approaching EOL is true', () => {
            mockResults.eolDetected = false;
            mockResults.approachingEol = true;
            mockResults.eolProducts = [];
            mockResults.approachingEolProducts = [
                {
                    product: 'nodejs',
                    cycle: '18',
                    status: EolStatus.APPROACHING_EOL,
                    eolDate: '2025-04-30',
                    daysUntilEol: 30,
                    releaseDate: '2022-04-19',
                    latestVersion: '18.19.0',
                    isLts: true,
                    supportDate: null,
                    link: null,
                    discontinuedDate: null,
                    isDiscontinued: false,
                    extendedSupportDate: null,
                    hasExtendedSupport: false,
                    latestReleaseDate: null,
                    daysSinceLatestRelease: null,
                    rawData: {
                        cycle: '18',
                        eol: '2025-04-30',
                        releaseDate: '2022-04-19',
                        latest: '18.19.0',
                        lts: true,
                    },
                },
            ];

            const message = channel.formatMessage(mockResults);

            const approachingField = message.fields.find((f) => f.name === 'Approaching EOL');
            expect(approachingField).toBeDefined();
            expect(approachingField?.value).toBe('1');
        });
    });

    describe('truncate', () => {
        it('should not truncate short text', () => {
            expect(channel['truncate']('short', 10)).toBe('short');
        });

        it('should truncate long text', () => {
            expect(channel['truncate']('this is a very long text', 10)).toBe('this is...');
        });

        it('should handle exact length', () => {
            expect(channel['truncate']('exactly10!', 10)).toBe('exactly10!');
        });
    });
});
