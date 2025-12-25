// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 BroadSage

import { EndOfLifeClient } from '../src/client';
import { EndOfLifeApiError } from '../src/types';
import nock from 'nock';

describe('EndOfLifeClient', () => {
    let client: EndOfLifeClient;
    const baseUrl = 'https://endoflife.date';

    beforeEach(() => {
        client = new EndOfLifeClient(baseUrl, 3600);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('getAllProducts', () => {
        it('should fetch all products successfully', async () => {
            const mockProducts = ['python', 'nodejs', 'ubuntu'];

            nock(baseUrl)
                .get('/api/all.json')
                .reply(200, mockProducts);

            const products = await client.getAllProducts();

            expect(products).toEqual(mockProducts);
            expect(products).toHaveLength(3);
        });

        it('should handle API errors', async () => {
            nock(baseUrl)
                .get('/api/all.json')
                .reply(500, 'Internal Server Error');

            await expect(client.getAllProducts()).rejects.toThrow(EndOfLifeApiError);
        });

        it('should use cache for repeated requests', async () => {
            const mockProducts = ['python', 'nodejs'];

            nock(baseUrl)
                .get('/api/all.json')
                .once()
                .reply(200, mockProducts);

            // First request
            const products1 = await client.getAllProducts();
            expect(products1).toEqual(mockProducts);

            // Second request should use cache (no new HTTP call)
            const products2 = await client.getAllProducts();
            expect(products2).toEqual(mockProducts);

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
                .get('/api/python.json')
                .reply(200, mockCycles);

            const cycles = await client.getProductCycles('python');

            expect(cycles).toEqual(mockCycles);
            expect(cycles).toHaveLength(2);
        });

        it('should handle 404 for unknown products', async () => {
            nock(baseUrl)
                .get('/api/unknown-product.json')
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
                .get('/api/python.json')
                .reply(200, invalidResponse);

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
                .get('/api/python/3.11.json')
                .reply(200, mockCycle);

            const cycle = await client.getProductCycle('python', '3.11');

            expect(cycle).toEqual(mockCycle);
        });

        it('should normalize cycle names with slashes', async () => {
            const mockCycle = {
                cycle: 'releng/14.0',
                releaseDate: '2023-11-20',
                eol: '2028-11-30',
                latest: '14.0',
            };

            nock(baseUrl)
                .get('/api/freebsd/releng-14.0.json')
                .reply(200, mockCycle);

            const cycle = await client.getProductCycle('freebsd', 'releng/14.0');

            expect(cycle).toEqual(mockCycle);
        });

        it('should handle 404 for unknown cycles', async () => {
            nock(baseUrl)
                .get('/api/python/99.99.json')
                .reply(404, 'Not Found');

            await expect(
                client.getProductCycle('python', '99.99')
            ).rejects.toThrow(EndOfLifeApiError);
        });
    });

    describe('cache management', () => {
        it('should clear cache', async () => {
            const mockProducts = ['python'];

            nock(baseUrl)
                .get('/api/all.json')
                .reply(200, mockProducts);

            await client.getAllProducts();

            let stats = client.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);

            client.clearCache();

            stats = client.getCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should expire cache after TTL', async () => {
            const shortTtlClient = new EndOfLifeClient(baseUrl, 1); // 1 second TTL
            const mockProducts = ['python'];

            nock(baseUrl)
                .get('/api/all.json')
                .times(2)
                .reply(200, mockProducts);

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
                .get('/api/python.json')
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
                .get('/api/python/3.11.json')
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
});
