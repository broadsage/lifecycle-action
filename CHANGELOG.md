# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- File-based version extraction from YAML files (e.g., `helm/values.yaml`)
- File-based version extraction from JSON files (e.g., `package.json`)
- Regex-based version extraction from any text file (e.g., `Dockerfile`)
- Nested key path support for YAML/JSON extraction (e.g., `image.tag`, `engines.node`)
- Semantic version fallback matching (1.2.3 → 1.2 → 1)
- Manual version input support via `version` input
- Shared utility modules (`version-utils.ts`, `error-utils.ts`)
- Strategy pattern for extensible version extraction
- Comprehensive example workflows (Helm, package.json, Dockerfile, manual)
- Release-please integration for automated releases
- Renovate configuration for dependency management

### Changed
- Refactored codebase to eliminate all code duplication (60+ lines removed)
- Applied OOP best practices and SOLID principles throughout
- Improved error handling with shared utility functions
- Enhanced type safety with strict TypeScript configuration
- Migrated from Dependabot to Renovate for better dependency management
- Updated release process to use release-please for semantic versioning

### Fixed
- Improved version extraction reliability and error messages
- Better handling of edge cases in version parsing
- More descriptive error messages for debugging

## [1.0.0] - 2025-12-25

### Added
- Initial release of EndOfLife Action
- Support for 380+ products via endoflife.date API
- Comprehensive EOL status detection (Active, Approaching EOL, End-of-Life)
- Multiple output formats (JSON, Markdown, GitHub Step Summary)
- Smart HTTP caching with configurable TTL
- GitHub issue creation on EOL detection
- Flexible product and cycle filtering
- TypeScript implementation with full type safety
- Runtime validation using Zod schemas
- Comprehensive test suite with 80%+ coverage
- CI/CD workflows for testing and releasing
- Detailed documentation and examples
- Error handling and retry logic
- Support for LTS version detection
- Configurable EOL threshold warnings
- Build failure options for CI/CD integration

### Features
- Track all products or specific cycles
- Automatic issue creation with customizable labels
- Cache management for optimal API usage
- Support for custom API URLs (self-hosted instances)
- Latest version tracking
- Support status information
- Days until EOL calculation
- Human-readable summaries

### Developer Experience
- ESLint and Prettier configuration
- Jest testing framework
- TypeScript strict mode
- Comprehensive error messages
- Debug logging support
- Well-documented codebase

[Unreleased]: https://github.com/broadsage/endoflife-action/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/broadsage/endoflife-action/releases/tag/v1.0.0
