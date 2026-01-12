// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { z } from 'zod';

/**
 * Schema for the EndOfLife.date API v1 response wrapper
 */
export function createV1ResponseSchema<T>(schema: z.ZodType<T>) {
  return z.object({
    schema_version: z.string(),
    generated_at: z.string().optional(),
    last_modified: z.string().optional(),
    total: z.number().optional(),
    result: schema,
  });
}

/**
 * Latest release version information
 */
export const LatestReleaseSchema = z.object({
  name: z.union([z.string(), z.number()]),
  date: z.union([z.string(), z.null()]).optional(),
  link: z.union([z.string(), z.null()]).optional(),
});

export type LatestRelease = z.infer<typeof LatestReleaseSchema>;

/**
 * Detailed information about a product release (v1 API)
 */
export const ReleaseSchema = z.object({
  name: z.union([z.string(), z.number()]),
  codename: z.union([z.string(), z.null()]).optional(),
  label: z.union([z.string(), z.null()]).optional(),
  releaseDate: z.union([z.string(), z.null()]).optional(),
  isLts: z.union([z.boolean(), z.string(), z.null()]).optional(),
  ltsFrom: z.union([z.string(), z.null()]).optional(),
  isEoas: z.union([z.boolean(), z.string(), z.null()]).optional(),
  eoasFrom: z.union([z.string(), z.null()]).optional(),
  isEol: z.union([z.boolean(), z.string(), z.null()]).optional(),
  eolFrom: z.union([z.string(), z.boolean(), z.number(), z.null()]).optional(),
  isEoes: z.union([z.boolean(), z.string(), z.null()]).optional(),
  eoesFrom: z.union([z.string(), z.null()]).optional(),
  isMaintained: z.union([z.boolean(), z.string(), z.null()]).optional(),
  latest: LatestReleaseSchema.optional().nullable(),
  link: z.union([z.string(), z.null()]).optional(),
  discontinued: z
    .union([z.string(), z.boolean(), z.number(), z.null()])
    .optional(),
});

export type Release = z.infer<typeof ReleaseSchema>;

/**
 * Product identifier (e.g., CPE, PURL)
 */
export const ProductIdentifierSchema = z.object({
  type: z.string(),
  id: z.string(),
});

/**
 * Full Product structure including all releases (v1 API)
 */
export const FullProductSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  label: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  versionCommand: z.string().optional(),
  identifiers: z.array(ProductIdentifierSchema).optional(),
  links: z.record(z.string(), z.string()).optional(),
  releases: z.array(ReleaseSchema),
});

export type FullProduct = z.infer<typeof FullProductSchema>;

/**
 * Product summary (from /products endpoint)
 */
export const ProductSummarySchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  label: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uri: z.string().optional(),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/**
 * Schema for the list of all products response
 */
export const AllProductsSchema = z.array(ProductSummarySchema);

export type AllProducts = z.infer<typeof AllProductsSchema>;

/**
 * Identifier item (from /identifiers/{type} endpoint)
 */
export const IdentifierItemSchema = z.object({
  identifier: z.string(),
  product: z.string(),
});

export type IdentifierItem = z.infer<typeof IdentifierItemSchema>;

/**
 * Identifier list response
 */
export const IdentifierListSchema = z.array(IdentifierItemSchema);

export type IdentifierList = z.infer<typeof IdentifierListSchema>;

/**
 * Mapping of product names to specific release versions to track
 */
export const ProductReleasesSchema = z.record(z.string(), z.array(z.string()));

export type ProductReleases = z.infer<typeof ProductReleasesSchema>;

/**
 * Support and maintenance status for a product release
 */
export enum EolStatus {
  ACTIVE = 'active',
  APPROACHING_EOL = 'approaching_eol',
  END_OF_LIFE = 'end_of_life',
  DISCONTINUED = 'discontinued',
  STALE = 'stale',
  UNKNOWN = 'unknown',
}

/**
 * Severity level for notifications
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Analysis result for a single product release
 */
export interface ProductVersionInfo {
  product: string;
  release: string;
  status: EolStatus;
  eolDate: string | null;
  daysUntilEol: number | null;
  releaseDate: string | null;
  latestVersion: string | null;
  isLts: boolean;
  supportDate: string | null;
  link: string | null;
  discontinuedDate: string | null;
  isDiscontinued: boolean;
  extendedSupportDate: string | null;
  hasExtendedSupport: boolean;
  latestReleaseDate: string | null;
  daysSinceLatestRelease: number | null;
  rawData: Release;
}

/**
 * Comprehensive results of the EOL analysis
 */
export interface ActionResults {
  eolDetected: boolean;
  approachingEol: boolean;
  staleDetected: boolean;
  discontinuedDetected: boolean;
  totalProductsChecked: number;
  totalReleasesChecked: number;
  products: ProductVersionInfo[];
  eolProducts: ProductVersionInfo[];
  approachingEolProducts: ProductVersionInfo[];
  staleProducts: ProductVersionInfo[];
  discontinuedProducts: ProductVersionInfo[];
  extendedSupportProducts: ProductVersionInfo[];
  latestVersions: Record<string, string>;
  summary: string;
  matrix?: MatrixOutput;
  matrixInclude?: MatrixIncludeOutput;
}

/**
 * Matrix output for GitHub Actions runner
 */
export interface MatrixOutput {
  versions: string[];
}

export interface MatrixIncludeItem {
  version: string;
  release: string;
  isLts: boolean;
  eolDate: string | null;
  status: string;
  releaseDate: string | null;
}

export interface MatrixIncludeOutput {
  include: MatrixIncludeItem[];
}

/**
 * Configuration for the GitHub Action
 */
export const ActionInputsSchema = z.object({
  products: z.string(),
  releases: z.string(),
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

  useDashboard: z.boolean(),
  dashboardTitle: z.string(),
  includeLatestVersion: z.boolean(),
  includeSupportInfo: z.boolean(),
  customApiUrl: z.string().url(),
  filePath: z.string(),
  fileKey: z.string(),
  fileFormat: z.enum(['yaml', 'json', 'text', 'auto']),
  versionRegex: z.string(),
  version: z.string(),
  filterByCategory: z.string().optional(),
  filterByTag: z.string().optional(),
  minReleaseDate: z.string().optional(),
  maxReleaseDate: z.string().optional(),
  maxVersions: z.number().nullable(),
  versionSortOrder: z.enum(['newest-first', 'oldest-first']),
  semanticVersionFallback: z.boolean(),
  outputMatrix: z.boolean(),
  excludeEolFromMatrix: z.boolean(),
  excludeApproachingEolFromMatrix: z.boolean(),
  apiConcurrency: z.number().int().positive(),
  notificationRetryAttempts: z.number().int().nonnegative(),
  notificationRetryDelayMs: z.number().int().nonnegative(),
  notificationThresholdDays: z.number().int().positive(),
  notifyOnEolOnly: z.boolean(),
  notifyOnApproachingEol: z.boolean(),
  enableNotifications: z.boolean(),
  webhookUrl: z.string().optional(),
  webhookMinSeverity: z.nativeEnum(NotificationSeverity),
  webhookCustomHeaders: z.string().optional(),
  teamsUrl: z.string().optional(),
  teamsMinSeverity: z.nativeEnum(NotificationSeverity),
  googleChatUrl: z.string().optional(),
  googleChatMinSeverity: z.nativeEnum(NotificationSeverity),
  discordUrl: z.string().optional(),
  discordMinSeverity: z.nativeEnum(NotificationSeverity),
  slackUrl: z.string().optional(),
  slackMinSeverity: z.nativeEnum(NotificationSeverity),
  // SBOM
  sbomFile: z.string().optional(),
  sbomFormat: z.enum(['cyclonedx', 'spdx', 'auto']).optional(),
  sbomComponentMapping: z.string().optional(),
});

export type ActionInputs = z.infer<typeof ActionInputsSchema>;

/**
 * Custom error for API-related issues
 */
export class EndOfLifeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public product?: string,
    public release?: string
  ) {
    super(message);
    this.name = 'EndOfLifeApiError';
  }
}

/**
 * Custom error for input validation issues
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: z.ZodError
  ) {
    let detailedMessage = message;
    if (errors) {
      const details = errors.errors
        .map((e) => `[${e.path.join('.')}] ${e.message}`)
        .join(', ');
      detailedMessage = `${message}: ${details}`;
    }
    super(detailedMessage);
    this.name = 'ValidationError';
  }
}
