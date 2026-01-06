// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import {
    getInputs,
    parseProducts,
    parseReleases,
    validateInputs,
} from '../src/inputs';
import { ActionInputs, NotificationSeverity } from '../src/types';
import * as core from '@actions/core';

// Mock @actions/core
jest.mock('@actions/core');

describe('Input Parsing and Validation', () => {
    const mockCore = core as jest.Mocked<typeof core>;

    describe('getInputs', () => {
        beforeEach(() => {
            jest.clearAllMocks();

            // Set default mock return values
            mockCore.getInput.mockImplementation((name: string) => {
                const defaults: Record<string, string> = {
                    'products': 'python,nodejs',
                    'releases': '{}',
                    'eol-threshold-days': '90',
                    'staleness-threshold-days': '365',
                    'output-format': 'summary',
                    'output-file': '',
                    'cache-ttl': '3600',
                    'github-token': '',
                    'issue-labels': 'dependencies,eol,security',
                    'custom-api-url': 'https://endoflife.date/api/v1',
                    'file-path': '',
                    'file-key': '',
                    'file-format': 'yaml',
                    'version-regex': '',
                    'version': '',
                    'min-release-date': '',
                    'max-release-date': '',
                    'max-versions': '',
                    'version-sort-order': 'newest-first',
                };
                return defaults[name] || '';
            });

            mockCore.getBooleanInput.mockImplementation((name: string) => {
                const defaults: Record<string, boolean> = {
                    'check-eol': true,
                    'fail-on-eol': false,
                    'fail-on-approaching-eol': false,
                    'fail-on-stale': false,
                    'include-discontinued': true,
                    'create-issue-on-eol': false,
                    'include-latest-version': true,
                    'include-support-info': true,
                    'semantic-version-fallback': true,
                    'output-matrix': false,
                    'exclude-eol-from-matrix': true,
                    'exclude-approaching-eol-from-matrix': false,
                };
                return defaults[name] || false;
            });
        });

        it('should parse all inputs with default values', () => {
            const inputs = getInputs();

            expect(inputs.products).toBe('python,nodejs');
            expect(inputs.releases).toBe('{}');
            expect(inputs.checkEol).toBe(true);
            expect(inputs.eolThresholdDays).toBe(90);
            expect(inputs.stalenessThresholdDays).toBe(365);
            expect(inputs.includeDiscontinued).toBe(true);
        });

        it('should parse custom values', () => {
            mockCore.getInput.mockImplementation((name: string) => {
                if (name === 'products') return 'ubuntu';
                if (name === 'eol-threshold-days') return '30';
                if (name === 'staleness-threshold-days') return '180';
                return '';
            });

            const inputs = getInputs();

            expect(inputs.products).toBe('ubuntu');
            expect(inputs.eolThresholdDays).toBe(30);
            expect(inputs.stalenessThresholdDays).toBe(180);
        });

        it('should handle empty max-versions', () => {
            const inputs = getInputs();
            expect(inputs.maxVersions).toBeNull();
        });

        it('should parse max-versions when provided', () => {
            mockCore.getInput.mockImplementation((name: string) => {
                if (name === 'max-versions') return '10';
                return '';
            });

            const inputs = getInputs();
            expect(inputs.maxVersions).toBe(10);
        });

        it('should parse api-concurrency when provided', () => {
            mockCore.getInput.mockImplementation((name: string) => {
                if (name === 'api-concurrency') return '8';
                return '';
            });

            const inputs = getInputs();
            expect(inputs.apiConcurrency).toBe(8);
        });

        it('should use default api-concurrency when not provided', () => {
            const inputs = getInputs();
            expect(inputs.apiConcurrency).toBe(5);
        });

        it('should support cycles as an alias for releases', () => {
            mockCore.getInput.mockImplementation((name: string) => {
                if (name === 'cycles') return '{"python": ["3.11"]}';
                if (name === 'releases') return '';
                return '';
            });

            const inputs = getInputs();
            expect(inputs.releases).toBe('{"python": ["3.11"]}');
        });
    });

    describe('parseProducts', () => {
        it('should parse comma-separated products', () => {
            const input = 'python,nodejs,ubuntu';
            const result = parseProducts(input);

            expect(result).toEqual(['python', 'nodejs', 'ubuntu']);
        });

        it('should trim whitespace', () => {
            const input = ' python , nodejs , ubuntu ';
            const result = parseProducts(input);

            expect(result).toEqual(['python', 'nodejs', 'ubuntu']);
        });

        it('should filter empty strings', () => {
            const input = 'python,,nodejs,';
            const result = parseProducts(input);

            expect(result).toEqual(['python', 'nodejs']);
        });

        it('should handle single product', () => {
            const input = 'python';
            const result = parseProducts(input);

            expect(result).toEqual(['python']);
        });

        it('should handle "all" keyword', () => {
            const input = 'all';
            const result = parseProducts(input);

            expect(result).toEqual(['all']);
        });
    });

    describe('parseReleases', () => {
        it('should parse valid JSON releases', () => {
            const input = '{"python": ["3.11", "3.12"], "nodejs": ["20"]}';
            const result = parseReleases(input);

            expect(result).toEqual({
                python: ['3.11', '3.12'],
                nodejs: ['20'],
            });
        });

        it('should return empty object for empty input', () => {
            const result1 = parseReleases('');
            const result2 = parseReleases('{}');

            expect(result1).toEqual({});
            expect(result2).toEqual({});
        });

        it('should throw error for invalid JSON', () => {
            const input = '{invalid json}';

            expect(() => parseReleases(input)).toThrow('Invalid releases JSON');
        });

        it('should throw error for array input', () => {
            const input = '["python", "nodejs"]';

            expect(() => parseReleases(input)).toThrow('Releases must be a JSON object');
        });

        it('should throw error for non-object input', () => {
            const input = '"string"';

            expect(() => parseReleases(input)).toThrow('Releases must be a JSON object');
        });
    });

    describe('validateInputs', () => {
        const validInputs: ActionInputs = {
            products: 'python,nodejs',
            releases: '{}',
            checkEol: true,
            eolThresholdDays: 90,
            failOnEol: false,
            failOnApproachingEol: false,
            failOnStale: false,
            stalenessThresholdDays: 365,
            includeDiscontinued: true,
            outputFormat: 'summary',
            outputFile: '',
            cacheTtl: 3600,
            githubToken: '',
            createIssueOnEol: false,
            issueLabels: 'dependencies,eol',
            includeLatestVersion: true,
            includeSupportInfo: true,
            customApiUrl: 'https://endoflife.date',
            filePath: '',
            fileKey: '',
            fileFormat: 'yaml',
            versionRegex: '',
            version: '',
            sbomFile: '',
            sbomFormat: 'auto',
            sbomComponentMapping: '',
            apiConcurrency: 5,
            semanticVersionFallback: true,
            // Matrix output properties
            outputMatrix: false,
            excludeEolFromMatrix: false,
            excludeApproachingEolFromMatrix: false,
            // Filtering properties
            minReleaseDate: '',
            maxReleaseDate: '',
            maxVersions: null,
            versionSortOrder: 'newest-first',
            failOnNotificationFailure: false,
            notificationRetryAttempts: 3,
            notificationRetryDelay: 1000,
            webhookMinSeverity: NotificationSeverity.INFO,
            teamsMinSeverity: NotificationSeverity.INFO,
            googleChatMinSeverity: NotificationSeverity.INFO,
            discordMinSeverity: NotificationSeverity.INFO,
            slackMinSeverity: NotificationSeverity.INFO,
        };

        it('should validate correct inputs', () => {
            expect(() => validateInputs(validInputs)).not.toThrow();
        });

        it('should throw error for empty products', () => {
            const inputs = { ...validInputs, products: '' };

            expect(() => validateInputs(inputs)).toThrow('Products input is required');
        });

        it('should throw error for negative threshold days', () => {
            const inputs = { ...validInputs, eolThresholdDays: -1 };

            expect(() => validateInputs(inputs)).toThrow(
                'EOL threshold days must be positive'
            );
        });

        it('should throw error for negative cache TTL', () => {
            const inputs = { ...validInputs, cacheTtl: -1 };

            expect(() => validateInputs(inputs)).toThrow('Cache TTL must be positive');
        });

        it('should throw error for invalid output format', () => {
            const inputs = { ...validInputs, outputFormat: 'invalid' as any };

            expect(() => validateInputs(inputs)).toThrow(
                'Output format must be json, markdown, or summary'
            );
        });

        it('should throw error when creating issue without token', () => {
            const inputs = {
                ...validInputs,
                createIssueOnEol: true,
                githubToken: '',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'GitHub token is required when create-issue-on-eol is enabled'
            );
        });

        it('should validate releases JSON format', () => {
            const inputs = { ...validInputs, releases: '{invalid}' };

            expect(() => validateInputs(inputs)).toThrow('Invalid releases input');
        });

        it('should accept valid releases JSON', () => {
            const inputs = {
                ...validInputs,
                releases: '{"python": ["3.11"]}',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should require file-key or version-regex when file-path is provided', () => {
            const inputs = {
                ...validInputs,
                filePath: 'test.yaml',
                fileKey: '',
                versionRegex: '',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'Either file-key or version-regex is required'
            );
        });

        it('should accept file-path with file-key', () => {
            const inputs = {
                ...validInputs,
                filePath: 'test.yaml',
                fileKey: 'image.tag',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should accept file-path with version-regex', () => {
            const inputs = {
                ...validInputs,
                filePath: 'test.txt',
                fileFormat: 'text' as const,
                versionRegex: 'v([0-9.]+)',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should require version-regex for text format', () => {
            const inputs = {
                ...validInputs,
                filePath: 'test.txt',
                fileFormat: 'text' as const,
                fileKey: 'key',
                versionRegex: '',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'version-regex is required when file-format is text'
            );
        });

        it('should throw error for invalid file format', () => {
            const inputs = {
                ...validInputs,
                filePath: 'test.txt',
                fileFormat: 'invalid' as any,
                fileKey: 'key',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'File format must be yaml, json, or text'
            );
        });

        it('should require file-path, version, or releases for single product', () => {
            const inputs = {
                ...validInputs,
                products: 'python',
                releases: '{}',
                filePath: '',
                version: '',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'For single product tracking, either file-path, version, or releases must be specified'
            );
        });

        it('should not require file-path/version/releases for multiple products', () => {
            const inputs = {
                ...validInputs,
                products: 'python,nodejs',
                releases: '{}',
                filePath: '',
                version: '',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should not require file-path/version/releases for "all" products', () => {
            const inputs = {
                ...validInputs,
                products: 'all',
                releases: '{}',
                filePath: '',
                version: '',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should throw error for invalid max-versions', () => {
            const inputs = {
                ...validInputs,
                maxVersions: 0,
            };

            expect(() => validateInputs(inputs)).toThrow(
                'max-versions must be a positive integer'
            );
        });

        it('should throw error for invalid version-sort-order', () => {
            const inputs = {
                ...validInputs,
                versionSortOrder: 'invalid' as any,
            };

            expect(() => validateInputs(inputs)).toThrow(
                'version-sort-order must be newest-first or oldest-first'
            );
        });

        it('should validate minReleaseDate when provided', () => {
            const inputs = {
                ...validInputs,
                minReleaseDate: 'invalid-date',
            };

            expect(() => validateInputs(inputs)).toThrow('Invalid date format');
        });

        it('should validate maxReleaseDate when provided', () => {
            const inputs = {
                ...validInputs,
                maxReleaseDate: 'invalid-date',
            };

            expect(() => validateInputs(inputs)).toThrow('Invalid date format');
        });

        it('should accept valid minReleaseDate', () => {
            const inputs = {
                ...validInputs,
                minReleaseDate: '2020',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should accept valid maxReleaseDate', () => {
            const inputs = {
                ...validInputs,
                maxReleaseDate: '2025-12-31',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });
    });

    describe('validateDateFilter', () => {
        const { validateDateFilter } = require('../src/inputs');

        it('should accept valid year format', () => {
            expect(() => validateDateFilter('2023', 'test-field')).not.toThrow();
        });

        it('should accept year with >= operator', () => {
            expect(() => validateDateFilter('>=2023', 'test-field')).not.toThrow();
        });

        it('should accept year with <= operator', () => {
            expect(() => validateDateFilter('<=2023', 'test-field')).not.toThrow();
        });

        it('should accept valid date format', () => {
            expect(() =>
                validateDateFilter('2023-01-15', 'test-field')
            ).not.toThrow();
        });

        it('should throw error for year out of range (too low)', () => {
            expect(() => validateDateFilter('1899', 'test-field')).toThrow(
                'Year must be between 1900 and 2100'
            );
        });

        it('should throw error for year out of range (too high)', () => {
            expect(() => validateDateFilter('2101', 'test-field')).toThrow(
                'Year must be between 1900 and 2100'
            );
        });

        it('should throw error for invalid date', () => {
            expect(() => validateDateFilter('2023-13-45', 'test-field')).toThrow(
                'Invalid date format'
            );
        });

        it('should throw error for invalid format', () => {
            expect(() => validateDateFilter('invalid', 'test-field')).toThrow(
                'Invalid date format'
            );
        });
    });

    describe('parseDateFilter', () => {
        const { parseDateFilter } = require('../src/inputs');

        it('should parse year with >= operator', () => {
            const result = parseDateFilter('>=2023');
            expect(result.operator).toBe('>=');
            expect(result.date).toEqual(new Date('2023-01-01'));
        });

        it('should parse year with <= operator', () => {
            const result = parseDateFilter('<=2023');
            expect(result.operator).toBe('<=');
            expect(result.date).toEqual(new Date('2023-12-31'));
        });

        it('should parse year without operator', () => {
            const result = parseDateFilter('2023');
            expect(result.operator).toBe('=');
            expect(result.date).toEqual(new Date('2023-01-01'));
        });

        it('should parse full date', () => {
            const result = parseDateFilter('2023-06-15');
            expect(result.operator).toBe('=');
            expect(result.date).toEqual(new Date('2023-06-15'));
        });

        it('should parse full date with >= operator', () => {
            const result = parseDateFilter('>=2023-06-15');
            expect(result.operator).toBe('>=');
            expect(result.date).toEqual(new Date('2023-06-15'));
        });

        it('should parse full date with <= operator', () => {
            const result = parseDateFilter('<=2023-06-15');
            expect(result.operator).toBe('<=');
            expect(result.date).toEqual(new Date('2023-06-15'));
        });
    });
});
