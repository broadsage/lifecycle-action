// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { EndOfLifeClient } from '../src/client';
import { EndOfLifeApiError } from '../src/types';
import nock from 'nock';

describe('EndOfLifeClient', () => {
    let client: EndOfLifeClient;
    const baseUrl = 'https://endoflife.date/api/v1';

    beforeEach(() => {
        client = new EndOfLifeClient(baseUrl, 3600);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('getAllProducts', () => {
        it('should fetch all products successfully', async () => {
            const mockProducts = [
                { name: 'python', label: 'Python' },
                { name: 'nodejs', label: 'Node.js' },
                { name: 'ubuntu', label: 'Ubuntu' },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getAllProducts();

            expect(products).toEqual(['python', 'nodejs', 'ubuntu']);
            expect(products).toHaveLength(3);
        });

        it('should handle API errors', async () => {
            nock('https://endoflife.date')
                .get('/api/v1/products')
                .reply(500, 'Internal Server Error');

            await expect(client.getAllProducts()).rejects.toThrow(EndOfLifeApiError);
        });

        it('should use cache for repeated requests', async () => {
            const mockProducts = [
                { name: 'python', label: 'Python' },
                { name: 'nodejs', label: 'Node.js' },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products')
                .once()
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            // First request
            const products1 = await client.getAllProducts();
            expect(products1).toEqual(['python', 'nodejs']);

            // Second request should use cache
            const products2 = await client.getAllProducts();
            expect(products2).toEqual(['python', 'nodejs']);
        });
    });

    describe('getProductReleases', () => {
        it('should fetch product releases successfully', async () => {
            const mockReleases = [
                {
                    name: '3.11',
                    releaseDate: '2022-10-24',
                    eolFrom: '2027-10-24',
                    latest: { name: '3.11.7' },
                    isLts: false,
                },
                {
                    name: '3.10',
                    releaseDate: '2021-10-04',
                    eolFrom: '2026-10-04',
                    latest: { name: '3.10.13' },
                    isLts: false,
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: {
                        name: 'python',
                        releases: mockReleases,
                    },
                });

            const releases = await client.getProductReleases('python');

            expect(releases).toEqual(mockReleases);
            expect(releases).toHaveLength(2);
        });

        it('should handle 404 for unknown products', async () => {
            nock('https://endoflife.date')
                .get('/api/v1/products/unknown-product')
                .reply(404, 'Not Found');

            await expect(
                client.getProductReleases('unknown-product')
            ).rejects.toThrow(EndOfLifeApiError);
        });
    });

    describe('getProductRelease', () => {
        it('should fetch specific release successfully', async () => {
            const mockRelease = {
                name: '3.11',
                releaseDate: '2022-10-24',
                eolFrom: '2027-10-24',
                latest: { name: '3.11.7' },
                isLts: false,
            };

            nock('https://endoflife.date')
                .get('/api/v1/products/python/releases/3.11')
                .reply(200, { schema_version: '1.2.0', result: mockRelease });

            const release = await client.getProductRelease('python', '3.11');

            expect(release).toEqual(mockRelease);
        });

        it('should handle releases with special characters', async () => {
            const mockRelease = {
                name: 'releng/14.0',
                releaseDate: '2023-11-20',
                eolFrom: '2028-11-30',
                latest: { name: '14.0' },
            };

            nock('https://endoflife.date')
                .get('/api/v1/products/freebsd/releases/releng%2F14.0')
                .reply(200, { schema_version: '1.2.0', result: mockRelease });

            const release = await client.getProductRelease('freebsd', 'releng/14.0');

            expect(release).toEqual(mockRelease);
        });
    });

    describe('rate limiting', () => {
        it('should retry on 429 response', async () => {
            const mockProducts = [{ name: 'python', label: 'Python' }];

            nock('https://endoflife.date')
                .get('/api/v1/products')
                .reply(429, 'Rate Limited')
                .get('/api/v1/products')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getAllProducts();

            expect(products).toEqual(['python']);
        }, 10000);
    });

    describe('getReleaseInfoWithFallback', () => {
        it('should find release with semantic version fallback', async () => {
            const mockRelease = {
                name: '3.11',
                releaseDate: '2022-10-24',
                eolFrom: '2027-10-24',
                latest: { name: '3.11.7' },
            };

            nock('https://endoflife.date')
                .get('/api/v1/products/python/releases/3.11.7')
                .reply(404, 'Not Found')
                .get('/api/v1/products/python/releases/3.11')
                .reply(200, { schema_version: '1.2.0', result: mockRelease });

            const result = await client.getReleaseInfoWithFallback('python', '3.11.7', true);

            expect(result).toEqual(mockRelease);
        });
    });

    describe('getIdentifiersByType', () => {
        it('should fetch identifiers by type successfully', async () => {
            const mockIdentifiers = [
                {
                    identifier: 'pkg:npm/express@4.17.1',
                    product: 'nodejs',
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/identifiers/purl')
                .reply(200, { schema_version: '1.2.0', result: mockIdentifiers });

            const identifiers = await client.getIdentifiersByType('purl');

            expect(identifiers).toEqual(mockIdentifiers);
            expect(identifiers).toHaveLength(1);
        });
    });
});
