// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import {
    getErrorMessage,
    isErrorInstance,
    createError,
} from '../src/utils/error-utils';

describe('Error Utils', () => {
    describe('getErrorMessage', () => {
        it('should extract message from Error instance', () => {
            const error = new Error('Test error message');
            expect(getErrorMessage(error)).toBe('Test error message');
        });

        it('should convert non-Error to string', () => {
            expect(getErrorMessage('string error')).toBe('string error');
            expect(getErrorMessage(123)).toBe('123');
            expect(getErrorMessage(null)).toBe('null');
            expect(getErrorMessage(undefined)).toBe('undefined');
        });

        it('should handle objects', () => {
            const obj = { code: 'ERR_001', message: 'Custom error' };
            expect(getErrorMessage(obj)).toBe('[object Object]');
        });
    });

    describe('isErrorInstance', () => {
        class CustomError extends Error {
            constructor(message: string) {
                super(message);
                this.name = 'CustomError';
            }
        }

        it('should return true for matching error class', () => {
            const error = new CustomError('test');
            expect(isErrorInstance(error, CustomError as any)).toBe(true);
        });

        it('should return true for Error class', () => {
            const error = new Error('test');
            expect(isErrorInstance(error, Error as any)).toBe(true);
        });

        it('should return false for non-matching error class', () => {
            const error = new Error('test');
            expect(isErrorInstance(error, CustomError as any)).toBe(false);
        });

        it('should return false for non-Error values', () => {
            expect(isErrorInstance('string', Error as any)).toBe(false);
            expect(isErrorInstance(123, Error as any)).toBe(false);
            expect(isErrorInstance(null, Error as any)).toBe(false);
        });
    });

    describe('createError', () => {
        it('should create error with message', () => {
            const error = createError('Test error');
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Test error');
        });

        it('should create error with cause', () => {
            const cause = new Error('Original error');
            const error = createError('Wrapped error', cause);

            expect(error.message).toBe('Wrapped error');
            expect(error.stack).toContain('Caused by:');
            expect(error.stack).toContain('Original error');
        });

        it('should handle non-Error cause', () => {
            const error = createError('Test error', 'string cause');
            expect(error.message).toBe('Test error');
            expect(error.stack).not.toContain('Caused by:');
        });

        it('should create error without cause', () => {
            const error = createError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.stack).toBeDefined();
        });
    });
});
