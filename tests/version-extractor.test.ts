// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { VersionExtractor, FileFormat } from '../src/version-extractor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('VersionExtractor', () => {
    let extractor: VersionExtractor;
    let tempDir: string;

    beforeEach(() => {
        extractor = new VersionExtractor();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-extractor-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('extractFromFile - YAML', () => {
        it('should extract nested value from YAML', () => {
            const yamlContent = `
image:
  repository: prometheus
  tag: v2.45.0
`;
            const filePath = path.join(tempDir, 'test.yaml');
            fs.writeFileSync(filePath, yamlContent);

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.YAML,
                'image.tag'
            );

            expect(result.version).toBe('2.45.0');
            expect(result.source).toBe('file');
            expect(result.extractionMethod).toBe('yaml');
        });

        it('should extract deeply nested value from YAML', () => {
            const yamlContent = `
app:
  services:
    backend:
      image:
        tag: "3.11.7"
`;
            const filePath = path.join(tempDir, 'test.yaml');
            fs.writeFileSync(filePath, yamlContent);

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.YAML,
                'app.services.backend.image.tag'
            );

            expect(result.version).toBe('3.11.7');
        });

        it('should throw error if key not found in YAML', () => {
            const yamlContent = `
image:
  repository: prometheus
`;
            const filePath = path.join(tempDir, 'test.yaml');
            fs.writeFileSync(filePath, yamlContent);

            expect(() =>
                extractor.extractFromFile(filePath, FileFormat.YAML, 'image.tag')
            ).toThrow('not a string or number');
        });

        it('should throw error if file-key not provided for YAML', () => {
            const filePath = path.join(tempDir, 'test.yaml');
            fs.writeFileSync(filePath, 'test: value');

            expect(() =>
                extractor.extractFromFile(filePath, FileFormat.YAML)
            ).toThrow('file-key is required for YAML extraction');
        });
    });

    describe('extractFromFile - JSON', () => {
        it('should extract nested value from JSON', () => {
            const jsonContent = {
                engines: {
                    node: '20.10.0',
                },
            };
            const filePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2));

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.JSON,
                'engines.node'
            );

            expect(result.version).toBe('20.10.0');
            expect(result.extractionMethod).toBe('json');
        });

        it('should extract number value from JSON', () => {
            const jsonContent = {
                version: 3.11,
            };
            const filePath = path.join(tempDir, 'config.json');
            fs.writeFileSync(filePath, JSON.stringify(jsonContent));

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.JSON,
                'version'
            );

            expect(result.version).toBe('3.11');
        });

        it('should throw error if key not found in JSON', () => {
            const jsonContent = { name: 'test' };
            const filePath = path.join(tempDir, 'test.json');
            fs.writeFileSync(filePath, JSON.stringify(jsonContent));

            expect(() =>
                extractor.extractFromFile(filePath, FileFormat.JSON, 'version')
            ).toThrow('not a string or number');
        });
    });

    describe('extractFromFile - Regex', () => {
        it('should extract version with regex from Dockerfile', () => {
            const dockerfileContent = `
FROM python:3.11.7-slim
WORKDIR /app
COPY . .
`;
            const filePath = path.join(tempDir, 'Dockerfile');
            fs.writeFileSync(filePath, dockerfileContent);

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.TEXT,
                undefined,
                'python:([0-9.]+)'
            );

            expect(result.version).toBe('3.11.7');
            expect(result.extractionMethod).toBe('regex');
        });

        it('should extract version with capture group', () => {
            const content = 'Version: v2.45.0';
            const filePath = path.join(tempDir, 'version.txt');
            fs.writeFileSync(filePath, content);

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.TEXT,
                undefined,
                'v([0-9.]+)'
            );

            expect(result.version).toBe('2.45.0');
        });

        it('should use full match if no capture group', () => {
            const content = 'Version: 2.45.0';
            const filePath = path.join(tempDir, 'version.txt');
            fs.writeFileSync(filePath, content);

            const result = extractor.extractFromFile(
                filePath,
                FileFormat.TEXT,
                undefined,
                '[0-9.]+'
            );

            expect(result.version).toBe('2.45.0');
        });

        it('should throw error if regex does not match', () => {
            const content = 'No version here';
            const filePath = path.join(tempDir, 'test.txt');
            fs.writeFileSync(filePath, content);

            expect(() =>
                extractor.extractFromFile(
                    filePath,
                    FileFormat.TEXT,
                    undefined,
                    'v([0-9.]+)'
                )
            ).toThrow('No match found for regex pattern');
        });

        it('should override file format when regex is provided', () => {
            const yamlContent = `
image:
  tag: v2.45.0
`;
            const filePath = path.join(tempDir, 'test.yaml');
            fs.writeFileSync(filePath, yamlContent);

            // Even though format is YAML, regex should be used
            const result = extractor.extractFromFile(
                filePath,
                FileFormat.YAML,
                'image.tag',
                'v([0-9.]+)'
            );

            expect(result.version).toBe('2.45.0');
            expect(result.extractionMethod).toBe('regex');
        });
    });

    describe('cleanVersion', () => {
        it('should remove v prefix', () => {
            expect(extractor.cleanVersion('v1.2.3')).toBe('1.2.3');
        });

        it('should trim whitespace', () => {
            expect(extractor.cleanVersion('  1.2.3  ')).toBe('1.2.3');
        });

        it('should handle version without v prefix', () => {
            expect(extractor.cleanVersion('1.2.3')).toBe('1.2.3');
        });

        it('should handle complex versions', () => {
            expect(extractor.cleanVersion('v3.11.7-slim')).toBe('3.11.7-slim');
        });
    });

    describe('getSemanticFallbacks', () => {
        it('should generate correct fallbacks for patch version', () => {
            const fallbacks = extractor.getSemanticFallbacks('1.2.3');
            expect(fallbacks).toEqual(['1.2.3', '1.2', '1']);
        });

        it('should generate correct fallbacks for minor version', () => {
            const fallbacks = extractor.getSemanticFallbacks('1.2');
            expect(fallbacks).toEqual(['1.2', '1']);
        });

        it('should handle single version number', () => {
            const fallbacks = extractor.getSemanticFallbacks('1');
            expect(fallbacks).toEqual(['1']);
        });

        it('should handle v prefix', () => {
            const fallbacks = extractor.getSemanticFallbacks('v3.11.7');
            expect(fallbacks).toEqual(['3.11.7', '3.11', '3']);
        });

        it('should handle four-part versions', () => {
            const fallbacks = extractor.getSemanticFallbacks('1.2.3.4');
            expect(fallbacks).toEqual(['1.2.3.4', '1.2.3', '1.2', '1']);
        });
    });

    describe('isSemanticVersion', () => {
        it('should recognize valid semantic versions', () => {
            expect(extractor.isSemanticVersion('1.2.3')).toBe(true);
            expect(extractor.isSemanticVersion('1.2')).toBe(true);
            expect(extractor.isSemanticVersion('1')).toBe(true);
            expect(extractor.isSemanticVersion('v1.2.3')).toBe(true);
        });

        it('should reject invalid semantic versions', () => {
            expect(extractor.isSemanticVersion('1.2.3-alpha')).toBe(false);
            expect(extractor.isSemanticVersion('latest')).toBe(false);
            expect(extractor.isSemanticVersion('v1.2.3-slim')).toBe(false);
        });
    });

    describe('Error handling', () => {
        it('should throw error if file does not exist', () => {
            expect(() =>
                extractor.extractFromFile(
                    '/nonexistent/file.yaml',
                    FileFormat.YAML,
                    'key'
                )
            ).toThrow('File not found');
        });

        it('should throw error for unsupported file format', () => {
            const filePath = path.join(tempDir, 'test.txt');
            fs.writeFileSync(filePath, 'content');

            expect(() =>
                extractor.extractFromFile(filePath, 'xml' as FileFormat, 'key')
            ).toThrow('Unsupported file format');
        });

        it('should throw error for invalid YAML', () => {
            const filePath = path.join(tempDir, 'invalid.yaml');
            fs.writeFileSync(filePath, '{ invalid yaml content [');

            expect(() =>
                extractor.extractFromFile(filePath, FileFormat.YAML, 'key')
            ).toThrow();
        });

        it('should throw error for invalid JSON', () => {
            const filePath = path.join(tempDir, 'invalid.json');
            fs.writeFileSync(filePath, '{ invalid json }');

            expect(() =>
                extractor.extractFromFile(filePath, FileFormat.JSON, 'key')
            ).toThrow();
        });
    });
});
