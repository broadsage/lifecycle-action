// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

/**
 * Shared test fixtures and mock data for unit tests
 * This eliminates code duplication across test files
 */

import { ProductVersionInfo, ActionResults, EolStatus, Release } from '../../src/types';

/**
 * Default mock product for testing
 */
export const mockProductDefaults: ProductVersionInfo = {
    product: 'python',
    release: '3.7',
    status: EolStatus.END_OF_LIFE,
    eolDate: '2023-06-27',
    daysUntilEol: -500,
    releaseDate: '2018-06-27',
    latestVersion: '3.7.17',
    isLts: false,
    supportDate: null,
    link: 'https://endoflife.date/python',
    discontinuedDate: null,
    isDiscontinued: false,
    extendedSupportDate: null,
    hasExtendedSupport: false,
    latestReleaseDate: null,
    daysSinceLatestRelease: null,
    rawData: {
        name: '3.7',
        eolFrom: '2023-06-27',
        latest: { name: '3.7.17' },
        releaseDate: '2018-06-27',
    },
};

/**
 * Creates a mock ProductVersionInfo with optional overrides
 * @param overrides - Partial product info to override defaults
 * @returns Complete ProductVersionInfo object
 */
export function createMockProduct(
    overrides: Partial<ProductVersionInfo> = {}
): ProductVersionInfo {
    return {
        ...mockProductDefaults,
        ...overrides,
        rawData: {
            ...mockProductDefaults.rawData,
            ...(overrides.rawData || {}),
        },
    };
}

/**
 * Creates a mock ActionResults with optional overrides
 * @param overrides - Partial results to override defaults
 * @returns Complete ActionResults object
 */
export function createMockResults(
    overrides: Partial<ActionResults> = {}
): ActionResults {
    const defaults: ActionResults = {
        eolDetected: true,
        approachingEol: false,
        staleDetected: false,
        discontinuedDetected: false,
        totalProductsChecked: 1,
        totalReleasesChecked: 1,
        products: [mockProductDefaults],
        eolProducts: [mockProductDefaults],
        approachingEolProducts: [],
        staleProducts: [],
        discontinuedProducts: [],
        extendedSupportProducts: [],
        latestVersions: { python: '3.12.0' },
        summary: 'EOL detected',
    };
    return { ...defaults, ...overrides };
}

/**
 * Creates a mock Release with optional overrides
 * @param overrides - Partial release info to override defaults
 * @returns Complete Release object
 */
export function createMockRelease(overrides: Partial<Release> = {}): Release {
    const defaults: Release = {
        name: '3.7',
        releaseDate: '2018-06-27',
        eolFrom: '2023-06-27',
        latest: { name: '3.7.17' },
        link: 'https://endoflife.date/python',
        isLts: false,
    };
    return { ...defaults, ...overrides };
}

/**
 * Common test products for various scenarios
 */
export const testProducts = {
    /** End-of-life product */
    eol: createMockProduct({
        product: 'python',
        release: '2.7',
        status: EolStatus.END_OF_LIFE,
        eolDate: '2020-01-01',
        daysUntilEol: -1800,
        rawData: {
            name: '2.7',
            eolFrom: '2020-01-01',
            releaseDate: '2010-07-03',
            latest: { name: '2.7.18' }
        }
    }),

    /** Active product */
    active: createMockProduct({
        product: 'python',
        release: '3.12',
        status: EolStatus.ACTIVE,
        eolDate: '2028-10-02',
        daysUntilEol: 1400,
        isLts: true,
        rawData: {
            name: '3.12',
            eolFrom: '2028-10-02',
            releaseDate: '2023-10-02',
            latest: { name: '3.12.1' },
            isLts: true
        }
    }),

    /** Approaching EOL product */
    approaching: createMockProduct({
        product: 'nodejs',
        release: '18',
        status: EolStatus.APPROACHING_EOL,
        eolDate: '2025-04-30',
        daysUntilEol: 45,
        isLts: true,
        rawData: {
            name: '18',
            eolFrom: '2025-04-30',
            releaseDate: '2022-04-19',
            latest: { name: '18.19.0' },
            isLts: true
        }
    }),

    /** Discontinued hardware */
    discontinued: createMockProduct({
        product: 'iphone',
        release: '6s',
        status: EolStatus.END_OF_LIFE,
        eolDate: '2022-09-12',
        daysUntilEol: -800,
        discontinuedDate: '2018-09-12',
        isDiscontinued: true,
        rawData: {
            name: '6s',
            discontinued: '2018-09-12',
            isEol: true
        }
    }),

    /** Product with extended support */
    extendedSupport: createMockProduct({
        product: 'ubuntu',
        release: '18.04',
        status: EolStatus.ACTIVE,
        eolDate: '2023-05-31',
        extendedSupportDate: '2028-04-30',
        hasExtendedSupport: true,
        rawData: {
            name: '18.04',
            eolFrom: '2023-05-31',
            eoasFrom: '2028-04-30',
            isEoas: true
        }
    }),

    /** Stale product (no recent releases) */
    stale: createMockProduct({
        product: 'python',
        release: '3.9',
        status: EolStatus.ACTIVE,
        eolDate: '2025-10-05',
        latestReleaseDate: '2022-01-01',
        daysSinceLatestRelease: 800,
        rawData: {
            name: '3.9',
            eolFrom: '2025-10-05',
            latest: { name: '3.9.10', date: '2022-01-01' }
        }
    }),
};

/**
 * Common test results for various scenarios
 */
export const testResults = {
    /** No issues detected */
    clean: createMockResults({
        eolDetected: false,
        approachingEol: false,
        staleDetected: false,
        discontinuedDetected: false,
        products: [testProducts.active],
        eolProducts: [],
        approachingEolProducts: [],
        staleProducts: [],
        discontinuedProducts: [],
        summary: 'All products are actively supported',
    }),

    /** EOL detected */
    eolDetected: createMockResults({
        eolDetected: true,
        products: [testProducts.eol],
        eolProducts: [testProducts.eol],
        summary: 'EOL detected for 1 product',
    }),

    /** Multiple issues */
    multipleIssues: createMockResults({
        eolDetected: true,
        approachingEol: true,
        staleDetected: true,
        discontinuedDetected: true,
        totalProductsChecked: 4,
        totalReleasesChecked: 4,
        products: [
            testProducts.eol,
            testProducts.approaching,
            testProducts.stale,
            testProducts.discontinued,
        ],
        eolProducts: [testProducts.eol],
        approachingEolProducts: [testProducts.approaching],
        staleProducts: [testProducts.stale],
        discontinuedProducts: [testProducts.discontinued],
        summary: 'Multiple issues detected',
    }),
};
