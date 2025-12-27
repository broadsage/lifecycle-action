// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import {
    parseProducts,
    parseCycles,
    validateInputs,
} from '../src/inputs';
import { ActionInputs } from '../src/types';

describe('Input Parsing and Validation', () => {
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

    describe('parseCycles', () => {
        it('should parse valid JSON cycles', () => {
            const input = '{"python": ["3.11", "3.12"], "nodejs": ["20"]}';
            const result = parseCycles(input);

            expect(result).toEqual({
                python: ['3.11', '3.12'],
                nodejs: ['20'],
            });
        });

        it('should return empty object for empty input', () => {
            const result1 = parseCycles('');
            const result2 = parseCycles('{}');

            expect(result1).toEqual({});
            expect(result2).toEqual({});
        });

        it('should throw error for invalid JSON', () => {
            const input = '{invalid json}';

            expect(() => parseCycles(input)).toThrow('Invalid cycles JSON');
        });

        it('should throw error for array input', () => {
            const input = '["python", "nodejs"]';

            expect(() => parseCycles(input)).toThrow('Cycles must be a JSON object');
        });

        it('should throw error for non-object input', () => {
            const input = '"string"';

            expect(() => parseCycles(input)).toThrow('Cycles must be a JSON object');
        });
    });

    describe('validateInputs', () => {
        const validInputs: ActionInputs = {
            products: 'python,nodejs',
            cycles: '{}',
            checkEol: true,
            eolThresholdDays: 90,
            failOnEol: false,
            failOnApproachingEol: false,
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

        it('should validate cycles JSON format', () => {
            const inputs = { ...validInputs, cycles: '{invalid}' };

            expect(() => validateInputs(inputs)).toThrow('Invalid cycles input');
        });

        it('should accept valid cycles JSON', () => {
            const inputs = {
                ...validInputs,
                cycles: '{"python": ["3.11"]}',
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

        it('should require file-path, version, or cycles for single product', () => {
            const inputs = {
                ...validInputs,
                products: 'python',
                cycles: '{}',
                filePath: '',
                version: '',
            };

            expect(() => validateInputs(inputs)).toThrow(
                'For single product tracking, either file-path, version, or cycles must be specified'
            );
        });

        it('should not require file-path/version/cycles for multiple products', () => {
            const inputs = {
                ...validInputs,
                products: 'python,nodejs',
                cycles: '{}',
                filePath: '',
                version: '',
            };

            expect(() => validateInputs(inputs)).not.toThrow();
        });

        it('should not require file-path/version/cycles for "all" products', () => {
            const inputs = {
                ...validInputs,
                products: 'all',
                cycles: '{}',
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
