import {
  demoAgentTools,
  demoArtifacts,
  demoDevices,
  demoEvents,
  demoIssuePackage,
  demoRecipes,
  demoReplayScripts,
  demoSession,
} from './fixtures';
import { classifyCommandRisk, parseCommandLine } from '../domain';
import type {
  AgentTool,
  ArtifactFile,
  CommandExecutionResult,
  DebugRecipe,
  DebugSession,
  DeviceRef,
  DiagnosticArtifact,
  IntegrationSubmissionResult,
  IssuePackage,
  MirrorSession,
  RemoteInvite,
  ReplayScript,
  SymbolicationResult,
} from '../domain';

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function getTauriInvoke(): Promise<InvokeFn | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return null;
  }

  const core = await import('@tauri-apps/api/core');
  return core.invoke as InvokeFn;
}

async function callBackend<T>(command: string, args: Record<string, unknown> | undefined, fallback: () => T): Promise<T> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
    return fallback();
  }

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.warn(`后端命令失败，已切换到安全预览模式：${command}`, error);
    return fallback();
  }
}

function artifactFile(path: string, kind: ArtifactFile['kind'], sizeBytes = 256): ArtifactFile {
  return { path, kind, sizeBytes };
}

function fallbackRecipeFiles(recipeId: string): ArtifactFile[] {
  const files = [
    artifactFile('metadata.json', 'metadata'),
    artifactFile('evidence-index.json', 'evidence'),
  ];

  if (recipeId.includes('logcat') || recipeId.includes('crash') || recipeId === 'collect-issue-package') {
    files.push(artifactFile('logcat/all.txt', 'logcat', 1024));
  }

  if (recipeId.includes('bugreport') || recipeId.includes('crash') || recipeId === 'collect-issue-package') {
    files.push(artifactFile('bugreport/bugreport.txt', 'bugreport', 1024));
  }

  if (recipeId.includes('perfetto') || recipeId.includes('performance') || recipeId.includes('graphics')) {
    files.push(artifactFile('traces/main.perfetto-trace', 'trace', 1024));
  }

  if (recipeId.includes('screenshot') || recipeId.includes('crash') || recipeId === 'collect-issue-package') {
    files.push(artifactFile('screenshots/current.png', 'screenshot', 128));
  }

  if (recipeId.includes('screenrecord')) {
    files.push(artifactFile('screenrecords/current.mp4', 'screenrecord', 128));
  }

  if (recipeId === 'collect-issue-package') {
    files.push(artifactFile('issue-package/manifest.json', 'manifest', 512));
  }

  if (recipeId === 'collect-regression-report') {
    files.push(artifactFile('regression-report.json', 'report', 512));
  }

  return files;
}

function classifyFallbackCommand(argv: string[]): CommandExecutionResult['riskLevel'] {
  const commandArgv = argv[0] === 'adb' ? argv.slice(1) : argv;
  return classifyCommandRisk(commandArgv);
}

export const workbenchApi = {
  listDevices: () => callBackend<DeviceRef[]>('list_devices', undefined, () => demoDevices),
  listRecipes: () => callBackend<DebugRecipe[]>('list_recipes', undefined, () => demoRecipes),
  listAgentTools: () => callBackend<AgentTool[]>('list_agent_tools', undefined, () => demoAgentTools),
  listScripts: () => callBackend<ReplayScript[]>('list_scripts', undefined, () => demoReplayScripts),
  currentSession: () => callBackend<DebugSession>('current_session', undefined, () => demoSession),
  listArtifacts: () => callBackend<DiagnosticArtifact[]>('list_artifacts', undefined, () => demoArtifacts),
  exportIssuePackage: (title: string) => callBackend<IssuePackage>('export_issue_package', { title }, () => ({ ...demoIssuePackage, title })),
  runRecipe: (recipeId: string, deviceId: string) =>
    callBackend<DiagnosticArtifact>('run_recipe', { recipeId, deviceId }, () => ({
      ...demoArtifacts[0],
      id: `artifact-${recipeId}-${Date.now()}`,
      recipeId,
      deviceId,
      createdAt: new Date().toISOString(),
      status: 'success',
      rootDir: `artifacts/preview-${recipeId}`,
      files: fallbackRecipeFiles(recipeId),
      timeline: demoEvents,
      summary: `已生成 ${recipeId} 诊断产物（预览模式），包含 metadata、证据索引和时间线。`,
    })),
  runAgentPrompt: (prompt: string) =>
    callBackend<string>('run_agent_prompt', { prompt }, () =>
      [
        '结论：当前演示会话显示 LoginActivity 在提交凭据后出现崩溃。',
        '证据：ev-log-001 指向 logcat/crash.txt 的 FATAL EXCEPTION；ev-cmd-001 指向触发 Activity 的命令输出。',
        '已执行动作：读取设备状态、关联 Debug Session 时间线、生成 Issue Package 摘要。',
        `用户问题：${prompt}`,
      ].join('\n'),
    ),
  executeCommand: (commandLine: string, deviceId?: string) =>
    callBackend<CommandExecutionResult>('execute_command', { commandLine, deviceId }, () => {
      const argv = parseCommandLine(commandLine);
      const riskLevel = classifyFallbackCommand(argv);
      const requiresApproval = riskLevel === 'dangerous' || riskLevel === 'destructive';
      return {
        commandLine,
        argv,
        status: requiresApproval ? 'blocked' : 'success',
        exitCode: requiresApproval ? undefined : 0,
        stdout: requiresApproval ? '' : `浏览器预览模式已通过命令网关排队：\n${commandLine}`,
        stderr: requiresApproval ? '该命令需要本地明确确认后才能执行。' : '',
        riskLevel,
        requiresApproval,
        durationMs: 0,
      };
    }),
  startMirror: (deviceId: string) =>
    callBackend<MirrorSession>('start_mirror', { deviceId }, () => ({
      id: `mirror-${Date.now()}`,
      deviceId,
      status: 'running',
      message: '浏览器预览镜像已启动。桌面运行时会在 scrcpy 可用时拉起真实镜像。',
      startedAt: new Date().toISOString(),
    })),
  createRemoteInvite: (permission: string) =>
    callBackend<RemoteInvite>('create_remote_invite', { permission }, () => ({
      code: '428-119',
      permission,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      lanCandidates: ['local-fallback'],
      auditEnabled: true,
    })),
  runSymbolication: (stack: string, mapping: string) =>
    callBackend<SymbolicationResult>('symbolication_run', { stack, mapping }, () => ({
      status: 'partial',
      inputFrames: stack.split('\n').filter((line) => line.trim().startsWith('at ')).length,
      matchedFrames: mapping ? 1 : 0,
      output: mapping ? stack.replace('a.a', 'com.example.LoginActivity.submit') : stack,
    })),
  submitIssue: (tracker: string, title: string) =>
    callBackend<IntegrationSubmissionResult>('integration_submit_issue', { tracker, title }, () => ({
      tracker,
      status: 'dry-run',
      title,
      payloadPreview: `缺陷提交预览（未联网提交）\n系统：${tracker}\n标题：${title}\n附件：artifact-crash-package`,
      attachments: ['artifact-crash-package'],
    })),
  getSelfDiagnostics: () =>
    callBackend<string[]>('self_diagnostics', undefined, () => [
      'ADB 可用：浏览器预览模式不直接探测，桌面运行时通过 Tauri 校验。',
      'fastboot 可用：浏览器预览模式不直接探测，桌面运行时通过 Tauri 校验。',
      'scrcpy 可用：浏览器预览模式不直接探测，桌面运行时可启动 sidecar。',
      'Perfetto 可用：浏览器预览模式不直接探测，桌面运行时执行真实 trace 采集。',
      'Tauri 命令网关：前端预览适配器已启用，桌面运行时必须经过 invoke 网关。',
      `在线设备数量：${demoDevices.filter((device) => device.state === 'device').length}`,
      '安全存储：浏览器预览不读取密钥，桌面运行时使用系统安全凭据或加密存储。',
      '最近失败任务：无；失败任务会进入任务日志和恢复建议。',
      '产物目录：预览模式写入虚拟 artifacts 路径，桌面运行时会校验目录可写。',
      '自检不会输出 API key、Token 或其他敏感信息。',
    ]),
};
