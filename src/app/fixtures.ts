import { BUILTIN_RECIPES, createIssuePackageManifest, timelineFromEvents } from '../domain';
import type {
  AgentTool,
  DebugSession,
  DeviceCapabilityProfile,
  DeviceRef,
  DiagnosticArtifact,
  EvidenceBackedSummary,
  IssuePackage,
  ReplayScript,
  SessionEvent,
} from '../domain';

export const demoProfile: DeviceCapabilityProfile = {
  abi: ['arm64-v8a', 'armeabi-v7a'],
  screen: { width: 1080, height: 2400, density: 440, refreshRate: 120 },
  selinux: 'enforcing',
  partitions: [
    { name: 'boot_a', type: 'boot' },
    { name: 'system_a', type: 'dynamic' },
    { name: 'vendor_a', type: 'dynamic' },
  ],
  toolAvailability: {
    adb: true,
    logcat: true,
    bugreport: true,
    perfetto: true,
    screenrecord: true,
    scrcpy: true,
    fastboot: false,
  },
  scrcpy: { available: true, version: '2.x', audio: true, hid: true },
  perfetto: { available: true, sdkSupported: true, dataSources: ['linux.ftrace', 'android.log', 'android.surfaceflinger'] },
  wirelessDebugging: { paired: true, connected: false, port: 37099 },
};

export const demoDevices: DeviceRef[] = [
  {
    id: 'demo-adb-001',
    serial: 'R58T-demo',
    alias: 'ROM 测试主机',
    transport: 'adb-usb',
    state: 'device',
    model: 'Pixel 8 Pro',
    manufacturer: 'Google',
    androidVersion: '16',
    apiLevel: 36,
    buildFingerprint: 'google/husky_beta/demo:userdebug/dev-keys',
    rootState: 'adb-root',
    capabilities: ['adb', 'logcat', 'bugreport', 'perfetto', 'dumpsys', 'screenshot', 'screenrecord', 'scrcpy'],
    profile: demoProfile,
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: 'demo-serial-001',
    serial: 'COM5',
    alias: '串口控制台',
    transport: 'serial',
    state: 'device',
    model: 'Qualcomm reference board',
    rootState: 'unknown',
    capabilities: ['serial'],
    lastSeenAt: new Date().toISOString(),
  },
];

export const demoEvents: SessionEvent[] = timelineFromEvents([
  {
    id: 'evt-001',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    kind: 'user-action',
    source: 'local-user',
    title: '开始复现登录崩溃',
    evidenceRefs: [{ id: 'ev-step-001', type: 'script-step', description: '冷启动后点击登录按钮' }],
  },
  {
    id: 'evt-002',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    kind: 'terminal-command',
    source: 'local-user',
    title: 'adb shell am start -n com.example/.LoginActivity',
    evidenceRefs: [{ id: 'ev-cmd-001', type: 'command-output', filePath: 'commands.log', lineRange: [12, 14] }],
  },
  {
    id: 'evt-003',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    kind: 'log-event',
    source: 'system',
    title: '检测到 com.example 发生 FATAL EXCEPTION',
    evidenceRefs: [{ id: 'ev-log-001', type: 'log-line', filePath: 'logcat/crash.txt', lineRange: [420, 438] }],
  },
  {
    id: 'evt-004',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    kind: 'agent-tool-call',
    source: 'agent',
    title: 'Agent 已按证据汇总崩溃聚类',
    evidenceRefs: [{ id: 'ev-agent-001', type: 'artifact-file', filePath: 'agent-summary.md' }],
  },
]);

export const demoSession: DebugSession = {
  id: 'session-demo-001',
  deviceId: 'demo-adb-001',
  startedAt: demoEvents[0].timestamp,
  title: '登录崩溃复现',
  events: demoEvents,
  artifacts: [],
};

export const demoSummary: EvidenceBackedSummary = {
  conclusion: 'LoginActivity 在提交凭据后崩溃，日志显示跳转前 token 响应为空。',
  evidenceIds: ['ev-log-001', 'ev-cmd-001'],
  actionsTaken: ['已抓取 logcat', '已关联命令时间线', '已准备崩溃诊断包'],
  unverifiedItems: ['当前本地演示会话尚未采集后端响应体'],
};

export const demoIssuePackage: IssuePackage = {
  ...createIssuePackageManifest({
    title: '登录崩溃',
    createdAt: new Date().toISOString(),
    deviceProfile: demoProfile,
    buildInfo: { fingerprint: 'google/husky_beta/demo:userdebug/dev-keys', buildId: 'AP4A.demo' },
    session: demoSession,
    replayScriptIds: ['script-login-crash'],
    artifactIds: ['artifact-crash-package'],
    redactionStatus: 'redacted',
  }),
  agentSummary: demoSummary,
};

export const demoArtifacts: DiagnosticArtifact[] = [
  {
    id: 'artifact-crash-package',
    deviceId: 'demo-adb-001',
    recipeId: 'collect-crash-package',
    createdAt: new Date(Date.now() - 45000).toISOString(),
    status: 'success',
    rootDir: 'artifacts/demo-crash-package',
    summary: '已生成包含 logcat、截图、bugreport 占位文件和证据索引的崩溃诊断包。',
    files: [
      { path: 'logcat/crash.txt', kind: 'logcat', sizeBytes: 238000 },
      { path: 'screenshots/current.png', kind: 'screenshot', sizeBytes: 512000 },
      { path: 'evidence-index.json', kind: 'evidence', sizeBytes: 4200 },
    ],
    timeline: demoEvents,
  },
];

export const demoReplayScripts: ReplayScript[] = [
  {
    id: 'script-login-crash',
    name: '登录崩溃复现',
    createdAt: new Date(Date.now() - 240000).toISOString(),
    coordinateSpace: { width: 1080, height: 2400, rotation: 0 },
    steps: [
      { id: 'step-1', type: 'tap', payload: { x: 540, y: 1960, label: '登录按钮' }, evidenceRefs: [{ id: 'ev-step-001', type: 'script-step' }] },
      { id: 'step-2', type: 'wait', payload: { ms: 1200, condition: 'Activity 切换' } },
      { id: 'step-3', type: 'assert', payload: { logContains: 'FATAL EXCEPTION' } },
    ],
  },
];

function agentTool(
  name: string,
  description: string,
  riskLevel: AgentTool['riskLevel'],
  permission: string,
  handler: string,
  inputSchema: AgentTool['inputSchema'] = { type: 'object', properties: {} },
): AgentTool {
  return {
    name,
    description,
    inputSchema,
    riskLevel,
    permission,
    supportsDryRun: true,
    handler,
  };
}

export const demoAgentTools: AgentTool[] = [
  agentTool('device.list', '列出已连接的 Android、串口、fastboot 和远程设备。', 'read', 'device.read', 'list_devices'),
  agentTool(
    'device.profile.read',
    '读取当前设备画像、能力和工具可用性摘要。',
    'read',
    'device.read',
    'list_devices',
    { type: 'object', properties: { deviceId: { type: 'string' } } },
  ),
  agentTool(
    'command.executeReadOnly',
    '通过命令网关执行只读 ADB 命令，仍会复用本地风险分类和审批边界。',
    'read',
    'command.execute',
    'execute_read_only_command',
    { type: 'object', properties: { commandLine: { type: 'string' }, deviceId: { type: 'string' } }, required: ['commandLine'] },
  ),
  agentTool(
    'logcat.capture',
    '抓取 logcat buffer，并挂载到当前 Debug Session。',
    'read',
    'diagnostic.run',
    'run_recipe',
    { type: 'object', properties: { buffers: { type: 'array', items: { type: 'string' } } } },
  ),
  agentTool(
    'bugreport.capture',
    '抓取 bugreport 诊断产物并写入证据索引。',
    'read',
    'diagnostic.run',
    'run_recipe',
    { type: 'object', properties: { deviceId: { type: 'string' } } },
  ),
  agentTool(
    'perfetto.capture',
    '按预设模板抓取 Perfetto trace 产物。',
    'read',
    'diagnostic.run',
    'run_recipe',
    { type: 'object', properties: { templateId: { type: 'string' }, durationMs: { type: 'number' } } },
  ),
  agentTool(
    'dumpsys.capture',
    '抓取指定 dumpsys service 输出并关联到当前会话。',
    'read',
    'diagnostic.run',
    'run_recipe',
    { type: 'object', properties: { service: { type: 'string' } } },
  ),
  agentTool(
    'artifact.search',
    '在当前诊断产物和证据索引中检索关键字。',
    'read',
    'artifact.read',
    'list_artifacts',
    { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  ),
  agentTool('artifact.summarize', '读取诊断产物摘要和证据卡片。', 'read', 'artifact.read', 'list_artifacts', {
    type: 'object',
    properties: { artifactId: { type: 'string' } },
  }),
  agentTool(
    'script.generateDraft',
    '根据当前证据生成复现脚本草稿预览。',
    'write',
    'script.write',
    'list_scripts',
    { type: 'object', properties: { sessionId: { type: 'string' }, goal: { type: 'string' } } },
  ),
  agentTool(
    'script.runRegression',
    '运行已批准的复现脚本并生成回归报告产物。',
    'read',
    'diagnostic.run',
    'run_recipe',
    { type: 'object', properties: { scriptId: { type: 'string' } }, required: ['scriptId'] },
  ),
  agentTool(
    'issuePackage.create',
    '导出包含时间线和证据索引的可移交问题包。',
    'read',
    'report.export',
    'export_issue_package',
    { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  ),
  agentTool(
    'issueDraft.create',
    '基于 Issue Package 生成缺陷描述草稿预览。',
    'write',
    'integration.submit',
    'integration_submit_issue',
    { type: 'object', properties: { title: { type: 'string' }, tracker: { type: 'string' } }, required: ['title'] },
  ),
  agentTool(
    'symbolication.run',
    '使用已配置的 Java/native 符号化方案解析崩溃输出。',
    'read',
    'symbolication.run',
    'symbolication_run',
    { type: 'object', properties: { artifactId: { type: 'string' } } },
  ),
  agentTool(
    'integration.submitIssue',
    '基于当前 Issue Package 生成外部缺陷系统提交预览。',
    'write',
    'integration.submit',
    'integration_submit_issue',
    { type: 'object', properties: { tracker: { type: 'string' } } },
  ),
];

export const demoRecipes = BUILTIN_RECIPES;
