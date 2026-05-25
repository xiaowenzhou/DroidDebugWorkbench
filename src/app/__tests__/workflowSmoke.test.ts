import { describe, expect, it } from 'vitest';
import { workbenchApi } from '../api';

describe('workbench browser-mode workflows', () => {
  it('runs core workflows without desktop runtime', async () => {
    const devices = await workbenchApi.listDevices();
    expect(devices.length).toBeGreaterThan(0);

    const artifact = await workbenchApi.runRecipe('collect-logcat', devices[0].id);
    expect(artifact.status).toBe('success');
    expect(artifact.recipeId).toBe('collect-logcat');

    const blocked = await workbenchApi.executeCommand('adb shell pm clear com.example', devices[0].id);
    expect(blocked.status).toBe('blocked');
    expect(blocked.requiresApproval).toBe(true);

    const mirror = await workbenchApi.startMirror(devices[0].id);
    expect(mirror.status).toBe('running');

    const invite = await workbenchApi.createRemoteInvite('mirror-control');
    expect(invite.auditEnabled).toBe(true);

    const packageManifest = await workbenchApi.exportIssuePackage('登录崩溃');
    expect(packageManifest.evidenceIndex.length).toBeGreaterThan(0);

    const symbolicated = await workbenchApi.runSymbolication('at a.a(SourceFile:42)', 'com.example.LoginActivity -> a:');
    expect(symbolicated.output).toContain('LoginActivity');

    const submitted = await workbenchApi.submitIssue('Jira', packageManifest.title);
    expect(submitted.status).toBe('dry-run');
  });

  it('returns readable Chinese Agent fallback text', async () => {
    const output = await workbenchApi.runAgentPrompt('分析当前崩溃');
    expect(output).toContain('结论');
    expect(output).toContain('证据');
    expect(output).not.toMatch(/[�]|缁|鏃|锛|璇/);
  });
});
