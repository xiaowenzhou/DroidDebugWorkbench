import { describe, expect, it } from 'vitest';
import { buildIssueSubmissionPayload } from '../integrations';
import type { IssuePackage } from '../types';

describe('issue tracker integration payload', () => {
  it('builds a preview-safe issue payload from an Issue Package', () => {
    const issuePackage: IssuePackage = {
      id: 'issue-login-crash',
      schemaVersion: 1,
      title: 'Login crash',
      createdAt: '2026-05-25T10:00:00.000Z',
      deviceProfile: {
        abi: ['arm64-v8a'],
        partitions: [],
        toolAvailability: { adb: true },
        scrcpy: { available: true },
        perfetto: { available: true, sdkSupported: true, dataSources: [] },
      },
      buildInfo: { fingerprint: 'vendor/device/build' },
      sessionId: 'session-1',
      replayScriptIds: ['script-1'],
      artifactIds: ['artifact-1'],
      evidenceIndex: [{ id: 'ev-log', type: 'log-line', filePath: 'logcat/crash.txt', lineRange: [1, 5] }],
      agentSummary: {
        conclusion: 'Crash happens after login.',
        evidenceIds: ['ev-log'],
        actionsTaken: ['Captured logcat'],
        unverifiedItems: ['Network body'],
      },
      redactionStatus: 'redacted',
    };

    expect(buildIssueSubmissionPayload({ tracker: 'jira', issuePackage })).toEqual({
      tracker: 'jira',
      title: '[DroidDebug] Login crash',
      description: expect.stringContaining('Crash happens after login.'),
      attachments: ['artifact-1'],
      evidenceIds: ['ev-log'],
      redactionStatus: 'redacted',
    });
  });
});
