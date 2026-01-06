// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

/**
 * Utility functions for error handling
 */

import { EndOfLifeApiError } from '../types';

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Check if error is an instance of a specific error class
 */
export function isErrorInstance<T extends Error>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Create a standardized error with context
 */
export function createError(message: string, cause?: unknown): Error {
  const error = new Error(message);
  if (cause instanceof Error) {
    error.stack = `${error.stack}\nCaused by: ${cause.stack}`;
  }
  return error;
}

/**
 * Handle client errors with context information
 * This centralizes error handling logic to eliminate duplication
 *
 * @param error - The error to handle
 * @param context - Context information (product, release, etc.)
 * @throws The error with added context
 * @example
 * try {
 *   return await this.request(url, schema);
 * } catch (error) {
 *   handleClientError(error, { product: 'python', release: '3.12' });
 * }
 */
export function handleClientError(
  error: unknown,
  context: { product?: string; release?: string } = {}
): never {
  if (error instanceof EndOfLifeApiError) {
    // Add context to API errors
    if (context.product) error.product = context.product;
    if (context.release) error.release = context.release;
  }
  throw error;
}
