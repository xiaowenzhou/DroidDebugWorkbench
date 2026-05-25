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
    alias: 'ROM daily driver',
    transport: 'adb-usb',
    state: 'device',
    model: 'Pixel 8 Pro',
    manufacturer: 'Google',
    androidVersion: '16',
    apiLevel: 36,
    buildFingerprint: 'google/husky_beta/demo:userdebug/dev-keys',
    rootState: 'adb-root',
    capabilities: ['adb', 'logcat', 'bugreport', 'perfetto', 'dumpsys', 'screenshot', 'scrcpy'],
    profile: demoProfile,
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: 'demo-serial-001',
    serial: 'COM5',
    alias: 'UART console',
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
    title: 'Started login reproduction',
    evidenceRefs: [{ id: 'ev-step-001', type: 'script-step', description: 'Tap Login from cold start' }],
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
    title: 'FATAL EXCEPTION detected in com.example',
    evidenceRefs: [{ id: 'ev-log-001', type: 'log-line', filePath: 'logcat/crash.txt', lineRange: [420, 438] }],
  },
  {
    id: 'evt-004',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    kind: 'agent-tool-call',
    source: 'agent',
    title: 'Agent summarized crash cluster with evidence',
    evidenceRefs: [{ id: 'ev-agent-001', type: 'artifact-file', filePath: 'agent-summary.md' }],
  },
]);

export const demoSession: DebugSession = {
  id: 'session-demo-001',
  deviceId: 'demo-adb-001',
  startedAt: demoEvents[0].timestamp,
  title: 'Login crash reproduction',
  events: demoEvents,
  artifacts: [],
};

export const demoSummary: EvidenceBackedSummary = {
  conclusion: 'LoginActivity crashes after credential submit because the token response is null before navigation.',
  evidenceIds: ['ev-log-001', 'ev-cmd-001'],
  actionsTaken: ['Captured logcat', 'Correlated command timeline', 'Prepared crash package'],
  unverifiedItems: ['Backend response body was not captured in this local demo session'],
};

export const demoIssuePackage: IssuePackage = {
  ...createIssuePackageManifest({
    title: 'Login crash',
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
    summary: 'Crash package captured with logcat, screenshot, bugreport placeholder, and evidence index.',
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
    name: 'Login crash reproduction',
    createdAt: new Date(Date.now() - 240000).toISOString(),
    coordinateSpace: { width: 1080, height: 2400, rotation: 0 },
    steps: [
      { id: 'step-1', type: 'tap', payload: { x: 540, y: 1960, label: 'Login button' }, evidenceRefs: [{ id: 'ev-step-001', type: 'script-step' }] },
      { id: 'step-2', type: 'wait', payload: { ms: 1200, condition: 'Activity switch' } },
      { id: 'step-3', type: 'assert', payload: { logContains: 'FATAL EXCEPTION' } },
    ],
  },
];

export const demoAgentTools: AgentTool[] = [
  {
    name: 'device.list',
    description: 'List connected Android, serial, fastboot, and remote devices.',
    inputSchema: { type: 'object', properties: {} },
    riskLevel: 'read',
    permission: 'device.read',
    supportsDryRun: true,
    handler: 'list_devices',
  },
  {
    name: 'logcat.capture',
    description: 'Capture logcat buffers and attach them to the active Debug Session.',
    inputSchema: { type: 'object', properties: { buffers: { type: 'array', items: { type: 'string' } } } },
    riskLevel: 'read',
    permission: 'diagnostic.run',
    supportsDryRun: true,
    handler: 'run_recipe',
  },
  {
    name: 'issuePackage.create',
    description: 'Export a portable Issue Package with timeline and evidence index.',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
    riskLevel: 'read',
    permission: 'report.export',
    supportsDryRun: true,
    handler: 'export_issue_package',
  },
  {
    name: 'symbolication.run',
    description: 'Run a configured Java/native symbolication profile against captured crash output.',
    inputSchema: { type: 'object', properties: { artifactId: { type: 'string' } } },
    riskLevel: 'read',
    permission: 'symbolication.run',
    supportsDryRun: true,
    handler: 'symbolication_run',
  },
  {
    name: 'integration.submitIssue',
    description: 'Prepare an external tracker issue from the current Issue Package.',
    inputSchema: { type: 'object', properties: { tracker: { type: 'string' } } },
    riskLevel: 'write',
    permission: 'integration.submit',
    supportsDryRun: true,
    handler: 'integration_submit_issue',
  },
];

export const demoRecipes = BUILTIN_RECIPES;
