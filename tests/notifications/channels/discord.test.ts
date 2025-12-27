// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { DiscordChannel } from '../../src/notifications/channels/discord';
import { NotificationChannelType, NotificationMessage, NotificationSeverity } from '../../src/notifications/types';

describe('DiscordChannel', () => {
    let channel: DiscordChannel;

    beforeEach(() => {
        channel = new DiscordChannel('https://discord.com/api/webhooks/123/abc');
    });

    describe('properties', () => {
        it('should have correct name and type', () => {
            expect(channel.name).toBe('Discord');
            expect(channel.type).toBe(NotificationChannelType.DISCORD);
        });
    });

    describe('buildPayload', () => {
        it('should build basic embed', () => {
            const message: NotificationMessage = {
                title: 'Test Title',
                summary: 'Test Summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date('2025-01-01T00:00:00Z'),
                color: '#00FF00',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds).toHaveLength(1);
            expect(payload.embeds[0].title).toBe('Test Title');
            expect(payload.embeds[0].description).toBe('Test Summary');
            expect(payload.embeds[0].timestamp).toBe('2025-01-01T00:00:00.000Z');
        });

        it('should convert hex color to decimal', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.ERROR,
                fields: [],
                timestamp: new Date(),
                color: '#FF0000',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].color).toBe(16711680); // #FF0000 in decimal
        });

        it('should include repository as author', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                repository: 'test/repo',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].author).toBeDefined();
            expect(payload.embeds[0].author?.name).toBe('test/repo');
            expect(payload.embeds[0].author?.url).toBe('https://github.com/test/repo');
        });

        it('should include fields', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [
                    { name: 'Field 1', value: 'Value 1', inline: true },
                    { name: 'Field 2', value: 'Value 2', inline: false },
                ],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].fields).toHaveLength(2);
            expect(payload.embeds[0].fields[0].name).toBe('Field 1');
            expect(payload.embeds[0].fields[0].value).toBe('Value 1');
            expect(payload.embeds[0].fields[0].inline).toBe(true);
            expect(payload.embeds[0].fields[1].inline).toBe(false);
        });

        it('should limit fields to 25', () => {
            const fields = Array.from({ length: 30 }, (_, i) => ({
                name: `Field ${i}`,
                value: `Value ${i}`,
                inline: true,
            }));

            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields,
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].fields).toHaveLength(25);
        });

        it('should truncate field names to 256 characters', () => {
            const longName = 'a'.repeat(300);
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [{ name: longName, value: 'Value', inline: true }],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].fields[0].name.length).toBe(256);
            expect(payload.embeds[0].fields[0].name).toContain('...');
        });

        it('should truncate field values to 1024 characters', () => {
            const longValue = 'a'.repeat(1100);
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [{ name: 'Field', value: longValue, inline: true }],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].fields[0].value.length).toBe(1024);
            expect(payload.embeds[0].fields[0].value).toContain('...');
        });

        it('should truncate description to 4096 characters', () => {
            const longSummary = 'a'.repeat(5000);
            const message: NotificationMessage = {
                title: 'Test',
                summary: longSummary,
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].description.length).toBe(4096);
            expect(payload.embeds[0].description).toContain('...');
        });

        it('should include footer with run URL', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                runUrl: 'https://github.com/test/repo/actions/runs/123',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.embeds[0].footer).toBeDefined();
            expect(payload.embeds[0].footer?.text).toBe('Click to view workflow run');
        });

        it('should include content with run URL link', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                runUrl: 'https://github.com/test/repo/actions/runs/123',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.content).toContain('View Workflow Run');
            expect(payload.content).toContain('https://github.com/test/repo/actions/runs/123');
        });

        it('should not include content when no run URL', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.content).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('should validate correct Discord webhook URL', () => {
            const validChannel = new DiscordChannel('https://discord.com/api/webhooks/123/abc');
            expect(validChannel.validate()).toBe(true);
        });

        it('should reject invalid URL', () => {
            const invalidChannel = new DiscordChannel('not-a-url');
            expect(invalidChannel.validate()).toBe(false);
        });
    });
});
