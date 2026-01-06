// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { BaseNotificationChannel } from '../base-channel';
import { NotificationChannelType, NotificationMessage } from '../types';

/**
 * Google Chat card widget
 */
interface GoogleChatWidget {
  keyValue?: {
    topLabel: string;
    content: string;
    contentMultiline?: boolean;
    icon?: string;
  };
  textParagraph?: {
    text: string;
  };
  buttons?: Array<{
    textButton: {
      text: string;
      onClick: {
        openLink: {
          url: string;
        };
      };
    };
  }>;
}

/**
 * Google Chat card section
 */
interface GoogleChatSection {
  header?: string;
  widgets: GoogleChatWidget[];
}

/**
 * Google Chat card
 */
interface GoogleChatCard {
  header: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: GoogleChatSection[];
}

/**
 * Google Chat message payload
 */
interface GoogleChatPayload {
  text?: string;
  cards?: GoogleChatCard[];
}

/**
 * Google Chat notification channel
 */
export class GoogleChatChannel extends BaseNotificationChannel {
  readonly name = 'Google Chat';
  readonly type = NotificationChannelType.GOOGLE_CHAT;

  /**
   * Build Google Chat-specific payload
   */
  protected buildPayload(message: NotificationMessage): GoogleChatPayload {
    const widgets: GoogleChatWidget[] = [];

    // Add summary as text paragraph
    widgets.push({
      textParagraph: {
        text: message.summary,
      },
    });

    // Add fields as key-value widgets
    message.fields.forEach((field) => {
      widgets.push({
        keyValue: {
          topLabel: field.name,
          content: field.value,
          contentMultiline: !field.inline,
          icon: this.getIconForField(field.name),
        },
      });
    });

    // Add button to view workflow run
    if (message.runUrl) {
      widgets.push({
        buttons: [
          {
            textButton: {
              text: 'VIEW WORKFLOW RUN',
              onClick: {
                openLink: {
                  url: message.runUrl,
                },
              },
            },
          },
        ],
      });
    }

    const card: GoogleChatCard = {
      header: {
        title: message.title,
        subtitle: message.repository
          ? `Repository: ${message.repository}`
          : undefined,
        imageUrl: this.getImageForSeverity(message.severity),
      },
      sections: [
        {
          widgets,
        },
      ],
    };

    return {
      text: message.title, // Fallback text
      cards: [card],
    };
  }

  /**
   * Get icon for field name
   */
  private getIconForField(fieldName: string): string {
    const icons: Record<string, string> = {
      'Products Checked': 'DESCRIPTION',
      'Releases Checked': 'BOOKMARK',
      'EOL Versions': 'STAR',
      'Approaching EOL': 'CLOCK',
    };
    return icons[fieldName] || 'DESCRIPTION';
  }

  /**
   * Get image URL for severity
   */
  private getImageForSeverity(severity: string): string {
    // Using Google's Material Icons
    const baseUrl = 'https://www.gstatic.com/images/icons/material/system/1x';
    switch (severity) {
      case 'error':
      case 'critical':
        return `${baseUrl}/error_outline_red_24dp.png`;
      case 'warning':
        return `${baseUrl}/warning_amber_24dp.png`;
      default:
        return `${baseUrl}/check_circle_outline_green_24dp.png`;
    }
  }
}
