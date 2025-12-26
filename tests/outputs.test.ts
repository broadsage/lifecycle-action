// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import {
    formatAsJson,
    formatAsMarkdown,
    createIssueBody,
} from '../src/outputs';
import { ActionResults, EolStatus, ProductVersionInfo } from '../src/types';

describe('Output Formatting', () => {
    const mockProduct: ProductVersionInfo = {
        product: 'python',
        cycle: '2.7',
        status: EolStatus.END_OF_LIFE,
        eolDate: '2020-01-01',
        daysUntilEol: -1800,
        releaseDate: '2010-07-03',
        latestVersion: '2.7.18',
        isLts: false,
        supportDate: null,
        link: 'https://www.python.org/downloads/release/python-2718/',
        rawData: {
            cycle: '2.7',
            releaseDate: '2010-07-03',
            eol: '2020-01-01',
            latest: '2.7.18',
        },
    };

    const mockResults: ActionResults = {
        eolDetected: true,
        approachingEol: false,
        totalProductsChecked: 1,
        totalCyclesChecked: 1,
        products: [mockProduct],
        eolProducts: [mockProduct],
        approachingEolProducts: [],
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

            expect(result).toContain('# 📊 EndOfLife Analysis Report');
            expect(result).toContain('**Total Products Checked:** 1');
            expect(result).toContain('## ❌ End-of-Life Detected');
        });

        it('should include EOL products table', () => {
            const result = formatAsMarkdown(mockResults);

            expect(result).toContain('| Product | Cycle | EOL Date');
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

            expect(result).toContain('## ⚠️ Approaching End-of-Life');
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
                cycle: '3.11',
                eolDate: '2027-10-24',
                daysUntilEol: 1000,
            };

            const results: ActionResults = {
                ...mockResults,
                products: [mockProduct, activeProduct],
            };

            const result = formatAsMarkdown(results);

            expect(result).toContain('## ✅ Active Support');
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
                cycle: '3.9',
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
    });
});
