// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { z } from 'zod';
import {
  Cycle,
  CycleSchema,
  AllProducts,
  ProductSummary,
  ProductSummarySchema,
  FullProduct,
  FullProductSchema,
  StringList,
  StringListSchema,
  IdentifierList,
  IdentifierListSchema,
  EndOfLifeApiError,
  ValidationError,
} from './types';
import { cleanVersion, getSemanticFallbacks } from './utils/version-utils';
import { getErrorMessage, handleClientError } from './utils/error-utils';

/**
 * Client for interacting with the EndOfLife.date API v1
 * API Documentation: https://endoflife.date/docs/api/v1/
 */
export class EndOfLifeClient {
  private httpClient: HttpClient;
  private baseUrl: string;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private cacheTtl: number;

  constructor(baseUrl = 'https://endoflife.date/api/v1', cacheTtl = 3600) {
    this.httpClient = new HttpClient('endoflife-action/v3', undefined, {
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
   * Make HTTP request with error handling and rate limit retry
   * Implements exponential backoff for 429 (Rate Limit) responses
   */
  private async request<T>(
    url: string,
    schema: z.ZodSchema<T>,
    retryAttempt = 0
  ): Promise<T> {
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

      // Handle rate limiting with exponential backoff
      if (response.message.statusCode === 429) {
        const maxRetries = 3;
        if (retryAttempt < maxRetries) {
          const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
          core.warning(
            `Rate limited (429). Retrying in ${delay}ms (attempt ${retryAttempt + 1}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request(url, schema, retryAttempt + 1);
        }
        throw new EndOfLifeApiError(
          'Rate limit exceeded. Max retries reached.',
          429
        );
      }

      if (response.message.statusCode !== 200) {
        throw new EndOfLifeApiError(
          `HTTP ${response.message.statusCode}: ${response.message.statusMessage}`,
          response.message.statusCode
        );
      }

      let data: any = JSON.parse(body);

      // Handle v1 API wrapper (result field)
      if (
        data &&
        typeof data === 'object' &&
        'result' in data &&
        'schema_version' in data
      ) {
        data = data.result;
      }

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
   * API v1: GET /products
   */
  async getAllProducts(): Promise<AllProducts> {
    const url = `${this.baseUrl}/products`;
    // v1 API returns an array of product objects with name, label, etc.
    // We need to extract just the names for backward compatibility
    const response = await this.request(
      url,
      z.array(
        z.object({
          name: z.string(),
          label: z.string().optional(),
          category: z.string().optional(),
        })
      )
    );
    return response.map((p) => p.name);
  }

  /**
   * Get all release cycles for a product
   * API v1: GET /products/{product}
   * Returns the full product object including releases array
   */
  async getProductCycles(product: string): Promise<Cycle[]> {
    const url = `${this.baseUrl}/products/${product}`;
    try {
      const response = await this.request(
        url,
        z.object({
          name: z.string(),
          label: z.string().optional(),
          releases: z.array(CycleSchema),
        })
      );
      return response.releases;
    } catch (error) {
      handleClientError(error, { product });
    }
  }

  /**
   * Get a specific release cycle for a product
   * API v1: GET /products/{product}/releases/{release}
   */
  async getProductCycle(product: string, cycle: string): Promise<Cycle> {
    // v1 API uses 'releases' instead of cycles, but the cycle name remains the same
    // URL-encode the cycle to handle special characters like slashes
    const encodedCycle = encodeURIComponent(cycle);
    const url = `${this.baseUrl}/products/${product}/releases/${encodedCycle}`;

    try {
      return await this.request(url, CycleSchema);
    } catch (error) {
      handleClientError(error, { product, cycle });
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
        core.debug(`Trying to fetch release info for ${product}/${v}`);
        const info = await this.getProductCycle(product, v);
        if (info) {
          core.info(`✓ Matched ${product} version ${version} to release ${v}`);
          return info;
        }
      } catch (error) {
        core.debug(`No release found for ${product}/${v}`);
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

  /**
   * Get full data for all products (bulk dump)
   * API v1: GET /products/full
   * Warning: This endpoint returns a large amount of data
   */
  async getProductsFullData(): Promise<FullProduct[]> {
    const url = `${this.baseUrl}/products/full`;
    return await this.request(url, z.array(FullProductSchema));
  }

  /**
   * Get the latest release cycle for a product
   * API v1: GET /products/{product}/releases/latest
   */
  async getLatestRelease(product: string): Promise<Cycle> {
    const url = `${this.baseUrl}/products/${product}/releases/latest`;
    try {
      return await this.request(url, CycleSchema);
    } catch (error) {
      handleClientError(error, { product });
    }
  }

  /**
   * Get all available categories
   * API v1: GET /categories
   */
  async getCategories(): Promise<StringList> {
    const url = `${this.baseUrl}/categories`;
    return await this.request(url, StringListSchema);
  }

  /**
   * Get all products in a specific category
   * API v1: GET /categories/{category}
   */
  async getProductsByCategory(category: string): Promise<ProductSummary[]> {
    const url = `${this.baseUrl}/categories/${category}`;
    return await this.request(url, z.array(ProductSummarySchema));
  }

  /**
   * Get all available tags
   * API v1: GET /tags
   */
  async getTags(): Promise<StringList> {
    const url = `${this.baseUrl}/tags`;
    return await this.request(url, StringListSchema);
  }

  /**
   * Get all products with a specific tag
   * API v1: GET /tags/{tag}
   */
  async getProductsByTag(tag: string): Promise<ProductSummary[]> {
    const url = `${this.baseUrl}/tags/${tag}`;
    return await this.request(url, z.array(ProductSummarySchema));
  }

  /**
   * Get all identifier types (e.g., purl, cpe)
   * API v1: GET /identifiers
   */
  async getIdentifierTypes(): Promise<StringList> {
    const url = `${this.baseUrl}/identifiers`;
    return await this.request(url, StringListSchema);
  }

  /**
   * Get all identifiers for a specific type
   * API v1: GET /identifiers/{identifier_type}
   * @param identifierType - Type of identifier (e.g., 'purl', 'cpe')
   * @returns List of identifiers with their associated products
   * @example
   * const purls = await client.getIdentifiersByType('purl');
   * // Returns: [{ identifier: 'pkg:npm/express@4.17.1', product: 'nodejs' }, ...]
   */
  async getIdentifiersByType(identifierType: string): Promise<IdentifierList> {
    const url = `${this.baseUrl}/identifiers/${identifierType}`;
    return await this.request(url, IdentifierListSchema);
  }
}
