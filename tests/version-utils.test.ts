// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import {
    cleanVersion,
    getSemanticFallbacks,
    isSemanticVersion,
    parseSemanticVersion,
} from '../src/utils/version-utils';

describe('Version Utils', () => {
    describe('cleanVersion', () => {
        it('should remove v prefix', () => {
            expect(cleanVersion('v1.2.3')).toBe('1.2.3');
        });

        it('should trim whitespace', () => {
            expect(cleanVersion('  1.2.3  ')).toBe('1.2.3');
        });

        it('should handle version without v prefix', () => {
            expect(cleanVersion('1.2.3')).toBe('1.2.3');
        });

        it('should handle complex versions', () => {
            expect(cleanVersion('v1.2.3-alpha')).toBe('1.2.3-alpha');
        });
    });

    describe('getSemanticFallbacks', () => {
        it('should generate fallbacks for patch version', () => {
            const fallbacks = getSemanticFallbacks('1.2.3');
            expect(fallbacks).toEqual(['1.2.3', '1.2', '1']);
        });

        it('should generate fallbacks for minor version', () => {
            const fallbacks = getSemanticFallbacks('1.2');
            expect(fallbacks).toEqual(['1.2', '1']);
        });

        it('should handle single version number', () => {
            const fallbacks = getSemanticFallbacks('1');
            expect(fallbacks).toEqual(['1']);
        });

        it('should handle v prefix', () => {
            const fallbacks = getSemanticFallbacks('v1.2.3');
            expect(fallbacks).toEqual(['1.2.3', '1.2', '1']);
        });

        it('should handle four-part versions', () => {
            const fallbacks = getSemanticFallbacks('1.2.3.4');
            expect(fallbacks).toEqual(['1.2.3.4', '1.2.3', '1.2', '1']);
        });
    });

    describe('isSemanticVersion', () => {
        it('should recognize valid semantic versions', () => {
            expect(isSemanticVersion('1.2.3')).toBe(true);
            expect(isSemanticVersion('1.2')).toBe(true);
            expect(isSemanticVersion('1')).toBe(true);
            expect(isSemanticVersion('v1.2.3')).toBe(true);
            expect(isSemanticVersion('10.20.30')).toBe(true);
        });

        it('should reject invalid semantic versions', () => {
            expect(isSemanticVersion('1.2.3.4')).toBe(false);
            expect(isSemanticVersion('1.2.3-alpha')).toBe(false);
            expect(isSemanticVersion('abc')).toBe(false);
            expect(isSemanticVersion('1.x.3')).toBe(false);
            expect(isSemanticVersion('')).toBe(false);
        });
    });

    describe('parseSemanticVersion', () => {
        it('should parse full semantic version', () => {
            const result = parseSemanticVersion('1.2.3');
            expect(result).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it('should parse version with minor only', () => {
            const result = parseSemanticVersion('1.2');
            expect(result).toEqual({
                major: 1,
                minor: 2,
            });
        });

        it('should parse version with major only', () => {
            const result = parseSemanticVersion('1');
            expect(result).toEqual({
                major: 1,
            });
        });

        it('should handle v prefix', () => {
            const result = parseSemanticVersion('v1.2.3');
            expect(result).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it('should return null for empty string', () => {
            const result = parseSemanticVersion('');
            expect(result).toBeNull();
        });

        it('should return null for invalid major version', () => {
            const result = parseSemanticVersion('abc.2.3');
            expect(result).toBeNull();
        });

        it('should handle invalid minor version', () => {
            const result = parseSemanticVersion('1.x.3');
            expect(result).toEqual({
                major: 1,
                patch: 3,
            });
        });

        it('should handle invalid patch version', () => {
            const result = parseSemanticVersion('1.2.x');
            expect(result).toEqual({
                major: 1,
                minor: 2,
            });
        });

        it('should parse large version numbers', () => {
            const result = parseSemanticVersion('99.100.101');
            expect(result).toEqual({
                major: 99,
                minor: 100,
                patch: 101,
            });
        });
    });
});
