// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { EolAnalyzer } from '../src/analyzer';
import { EndOfLifeClient } from '../src/client';
import { EolStatus, Release } from '../src/types';
import nock from 'nock';

// Mock p-limit as it's ESM only and causes issues with Jest
jest.mock('p-limit', () => {
    return (_concurrency: number) => {
        return (fn: any) => fn();
    };
});

describe('EolAnalyzer', () => {
    let client: EndOfLifeClient;
    let analyzer: EolAnalyzer;
    const baseUrl = 'https://endoflife.date/api/v1';

    beforeEach(() => {
        client = new EndOfLifeClient(baseUrl, 3600);
        analyzer = new EolAnalyzer(client, 90);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('analyzeProductRelease', () => {
        it('should identify end-of-life versions', async () => {
            const release: Release = {
                name: '2.7',
                releaseDate: '2010-07-03',
                eolFrom: '2020-01-01',
                latest: { name: '2.7.18' },
                isLts: false,
            };

            const result = await analyzer.analyzeProductRelease('python', release);

            expect(result.status).toBe(EolStatus.END_OF_LIFE);
            expect(result.product).toBe('python');
            expect(result.release).toBe('2.7');
            expect(result.eolDate).toMatch(/^(2019-12-31|2020-01-01)$/);
            expect(result.daysUntilEol).toBeLessThan(0);
        });

        it('should identify versions approaching EOL', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            const eolDate = futureDate.toISOString().split('T')[0];

            const release: Release = {
                name: '3.9',
                releaseDate: '2020-10-05',
                eolFrom: eolDate,
                latest: { name: '3.9.18' },
                isLts: false,
            };

            const result = await analyzer.analyzeProductRelease('python', release);

            expect(result.status).toBe(EolStatus.APPROACHING_EOL);
            expect(result.daysUntilEol).toBeGreaterThan(0);
            expect(result.daysUntilEol).toBeLessThanOrEqual(90);
        });

        it('should identify active versions', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 365);
            const eolDate = futureDate.toISOString().split('T')[0];

            const release: Release = {
                name: '3.12',
                releaseDate: '2023-10-02',
                eolFrom: eolDate,
                latest: { name: '3.12.1' },
                isLts: false,
            };

            const result = await analyzer.analyzeProductRelease('python', release);

            expect(result.status).toBe(EolStatus.ACTIVE);
            expect(result.daysUntilEol).toBeGreaterThan(90);
        });

        it('should handle boolean EOL values', async () => {
            const activeRelease: Release = {
                name: '3.13',
                releaseDate: '2024-10-01',
                eolFrom: false,
                isEol: false,
                latest: { name: '3.13.0' },
            };

            const result = await analyzer.analyzeProductRelease('python', activeRelease);

            expect(result.status).toBe(EolStatus.ACTIVE);
            expect(result.eolDate).toBeNull();
        });

        it('should identify LTS versions', async () => {
            const ltsRelease: Release = {
                name: '20.04',
                releaseDate: '2020-04-23',
                eolFrom: '2025-04-02',
                latest: { name: '20.04.6' },
                isLts: true,
            };

            const result = await analyzer.analyzeProductRelease('ubuntu', ltsRelease);

            expect(result.isLts).toBe(true);
        });

        it('should handle LTS as date string', async () => {
            const ltsRelease: Release = {
                name: '14',
                releaseDate: '2019-09-23',
                eolFrom: '2029-09-30',
                latest: { name: '14.11.0' },
                ltsFrom: '2021-10-26',
            };

            const result = await analyzer.analyzeProductRelease('nodejs', ltsRelease);

            expect(result.isLts).toBe(true);
        });

        it('should identify discontinued products', async () => {
            const discontinuedRelease: Release = {
                name: '1.0',
                discontinued: '2020-01-01',
                latest: { name: '1.0.5' },
            };

            const result = await analyzer.analyzeProductRelease('app', discontinuedRelease);

            expect(result.isDiscontinued).toBe(true);
            expect(result.discontinuedDate).toMatch(/^(2019-12-31|2020-01-01)$/);
        });

        it('should calculate days since latest release correctly', async () => {
            const lastReleaseDate = '2023-01-01';
            const release: Release = {
                name: '3.0',
                latest: {
                    name: '3.0.1',
                    date: lastReleaseDate,
                }
            };

            const result = await analyzer.analyzeProductRelease('app', release);

            expect(result.latestReleaseDate).toBe(lastReleaseDate);
            expect(result.daysSinceLatestRelease).toBeGreaterThan(0);
        });
    });

    describe('analyzeMany', () => {
        it('should analyze multiple products', async () => {
            const pythonReleases = [
                {
                    name: '3.11',
                    releaseDate: '2022-10-24',
                    eolFrom: '2027-10-24',
                    latest: { name: '3.11.7' },
                },
            ];

            const nodejsReleases = [
                {
                    name: '20',
                    releaseDate: '2023-04-18',
                    eolFrom: '2026-04-30',
                    latest: { name: '20.10.0' },
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: { name: 'python', releases: pythonReleases }
                })
                .get('/api/v1/products/nodejs')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: { name: 'nodejs', releases: nodejsReleases }
                });

            const results = await analyzer.analyzeMany(['python', 'nodejs'], {});

            expect(results.totalProductsChecked).toBe(2);
            expect(results.totalReleasesChecked).toBe(2);
            expect(results.eolDetected).toBe(false);
        });

        it('should handle product-specific versions from releasesMap', async () => {
            const pythonReleases = [
                {
                    name: '3.11',
                    releaseDate: '2022-10-24',
                    eolFrom: '2027-10-24',
                    latest: { name: '3.11.7' },
                },
                {
                    name: '2.7',
                    releaseDate: '2010-07-03',
                    eolFrom: '2020-01-01',
                    latest: { name: '2.7.18' },
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: { name: 'python', releases: pythonReleases }
                });

            const results = await analyzer.analyzeMany(['python'], { python: ['3.11'] });

            expect(results.totalReleasesChecked).toBe(1);
            expect(results.products[0].release).toBe('3.11');
        });

        it('should generate summary correctly', async () => {
            const mockReleases = [
                {
                    name: '2.7',
                    releaseDate: '2010-07-03',
                    eolFrom: '2020-01-01',
                    latest: { name: '2.7.18' },
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: { name: 'python', releases: mockReleases }
                });

            const results = await analyzer.analyzeMany(['python'], {});

            expect(results.summary).toContain('Analyzed 1 releases for 1 products');
            expect(results.eolDetected).toBe(true);
        });
    });
});
