// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 BroadSage

import { z } from 'zod';

/**
 * Schema for a single release cycle from the EndOfLife.date API
 */
export const CycleSchema = z.object({
    cycle: z.union([z.string(), z.number()]),
    releaseDate: z.string().optional(),
    eol: z.union([z.string(), z.boolean()]).optional(),
    latest: z.string().optional(),
    link: z.string().nullable().optional(),
    lts: z.union([z.string(), z.boolean()]).optional(),
    support: z.union([z.string(), z.boolean()]).optional(),
    discontinued: z.union([z.string(), z.boolean()]).optional(),
    latestReleaseDate: z.string().optional(),
    extendedSupport: z.union([z.string(), z.boolean()]).optional(),
});

export type Cycle = z.infer<typeof CycleSchema>;

/**
 * Schema for the list of all products
 */
export const AllProductsSchema = z.array(z.string());

export type AllProducts = z.infer<typeof AllProductsSchema>;

/**
 * Schema for product cycles mapping
 */
export const ProductCyclesSchema = z.record(z.string(), z.array(z.string()));

export type ProductCycles = z.infer<typeof ProductCyclesSchema>;

/**
 * Schema for action inputs
 */
export const ActionInputsSchema = z.object({
    products: z.string(),
    cycles: z.string(),
    checkEol: z.boolean(),
    eolThresholdDays: z.number().int().positive(),
    failOnEol: z.boolean(),
    failOnApproachingEol: z.boolean(),
    outputFormat: z.enum(['json', 'markdown', 'summary']),
    outputFile: z.string(),
    cacheTtl: z.number().int().positive(),
    githubToken: z.string(),
    createIssueOnEol: z.boolean(),
    issueLabels: z.string(),
    includeLatestVersion: z.boolean(),
    includeSupportInfo: z.boolean(),
    customApiUrl: z.string().url(),
    // File extraction inputs
    filePath: z.string(),
    fileKey: z.string(),
    fileFormat: z.enum(['yaml', 'json', 'text']),
    versionRegex: z.string(),
    version: z.string(),
    semanticVersionFallback: z.boolean(),
});

export type ActionInputs = z.infer<typeof ActionInputsSchema>;

/**
 * EOL Status enumeration
 */
export enum EolStatus {
    ACTIVE = 'active',
    APPROACHING_EOL = 'approaching_eol',
    END_OF_LIFE = 'end_of_life',
    UNKNOWN = 'unknown',
}

/**
 * Product version information
 */
export interface ProductVersionInfo {
    product: string;
    cycle: string;
    status: EolStatus;
    eolDate: string | null;
    daysUntilEol: number | null;
    releaseDate: string | null;
    latestVersion: string | null;
    isLts: boolean;
    supportDate: string | null;
    link: string | null;
    rawData: Cycle;
}

/**
 * Action results
 */
export interface ActionResults {
    eolDetected: boolean;
    approachingEol: boolean;
    totalProductsChecked: number;
    totalCyclesChecked: number;
    products: ProductVersionInfo[];
    eolProducts: ProductVersionInfo[];
    approachingEolProducts: ProductVersionInfo[];
    latestVersions: Record<string, string>;
    summary: string;
}

/**
 * API Error
 */
export class EndOfLifeApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public product?: string,
        public cycle?: string
    ) {
        super(message);
        this.name = 'EndOfLifeApiError';
    }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
    constructor(message: string, public errors?: z.ZodError) {
        super(message);
        this.name = 'ValidationError';
    }
}
