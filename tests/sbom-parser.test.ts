// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { SBOMParser, SBOMFormat } from '../src/sbom-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SBOMParser', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-test-'));
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('CycloneDX parsing', () => {
        it('should parse CycloneDX SBOM successfully', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python',
                        version: '3.11.0',
                        type: 'library',
                    },
                    {
                        name: 'nodejs',
                        version: '18.12.0',
                        type: 'library',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'cyclonedx.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath, SBOMFormat.CYCLONEDX);

            expect(result.size).toBe(2);
            expect(result.get('python')).toBe('3.11.0');
            expect(result.get('nodejs')).toBe('18.12.0');
        });

        it('should parse nested components', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python',
                        version: '3.11.0',
                        components: [
                            {
                                name: 'django',
                                version: '4.2.0',
                            },
                        ],
                    },
                ],
            };

            const filePath = path.join(tempDir, 'nested.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.size).toBe(2);
            expect(result.get('python')).toBe('3.11.0');
            expect(result.get('django')).toBe('4.2.0');
        });

        it('should handle components with PURL', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'express',
                        version: '4.18.2',
                        purl: 'pkg:npm/express@4.18.2',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'purl.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const components = SBOMParser.parseComponents(filePath);

            expect(components).toHaveLength(1);
            expect(components[0].name).toBe('express');
            expect(components[0].version).toBe('4.18.2');
            expect(components[0].purl).toBe('pkg:npm/express@4.18.2');
        });

        it('should skip components without version', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python',
                        version: '3.11.0',
                    },
                    {
                        name: 'no-version-component',
                        // Missing version
                    },
                ],
            };

            const filePath = path.join(tempDir, 'missing-version.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.size).toBe(1);
            expect(result.get('python')).toBe('3.11.0');
        });
    });

    describe('SPDX parsing', () => {
        it('should parse SPDX SBOM successfully', () => {
            const sbom = {
                spdxVersion: 'SPDX-2.3',
                packages: [
                    {
                        name: 'python',
                        versionInfo: '3.11.0',
                    },
                    {
                        name: 'nodejs',
                        versionInfo: '18.12.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'spdx.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath, SBOMFormat.SPDX);

            expect(result.size).toBe(2);
            expect(result.get('python')).toBe('3.11.0');
            expect(result.get('nodejs')).toBe('18.12.0');
        });

        it('should handle packages with external refs', () => {
            const sbom = {
                spdxVersion: 'SPDX-2.3',
                packages: [
                    {
                        name: 'express',
                        versionInfo: '4.18.2',
                        externalRefs: [
                            {
                                referenceCategory: 'PACKAGE-MANAGER',
                                referenceType: 'purl',
                                referenceLocator: 'pkg:npm/express@4.18.2',
                            },
                        ],
                    },
                ],
            };

            const filePath = path.join(tempDir, 'spdx-refs.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const components = SBOMParser.parseComponents(filePath, SBOMFormat.SPDX);

            expect(components).toHaveLength(1);
            expect(components[0].purl).toBe('pkg:npm/express@4.18.2');
        });

        it('should skip packages without version', () => {
            const sbom = {
                spdxVersion: 'SPDX-2.3',
                packages: [
                    {
                        name: 'python',
                        versionInfo: '3.11.0',
                    },
                    {
                        name: 'no-version-package',
                        // Missing versionInfo
                    },
                ],
            };

            const filePath = path.join(tempDir, 'spdx-missing-version.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath, SBOMFormat.SPDX);

            expect(result.size).toBe(1);
            expect(result.get('python')).toBe('3.11.0');
        });
    });

    describe('Format detection', () => {
        it('should auto-detect CycloneDX format', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python',
                        version: '3.11.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'auto-cyclonedx.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath, SBOMFormat.AUTO);

            expect(result.size).toBe(1);
            expect(result.get('python')).toBe('3.11.0');
        });

        it('should auto-detect SPDX format', () => {
            const sbom = {
                spdxVersion: 'SPDX-2.3',
                packages: [
                    {
                        name: 'nodejs',
                        versionInfo: '18.12.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'auto-spdx.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath, SBOMFormat.AUTO);

            expect(result.size).toBe(1);
            expect(result.get('nodejs')).toBe('18.12.0');
        });

        it('should throw error for unknown format', () => {
            const sbom = {
                unknownField: 'value',
            };

            const filePath = path.join(tempDir, 'unknown.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            expect(() => {
                SBOMParser.parseFile(filePath, SBOMFormat.AUTO);
            }).toThrow('Unable to detect SBOM format');
        });
    });

    describe('Component mapping', () => {
        it('should map python3 to python', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python3',
                        version: '3.11.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'python3.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.get('python')).toBe('3.11.0');
        });

        it('should map node to nodejs', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'node',
                        version: '18.12.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'node.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.get('nodejs')).toBe('18.12.0');
        });

        it('should map postgres to postgresql', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'postgres',
                        version: '15.2',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'postgres.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.get('postgresql')).toBe('15.2');
        });

        it('should handle case-insensitive mapping', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'Python',
                        version: '3.11.0',
                    },
                    {
                        name: 'NodeJS',
                        version: '18.12.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'case-insensitive.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.get('python')).toBe('3.11.0');
            expect(result.get('nodejs')).toBe('18.12.0');
        });

        it('should use custom mapping if provided', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'my-custom-python',
                        version: '3.11.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'custom-mapping.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const customMapping = {
                'my-custom-python': 'python',
            };

            const result = SBOMParser.parseFile(
                filePath,
                SBOMFormat.CYCLONEDX,
                customMapping
            );

            expect(result.get('python')).toBe('3.11.0');
        });
    });

    describe('Statistics', () => {
        it('should return correct statistics', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                    {
                        name: 'python',
                        version: '3.11.0',
                    },
                    {
                        name: 'nodejs',
                        version: '18.12.0',
                    },
                    {
                        name: 'unmapped-component',
                        version: '1.0.0',
                    },
                ],
            };

            const filePath = path.join(tempDir, 'stats.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const stats = SBOMParser.getStatistics(filePath);

            expect(stats.format).toBe('cyclonedx');
            expect(stats.totalComponents).toBe(3);
            expect(stats.mappedComponents).toBe(2);
            expect(stats.unmappedComponents).toContain('unmapped-component');
        });
    });

    describe('Error handling', () => {
        it('should throw error for non-existent file', () => {
            expect(() => {
                SBOMParser.parseFile('/non/existent/file.json');
            }).toThrow('Failed to parse SBOM file');
        });

        it('should throw error for invalid JSON', () => {
            const filePath = path.join(tempDir, 'invalid.json');
            fs.writeFileSync(filePath, 'invalid json');

            expect(() => {
                SBOMParser.parseFile(filePath);
            }).toThrow('Failed to parse SBOM file');
        });

        it('should handle empty components array', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [],
            };

            const filePath = path.join(tempDir, 'empty.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.size).toBe(0);
        });

        it('should handle missing components field', () => {
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
            };

            const filePath = path.join(tempDir, 'no-components.json');
            fs.writeFileSync(filePath, JSON.stringify(sbom));

            const result = SBOMParser.parseFile(filePath);

            expect(result.size).toBe(0);
        });
    });
});
