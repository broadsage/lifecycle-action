// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { GoogleChatChannel } from '../../../src/notifications/channels/google-chat';
import { NotificationChannelType, NotificationMessage, NotificationSeverity } from '../../../src/notifications/types';

describe('GoogleChatChannel', () => {
    let channel: GoogleChatChannel;

    beforeEach(() => {
        channel = new GoogleChatChannel('https://chat.googleapis.com/v1/spaces/123/messages?key=abc');
    });

    describe('properties', () => {
        it('should have correct name and type', () => {
            expect(channel.name).toBe('Google Chat');
            expect(channel.type).toBe(NotificationChannelType.GOOGLE_CHAT);
        });
    });

    describe('buildPayload', () => {
        it('should build basic card', () => {
            const message: NotificationMessage = {
                title: 'Test Title',
                summary: 'Test Summary',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date('2025-01-01T00:00:00Z'),
                color: '#00FF00',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.text).toBe('Test Title');
            expect(payload.cards).toHaveLength(1);
            expect(payload.cards![0].header.title).toBe('Test Title');
        });

        it('should include repository in subtitle', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                repository: 'test/repo',
            };

            const payload = channel['buildPayload'](message);

            expect(payload.cards![0].header.subtitle).toBe('Repository: test/repo');
        });

        it('should not include subtitle when no repository', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            expect(payload.cards![0].header.subtitle).toBeUndefined();
        });

        it('should include summary as text paragraph', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test Summary Content',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            const widgets = payload.cards![0].sections[0].widgets;
            expect(widgets[0].textParagraph).toBeDefined();
            expect(widgets[0].textParagraph!.text).toBe('Test Summary Content');
        });

        it('should include fields as key-value widgets', () => {
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

            const widgets = payload.cards![0].sections[0].widgets;
            // First widget is summary, then fields
            expect(widgets[1].keyValue).toBeDefined();
            expect(widgets[1].keyValue!.topLabel).toBe('Field 1');
            expect(widgets[1].keyValue!.content).toBe('Value 1');
            expect(widgets[1].keyValue!.contentMultiline).toBe(false);

            expect(widgets[2].keyValue!.contentMultiline).toBe(true);
        });

        it('should include button with run URL', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
                runUrl: 'https://github.com/test/repo/actions/runs/123',
            };

            const payload = channel['buildPayload'](message);

            const widgets = payload.cards![0].sections[0].widgets;
            const buttonWidget = widgets[widgets.length - 1];

            expect(buttonWidget.buttons).toBeDefined();
            expect(buttonWidget.buttons![0].textButton.text).toBe('VIEW WORKFLOW RUN');
            expect(buttonWidget.buttons![0].textButton.onClick.openLink.url).toBe('https://github.com/test/repo/actions/runs/123');
        });

        it('should not include button when no run URL', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            const widgets = payload.cards![0].sections[0].widgets;
            const hasButton = widgets.some(w => w.buttons !== undefined);

            expect(hasButton).toBe(false);
        });

        it('should assign icons to fields', () => {
            const message: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [
                    { name: 'Products Checked', value: '5', inline: true },
                    { name: 'Releases Checked', value: '10', inline: true },
                    { name: 'EOL Versions', value: '2', inline: true },
                    { name: 'Approaching EOL', value: '1', inline: true },
                    { name: 'Other Field', value: 'Value', inline: true },
                ],
                timestamp: new Date(),
            };

            const payload = channel['buildPayload'](message);

            const widgets = payload.cards![0].sections[0].widgets;

            // Skip first widget (summary)
            expect(widgets[1].keyValue!.icon).toBe('DESCRIPTION');
            expect(widgets[2].keyValue!.icon).toBe('BOOKMARK');
            expect(widgets[3].keyValue!.icon).toBe('STAR');
            expect(widgets[4].keyValue!.icon).toBe('CLOCK');
            expect(widgets[5].keyValue!.icon).toBe('DESCRIPTION'); // Default
        });

        it('should include severity-based image in header', () => {
            const errorMessage: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.ERROR,
                fields: [],
                timestamp: new Date(),
            };

            const errorPayload = channel['buildPayload'](errorMessage);
            expect(errorPayload.cards![0].header.imageUrl).toContain('error_outline_red');

            const warningMessage: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.WARNING,
                fields: [],
                timestamp: new Date(),
            };

            const warningPayload = channel['buildPayload'](warningMessage);
            expect(warningPayload.cards![0].header.imageUrl).toContain('warning_amber');

            const infoMessage: NotificationMessage = {
                title: 'Test',
                summary: 'Test',
                severity: NotificationSeverity.INFO,
                fields: [],
                timestamp: new Date(),
            };

            const infoPayload = channel['buildPayload'](infoMessage);
            expect(infoPayload.cards![0].header.imageUrl).toContain('check_circle_outline_green');
        });
    });

    describe('validate', () => {
        it('should validate correct Google Chat webhook URL', () => {
            const validChannel = new GoogleChatChannel('https://chat.googleapis.com/v1/spaces/123/messages?key=abc');
            expect(validChannel.validate()).toBe(true);
        });

        it('should reject invalid URL', () => {
            const invalidChannel = new GoogleChatChannel('not-a-url');
            expect(invalidChannel.validate()).toBe(false);
        });
    });
});
