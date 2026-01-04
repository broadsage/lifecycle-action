# Changelog

## [4.0.0](https://github.com/broadsage/endoflife-action/compare/v3.1.0...v4.0.0) (2026-01-04)


### ⚠ BREAKING CHANGES

* Migrated from endoflife.date API v0 to API v1. Users with custom-api-url must update to include /api/v1 path.

### Features

* complete v1 API migration with full endpoint coverage and improved test coverage ([4bfcea6](https://github.com/broadsage/endoflife-action/commit/4bfcea6b0b49a788836a01bc22c4a17efcfab467))

## [Unreleased]

### ⚠ BREAKING CHANGES

* **API Migration**: Migrated from endoflife.date API v0 to API v1. If using `custom-api-url`, update to include `/api/v1` path.

### Features

* **API v1 Migration**: Complete migration to endoflife.date API v1 with all endpoints
  - Migrated base URL from `/api` to `/api/v1`
  - Updated all endpoints to v1 structure (`/products`, `/products/{product}`, `/products/{product}/releases/{release}`)
  - Added support for 7 new v1 API endpoints:
    - `GET /products/full` - Bulk data dump of all products
    - `GET /products/{product}/releases/latest` - Latest release for a product
    - `GET /categories` - List all categories
    - `GET /categories/{category}` - Products by category
    - `GET /tags` - List all tags
    - `GET /tags/{tag}` - Products by tag
    - `GET /identifiers` - List identifier types
  - Proper URL encoding for special characters in cycle names (e.g., slashes)
  - Enhanced response validation with Zod schemas

* **Extended API Fields**: Full support for all v1 API fields
  - `discontinued` - Track hardware/device discontinuation dates
  - `extendedSupport` - Identify products with extended support options
  - `latestReleaseDate` - Detect stale versions with no recent updates
  - `category` - Product categorization
  - `label` - Human-readable product names

* **New Action Inputs**:
  - `fail-on-stale` - Fail workflow if versions haven't been updated recently
  - `staleness-threshold-days` - Days since last release to consider stale (default: 365)
  - `include-discontinued` - Include discontinued products in analysis (default: true)

* **New Action Outputs**:
  - `stale-detected` - Boolean indicating stale versions
  - `stale-products` - JSON array of stale products
  - `discontinued-detected` - Boolean indicating discontinued products
  - `discontinued-products` - JSON array of discontinued products
  - `extended-support-products` - JSON array with extended support

### Bug Fixes

* **Test Coverage**: Fixed all failing tests after v1 API migration
  - Updated test mocks to match v1 API response structure
  - Fixed analyzer tests to use v1 endpoints
  - Fixed client tests to use v1 endpoints
  - All 192 tests now passing ✅

* **URL Encoding**: Added proper URL encoding for cycle parameters to handle special characters

### Code Refactoring

* **Remove Code Duplication**: Eliminated backward compatibility code for v0 API
* **Type Safety**: Enhanced type definitions with new v1 API schemas
* **Client Architecture**: Streamlined client methods for better maintainability

### Tests

* **Improved Coverage**: Increased test coverage significantly
  - Client coverage: 76% → 81%
  - Added comprehensive tests for all new v1 endpoints
  - Added 15 new test cases for v1 API extensions
  - Total tests: 177 → 192 (+15)
  - All notification channels: 100% coverage
  - All utils: 97.5% coverage

### Documentation

* **README**: Updated to reflect v1 API migration and new features
* **API Migration Guide**: Comprehensive migration documentation in `API_V1_MIGRATION.md`
* **Examples**: Added new example workflows for hardware EOL tracking and staleness detection
* **Code Comments**: Enhanced inline documentation for all new methods

### Performance

* **Caching**: Maintained efficient caching for all new endpoints
* **Rate Limiting**: Exponential backoff retry logic for HTTP 429 responses (1s, 2s, 4s delays)

## [3.1.0](https://github.com/broadsage/endoflife-action/compare/v3.0.1...v3.1.0) (2026-01-03)


### Features

* add latest changes to dist ([c43f5a1](https://github.com/broadsage/endoflife-action/commit/c43f5a18d809205fc644c81d1b51df9e4814f59d))
* add multi-channel notification system with Slack, Discord, Teams, Google Chat, and custom webhooks ([3cfc460](https://github.com/broadsage/endoflife-action/commit/3cfc4604f14bc654ca562764b97af861257c8ea1))


### Bug Fixes

* code style format ([cbe8719](https://github.com/broadsage/endoflife-action/commit/cbe8719d5969627bf5eae68ef7e5902a73c1230e))
* resolve ESLint errors in notification factory ([315121e](https://github.com/broadsage/endoflife-action/commit/315121e5b51772586e19a13499250843a87899e6))


### Miscellaneous

* **deps:** refresh ([c2df769](https://github.com/broadsage/endoflife-action/commit/c2df769d2bc593d8705f1946ead2f0d98d5cdeda))
* **deps:** refresh ([c2df769](https://github.com/broadsage/endoflife-action/commit/c2df769d2bc593d8705f1946ead2f0d98d5cdeda))
* **deps:** refresh ([9355366](https://github.com/broadsage/endoflife-action/commit/935536677e0697dce3c1cc09e3db1f176fbe7f2e))
* description change in action.yml ([60a74f4](https://github.com/broadsage/endoflife-action/commit/60a74f4cc4f9e4483ca7c3c882c133ed8005a7c7))


### Tests

* improve test coverage to 86.52% function coverage ([830d249](https://github.com/broadsage/endoflife-action/commit/830d24964ec05b88387a871def2062a54810c963))

## [3.0.1](https://github.com/broadsage/endoflife-action/compare/v3.0.0...v3.0.1) (2025-12-29)


### Miscellaneous

* **deps:** migrate config renovate.json ([3749e25](https://github.com/broadsage/endoflife-action/commit/3749e25d4a37f051e330e7fc2e8219f921eae9fe))
* **deps:** migrate Renovate config ([c80665c](https://github.com/broadsage/endoflife-action/commit/c80665c715e2a532d17e17656473c77de0456b52))

## [3.0.0](https://github.com/broadsage/endoflife-action/compare/v2.0.3...v3.0.0) (2025-12-27)


### ⚠ BREAKING CHANGES

* This is the initial v2.0.0 release with file-based version extraction and automated release management using release-please and Renovate.

### Features

* automate GitHub Marketplace publishing and refactor release workflows ([8d7f993](https://github.com/broadsage/endoflife-action/commit/8d7f993657919a093a3c31a58a65e3f98673f78b))
* initial release of endoflife-action v2.0.0 ([306e11b](https://github.com/broadsage/endoflife-action/commit/306e11b52a909a4b55611f2d29f1a0403020f621))


### Bug Fixes

* add package-lock.json for npm cache support ([f32a858](https://github.com/broadsage/endoflife-action/commit/f32a8587e0434f1f2ea9dbf0780a32e403452dc2))
* adjust coverage thresholds and remove CodeQL manual config ([a56b2e0](https://github.com/broadsage/endoflife-action/commit/a56b2e075a7c57bed19790079418cf493bf8e7ad))
* apply Prettier formatting to all source files ([44600e0](https://github.com/broadsage/endoflife-action/commit/44600e0838bd9b7e7c8811a46f66552880370c72))
* chnage scorecard workflow format ([ecae88f](https://github.com/broadsage/endoflife-action/commit/ecae88fdd88c2db08e40e6781ed790ec509b877e))
* download build artifacts in integration test job ([ebf05b3](https://github.com/broadsage/endoflife-action/commit/ebf05b35ca257557c50b6a86368c9fab603a777e))
* generate changelog dynamically ([dd01e58](https://github.com/broadsage/endoflife-action/commit/dd01e583a938ef51b967aa8860a48cdd4338b9e7))
* swap release-please config and manifest contents to standard format ([642bac4](https://github.com/broadsage/endoflife-action/commit/642bac4cb9ef580ad5be2dc9dd40330f9b0728ab))
* trigger workflow only on tag creation ([d362c1f](https://github.com/broadsage/endoflife-action/commit/d362c1f41d71fe43a914fa1cc223793440d9abd0))
* update action name to avoid marketplace conflicts ([b60f6fc](https://github.com/broadsage/endoflife-action/commit/b60f6fca101b44dd9563499d318c70a1bb5a696d))
* update action name to avoid marketplace conflicts ([a0c0968](https://github.com/broadsage/endoflife-action/commit/a0c0968ccccc879e3d1018cd1b8528fbb56b3d9c))
* Update code format ([420c438](https://github.com/broadsage/endoflife-action/commit/420c438edb1b23eddc158e7379fe429e75cf20ea))
* upgrade node from 22.x to 24.x ([bd103b8](https://github.com/broadsage/endoflife-action/commit/bd103b87de2a66133ddd3d286589d175d2c0bde4))


### Code Refactoring

* change in node version ([d1c80f0](https://github.com/broadsage/endoflife-action/commit/d1c80f0d923afbc5fa75721a4510e23fe1237628))
* eliminate workflow duplication and improve consistency ([5ee8458](https://github.com/broadsage/endoflife-action/commit/5ee8458dc4f21a8737cd0fca8ee2a572a4a14096))
* improve action structure and documentation ([18bc8b9](https://github.com/broadsage/endoflife-action/commit/18bc8b9a6ab762afb90530daba71c28f4b1bb28b))
* improve dependency security scanning in CI ([fb50974](https://github.com/broadsage/endoflife-action/commit/fb5097468d4e5d1ba817ce78da489157fa30a9c8))
* test on latest Node.js LTS and n-1 version ([6484cfb](https://github.com/broadsage/endoflife-action/commit/6484cfbe0f9a12fcf724f158c1b1f6330e8bdac2))
* use Node.js 22.x for build and security jobs ([eb96980](https://github.com/broadsage/endoflife-action/commit/eb96980e0cd78c23a41be21b6a5e10331b5b41d9))
* use Node.js 22.x for build and security jobs ([70b5d27](https://github.com/broadsage/endoflife-action/commit/70b5d27ee47aaebb298fb04c75a07bff70cffca3))


### Documentation

* standardize company name from BroadSage to Broadsage ([a698b88](https://github.com/broadsage/endoflife-action/commit/a698b8870b68fa27238ae48663574dae49958fc5))


### Miscellaneous

* commit dist/ artifacts following GitHub Actions best practices ([9cffec7](https://github.com/broadsage/endoflife-action/commit/9cffec7d728d4c8358e39fe23a06b8eee72ec278))
* configure releases to use version tags only ([49f41f4](https://github.com/broadsage/endoflife-action/commit/49f41f411f93177ca00e7e8c7128a7ca5fee7176))
* **main:** release 1.0.0 ([c43dad4](https://github.com/broadsage/endoflife-action/commit/c43dad4127b4e5909ac97f5e9625efdc5cc67b1e))
* **main:** release 1.0.0 ([c43dad4](https://github.com/broadsage/endoflife-action/commit/c43dad4127b4e5909ac97f5e9625efdc5cc67b1e))
* **main:** release 1.0.0 ([19c3786](https://github.com/broadsage/endoflife-action/commit/19c37869ff39e8e76d672f5c6874c9ea5e92a498))
* **main:** release 1.0.1 ([b0cd60e](https://github.com/broadsage/endoflife-action/commit/b0cd60ecd8defc31f6aa766c3d6b7bc037990762))
* **main:** release 1.0.1 ([b0cd60e](https://github.com/broadsage/endoflife-action/commit/b0cd60ecd8defc31f6aa766c3d6b7bc037990762))
* **main:** release 1.0.1 ([cbdd9fb](https://github.com/broadsage/endoflife-action/commit/cbdd9fbdfe6d230cf20827ef144cc9f24c8259a8))
* **main:** release endoflife-action 2.0.0 ([10baa8f](https://github.com/broadsage/endoflife-action/commit/10baa8f291695f79b8e5a611812c0e285426dd72))
* **main:** release endoflife-action 2.0.0 ([10baa8f](https://github.com/broadsage/endoflife-action/commit/10baa8f291695f79b8e5a611812c0e285426dd72))
* **main:** release endoflife-action 2.0.0 ([8f948eb](https://github.com/broadsage/endoflife-action/commit/8f948ebc73a64495aa11b1a20a0bd538f98e551a))
* **main:** release endoflife-action 2.0.1 ([9440115](https://github.com/broadsage/endoflife-action/commit/94401152a709f35afa38fff1690895e8db835aea))
* **main:** release endoflife-action 2.0.1 ([9440115](https://github.com/broadsage/endoflife-action/commit/94401152a709f35afa38fff1690895e8db835aea))
* **main:** release endoflife-action 2.0.1 ([0ba8c9b](https://github.com/broadsage/endoflife-action/commit/0ba8c9bf6a211036e9f3bb984298037de3123bb0))
* **main:** release endoflife-action 2.0.2 ([ed784e7](https://github.com/broadsage/endoflife-action/commit/ed784e7339c1b44ee73cb465d809c7429bd93028))
* **main:** release endoflife-action 2.0.2 ([ed784e7](https://github.com/broadsage/endoflife-action/commit/ed784e7339c1b44ee73cb465d809c7429bd93028))
* **main:** release endoflife-action 2.0.2 ([5362cdc](https://github.com/broadsage/endoflife-action/commit/5362cdc7e6cc662d253870f5e4881708df96bf53))
* **main:** release endoflife-action 2.0.3 ([b8fbc82](https://github.com/broadsage/endoflife-action/commit/b8fbc82d9bf51c77c6a7f510e4cef6336b9167c8))
* **main:** release endoflife-action 2.0.3 ([b8fbc82](https://github.com/broadsage/endoflife-action/commit/b8fbc82d9bf51c77c6a7f510e4cef6336b9167c8))
* **main:** release endoflife-action 2.0.3 ([224857f](https://github.com/broadsage/endoflife-action/commit/224857f093de41745de2e19871134d7f6edf48d1))
* optimize dist/ to contain only essential runtime files ([407e1a2](https://github.com/broadsage/endoflife-action/commit/407e1a2aeef60d40904387a7dacf06b8addf27a5))


### Tests

* fix failing tests and improve coverage to meet thresholds ([48c442a](https://github.com/broadsage/endoflife-action/commit/48c442a12089f1294abb58e3012264a90093e431))

## [2.0.3](https://github.com/broadsage/endoflife-action/compare/endoflife-action-v2.0.2...endoflife-action-v2.0.3) (2025-12-27)


### Tests

* fix failing tests and improve coverage to meet thresholds ([48c442a](https://github.com/broadsage/endoflife-action/commit/48c442a12089f1294abb58e3012264a90093e431))

## [2.0.2](https://github.com/broadsage/endoflife-action/compare/endoflife-action-v2.0.1...endoflife-action-v2.0.2) (2025-12-27)


### Code Refactoring

* eliminate workflow duplication and improve consistency ([5ee8458](https://github.com/broadsage/endoflife-action/commit/5ee8458dc4f21a8737cd0fca8ee2a572a4a14096))
* improve action structure and documentation ([18bc8b9](https://github.com/broadsage/endoflife-action/commit/18bc8b9a6ab762afb90530daba71c28f4b1bb28b))

## [2.0.1](https://github.com/broadsage/endoflife-action/compare/endoflife-action-v2.0.0...endoflife-action-v2.0.1) (2025-12-26)


### Miscellaneous

* commit dist/ artifacts following GitHub Actions best practices ([9cffec7](https://github.com/broadsage/endoflife-action/commit/9cffec7d728d4c8358e39fe23a06b8eee72ec278))
* optimize dist/ to contain only essential runtime files ([407e1a2](https://github.com/broadsage/endoflife-action/commit/407e1a2aeef60d40904387a7dacf06b8addf27a5))

## [2.0.0](https://github.com/broadsage/endoflife-action/compare/endoflife-action-v1.0.1...endoflife-action-v2.0.0) (2025-12-26)


### ⚠ BREAKING CHANGES

* This is the initial v2.0.0 release with file-based version extraction and automated release management using release-please and Renovate.

### Features

* automate GitHub Marketplace publishing and refactor release workflows ([8d7f993](https://github.com/broadsage/endoflife-action/commit/8d7f993657919a093a3c31a58a65e3f98673f78b))
* initial release of endoflife-action v2.0.0 ([306e11b](https://github.com/broadsage/endoflife-action/commit/306e11b52a909a4b55611f2d29f1a0403020f621))


### Bug Fixes

* add package-lock.json for npm cache support ([f32a858](https://github.com/broadsage/endoflife-action/commit/f32a8587e0434f1f2ea9dbf0780a32e403452dc2))
* adjust coverage thresholds and remove CodeQL manual config ([a56b2e0](https://github.com/broadsage/endoflife-action/commit/a56b2e075a7c57bed19790079418cf493bf8e7ad))
* apply Prettier formatting to all source files ([44600e0](https://github.com/broadsage/endoflife-action/commit/44600e0838bd9b7e7c8811a46f66552880370c72))
* chnage scorecard workflow format ([ecae88f](https://github.com/broadsage/endoflife-action/commit/ecae88fdd88c2db08e40e6781ed790ec509b877e))
* download build artifacts in integration test job ([ebf05b3](https://github.com/broadsage/endoflife-action/commit/ebf05b35ca257557c50b6a86368c9fab603a777e))
* generate changelog dynamically ([dd01e58](https://github.com/broadsage/endoflife-action/commit/dd01e583a938ef51b967aa8860a48cdd4338b9e7))
* swap release-please config and manifest contents to standard format ([642bac4](https://github.com/broadsage/endoflife-action/commit/642bac4cb9ef580ad5be2dc9dd40330f9b0728ab))
* trigger workflow only on tag creation ([d362c1f](https://github.com/broadsage/endoflife-action/commit/d362c1f41d71fe43a914fa1cc223793440d9abd0))
* Update code format ([420c438](https://github.com/broadsage/endoflife-action/commit/420c438edb1b23eddc158e7379fe429e75cf20ea))
* upgrade node from 22.x to 24.x ([bd103b8](https://github.com/broadsage/endoflife-action/commit/bd103b87de2a66133ddd3d286589d175d2c0bde4))


### Code Refactoring

* change in node version ([d1c80f0](https://github.com/broadsage/endoflife-action/commit/d1c80f0d923afbc5fa75721a4510e23fe1237628))
* improve dependency security scanning in CI ([fb50974](https://github.com/broadsage/endoflife-action/commit/fb5097468d4e5d1ba817ce78da489157fa30a9c8))
* test on latest Node.js LTS and n-1 version ([6484cfb](https://github.com/broadsage/endoflife-action/commit/6484cfbe0f9a12fcf724f158c1b1f6330e8bdac2))
* use Node.js 22.x for build and security jobs ([eb96980](https://github.com/broadsage/endoflife-action/commit/eb96980e0cd78c23a41be21b6a5e10331b5b41d9))
* use Node.js 22.x for build and security jobs ([70b5d27](https://github.com/broadsage/endoflife-action/commit/70b5d27ee47aaebb298fb04c75a07bff70cffca3))


### Documentation

* standardize company name from BroadSage to Broadsage ([a698b88](https://github.com/broadsage/endoflife-action/commit/a698b8870b68fa27238ae48663574dae49958fc5))


### Miscellaneous

* **main:** release 1.0.0 ([c43dad4](https://github.com/broadsage/endoflife-action/commit/c43dad4127b4e5909ac97f5e9625efdc5cc67b1e))
* **main:** release 1.0.0 ([c43dad4](https://github.com/broadsage/endoflife-action/commit/c43dad4127b4e5909ac97f5e9625efdc5cc67b1e))
* **main:** release 1.0.0 ([19c3786](https://github.com/broadsage/endoflife-action/commit/19c37869ff39e8e76d672f5c6874c9ea5e92a498))
* **main:** release 1.0.1 ([b0cd60e](https://github.com/broadsage/endoflife-action/commit/b0cd60ecd8defc31f6aa766c3d6b7bc037990762))
* **main:** release 1.0.1 ([b0cd60e](https://github.com/broadsage/endoflife-action/commit/b0cd60ecd8defc31f6aa766c3d6b7bc037990762))
* **main:** release 1.0.1 ([cbdd9fb](https://github.com/broadsage/endoflife-action/commit/cbdd9fbdfe6d230cf20827ef144cc9f24c8259a8))

## [1.0.1](https://github.com/broadsage/endoflife-action/compare/v1.0.0...v1.0.1) (2025-12-26)


### Bug Fixes

* trigger workflow only on tag creation ([d362c1f](https://github.com/broadsage/endoflife-action/commit/d362c1f41d71fe43a914fa1cc223793440d9abd0))

## 1.0.0 (2025-12-26)


### ⚠ BREAKING CHANGES

* This is the initial v2.0.0 release with file-based version extraction and automated release management using release-please and Renovate.

### Features

* initial release of endoflife-action v2.0.0 ([306e11b](https://github.com/broadsage/endoflife-action/commit/306e11b52a909a4b55611f2d29f1a0403020f621))


### Bug Fixes

* add package-lock.json for npm cache support ([f32a858](https://github.com/broadsage/endoflife-action/commit/f32a8587e0434f1f2ea9dbf0780a32e403452dc2))
* adjust coverage thresholds and remove CodeQL manual config ([a56b2e0](https://github.com/broadsage/endoflife-action/commit/a56b2e075a7c57bed19790079418cf493bf8e7ad))
* apply Prettier formatting to all source files ([44600e0](https://github.com/broadsage/endoflife-action/commit/44600e0838bd9b7e7c8811a46f66552880370c72))
* chnage scorecard workflow format ([ecae88f](https://github.com/broadsage/endoflife-action/commit/ecae88fdd88c2db08e40e6781ed790ec509b877e))
* download build artifacts in integration test job ([ebf05b3](https://github.com/broadsage/endoflife-action/commit/ebf05b35ca257557c50b6a86368c9fab603a777e))
* generate changelog dynamically ([dd01e58](https://github.com/broadsage/endoflife-action/commit/dd01e583a938ef51b967aa8860a48cdd4338b9e7))
* upgrade node from 22.x to 24.x ([bd103b8](https://github.com/broadsage/endoflife-action/commit/bd103b87de2a66133ddd3d286589d175d2c0bde4))
