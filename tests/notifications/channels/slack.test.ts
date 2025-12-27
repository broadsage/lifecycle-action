// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { SlackChannel } from '../../src/notifications/channels/slack';
import { NotificationChannelType, NotificationMessage, NotificationSeverity } from '../../src/notifications/types';

describe('SlackChannel', () => {
    let channel: SlackChannel;

    beforeEach(() => {
        channel = new SlackChannel('https://hooks.slack.com/services/TEST');
    });

    describe('properties', () => {
        it('should have correct name and type', () => {
            expect(channel.name).toBe('Slack');
            expect(channel.type).toBe(NotificationChannelType.SLACK);
        });
    });

    describe('buildPayload', () => {
        it('should build basic payload with title and summary', () => {
            const message: NotificationMessage = {
                title: 'Test Title',
                summary: 'Test Summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.text).toBe('Test Title');
            expect(payload.blocks).toBeDefined();
            expect(payload.blocks?.length).toBeGreaterThan(0);
        });

        it('should include header block', () => {
            const message: NotificationMessage = {
                title: '🚨 End-of-Life Detected',
                summary: 'Test',
                severity: NotificationSeverity.ERROR,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);
            const headerBlock = payload.blocks?.find((b) => b.type === 'header');

            expect(headerBlock).toBeDefined();
            expect(headerBlock?.text?.text).toBe('🚨 End-of-Life Detected');
        });

        it('should include context block with repository', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                repository: 'test/repo',
            };

            const payload = channel['buildPayload'](message);
            const contextBlock = payload.blocks?.find((b) => b.type === 'context');

            expect(contextBlock).toBeDefined();
        });

        it('should include summary section', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'This is a test summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);
            const sectionBlock = payload.blocks?.find(
                (b) => b.type === 'section' && b.text?.text === 'This is a test summary'
            );

            expect(sectionBlock).toBeDefined();
        });

        it('should include inline fields', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [
                    { name: 'Field 1', value: 'Value 1', inline: true },
                    { name: 'Field 2', value: 'Value 2', inline: true },
                ],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);
            const fieldsBlock = payload.blocks?.find((b) => b.type === 'section' && b.fields);

            expect(fieldsBlock).toBeDefined();
            expect(fieldsBlock?.fields).toHaveLength(2);
        });

        it('should include non-inline fields separately', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [
                    { name: 'Inline Field', value: 'Value', inline: true },
                    { name: 'Non-Inline Field', value: 'Long value', inline: false },
                ],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            // Should have separate blocks for inline and non-inline
            const sectionBlocks = payload.blocks?.filter((b) => b.type === 'section');
            expect(sectionBlocks!.length).toBeGreaterThan(2); // Summary + inline fields + non-inline field
        });

        it('should limit inline fields to 10', () => {
            const fields = Array.from({ length: 15 }, (_, i) => ({
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
            const fieldsBlock = payload.blocks?.find((b) => b.type === 'section' && b.fields);

            expect(fieldsBlock?.fields).toHaveLength(10);
        });

        it('should include divider', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);
            const divider = payload.blocks?.find((b) => b.type === 'divider');

            expect(divider).toBeDefined();
        });

        it('should include action button when runUrl provided', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                runUrl: 'https://github.com/test/repo/actions/runs/123',
            };

            const payload = channel['buildPayload'](message);
            const actionBlock = payload.blocks?.find((b) => b.type === 'section' && b.accessory);

            expect(actionBlock).toBeDefined();
            expect(actionBlock?.accessory?.type).toBe('button');
            expect(actionBlock?.accessory?.url).toBe('https://github.com/test/repo/actions/runs/123');
        });

        it('should not include action button when runUrl not provided', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);
            const actionBlock = payload.blocks?.find((b) => b.type === 'section' && b.accessory);

            expect(actionBlock).toBeUndefined();
        });
    });

    describe('validate', () => {
        it('should validate correct Slack webhook URL', () => {
            const validChannel = new SlackChannel('https://hooks.slack.com/services/T00/B00/XXX');
            expect(validChannel.validate()).toBe(true);
        });

        it('should reject invalid URL', () => {
            const invalidChannel = new SlackChannel('not-a-url');
            expect(invalidChannel.validate()).toBe(false);
        });

        it('should reject empty URL', () => {
            const emptyChannel = new SlackChannel('');
            expect(emptyChannel.validate()).toBe(false);
        });
    });
});
