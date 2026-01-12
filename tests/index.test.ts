// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2025 Broadsage

jest.mock('p-limit', () => jest.fn().mockImplementation(() => (fn: any) => fn()));

import * as core from '@actions/core';
import * as inputs from '../src/inputs';
import * as outputs from '../src/outputs';
import * as notifications from '../src/notifications';
import { EndOfLifeClient } from '../src/client';
import { EolAnalyzer } from '../src/analyzer';
import { GitHubIntegration } from '../src/github';
import { VersionExtractor } from '../src/version-extractor';
import { SBOMParser } from '../src/sbom-parser';
import { run } from '../src/index';

// Mock all dependencies
jest.mock('@actions/core', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    group: jest.fn().mockImplementation(async (_name, fn) => await fn()),
}));
jest.mock('../src/client');
jest.mock('../src/analyzer');
jest.mock('../src/github');
jest.mock('../src/inputs');
jest.mock('../src/outputs');
jest.mock('../src/notifications');
jest.mock('../src/version-extractor');
jest.mock('../src/sbom-parser');

describe('Main Action (index.ts)', () => {
    const mockInputs: any = {
        products: 'python',
        releases: '{}',
        checkEol: true,
        eolThresholdDays: 90,
        failOnEol: false,
        failOnApproachingEol: false,
        failOnStale: false,
        stalenessThresholdDays: 365,
        includeDiscontinued: false,
        outputFormat: 'summary',
        outputFile: '',
        cacheTtl: 3600,
        githubToken: 'test-token',

        useDashboard: false,
        dashboardTitle: 'Dashboard',
        includeLatestVersion: true,
        includeSupportInfo: true,
        customApiUrl: 'https://endoflife.date/api/v1',
        filePath: '',
        fileKey: '',
        fileFormat: 'auto',
        versionRegex: '',
        version: '',
        outputMatrix: false,
        excludeEolFromMatrix: true,
        excludeApproachingEolFromMatrix: false,
        apiConcurrency: 5,
        notificationRetryAttempts: 3,
        notificationRetryDelayMs: 1000,
        notificationThresholdDays: 30,
        notifyOnEolOnly: true,
        notifyOnApproachingEol: false,
        enableNotifications: false,
    };

    const mockResults: any = {
        eolDetected: false,
        approachingEol: false,
        totalProductsChecked: 1,
        totalReleasesChecked: 1,
        products: [],
        eolProducts: [],
        approachingEolProducts: [],
        staleProducts: [],
        discontinuedProducts: [],
        latestVersions: {},
        summary: 'Mock Summary',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (inputs.getInputs as jest.Mock).mockReturnValue(mockInputs);
        (inputs.parseProducts as jest.Mock).mockReturnValue(['python']);
        (inputs.parseReleases as jest.Mock).mockReturnValue({});

        const mockClient = {
            getAllProducts: jest.fn().mockResolvedValue(['python', 'nodejs']),
            getProductsByCategory: jest.fn().mockResolvedValue([{ name: 'python' }]),
            getProductsByTag: jest.fn().mockResolvedValue([{ name: 'python' }]),
            getCacheStats: jest.fn().mockReturnValue({}),
        };
        (EndOfLifeClient as jest.Mock).mockImplementation(() => mockClient);

        (EolAnalyzer.prototype.analyzeMany as jest.Mock).mockResolvedValue(mockResults);

        (notifications.getNotificationConfig as jest.Mock).mockReturnValue({ enabled: false });
        (notifications.NotificationChannelFactory.createFromInputs as jest.Mock).mockReturnValue([]);
    });

    it('should run successfully with basic inputs', async () => {
        await run();

        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Starting Software Lifecycle Tracker'));
        expect(inputs.getInputs).toHaveBeenCalled();
        expect(inputs.validateInputs).toHaveBeenCalled();
        expect(outputs.setOutputs).toHaveBeenCalledWith(mockResults);
        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Action completed successfully'));
    });

    it('should handle "all" products', async () => {
        (inputs.parseProducts as jest.Mock).mockReturnValue(['all']);
        await run();
        expect(core.info).toHaveBeenCalledWith('Fetching all available products...');
    });

    it('should handle SBOM parsing', async () => {
        const inputsWithSbom = { ...mockInputs, sbomFile: 'sbom.json' };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithSbom);

        const mockSbomVersions = new Map([['python', '3.11']]);
        (SBOMParser.prototype.parseFile as jest.Mock).mockResolvedValue(mockSbomVersions);

        await run();

        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Parsing SBOM file'));
        expect(SBOMParser.prototype.parseFile).toHaveBeenCalled();
    });

    it('should handle version extraction from file', async () => {
        const inputsWithFile = { ...mockInputs, filePath: 'version.txt' };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithFile);

        (VersionExtractor.prototype.extractFromFile as jest.Mock).mockReturnValue({ version: '1.2.3' });

        await run();

        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Extracting version from file'));
        expect(VersionExtractor.prototype.extractFromFile).toHaveBeenCalled();
        expect(core.setOutput).toHaveBeenCalledWith('version', '1.2.3');
    });

    it('should handle error and set failed', async () => {
        const error = new Error('Test Error');
        (inputs.getInputs as jest.Mock).mockImplementation(() => { throw error; });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(`Action failed: ${error.message}`);
    });



    it('should handle dashboard updates', async () => {
        const inputsWithDashboard = { ...mockInputs, useDashboard: true, githubToken: 'token' };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithDashboard);

        const mockGh = {
            upsertDashboardIssue: jest.fn().mockResolvedValue(456),
        };
        (GitHubIntegration as jest.Mock).mockImplementation(() => mockGh);

        await run();

        expect(mockGh.upsertDashboardIssue).toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith('Dashboard updated: #456');
    });

    it('should handle category filtering', async () => {
        const inputsWithCategory = { ...mockInputs, filterByCategory: 'lang' };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithCategory);

        await run();

        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Filtering products by category: lang'));
    });

    it('should handle tag filtering', async () => {
        const inputsWithTag = { ...mockInputs, filterByTag: 'web' };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithTag);

        await run();

        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Filtering products by tag: web'));
    });

    it('should generate matrix when requested', async () => {
        const inputsWithMatrix = { ...mockInputs, outputMatrix: true };
        (inputs.getInputs as jest.Mock).mockReturnValue(inputsWithMatrix);
        (outputs.generateMatrix as jest.Mock).mockReturnValue({ versions: ['3.11'] });
        (outputs.generateMatrixInclude as jest.Mock).mockReturnValue([]);

        await run();

        expect(outputs.generateMatrix).toHaveBeenCalled();
        expect(outputs.generateMatrixInclude).toHaveBeenCalled();
    });

    it('should fail on EOL if requested', async () => {
        const resultsWithEol = { ...mockResults, eolDetected: true, eolProducts: [{ product: 'test' }] };
        const inputsFail = { ...mockInputs, failOnEol: true };

        (inputs.getInputs as jest.Mock).mockReturnValue(inputsFail);
        (EolAnalyzer.prototype.analyzeMany as jest.Mock).mockResolvedValue(resultsWithEol);

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed: 1 end-of-life version(s) detected'));
    });

    it('should fail on approaching EOL if requested', async () => {
        const resultsWithApproaching = { ...mockResults, approachingEol: true, approachingEolProducts: [{ product: 'test' }] };
        const inputsFail = { ...mockInputs, failOnApproachingEol: true };

        (inputs.getInputs as jest.Mock).mockReturnValue(inputsFail);
        (EolAnalyzer.prototype.analyzeMany as jest.Mock).mockResolvedValue(resultsWithApproaching);

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed: 1 version(s) approaching end-of-life'));
    });

    it('should handle notification sending', async () => {
        (notifications.getNotificationConfig as jest.Mock).mockReturnValue({ enabled: true });
        const mockChannel = { name: 'test-channel' };
        (notifications.NotificationChannelFactory.createFromInputs as jest.Mock).mockReturnValue([mockChannel]);

        const mockManager = {
            addChannel: jest.fn(),
            getChannelCount: jest.fn().mockReturnValue(1),
            sendAll: jest.fn().mockResolvedValue([{ success: true }]),
        };
        (notifications.NotificationManager as jest.Mock).mockImplementation(() => mockManager);

        await run();

        expect(mockManager.addChannel).toHaveBeenCalledWith(mockChannel);
        expect(mockManager.sendAll).toHaveBeenCalled();
    });
});
