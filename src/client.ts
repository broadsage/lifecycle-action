// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 BroadSage

import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { z } from 'zod';
import {
    Cycle,
    CycleSchema,
    AllProducts,
    AllProductsSchema,
    EndOfLifeApiError,
    ValidationError,
} from './types';
import { cleanVersion, getSemanticFallbacks } from './utils/version-utils';
import { getErrorMessage } from './utils/error-utils';

/**
 * Client for interacting with the EndOfLife.date API
 */
export class EndOfLifeClient {
    private httpClient: HttpClient;
    private baseUrl: string;
    private cache: Map<string, { data: unknown; timestamp: number }>;
    private cacheTtl: number;

    constructor(baseUrl = 'https://endoflife.date', cacheTtl = 3600) {
        this.httpClient = new HttpClient('endoflife-action', undefined, {
            allowRetries: true,
            maxRetries: 3,
        });
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTtl = cacheTtl * 1000; // Convert to milliseconds
    }

    /**
     * Get cached data if available and not expired
     */
    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTtl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    /**
     * Set cache data
     */
    private setCache(key: string, data: unknown): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Make HTTP request with error handling
     */
    private async request<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
        const cacheKey = url;
        const cached = this.getCached<T>(cacheKey);
        if (cached) {
            core.debug(`Cache hit for ${url}`);
            return cached;
        }

        core.debug(`Fetching ${url}`);

        try {
            const response = await this.httpClient.get(url);
            const body = await response.readBody();

            if (response.message.statusCode !== 200) {
                throw new EndOfLifeApiError(
                    `HTTP ${response.message.statusCode}: ${response.message.statusMessage}`,
                    response.message.statusCode
                );
            }

            const data: unknown = JSON.parse(body);
            const validated = schema.parse(data);
            this.setCache(cacheKey, validated);

            return validated;
        } catch (error) {
            if (error instanceof EndOfLifeApiError) {
                throw error;
            }
            if (error instanceof z.ZodError) {
                throw new ValidationError('API response validation failed', error);
            }
            throw new EndOfLifeApiError(
                `Failed to fetch ${url}: ${getErrorMessage(error)}`
            );
        }
    }

    /**
     * Get all available products
     */
    async getAllProducts(): Promise<AllProducts> {
        const url = `${this.baseUrl}/api/all.json`;
        return this.request(url, AllProductsSchema);
    }

    /**
     * Get all cycles for a product
     */
    async getProductCycles(product: string): Promise<Cycle[]> {
        const url = `${this.baseUrl}/api/${product}.json`;
        try {
            return await this.request(url, z.array(CycleSchema));
        } catch (error) {
            if (error instanceof EndOfLifeApiError) {
                error.product = product;
            }
            throw error;
        }
    }

    /**
     * Get a specific cycle for a product
     */
    async getProductCycle(product: string, cycle: string): Promise<Cycle> {
        // Replace slashes with dashes as per API spec
        const normalizedCycle = cycle.replace(/\//g, '-');
        const url = `${this.baseUrl}/api/${product}/${normalizedCycle}.json`;

        try {
            return await this.request(url, CycleSchema);
        } catch (error) {
            if (error instanceof EndOfLifeApiError) {
                error.product = product;
                error.cycle = cycle;
            }
            throw error;
        }
    }

    /**
     * Get cycle info with semantic version fallback
     * Tries version patterns: 1.2.3 → 1.2 → 1
     */
    async getCycleInfoWithFallback(
        product: string,
        version: string,
        enableFallback: boolean
    ): Promise<Cycle | null> {
        const versions = enableFallback
            ? getSemanticFallbacks(version)
            : [cleanVersion(version)];

        for (const v of versions) {
            try {
                core.debug(`Trying to fetch cycle info for ${product}/${v}`);
                const info = await this.getProductCycle(product, v);
                if (info) {
                    core.info(`✓ Matched ${product} version ${version} to cycle ${v}`);
                    return info;
                }
            } catch (error) {
                core.debug(`No cycle found for ${product}/${v}`);
            }
        }

        return null;
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}
