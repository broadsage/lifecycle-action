// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

import { GitHubIntegration } from '../src/github';
import { ActionResults, EolStatus } from '../src/types';
import * as github from '@actions/github';
import * as core from '@actions/core';

// Mock @actions/github
jest.mock('@actions/github', () => ({
    getOctokit: jest.fn(),
    context: {
        repo: {
            owner: 'test-owner',
            repo: 'test-repo',
        },
    },
}));

// Mock @actions/core
jest.mock('@actions/core');

describe('GitHubIntegration', () => {
    let mockOctokit: any;
    let ghIntegration: GitHubIntegration;

    const mockResults: ActionResults = {
        eolDetected: true,
        approachingEol: false,
        totalProductsChecked: 1,
        totalCyclesChecked: 1,
        products: [
            {
                product: 'python',
                cycle: '3.7',
                status: EolStatus.END_OF_LIFE,
                eolDate: '2023-06-27',
                daysUntilEol: -500,
                releaseDate: '2018-06-27',
                latestVersion: '3.7.17',
                isLts: false,
                supportDate: null,
                link: null,
                rawData: {
                    cycle: '3.7',
                    eol: '2023-06-27',
                    latest: '3.7.17',
                    releaseDate: '2018-06-27',
                },
            },
        ],
        eolProducts: [
            {
                product: 'python',
                cycle: '3.7',
                status: EolStatus.END_OF_LIFE,
                eolDate: '2023-06-27',
                daysUntilEol: -500,
                releaseDate: '2018-06-27',
                latestVersion: '3.7.17',
                isLts: false,
                supportDate: null,
                link: null,
                rawData: {
                    cycle: '3.7',
                    eol: '2023-06-27',
                    latest: '3.7.17',
                    releaseDate: '2018-06-27',
                },
            },
        ],
        approachingEolProducts: [],
        latestVersions: { python: '3.12.0' },
        summary: 'Test summary',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockOctokit = {
            rest: {
                issues: {
                    listForRepo: jest.fn(),
                    create: jest.fn(),
                    createComment: jest.fn(),
                    addLabels: jest.fn(),
                    update: jest.fn(),
                },
            },
        };

        (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
        ghIntegration = new GitHubIntegration('test-token');
    });

    describe('createEolIssue', () => {
        it('should create a new issue when no similar issue exists', async () => {
            mockOctokit.rest.issues.listForRepo.mockResolvedValue({
                data: [],
            });

            mockOctokit.rest.issues.create.mockResolvedValue({
                data: { number: 123 },
            });

            const issueNumber = await ghIntegration.createEolIssue(mockResults, [
                'eol',
                'dependencies',
            ]);

            expect(issueNumber).toBe(123);
            expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                state: 'open',
                labels: 'eol,dependencies',
                per_page: 10,
            });
            expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    owner: 'test-owner',
                    repo: 'test-repo',
                    labels: ['eol', 'dependencies'],
                    title: expect.stringContaining('End-of-Life Software Detected'),
                })
            );
        });

        it('should add comment to existing issue instead of creating new one', async () => {
            const existingIssue = {
                number: 456,
                title: '🚨 End-of-Life Software Detected - 2024-01-01',
            };

            mockOctokit.rest.issues.listForRepo.mockResolvedValue({
                data: [existingIssue],
            });

            const issueNumber = await ghIntegration.createEolIssue(mockResults, [
                'eol',
            ]);

            expect(issueNumber).toBe(456);
            expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 456,
                body: expect.stringContaining('Updated EOL Detection'),
            });
            expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
        });

        it('should return null on error', async () => {
            mockOctokit.rest.issues.listForRepo.mockRejectedValue(
                new Error('API error')
            );

            const issueNumber = await ghIntegration.createEolIssue(mockResults, [
                'eol',
            ]);

            expect(issueNumber).toBeNull();
            expect(core.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to search for existing issues')
            );
        });

        it('should handle empty labels array', async () => {
            mockOctokit.rest.issues.listForRepo.mockResolvedValue({
                data: [],
            });

            mockOctokit.rest.issues.create.mockResolvedValue({
                data: { number: 789 },
            });

            const issueNumber = await ghIntegration.createEolIssue(mockResults, []);

            expect(issueNumber).toBe(789);
            expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    labels: [],
                })
            );
        });
    });

    describe('addLabels', () => {
        it('should add labels to an issue', async () => {
            mockOctokit.rest.issues.addLabels.mockResolvedValue({});

            await ghIntegration.addLabels(123, ['bug', 'enhancement']);

            expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                labels: ['bug', 'enhancement'],
            });
        });

        it('should handle errors gracefully', async () => {
            mockOctokit.rest.issues.addLabels.mockRejectedValue(
                new Error('API error')
            );

            await ghIntegration.addLabels(123, ['bug']);

            expect(core.warning).toHaveBeenCalledWith(
                expect.stringContaining('Failed to add labels')
            );
        });
    });

    describe('closeIssue', () => {
        it('should close an issue without comment', async () => {
            mockOctokit.rest.issues.update.mockResolvedValue({});

            await ghIntegration.closeIssue(123);

            expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
            expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                state: 'closed',
            });
            expect(core.info).toHaveBeenCalledWith('Closed issue #123');
        });

        it('should close an issue with comment', async () => {
            mockOctokit.rest.issues.createComment.mockResolvedValue({});
            mockOctokit.rest.issues.update.mockResolvedValue({});

            await ghIntegration.closeIssue(123, 'All issues resolved');

            expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                body: 'All issues resolved',
            });
            expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                state: 'closed',
            });
        });

        it('should throw error on failure', async () => {
            const error = new Error('API error');
            mockOctokit.rest.issues.update.mockRejectedValue(error);

            await expect(ghIntegration.closeIssue(123)).rejects.toThrow('API error');
            expect(core.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to close issue')
            );
        });
    });
});
