export type DeviceTransport = 'adb-usb' | 'adb-wifi' | 'serial' | 'fastboot' | 'remote';
export type DeviceState =
  | 'device'
  | 'offline'
  | 'unauthorized'
  | 'recovery'
  | 'sideload'
  | 'fastboot'
  | 'disconnected';
export type RiskLevel = 'read' | 'write' | 'dangerous' | 'destructive';
export type Actor = 'local-user' | 'remote-user' | 'agent' | 'recipe' | 'system';

export interface PartitionInfo {
  name: string;
  sizeBytes?: number;
  type?: string;
}

export interface DeviceCapabilityProfile {
  abi: string[];
  screen?: { width: number; height: number; density: number; refreshRate?: number };
  selinux?: 'enforcing' | 'permissive' | 'unknown';
  partitions?: PartitionInfo[];
  toolAvailability: Record<string, boolean>;
  scrcpy: { available: boolean; version?: string; audio?: boolean; hid?: boolean };
  perfetto: { available: boolean; sdkSupported: boolean; dataSources: string[] };
  wirelessDebugging?: { paired: boolean; connected: boolean; port?: number };
}

export interface DeviceRef {
  id: string;
  serial: string;
  alias?: string;
  transport: DeviceTransport;
  state: DeviceState;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  apiLevel?: number;
  buildFingerprint?: string;
  rootState?: 'unknown' | 'none' | 'adb-root' | 'su';
  capabilities: string[];
  profile?: DeviceCapabilityProfile;
  lastSeenAt: string;
}

export interface RedactRule {
  id: string;
  pattern: string;
  replacement: string;
}

export interface CommandRequest {
  id?: string;
  kind: 'local' | 'adb' | 'adb-shell' | 'fastboot' | 'serial' | 'scrcpy' | 'perfetto';
  deviceId?: string;
  argv: string[];
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  redactRules?: RedactRule[];
  reason?: string;
}

export interface CommandExecutionResult {
  commandLine: string;
  argv: string[];
  status: 'success' | 'failed' | 'blocked' | 'timeout';
  exitCode?: number;
  stdout: string;
  stderr: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  durationMs: number;
}

export interface MirrorSession {
  id: string;
  deviceId: string;
  status: 'running' | 'unavailable' | 'failed';
  pid?: number;
  message: string;
  startedAt: string;
}

export interface RemoteInvite {
  code: string;
  permission: string;
  expiresAt: string;
  lanCandidates: string[];
  auditEnabled: boolean;
}

export interface IntegrationSubmissionResult {
  tracker: string;
  status: 'dry-run' | 'queued' | 'failed';
  title: string;
  payloadPreview: string;
  attachments: string[];
}

export interface SymbolicationResult {
  status: 'success' | 'partial' | 'failed';
  inputFrames: number;
  matchedFrames: number;
  output: string;
}

export interface ArtifactFile {
  path: string;
  kind: string;
  sizeBytes?: number;
}

export interface DiagnosticArtifact {
  id: string;
  deviceId: string;
  recipeId: string;
  createdAt: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  rootDir: string;
  files: ArtifactFile[];
  summary?: string;
  timeline?: SessionEvent[];
}

export interface DebugRecipe {
  id: string;
  name: string;
  description?: string;
  category: 'log' | 'trace' | 'crash' | 'anr' | 'performance' | 'power' | 'graphics' | 'custom';
  requiredCapabilities: string[];
  riskLevel: RiskLevel;
  inputs: RecipeInput[];
  steps: RecipeStep[];
  outputPolicy: OutputPolicy;
}

export interface RecipeInput {
  id: string;
  label: string;
  kind: 'string' | 'number' | 'boolean' | 'select';
  required?: boolean;
  defaultValue?: unknown;
}

export interface RecipeStep {
  id: string;
  type:
    | 'command'
    | 'parallel'
    | 'wait'
    | 'pull'
    | 'captureScreenshot'
    | 'recordScreen'
    | 'perfetto'
    | 'bugreport'
    | 'logcat'
    | 'dumpsys'
    | 'packageInfo'
    | 'redact'
    | 'symbolicate'
    | 'correlateTimeline'
    | 'createIssuePackage'
    | 'runRegression'
    | 'submitIssue'
    | 'zip';
  label: string;
  command?: CommandRequest;
  output?: string;
}

export interface OutputPolicy {
  rootDir: string;
  zipByDefault: boolean;
  redactByDefault: boolean;
}

export interface ReplayScript {
  id: string;
  name: string;
  createdAt: string;
  sourceDevice?: DeviceRef;
  coordinateSpace: { width: number; height: number; rotation: number };
  steps: ReplayStep[];
}

export interface ReplayStep {
  id: string;
  type: 'tap' | 'swipe' | 'key' | 'text' | 'terminal' | 'adb' | 'wait' | 'assert' | 'capture' | 'marker';
  timestamp?: string;
  payload: Record<string, unknown>;
  evidenceRefs?: EvidenceRef[];
}

export type SessionEventKind =
  | 'user-action'
  | 'mirror-event'
  | 'terminal-command'
  | 'log-event'
  | 'trace-marker'
  | 'diagnostic-task'
  | 'remote-action'
  | 'agent-tool-call'
  | 'artifact-created'
  | 'assertion-result';

export interface EvidenceRef {
  id: string;
  type: 'log-line' | 'command-output' | 'trace-slice' | 'screenshot' | 'screenrecord' | 'script-step' | 'artifact-file';
  artifactId?: string;
  filePath?: string;
  timestamp?: string;
  lineRange?: [number, number];
  traceTimeRangeNs?: [number, number];
  description?: string;
  eventId?: string;
}

export interface SessionEvent {
  id: string;
  timestamp: string;
  kind: SessionEventKind;
  source: Actor;
  title: string;
  evidenceRefs: EvidenceRef[];
  payload?: unknown;
}

export interface DebugSession {
  id: string;
  deviceId: string;
  startedAt: string;
  endedAt?: string;
  title?: string;
  events: SessionEvent[];
  artifacts: DiagnosticArtifact[];
  issuePackageId?: string;
}

export interface EvidenceBackedSummary {
  conclusion: string;
  evidenceIds: string[];
  actionsTaken: string[];
  unverifiedItems: string[];
}

export interface IssuePackage {
  id: string;
  schemaVersion: number;
  title: string;
  createdAt: string;
  deviceProfile: DeviceCapabilityProfile;
  buildInfo: Record<string, string>;
  sessionId: string;
  replayScriptIds: string[];
  artifactIds: string[];
  evidenceIndex: EvidenceRef[];
  agentSummary?: EvidenceBackedSummary;
  redactionStatus: 'not-run' | 'redacted' | 'partially-redacted';
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  riskLevel: RiskLevel;
  permission: string;
  supportsDryRun: boolean;
  handler: string;
}
