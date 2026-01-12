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
        totalReleasesChecked: 1,
        products: [
            {
                product: 'python',
                release: '3.7',
                status: EolStatus.END_OF_LIFE,
                eolDate: '2023-06-27',
                daysUntilEol: -500,
                releaseDate: '2018-06-27',
                latestVersion: '3.7.17',
                isLts: false,
                supportDate: null,
                link: null,
                discontinuedDate: null,
                isDiscontinued: false,
                extendedSupportDate: null,
                hasExtendedSupport: false,
                latestReleaseDate: null,
                daysSinceLatestRelease: null,
                rawData: {
                    name: '3.7',
                    eolFrom: '2023-06-27',
                    latest: { name: '3.7.17' },
                    releaseDate: '2018-06-27',
                },
            },
        ],
        eolProducts: [
            {
                product: 'python',
                release: '3.7',
                status: EolStatus.END_OF_LIFE,
                eolDate: '2023-06-27',
                daysUntilEol: -500,
                releaseDate: '2018-06-27',
                latestVersion: '3.7.17',
                isLts: false,
                supportDate: null,
                link: null,
                discontinuedDate: null,
                isDiscontinued: false,
                extendedSupportDate: null,
                hasExtendedSupport: false,
                latestReleaseDate: null,
                daysSinceLatestRelease: null,
                rawData: {
                    name: '3.7',
                    eolFrom: '2023-06-27',
                    latest: { name: '3.7.17' },
                    releaseDate: '2018-06-27',
                },
            },
        ],
        approachingEolProducts: [],
        staleProducts: [],
        staleDetected: false,
        discontinuedProducts: [],
        discontinuedDetected: false,
        extendedSupportProducts: [],
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
                    getLabel: jest.fn(),
                    createLabel: jest.fn(),
                    updateLabel: jest.fn(),
                },
            },
        };

        (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
        ghIntegration = new GitHubIntegration('test-token');
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
    });

    describe('closeIssue', () => {
        it('should close an issue without comment', async () => {
            mockOctokit.rest.issues.update.mockResolvedValue({});

            await ghIntegration.closeIssue(123);

            expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                state: 'closed',
            });
        });
    });

    describe('upsertDashboardIssue', () => {
        it('should create a new dashboard issue with only the tracking label', async () => {
            mockOctokit.rest.issues.listForRepo.mockResolvedValue({
                data: [],
            });

            mockOctokit.rest.issues.create.mockResolvedValue({
                data: { number: 789 },
            });

            const issueNumber = await ghIntegration.upsertDashboardIssue(
                mockResults,
                'Dashboard Test'
            );

            expect(issueNumber).toBe(789);
            expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    labels: ['lifecycle-dashboard'],
                })
            );
        });

        it('should update an existing dashboard issue', async () => {
            mockOctokit.rest.issues.listForRepo.mockResolvedValue({
                data: [{ number: 101, title: 'Old Dashboard' }],
            });

            const issueNumber = await ghIntegration.upsertDashboardIssue(
                mockResults,
                'New Dashboard'
            );

            expect(issueNumber).toBe(101);
            expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    issue_number: 101,
                    title: 'New Dashboard',
                })
            );
        });
    });

    describe('ensureLabelExists', () => {
        it('should create label if it does not exist', async () => {
            mockOctokit.rest.issues.getLabel.mockRejectedValue({ status: 404 });
            mockOctokit.rest.issues.createLabel.mockResolvedValue({});

            await ghIntegration.ensureLabelExists('test-label', 'test-desc', 'ffffff');

            expect(mockOctokit.rest.issues.getLabel).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                name: 'test-label',
            });
            expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                name: 'test-label',
                description: 'test-desc',
                color: 'ffffff',
            });
        });

        it('should update label if it exists but has different description or color', async () => {
            mockOctokit.rest.issues.getLabel.mockResolvedValue({
                data: { name: 'existing-label', description: 'old-desc', color: '000000' }
            });
            mockOctokit.rest.issues.updateLabel.mockResolvedValue({});

            await ghIntegration.ensureLabelExists('existing-label', 'new-desc', 'ffffff');

            expect(mockOctokit.rest.issues.updateLabel).toHaveBeenCalledWith({
                owner: 'test-owner',
                repo: 'test-repo',
                name: 'existing-label',
                new_name: 'existing-label',
                description: 'new-desc',
                color: 'ffffff',
            });
        });

        it('should not create or update label if it matches', async () => {
            mockOctokit.rest.issues.getLabel.mockResolvedValue({
                data: { name: 'match-label', description: 'match-desc', color: 'ffffff' }
            });

            await ghIntegration.ensureLabelExists('match-label', 'match-desc', 'ffffff');

            expect(mockOctokit.rest.issues.getLabel).toHaveBeenCalled();
            expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
            expect(mockOctokit.rest.issues.updateLabel).not.toHaveBeenCalled();
        });

        it('should handle unexpected errors gracefully', async () => {
            mockOctokit.rest.issues.getLabel.mockRejectedValue(new Error('API Error'));

            await ghIntegration.ensureLabelExists('error-label', 'desc');

            expect(mockOctokit.rest.issues.getLabel).toHaveBeenCalled();
            expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
            expect(core.debug).toHaveBeenCalledWith(
                expect.stringContaining('Unexpected error while checking for label')
            );
        });
    });
});
