// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { z } from 'zod';

/**
 * Schema for a single release cycle from the EndOfLife.date API
 */
export const BaseCycleSchema = z.object({
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

export type Cycle = z.infer<typeof BaseCycleSchema>;

export const CycleSchema: z.ZodType<Cycle> = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    return {
      ...val,
      // v1 uses 'name', root API uses 'cycle'
      cycle: val.cycle ?? val.name,
      // v1 uses 'eolFrom', root API uses 'eol'
      eol: val.eol ?? val.eolFrom,
      // v1 uses 'isLts' (bool) or 'ltsFrom' (date), root API uses 'lts'
      lts: val.lts ?? val.isLts ?? val.ltsFrom,
      // v1 uses nested 'latest' object, root API uses string
      latest: typeof val.latest === 'object' ? val.latest?.name : val.latest,
    };
  }
  return val;
}, BaseCycleSchema) as any;

/**
 * Schema for the list of all products
 */
export const AllProductsSchema = z.array(z.string());

export type AllProducts = z.infer<typeof AllProductsSchema>;

/**
 * Schema for product summary (from /products endpoint)
 */
export const ProductSummarySchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  category: z.string().optional(),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/**
 * Schema for full product data (from /products/{product} endpoint)
 */
export const FullProductSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  category: z.string().optional(),
  releases: z.array(CycleSchema),
});

export type FullProduct = z.infer<typeof FullProductSchema>;

/**
 * Schema for categories and tags (simple string arrays)
 */
export const StringListSchema = z.array(z.string());

export type StringList = z.infer<typeof StringListSchema>;

/**
 * Schema for identifier item (from /identifiers/{type} endpoint)
 */
export const IdentifierItemSchema = z.object({
  identifier: z.string(),
  product: z.string(),
});

export type IdentifierItem = z.infer<typeof IdentifierItemSchema>;

/**
 * Schema for identifier list response
 */
export const IdentifierListSchema = z.array(IdentifierItemSchema);

export type IdentifierList = z.infer<typeof IdentifierListSchema>;

/**
 * Schema for product cycles mapping
 */
export const ProductCyclesSchema = z.record(z.string(), z.array(z.string()));

export type ProductCycles = z.infer<typeof ProductCyclesSchema>;

/**
 * Matrix output formats
 */
export interface MatrixOutput {
  versions: string[];
}

export interface MatrixIncludeItem {
  version: string;
  cycle: string;
  isLts: boolean;
  eolDate: string | null;
  status: string;
  releaseDate: string | null;
}

export interface MatrixIncludeOutput {
  include: MatrixIncludeItem[];
}

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
  failOnStale: z.boolean(),
  stalenessThresholdDays: z.number().int().positive(),
  includeDiscontinued: z.boolean(),
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
  // SBOM inputs
  sbomFile: z.string(),
  sbomFormat: z.enum(['cyclonedx', 'spdx', 'auto']),
  sbomComponentMapping: z.string(),
  semanticVersionFallback: z.boolean(),
  // Matrix output inputs
  outputMatrix: z.boolean(),
  excludeEolFromMatrix: z.boolean(),
  excludeApproachingEolFromMatrix: z.boolean(),
  apiConcurrency: z.number().int().min(1).max(10),
  // Filtering inputs
  minReleaseDate: z.string(),
  maxReleaseDate: z.string(),
  maxVersions: z.number().int().positive().optional().nullable(),
  versionSortOrder: z.enum(['newest-first', 'oldest-first']),
  filterByCategory: z.string().optional(),
  filterByTag: z.string().optional(),
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
  // Extended fields for additional tracking
  discontinuedDate: string | null;
  isDiscontinued: boolean;
  extendedSupportDate: string | null;
  hasExtendedSupport: boolean;
  latestReleaseDate: string | null;
  daysSinceLatestRelease: number | null;
  rawData: Cycle;
}

/**
 * Action results
 */
export interface ActionResults {
  eolDetected: boolean;
  approachingEol: boolean;
  staleDetected: boolean;
  discontinuedDetected: boolean;
  totalProductsChecked: number;
  totalCyclesChecked: number;
  products: ProductVersionInfo[];
  eolProducts: ProductVersionInfo[];
  approachingEolProducts: ProductVersionInfo[];
  staleProducts: ProductVersionInfo[];
  discontinuedProducts: ProductVersionInfo[];
  extendedSupportProducts: ProductVersionInfo[];
  latestVersions: Record<string, string>;
  summary: string;
  // Matrix outputs
  matrix?: MatrixOutput;
  matrixInclude?: MatrixIncludeOutput;
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
  constructor(
    message: string,
    public errors?: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
