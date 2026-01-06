// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { z } from 'zod';
import {
  Release,
  ReleaseSchema,
  FullProductSchema,
  IdentifierList,
  IdentifierListSchema,
  EndOfLifeApiError,
  ValidationError,
  AllProductsSchema,
  ProductSummarySchema,
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

      const data: any = JSON.parse(body);
      let finalData = data;

      // Unpack v1 response if it's wrapped
      if (
        data &&
        typeof data === 'object' &&
        'schema_version' in data &&
        'result' in data
      ) {
        finalData = data.result;
      }

      const validated = schema.parse(finalData);
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
  async getAllProducts(): Promise<string[]> {
    const url = `${this.baseUrl}/products`;
    const response = await this.request(url, AllProductsSchema);
    return response.map((p) => p.name);
  }

  /**
   * Get all release information for a product
   * API v1: GET /products/{product}
   */
  async getProductReleases(product: string): Promise<Release[]> {
    const url = `${this.baseUrl}/products/${product}`;
    try {
      const response = await this.request(url, FullProductSchema);
      return response.releases;
    } catch (error) {
      handleClientError(error, { product });
      return [];
    }
  }

  /**
   * Get a specific release for a product
   * API v1: GET /products/{product}/releases/{release}
   */
  async getProductRelease(product: string, release: string): Promise<Release> {
    const encodedRelease = encodeURIComponent(release);
    const url = `${this.baseUrl}/products/${product}/releases/${encodedRelease}`;

    try {
      return await this.request(url, ReleaseSchema);
    } catch (error) {
      handleClientError(error, { product, release });
      throw error;
    }
  }

  /**
   * Get release info with semantic version fallback
   */
  async getReleaseInfoWithFallback(
    product: string,
    version: string,
    enableFallback: boolean
  ): Promise<Release | null> {
    const versions = enableFallback
      ? getSemanticFallbacks(version)
      : [cleanVersion(version)];

    for (const v of versions) {
      try {
        const info = await this.getProductRelease(product, v);
        if (info) return info;
      } catch (error) {
        core.debug(`No release found for ${product}/${v}`);
      }
    }

    return null;
  }

  /**
   * Get full data for all products
   * API v1: GET /products/full
   */
  async getProductsFullData(): Promise<any[]> {
    const url = `${this.baseUrl}/products/full`;
    return await this.request(url, z.array(z.any()));
  }

  /**
   * Get the latest release for a product
   * API v1: GET /products/{product}/releases/latest
   */
  async getLatestRelease(product: string): Promise<Release> {
    const url = `${this.baseUrl}/products/${product}/releases/latest`;
    try {
      return await this.request(url, ReleaseSchema);
    } catch (error) {
      handleClientError(error, { product });
      throw error;
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const url = `${this.baseUrl}/categories`;
    return await this.request(url, z.array(z.string()));
  }

  /**
   * Get all products in a specific category
   */
  async getProductsByCategory(category: string): Promise<any[]> {
    const url = `${this.baseUrl}/categories/${category}`;
    return await this.request(url, z.array(ProductSummarySchema));
  }

  /**
   * Get all available tags
   */
  async getTags(): Promise<string[]> {
    const url = `${this.baseUrl}/tags`;
    return await this.request(url, z.array(z.string()));
  }

  /**
   * Get all products with a specific tag
   */
  async getProductsByTag(tag: string): Promise<any[]> {
    const url = `${this.baseUrl}/tags/${tag}`;
    return await this.request(url, z.array(ProductSummarySchema));
  }

  /**
   * Get all identifier types
   */
  async getIdentifierTypes(): Promise<string[]> {
    const url = `${this.baseUrl}/identifiers`;
    return await this.request(url, z.array(z.string()));
  }

  /**
   * Get all identifiers for a specific type
   */
  async getIdentifiersByType(identifierType: string): Promise<IdentifierList> {
    const url = `${this.baseUrl}/identifiers/${identifierType}`;
    return await this.request(url, IdentifierListSchema);
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
