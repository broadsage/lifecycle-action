// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import * as fs from 'fs/promises';
import {
    formatAsJson,
    formatAsMarkdown,
    createIssueBody,
    generateMatrix,
    generateMatrixInclude,
    setOutputs,
    writeToStepSummary,
    writeToFile,
} from '../src/outputs';
import { ActionResults, EolStatus, ProductVersionInfo } from '../src/types';

// Mock fs/promises module
jest.mock('fs/promises');

describe('Output Formatting', () => {
    const mockProduct: ProductVersionInfo = {
        product: 'python',
        release: '2.7',
        status: EolStatus.END_OF_LIFE,
        eolDate: '2020-01-01',
        daysUntilEol: -1800,
        releaseDate: '2010-07-03',
        latestVersion: '2.7.18',
        isLts: false,
        supportDate: null,
        link: 'https://www.python.org/downloads/release/python-2718/',
        discontinuedDate: null,
        isDiscontinued: false,
        extendedSupportDate: null,
        hasExtendedSupport: false,
        latestReleaseDate: null,
        daysSinceLatestRelease: null,
        rawData: {
            name: '2.7',
            releaseDate: '2010-07-03',
            eolFrom: '2020-01-01',
            latest: { name: '2.7.18' },
        },
    };

    const mockResults: ActionResults = {
        eolDetected: true,
        approachingEol: false,
        staleDetected: false,
        discontinuedDetected: false,
        totalProductsChecked: 1,
        totalReleasesChecked: 1,
        products: [mockProduct],
        eolProducts: [mockProduct],
        approachingEolProducts: [],
        staleProducts: [],
        discontinuedProducts: [],
        extendedSupportProducts: [],
        latestVersions: { python: '2.7.18' },
        summary: 'Test summary',
    };

    describe('formatAsJson', () => {
        it('should format results as JSON', () => {
            const result = formatAsJson(mockResults);
            const parsed = JSON.parse(result);

            expect(parsed.eolDetected).toBe(true);
            expect(parsed.totalProductsChecked).toBe(1);
            expect(parsed.eolProducts).toHaveLength(1);
        });

        it('should be valid JSON', () => {
            const result = formatAsJson(mockResults);

            expect(() => JSON.parse(result)).not.toThrow();
        });
    });

    describe('formatAsMarkdown', () => {
        it('should format results as markdown', () => {
            const result = formatAsMarkdown(mockResults);

            expect(result).toContain('# 📊 Software Lifecycle Analysis Report');
            expect(result).toContain('### 📓 Summary of Findings');
            expect(result).toContain('❌ **1** EOL');
            expect(result).toContain('✅ **0** Healthy');
            expect(result).toContain('<details><summary>❌ CRITICAL: 1 End-of-Life versions detected</summary>');
        });

        it('should include EOL products table', () => {
            const result = formatAsMarkdown(mockResults);

            expect(result).toContain('| Product | Release | EOL Date');
            expect(result).toContain('| python | 2.7 | 2020-01-01');
        });

        it('should include approaching EOL section when applicable', () => {
            const approachingProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.APPROACHING_EOL,
                daysUntilEol: 30,
                eolDate: '2025-02-01',
            };

            const results: ActionResults = {
                ...mockResults,
                approachingEol: true,
                approachingEolProducts: [approachingProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('<details><summary>⚠️ WARNING: 1 versions approaching End-of-Life</summary>');
            expect(result).toContain('Days Until EOL');
        });

        it('should show all clear message when no issues', () => {
            const cleanResults: ActionResults = {
                ...mockResults,
                eolDetected: false,
                eolProducts: [],
                products: [],
            };

            const result = formatAsMarkdown(cleanResults);

            expect(result).toContain('## ✅ All Clear!');
            expect(result).toContain('All tracked versions are actively supported');
        });

        it('should include active support section', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
                eolDate: '2027-10-24',
                daysUntilEol: 1000,
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('<details><summary>✅ HEALTHY: 1 versions with active support</summary>');
        });

        it('should handle LTS indicators', () => {
            const ltsProduct: ProductVersionInfo = {
                ...mockProduct,
                isLts: true,
            };

            const results: ActionResults = {
                ...mockResults,
                eolProducts: [ltsProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('✓'); // LTS checkmark
        });

        it('should include stale versions section', () => {
            const staleProduct: ProductVersionInfo = {
                ...mockProduct,
                release: '3.6',
                latestReleaseDate: '2018-12-24',
                daysSinceLatestRelease: 1800,
            };

            const results: ActionResults = {
                ...mockResults,
                staleDetected: true,
                staleProducts: [staleProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('<details><summary>⏰ STALE: 1 stale versions detected</summary>');
            expect(result).toContain('3.6');
            expect(result).toContain('2018-12-24');
        });

        it('should include discontinued products section', () => {
            const discontinuedProduct: ProductVersionInfo = {
                ...mockProduct,
                release: '10.0',
                isDiscontinued: true,
                discontinuedDate: '2023-01-01',
            };

            const results: ActionResults = {
                ...mockResults,
                discontinuedDetected: true,
                discontinuedProducts: [discontinuedProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('<details><summary>🚫 **1** discontinued products</summary>');
            expect(result).toContain('10.0');
            expect(result).toContain('2023-01-01');
        });
    });

    describe('formatAsDashboard', () => {
        const { formatAsDashboard } = require('../src/outputs');

        it('should format results as a modern dashboard with legacy EOL', () => {
            const result = formatAsDashboard(mockResults);

            expect(result).toContain('> 🔴 **1** End-of-Life | 🟠 **0** Warning | ⏰ **0** Stale | 🟢 **0** Healthy');
            expect(result).toContain('| Product | Version | EOL Date | LTS | Latest |');
            expect(result).toContain('## 💾 Legacy End-of-Life');
            expect(result).toContain('| python | `2.7` | 2020-01-01 | ✗ | `2.7.18` |');
        });

        it('should format results with recent EOL', () => {
            // Create a date within the last 90 days (Today is 2026-01-08 in this context)
            const recentDate = '2025-12-01';
            const recentProduct: ProductVersionInfo = {
                ...mockProduct,
                eolDate: recentDate,
            };
            const results: ActionResults = {
                ...mockResults,
                eolProducts: [recentProduct],
            };

            const result = formatAsDashboard(results);
            expect(result).toContain('## 🔴 Critical: Recent End-of-Life');
            expect(result).toContain('| **python** | `2.7` | 2025-12-01 | ✗ | Update to `2.7.18` |');
        });

        it('should include healthy products section', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
            };
            const results: ActionResults = {
                ...mockResults,
                products: [activeProduct],
            };

            const result = formatAsDashboard(results);
            expect(result).toContain('## 🟢 Healthy & Supported');
            expect(result).toContain('| python | `3.11` | 2020-01-01 | ✗ | `2.7.18` |');
        });

        it('should include approaching EOL section', () => {
            const approachingProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.APPROACHING_EOL,
                release: '3.10',
                daysUntilEol: 30,
                eolDate: '2025-02-01',
            };
            const results: ActionResults = {
                ...mockResults,
                approachingEolProducts: [approachingProduct],
            };

            const result = formatAsDashboard(results);
            expect(result).toContain('🟠 Upcoming Risks');
            expect(result).toContain('| **python** | `3.10` | 2025-02-01 | ✗ | `30` days |');
        });

        it('should include stale products section', () => {
            const staleProduct: ProductVersionInfo = {
                ...mockProduct,
                release: '3.6',
                latestReleaseDate: '2018-12-24',
                daysSinceLatestRelease: 1800,
            };
            const results: ActionResults = {
                ...mockResults,
                staleProducts: [staleProduct],
            };

            const result = formatAsDashboard(results);
            expect(result).toContain('## ⏰ Maintenance Required');
            expect(result).toContain('<details><summary>Click to view products with no updates for a long time</summary>');
            expect(result).toContain('| **python** | `3.6` | 2018-12-24 | `1800` days stale |');
        });
    });

    describe('createIssueBody', () => {
        it('should create issue body with EOL information', () => {
            const result = createIssueBody(mockResults);

            expect(result).toContain('# 🚨 End-of-Life Software Detected');
            expect(result).toContain('## ❌ End-of-Life Versions');
            expect(result).toContain('### python 2.7');
            expect(result).toContain('**EOL Date:** 2020-01-01');
        });

        it('should include approaching EOL section', () => {
            const approachingProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.APPROACHING_EOL,
                release: '3.9',
                daysUntilEol: 45,
                eolDate: '2025-02-15',
            };

            const results: ActionResults = {
                ...mockResults,
                approachingEol: true,
                approachingEolProducts: [approachingProduct],
            };

            const result = createIssueBody(results);

            expect(result).toContain('## ⚠️ Approaching End-of-Life');
            expect(result).toContain('**Days Until EOL:** 45');
        });

        it('should include recommended actions', () => {
            const result = createIssueBody(mockResults);

            expect(result).toContain('## 📋 Recommended Actions');
            expect(result).toContain('Review the affected software versions');
            expect(result).toContain('Plan migration to supported versions');
        });

        it('should include links when available', () => {
            const result = createIssueBody(mockResults);

            expect(result).toContain('**More Info:**');
            expect(result).toContain('https://www.python.org/downloads/release/python-2718/');
        });

        it('should handle products without links', () => {
            const productWithoutLink: ProductVersionInfo = {
                ...mockProduct,
                link: null,
            };

            const results: ActionResults = {
                ...mockResults,
                eolProducts: [productWithoutLink],
            };

            const result = createIssueBody(results);

            expect(result).not.toContain('**More Info:**');
        });

        it('should include stale versions information', () => {
            const staleProduct: ProductVersionInfo = {
                ...mockProduct,
                release: '3.6',
                latestReleaseDate: '2018-12-24',
                daysSinceLatestRelease: 1800,
            };

            const results: ActionResults = {
                ...mockResults,
                staleProducts: [staleProduct],
            };

            const result = createIssueBody(results);

            expect(result).toContain('## ⏰ Stale Versions');
            expect(result).toContain('### python 3.6');
            expect(result).toContain('**Days Since Latest Release:** 1800');
        });

        it('should include discontinued products information', () => {
            const discontinuedProduct: ProductVersionInfo = {
                ...mockProduct,
                release: '10.0',
                isDiscontinued: true,
                discontinuedDate: '2023-01-01',
            };

            const results: ActionResults = {
                ...mockResults,
                discontinuedProducts: [discontinuedProduct],
            };

            const result = createIssueBody(results);

            expect(result).toContain('## 🚫 Discontinued Products');
            expect(result).toContain('### python 10.0');
            expect(result).toContain('**Discontinued Date:** 2023-01-01');
        });
    });

    describe('generateMatrix', () => {
        it('should generate simple matrix with all products', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct],
            };

            const matrix = generateMatrix(results, false, false);

            expect(matrix.versions).toHaveLength(2);
            expect(matrix.versions).toContain('2.7');
            expect(matrix.versions).toContain('3.11');
        });

        it('should exclude EOL products by default', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct],
            };

            const matrix = generateMatrix(results);

            expect(matrix.versions).toHaveLength(1);
            expect(matrix.versions).toContain('3.11');
            expect(matrix.versions).not.toContain('2.7');
        });

        it('should exclude approaching EOL when specified', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
            };

            const approachingProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.APPROACHING_EOL,
                release: '3.9',
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct, approachingProduct],
            };

            const matrix = generateMatrix(results, true, true);

            expect(matrix.versions).toHaveLength(1);
            expect(matrix.versions).toContain('3.11');
        });

        it('should handle empty products list', () => {
            const results: ActionResults = {
                ...mockResults,
                products: [],
            };

            const matrix = generateMatrix(results);

            expect(matrix.versions).toHaveLength(0);
        });
    });

    describe('generateMatrixInclude', () => {
        it('should generate detailed matrix with metadata', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
                eolDate: '2027-10-24',
                releaseDate: '2022-10-24',
                isLts: true,
            };

            const results: ActionResults = {
                ...mockResults,
                products: [activeProduct],
            };

            const matrix = generateMatrixInclude(results, false, false);

            expect(matrix.include).toHaveLength(1);
            expect(matrix.include[0]).toEqual({
                version: '3.11',
                release: '3.11',
                isLts: true,
                eolDate: '2027-10-24',
                status: EolStatus.ACTIVE,
                releaseDate: '2022-10-24',
            });
        });

        it('should exclude EOL products by default', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
                eolDate: '2027-10-24',
                releaseDate: '2022-10-24',
                isLts: false,
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct],
            };

            const matrix = generateMatrixInclude(results);

            expect(matrix.include).toHaveLength(1);
            expect(matrix.include[0].release).toBe('3.11');
        });

        it('should exclude approaching EOL when specified', () => {
            const activeProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.ACTIVE,
                release: '3.11',
                eolDate: '2027-10-24',
                releaseDate: '2022-10-24',
                isLts: false,
            };

            const approachingProduct: ProductVersionInfo = {
                ...mockProduct,
                status: EolStatus.APPROACHING_EOL,
                release: '3.9',
                eolDate: '2025-02-01',
                releaseDate: '2020-10-05',
                isLts: false,
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct, approachingProduct],
            };

            const matrix = generateMatrixInclude(results, true, true);

            expect(matrix.include).toHaveLength(1);
            expect(matrix.include[0].release).toBe('3.11');
        });

        it('should handle empty products list', () => {
            const results: ActionResults = {
                ...mockResults,
                products: [],
            };

            const matrix = generateMatrixInclude(results);

            expect(matrix.include).toHaveLength(0);
        });
    });

    describe('setOutputs', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.spyOn(core, 'setOutput').mockImplementation();
        });

        it('should set all basic outputs', () => {
            setOutputs(mockResults);

            expect(core.setOutput).toHaveBeenCalledWith('eol-detected', true);
            expect(core.setOutput).toHaveBeenCalledWith('approaching-eol', false);
            expect(core.setOutput).toHaveBeenCalledWith('results', JSON.stringify(mockResults));
            expect(core.setOutput).toHaveBeenCalledWith('eol-products', JSON.stringify(mockResults.eolProducts));
            expect(core.setOutput).toHaveBeenCalledWith('approaching-eol-products', JSON.stringify(mockResults.approachingEolProducts));
            expect(core.setOutput).toHaveBeenCalledWith('latest-versions', JSON.stringify(mockResults.latestVersions));
            expect(core.setOutput).toHaveBeenCalledWith('summary', 'Test summary');
            expect(core.setOutput).toHaveBeenCalledWith('total-products-checked', 1);
            expect(core.setOutput).toHaveBeenCalledWith('total-releases-checked', 1);
            expect(core.setOutput).toHaveBeenCalledWith('stale-detected', false);
            expect(core.setOutput).toHaveBeenCalledWith('stale-products', JSON.stringify([]));
            expect(core.setOutput).toHaveBeenCalledWith('discontinued-detected', false);
            expect(core.setOutput).toHaveBeenCalledWith('discontinued-products', JSON.stringify([]));
            expect(core.setOutput).toHaveBeenCalledWith('extended-support-products', JSON.stringify([]));
        });

        it('should set matrix output when provided', () => {
            const resultsWithMatrix: ActionResults = {
                ...mockResults,
                matrix: { versions: ['3.11', '3.12'] },
            };

            setOutputs(resultsWithMatrix);

            expect(core.setOutput).toHaveBeenCalledWith('matrix', JSON.stringify({ versions: ['3.11', '3.12'] }));
        });

        it('should set matrixInclude output when provided', () => {
            const resultsWithMatrixInclude: ActionResults = {
                ...mockResults,
                matrixInclude: {
                    include: [
                        {
                            version: '3.11',
                            release: '3.11',
                            isLts: true,
                            eolDate: '2027-10-24',
                            status: EolStatus.ACTIVE,
                            releaseDate: '2022-10-24',
                        },
                    ],
                },
            };

            setOutputs(resultsWithMatrixInclude);

            expect(core.setOutput).toHaveBeenCalledWith('matrix-include', JSON.stringify(resultsWithMatrixInclude.matrixInclude));
        });

        it('should not set matrix outputs when not provided', () => {
            setOutputs(mockResults);

            const calls = (core.setOutput as jest.Mock).mock.calls;
            const matrixCalls = calls.filter(call => call[0] === 'matrix' || call[0] === 'matrix-include');

            expect(matrixCalls).toHaveLength(0);
        });
    });

    describe('writeToStepSummary', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            // Mock the summary API
            (core.summary.addRaw as jest.Mock) = jest.fn().mockReturnValue(core.summary);
            (core.summary.write as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        });

        it('should write markdown to step summary', async () => {
            await writeToStepSummary(mockResults);

            expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('# 📊 Software Lifecycle Analysis Report'));
            expect(core.summary.write).toHaveBeenCalled();
        });

        it('should format results as markdown before writing', async () => {
            await writeToStepSummary(mockResults);

            const markdown = (core.summary.addRaw as jest.Mock).mock.calls[0][0];

            expect(markdown).toContain('### 📓 Summary of Findings');
            expect(markdown).toContain('<details><summary>❌ CRITICAL: 1 End-of-Life versions detected</summary>');
        });
    });

    describe('writeToFile', () => {
        const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

        beforeEach(() => {
            jest.clearAllMocks();
            mockWriteFile.mockResolvedValue(undefined);
            jest.spyOn(core, 'info').mockImplementation();
            jest.spyOn(core, 'error').mockImplementation();
        });

        it('should write content to file', async () => {
            await writeToFile('/tmp/test.json', '{"test": true}');

            expect(mockWriteFile).toHaveBeenCalledWith('/tmp/test.json', '{"test": true}', 'utf-8');
            expect(core.info).toHaveBeenCalledWith('Results written to /tmp/test.json');
        });

        it('should log info message on success', async () => {
            await writeToFile('/tmp/output.md', 'markdown content');

            expect(core.info).toHaveBeenCalledWith('Results written to /tmp/output.md');
        });

        it('should throw and log error on failure', async () => {
            const error = new Error('Permission denied');
            mockWriteFile.mockResolvedValue(undefined); // Reset
            mockWriteFile.mockRejectedValue(error);

            await expect(writeToFile('/tmp/test.json', 'content')).rejects.toThrow('Permission denied');

            expect(core.error).toHaveBeenCalledWith('Failed to write to file /tmp/test.json: Permission denied');
        });

        it('should handle non-Error exceptions', async () => {
            mockWriteFile.mockRejectedValue('String error');

            await expect(writeToFile('/tmp/test.json', 'content')).rejects.toBe('String error');

            expect(core.error).toHaveBeenCalledWith('Failed to write to file /tmp/test.json: String error');
        });
    });
});
