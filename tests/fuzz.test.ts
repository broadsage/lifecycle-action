import * as fc from 'fast-check';
import { ActionInputsSchema } from '../src/types';

describe('Fuzzing - ActionInputsSchema', () => {
    it('should handle random input strings without crashing', () => {
        fc.assert(
            fc.property(fc.string(), (input: string) => {
                try {
                    // We just ensure it doesn't throw unexpected errors (like memory leaks or segfaults)
                    // Zod should safely return an error for invalid inputs
                    ActionInputsSchema.safeParse(input);
                    return true;
                } catch (e) {
                    // Unexpected crash
                    return false;
                }
            })
        );
    });

    it('should handle random objects in schema validation', () => {
        fc.assert(
            fc.property(fc.object(), (input: object) => {
                try {
                    ActionInputsSchema.safeParse(input);
                    return true;
                } catch (e) {
                    return false;
                }
            })
        );
    });
});
