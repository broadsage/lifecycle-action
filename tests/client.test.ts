// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { EndOfLifeClient } from '../src/client';
import { EndOfLifeApiError } from '../src/types';
import nock from 'nock';

describe('EndOfLifeClient', () => {
    let client: EndOfLifeClient;
    const baseUrl = 'https://endoflife.date';

    beforeEach(() => {
        client = new EndOfLifeClient(`${baseUrl}/api/v1`, 3600);
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

            nock(baseUrl)
                .get('/api/v1/products')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getAllProducts();

            expect(products).toEqual(['python', 'nodejs', 'ubuntu']);
            expect(products).toHaveLength(3);
        });

        it('should handle API errors', async () => {
            nock(baseUrl)
                .get('/api/v1/products')
                .reply(500, 'Internal Server Error');

            await expect(client.getAllProducts()).rejects.toThrow(EndOfLifeApiError);
        });

        it('should use cache for repeated requests', async () => {
            const mockProducts = [
                { name: 'python', label: 'Python' },
                { name: 'nodejs', label: 'Node.js' },
            ];

            nock(baseUrl)
                .get('/api/v1/products')
                .once()
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            // First request
            const products1 = await client.getAllProducts();
            expect(products1).toEqual(['python', 'nodejs']);

            // Second request should use cache (no new HTTP call)
            const products2 = await client.getAllProducts();
            expect(products2).toEqual(['python', 'nodejs']);

            // Verify cache stats
            const stats = client.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);
        });
    });

    describe('getProductCycles', () => {
        it('should fetch product cycles successfully', async () => {
            const mockCycles = [
                {
                    cycle: '3.11',
                    releaseDate: '2022-10-24',
                    eol: '2027-10-24',
                    latest: '3.11.7',
                    lts: false,
                },
                {
                    cycle: '3.10',
                    releaseDate: '2021-10-04',
                    eol: '2026-10-04',
                    latest: '3.10.13',
                    lts: false,
                },
            ];

            nock(baseUrl)
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: {
                        name: 'python',
                        label: 'Python',
                        releases: mockCycles,
                    },
                });

            const cycles = await client.getProductCycles('python');

            expect(cycles).toEqual(mockCycles);
            expect(cycles).toHaveLength(2);
        });

        it('should handle 404 for unknown products', async () => {
            nock(baseUrl)
                .get('/api/v1/products/unknown-product')
                .reply(404, 'Not Found');

            await expect(
                client.getProductCycles('unknown-product')
            ).rejects.toThrow(EndOfLifeApiError);
        });

        it('should validate response schema', async () => {
            const invalidResponse = [
                {
                    // Missing required fields
                    invalidField: 'test',
                },
            ];

            nock(baseUrl)
                .get('/api/v1/products/python')
                .reply(200, {
                    schema_version: '1.2.0',
                    result: {
                        name: 'python',
                        label: 'Python',
                        releases: invalidResponse,
                    },
                });

            await expect(client.getProductCycles('python')).rejects.toThrow();
        });
    });

    describe('getProductCycle', () => {
        it('should fetch specific cycle successfully', async () => {
            const mockCycle = {
                cycle: '3.11',
                releaseDate: '2022-10-24',
                eol: '2027-10-24',
                latest: '3.11.7',
                lts: false,
            };

            nock(baseUrl)
                .get('/api/v1/products/python/releases/3.11')
                .reply(200, { schema_version: '1.2.0', result: mockCycle });

            const cycle = await client.getProductCycle('python', '3.11');

            expect(cycle).toEqual(mockCycle);
        });

        it('should handle cycles with special characters', async () => {
            const mockCycle = {
                cycle: 'releng/14.0',
                releaseDate: '2023-11-20',
                eol: '2028-11-30',
                latest: '14.0',
            };

            nock(baseUrl)
                .get('/api/v1/products/freebsd/releases/releng%2F14.0')
                .reply(200, { schema_version: '1.2.0', result: mockCycle });

            const cycle = await client.getProductCycle('freebsd', 'releng/14.0');

            expect(cycle).toEqual(mockCycle);
        });

        it('should handle 404 for unknown cycles', async () => {
            nock(baseUrl)
                .get('/api/v1/products/python/releases/99.99')
                .reply(404, 'Not Found');

            await expect(
                client.getProductCycle('python', '99.99')
            ).rejects.toThrow(EndOfLifeApiError);
        });
    });

    describe('cache management', () => {
        it('should clear cache', async () => {
            const mockProducts = [{ name: 'python', label: 'Python' }];

            nock(baseUrl)
                .get('/api/v1/products')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            await client.getAllProducts();

            let stats = client.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);

            client.clearCache();

            stats = client.getCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should expire cache after TTL', async () => {
            const shortTtlClient = new EndOfLifeClient(`${baseUrl}/api/v1`, 1); // 1 second TTL
            const mockProducts = [{ name: 'python', label: 'Python' }];

            nock(baseUrl)
                .get('/api/v1/products')
                .times(2)
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            // First request
            await shortTtlClient.getAllProducts();

            // Wait for cache to expire
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Second request should make new HTTP call
            await shortTtlClient.getAllProducts();

            expect(nock.isDone()).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should include product in error for product-specific calls', async () => {
            nock(baseUrl)
                .get('/api/v1/products/python')
                .reply(500, 'Server Error');

            try {
                await client.getProductCycles('python');
                fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(EndOfLifeApiError);
                expect((error as EndOfLifeApiError).product).toBe('python');
            }
        });

        it('should include cycle in error for cycle-specific calls', async () => {
            nock(baseUrl)
                .get('/api/v1/products/python/releases/3.11')
                .reply(500, 'Server Error');

            try {
                await client.getProductCycle('python', '3.11');
                fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(EndOfLifeApiError);
                expect((error as EndOfLifeApiError).product).toBe('python');
                expect((error as EndOfLifeApiError).cycle).toBe('3.11');
            }
        });
    });

    describe('rate limiting', () => {
        it('should retry on 429 response with exponential backoff', async () => {
            const mockProducts = [{ name: 'python', label: 'Python' }];

            // First response is 429, second is success
            nock(baseUrl)
                .get('/api/v1/products')
                .reply(429, 'Rate Limited')
                .get('/api/v1/products')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getAllProducts();

            expect(products).toEqual(['python']);
            expect(nock.isDone()).toBe(true);
        }, 10000);

        it('should throw error after max retries on 429', async () => {
            // All requests return 429
            nock(baseUrl)
                .get('/api/v1/products')
                .times(4)
                .reply(429, 'Rate Limited');

            await expect(client.getAllProducts()).rejects.toThrow(
                'Rate limit exceeded. Max retries reached'
            );
        }, 20000);
    });

    describe('getCycleInfoWithFallback', () => {
        it('should find cycle with semantic version fallback', async () => {
            const mockCycle = {
                cycle: '3.11',
                releaseDate: '2022-10-24',
                eol: '2027-10-24',
                latest: '3.11.7',
            };

            // First try 3.11.7 - returns 404
            nock(baseUrl)
                .get('/api/v1/products/python/releases/3.11.7')
                .reply(404, 'Not Found')
                // Then try 3.11 - returns success
                .get('/api/v1/products/python/releases/3.11')
                .reply(200, { schema_version: '1.2.0', result: mockCycle });

            const result = await client.getCycleInfoWithFallback('python', '3.11.7', true);

            expect(result).toEqual(mockCycle);
        });

        it('should return null when no fallback matches', async () => {
            // All fallback attempts fail
            nock(baseUrl)
                .get('/api/v1/products/python/releases/99.99.99')
                .reply(404, 'Not Found')
                .get('/api/v1/products/python/releases/99.99')
                .reply(404, 'Not Found')
                .get('/api/v1/products/python/releases/99')
                .reply(404, 'Not Found');

            const result = await client.getCycleInfoWithFallback('python', '99.99.99', true);

            expect(result).toBeNull();
        });

        it('should not use fallback when disabled', async () => {
            nock(baseUrl)
                .get('/api/v1/products/python/releases/3.11.7')
                .reply(404, 'Not Found');

            const result = await client.getCycleInfoWithFallback('python', '3.11.7', false);

            expect(result).toBeNull();
        });

        it('should return cycle on first match', async () => {
            const mockCycle = {
                cycle: '3.11.7',
                releaseDate: '2022-10-24',
                eol: '2027-10-24',
                latest: '3.11.7',
            };

            nock(baseUrl)
                .get('/api/v1/products/python/releases/3.11.7')
                .reply(200, { schema_version: '1.2.0', result: mockCycle });

            const result = await client.getCycleInfoWithFallback('python', '3.11.7', true);

            expect(result).toEqual(mockCycle);
        });
    });

    describe('getIdentifiersByType', () => {
        it('should fetch identifiers by type successfully', async () => {
            const mockIdentifiers = [
                {
                    identifier: 'pkg:npm/express@4.17.1',
                    product: 'nodejs',
                },
                {
                    identifier: 'pkg:npm/react@18.2.0',
                    product: 'nodejs',
                },
            ];

            nock(baseUrl)
                .get('/api/v1/identifiers/purl')
                .reply(200, { schema_version: '1.2.0', result: mockIdentifiers });

            const identifiers = await client.getIdentifiersByType('purl');

            expect(identifiers).toEqual(mockIdentifiers);
            expect(identifiers).toHaveLength(2);
            expect(identifiers[0].identifier).toBe('pkg:npm/express@4.17.1');
            expect(identifiers[0].product).toBe('nodejs');
        });

        it('should handle 404 for unknown identifier types', async () => {
            nock(baseUrl)
                .get('/api/v1/identifiers/unknown-type')
                .reply(404, 'Not Found');

            await expect(
                client.getIdentifiersByType('unknown-type')
            ).rejects.toThrow(EndOfLifeApiError);
        });

        it('should use cache for repeated identifier requests', async () => {
            const mockIdentifiers = [
                {
                    identifier: 'cpe:2.3:a:python:python:3.11.0',
                    product: 'python',
                },
            ];

            nock(baseUrl)
                .get('/api/v1/identifiers/cpe')
                .once()
                .reply(200, { schema_version: '1.2.0', result: mockIdentifiers });

            // First request
            const identifiers1 = await client.getIdentifiersByType('cpe');
            expect(identifiers1).toEqual(mockIdentifiers);

            // Second request should use cache
            const identifiers2 = await client.getIdentifiersByType('cpe');
            expect(identifiers2).toEqual(mockIdentifiers);
        });

        it('should validate identifier response schema', async () => {
            const invalidResponse = [
                {
                    // Missing required 'product' field
                    identifier: 'pkg:npm/express@4.17.1',
                },
            ];

            nock(baseUrl)
                .get('/api/v1/identifiers/purl')
                .reply(200, { schema_version: '1.2.0', result: invalidResponse });

            await expect(client.getIdentifiersByType('purl')).rejects.toThrow();
        });
    });
});
