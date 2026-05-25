import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { demoAgentTools, demoArtifacts, demoDevices, demoReplayScripts, demoSession, demoSummary } from '../fixtures';
import { workbenchApi } from '../api';

const mojibakePattern = /缁撹|璁惧|鎶撳|鍚庣|鐧诲|宕╂簝|闀滃|鑴氭|浼氳|杩滅|璁剧|涓€閿|鏃ュ織|鍛戒护|娴忚|缂洪/;

describe('localized workbench data', () => {
  it('keeps demo data readable for the Chinese desktop client', () => {
    const visibleText = [
      ...demoDevices.map((device) => device.alias),
      demoSession.title,
      ...demoSession.events.map((event) => event.title),
      demoSummary.conclusion,
      ...demoSummary.actionsTaken,
      ...demoSummary.unverifiedItems,
      ...demoArtifacts.map((artifact) => artifact.summary),
      ...demoReplayScripts.map((script) => script.name),
      ...demoReplayScripts.flatMap((script) => script.steps.map((step) => String(step.payload.label ?? step.payload.condition ?? step.payload.logContains ?? ''))),
      ...demoAgentTools.map((tool) => tool.description),
    ]
      .filter(Boolean)
      .join('\n');

    expect(visibleText).toContain('登录崩溃复现');
    expect(visibleText).toContain('ROM 测试主机');
    expect(visibleText).toContain('串口控制台');
    expect(visibleText).toContain('证据');
    expect(visibleText).not.toMatch(mojibakePattern);

    for (const oldEnglish of [
      'ROM daily driver',
      'UART console',
      'Started login reproduction',
      'Login crash reproduction',
      'Crash package captured',
      'List connected devices.',
      'Capture logcat buffers.',
    ]) {
      expect(visibleText).not.toContain(oldEnglish);
    }
  });

  it('returns localized workflow feedback in browser fallback mode', async () => {
    const blocked = await workbenchApi.executeCommand('adb shell pm clear com.example', 'demo-adb-001');
    expect(blocked.stderr).toContain('本地明确确认');

    const agentOutput = await workbenchApi.runAgentPrompt('分析当前崩溃');
    expect(agentOutput).toContain('结论');
    expect(agentOutput).toContain('证据');
    expect(agentOutput).not.toMatch(mojibakePattern);
  });

  it('keeps desktop backend user-facing copy localized', () => {
    const backendSource = readFileSync(new URL('../../../src-tauri/src/lib.rs', import.meta.url), 'utf8');

    expect(backendSource).toContain('一键 Logcat');
    expect(backendSource).toContain('一键截图');
    expect(backendSource).toContain('一键录屏');
    expect(backendSource).toContain('collect-screenshot');
    expect(backendSource).toContain('collect-screenrecord');
    expect(backendSource).toContain('自检');
    expect(backendSource).toContain('本地明确确认');
    expect(backendSource).toContain('fastboot 可用');
    expect(backendSource).toContain('在线设备数量');
    expect(backendSource).toContain('安全存储');
    expect(backendSource).toContain('产物目录可写');
    expect(backendSource).not.toMatch(mojibakePattern);

    for (const oldEnglish of [
      'One-click Logcat',
      'Capture logcat',
      'Login crash reproduction',
      'scrcpy was not found',
      'Command requires explicit local approval',
      'Tauri command gateway active',
    ]) {
      expect(backendSource).not.toContain(oldEnglish);
    }
  });
});
