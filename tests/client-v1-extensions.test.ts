// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { EndOfLifeClient } from '../src/client';
import nock from 'nock';

describe('EndOfLifeClient - v1 API Extensions', () => {
    let client: EndOfLifeClient;
    const baseUrl = 'https://endoflife.date/api/v1';

    beforeEach(() => {
        client = new EndOfLifeClient(baseUrl, 3600);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('getProductsFullData', () => {
        it('should fetch full data for all products', async () => {
            const mockFullData = [
                {
                    name: 'python',
                    label: 'Python',
                    category: 'lang',
                    releases: [
                        {
                            name: '3.12',
                            releaseDate: '2023-10-02',
                            eolFrom: '2028-10-02',
                            latest: { name: '3.12.1' },
                            isLts: false,
                        },
                    ],
                },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/products/full')
                .reply(200, { schema_version: '1.2.0', result: mockFullData });

            const products = await client.getProductsFullData();

            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('python');
            expect(products[0].releases).toHaveLength(1);
        });
    });

    describe('getLatestRelease', () => {
        it('should fetch latest release for a product', async () => {
            const mockLatest = {
                name: '3.12',
                releaseDate: '2023-10-02',
                eolFrom: '2028-10-02',
                latest: { name: '3.12.1' },
                isLts: false,
            };

            nock('https://endoflife.date')
                .get('/api/v1/products/python/releases/latest')
                .reply(200, { schema_version: '1.2.0', result: mockLatest });

            const latest = await client.getLatestRelease('python');

            expect(latest.name).toBe('3.12');
        });
    });

    describe('getCategories', () => {
        it('should fetch all categories', async () => {
            const mockCategories = ['lang', 'os'];

            nock('https://endoflife.date')
                .get('/api/v1/categories')
                .reply(200, mockCategories);

            const categories = await client.getCategories();

            expect(categories).toEqual(mockCategories);
        });
    });

    describe('getProductsByCategory', () => {
        it('should fetch products in a category', async () => {
            const mockProducts = [
                { name: 'python', label: 'Python', category: 'lang' },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/categories/lang')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getProductsByCategory('lang');

            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('python');
        });
    });

    describe('getTags', () => {
        it('should fetch all tags', async () => {
            const mockTags = ['database', 'web-server'];

            nock('https://endoflife.date')
                .get('/api/v1/tags')
                .reply(200, mockTags);

            const tags = await client.getTags();

            expect(tags).toEqual(mockTags);
        });
    });

    describe('getProductsByTag', () => {
        it('should fetch products with a tag', async () => {
            const mockProducts = [
                { name: 'postgresql', label: 'PostgreSQL', category: 'db' },
            ];

            nock('https://endoflife.date')
                .get('/api/v1/tags/database')
                .reply(200, { schema_version: '1.2.0', result: mockProducts });

            const products = await client.getProductsByTag('database');

            expect(products).toHaveLength(1);
        });
    });

    describe('getIdentifierTypes', () => {
        it('should fetch all identifier types', async () => {
            const mockTypes = ['purl', 'cpe'];

            nock('https://endoflife.date')
                .get('/api/v1/identifiers')
                .reply(200, mockTypes);

            const types = await client.getIdentifierTypes();

            expect(types).toEqual(mockTypes);
        });
    });
});
