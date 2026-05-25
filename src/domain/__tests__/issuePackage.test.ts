import { describe, expect, it } from 'vitest';
import { createIssuePackageManifest } from '../issuePackage';
import type { DebugSession, DeviceCapabilityProfile } from '../types';

describe('issue package manifest', () => {
  it('creates a portable manifest with device profile, session, evidence, and redaction status', () => {
    const profile: DeviceCapabilityProfile = {
      abi: ['arm64-v8a'],
      screen: { width: 1080, height: 2400, density: 440, refreshRate: 120 },
      selinux: 'enforcing',
      partitions: [],
      toolAvailability: { adb: true, scrcpy: true, perfetto: true },
      scrcpy: { available: true, version: '2.7', audio: true, hid: true },
      perfetto: { available: true, sdkSupported: true, dataSources: ['linux.ftrace'] },
      wirelessDebugging: { paired: true, connected: false },
    };
    const session: DebugSession = {
      id: 'session-1',
      deviceId: 'device-1',
      startedAt: '2026-05-25T10:00:00.000Z',
      events: [
        {
          id: 'evt-1',
          timestamp: '2026-05-25T10:00:01.000Z',
          kind: 'terminal-command',
          source: 'local-user',
          title: 'adb shell am start',
          evidenceRefs: [{ id: 'ev-cmd', type: 'command-output', filePath: 'commands.log' }],
        },
      ],
      artifacts: [],
    };

    const manifest = createIssuePackageManifest({
      title: 'Login crash',
      deviceProfile: profile,
      buildInfo: { fingerprint: 'vendor/device/build' },
      session,
      replayScriptIds: ['script-1'],
      artifactIds: ['artifact-1'],
      redactionStatus: 'redacted',
      createdAt: '2026-05-25T10:05:00.000Z',
    });

    expect(manifest.id).toBe('issue-login-crash-20260525-100500');
    expect(manifest.sessionId).toBe('session-1');
    expect(manifest.evidenceIndex).toHaveLength(1);
    expect(manifest.redactionStatus).toBe('redacted');
    expect(manifest.schemaVersion).toBe(1);
  });
});
