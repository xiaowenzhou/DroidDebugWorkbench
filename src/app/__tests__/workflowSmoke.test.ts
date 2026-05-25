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

  it('uses the shared command gateway contract in browser fallback mode', async () => {
    const writeCommand = await workbenchApi.executeCommand('adb shell am start -n "com.example/.Login Activity"', 'demo-adb-001');
    expect(writeCommand.argv).toEqual(['adb', 'shell', 'am', 'start', '-n', 'com.example/.Login Activity']);
    expect(writeCommand.riskLevel).toBe('write');
    expect(writeCommand.requiresApproval).toBe(false);

    const dangerousCommand = await workbenchApi.executeCommand('adb shell setprop persist.demo 1', 'demo-adb-001');
    expect(dangerousCommand.status).toBe('blocked');
    expect(dangerousCommand.riskLevel).toBe('dangerous');
    expect(dangerousCommand.stderr).toContain('本地明确确认');

    const fastbootFlash = await workbenchApi.executeCommand('fastboot -s ABC123 flash boot boot.img', 'demo-adb-001');
    expect(fastbootFlash.status).toBe('blocked');
    expect(fastbootFlash.riskLevel).toBe('destructive');
  });

  it('returns diagnostic artifacts with metadata and evidence index in fallback mode', async () => {
    const artifact = await workbenchApi.runRecipe('collect-issue-package', 'demo-adb-001');

    expect(artifact.files.map((file) => file.path)).toEqual(
      expect.arrayContaining(['metadata.json', 'evidence-index.json', 'issue-package/manifest.json']),
    );
    expect(artifact.timeline?.length).toBeGreaterThan(0);
    expect(artifact.summary).toContain('证据索引');
  });

  it('reports the PRD self-diagnostics checklist in fallback mode', async () => {
    const diagnostics = await workbenchApi.getSelfDiagnostics();
    const joined = diagnostics.join('\n');

    for (const label of ['ADB', 'fastboot', 'scrcpy', 'Perfetto', '命令网关', '安全存储', '在线设备', '最近失败任务', '产物目录']) {
      expect(joined).toContain(label);
    }
  });

  it('returns readable Chinese Agent fallback text', async () => {
    const output = await workbenchApi.runAgentPrompt('分析当前崩溃');
    expect(output).toContain('结论');
    expect(output).toContain('证据');
    expect(output).not.toMatch(/[�]|缁|鏃|锛|璇/);
  });
});
