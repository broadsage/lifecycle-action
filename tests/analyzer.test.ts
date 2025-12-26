// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { EolAnalyzer } from '../src/analyzer';
import { EndOfLifeClient } from '../src/client';
import { EolStatus, Cycle } from '../src/types';
import nock from 'nock';

describe('EolAnalyzer', () => {
    let client: EndOfLifeClient;
    let analyzer: EolAnalyzer;
    const baseUrl = 'https://endoflife.date';

    beforeEach(() => {
        client = new EndOfLifeClient(baseUrl, 3600);
        analyzer = new EolAnalyzer(client, 90);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('analyzeProductCycle', () => {
        it('should identify end-of-life versions', async () => {
            const cycle: Cycle = {
                cycle: '2.7',
                releaseDate: '2010-07-03',
                eol: '2020-01-01',
                latest: '2.7.18',
                lts: false,
            };

            const result = await analyzer.analyzeProductCycle('python', cycle);

            expect(result.status).toBe(EolStatus.END_OF_LIFE);
            expect(result.product).toBe('python');
            expect(result.cycle).toBe('2.7');
            // EOL date should be 2020-01-01 or 2019-12-31 depending on timezone
            expect(result.eolDate).toMatch(/^(2019-12-31|2020-01-01)$/);
            expect(result.daysUntilEol).toBeLessThan(0);
        });

        it('should identify versions approaching EOL', async () => {
            // Create a date 30 days in the future
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            const eolDate = futureDate.toISOString().split('T')[0];

            const cycle: Cycle = {
                cycle: '3.9',
                releaseDate: '2020-10-05',
                eol: eolDate,
                latest: '3.9.18',
                lts: false,
            };

            const result = await analyzer.analyzeProductCycle('python', cycle);

            expect(result.status).toBe(EolStatus.APPROACHING_EOL);
            expect(result.daysUntilEol).toBeGreaterThan(0);
            expect(result.daysUntilEol).toBeLessThanOrEqual(90);
        });

        it('should identify active versions', async () => {
            // Create a date 365 days in the future
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 365);
            const eolDate = futureDate.toISOString().split('T')[0];

            const cycle: Cycle = {
                cycle: '3.12',
                releaseDate: '2023-10-02',
                eol: eolDate,
                latest: '3.12.1',
                lts: false,
            };

            const result = await analyzer.analyzeProductCycle('python', cycle);

            expect(result.status).toBe(EolStatus.ACTIVE);
            expect(result.daysUntilEol).toBeGreaterThan(90);
        });

        it('should handle boolean EOL values', async () => {
            const activeCycle: Cycle = {
                cycle: '3.13',
                releaseDate: '2024-10-01',
                eol: true, // Still supported
                latest: '3.13.0',
            };

            const result = await analyzer.analyzeProductCycle('python', activeCycle);

            expect(result.status).toBe(EolStatus.ACTIVE);
            expect(result.eolDate).toBeNull();
        });

        it('should identify LTS versions', async () => {
            const ltsCycle: Cycle = {
                cycle: '20.04',
                releaseDate: '2020-04-23',
                eol: '2025-04-02',
                latest: '20.04.6',
                lts: true,
            };

            const result = await analyzer.analyzeProductCycle('ubuntu', ltsCycle);

            expect(result.isLts).toBe(true);
        });

        it('should handle LTS as date string', async () => {
            const ltsCycle: Cycle = {
                cycle: '14',
                releaseDate: '2019-09-23',
                eol: '2029-09-30',
                latest: '14.11.0',
                lts: '2021-10-26',
            };

            const result = await analyzer.analyzeProductCycle('nodejs', ltsCycle);

            expect(result.isLts).toBe(true);
        });
    });

    describe('analyzeProduct', () => {
        it('should analyze all cycles of a product', async () => {
            const mockCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                    lts: false,
                },
                {
                    cycle: '2.7',
                    releaseDate: '2010-07-03',
                    eol: '2020-01-01',
                    latest: '2.7.18',
                    lts: false,
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, mockCycles);

            const results = await analyzer.analyzeProduct('python');

            expect(results).toHaveLength(2);
            expect(results[0].cycle).toBe('3.11');
            expect(results[1].cycle).toBe('2.7');
            expect(results[1].status).toBe(EolStatus.END_OF_LIFE);
        });

        it('should filter to specific cycles when provided', async () => {
            const mockCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                },
                {
                    cycle: '3.10',
                    releaseDate: '2021-10-04',
                    eol: '2026-10-04',
                    latest: '3.10.13',
                },
                {
                    cycle: '2.7',
                    releaseDate: '2010-07-03',
                    eol: '2020-01-01',
                    latest: '2.7.18',
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, mockCycles);

            const results = await analyzer.analyzeProduct('python', ['3.11', '3.10']);

            expect(results).toHaveLength(2);
            expect(results.map((r) => r.cycle)).toEqual(['3.11', '3.10']);
        });
    });

    describe('analyzeProducts', () => {
        it('should analyze multiple products', async () => {
            const pythonCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                },
            ];

            const nodejsCycles = [
                {
                    cycle: '20',
                    releaseDate: '2023-04-18',
                    eol: '2026-04-30',
                    latest: '20.10.0',
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, pythonCycles);

            nock(baseUrl)
                .get('/api/nodejs.json')
                .reply(200, nodejsCycles);

            const results = await analyzer.analyzeProducts(['python', 'nodejs']);

            expect(results.totalProductsChecked).toBe(2);
            expect(results.totalCyclesChecked).toBe(2);
            expect(results.products).toHaveLength(2);
        });

        it('should generate summary correctly', async () => {
            const mockCycles = [
                {
                    cycle: '2.7',
                    releaseDate: '2010-07-03',
                    eol: '2020-01-01',
                    latest: '2.7.18',
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, mockCycles);

            const results = await analyzer.analyzeProducts(['python']);

            expect(results.summary).toContain('End-of-Life Detected');
            expect(results.eolDetected).toBe(true);
            expect(results.eolProducts).toHaveLength(1);
        });

        it('should handle product-specific cycles', async () => {
            const pythonCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                },
                {
                    cycle: '3.10',
                    releaseDate: '2021-10-04',
                    eol: '2026-10-04',
                    latest: '3.10.13',
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, pythonCycles);

            const cyclesMap = {
                python: ['3.11'],
            };

            const results = await analyzer.analyzeProducts(['python'], cyclesMap);

            expect(results.totalCyclesChecked).toBe(1);
            expect(results.products[0].cycle).toBe('3.11');
        });

        it('should extract latest versions', async () => {
            const mockCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                },
            ];

            nock(baseUrl)
                .get('/api/python.json')
                .reply(200, mockCycles);

            const results = await analyzer.analyzeProducts(['python']);

            expect(results.latestVersions).toHaveProperty('python');
            expect(results.latestVersions.python).toBe('3.11.7');
        });
    });
});
