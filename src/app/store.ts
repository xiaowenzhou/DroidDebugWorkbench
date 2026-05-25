import { create } from 'zustand';
import type {
  AgentTool,
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
import { workbenchApi } from './api';

const riskLabel: Record<'read' | 'write' | 'dangerous' | 'destructive', string> = {
  read: '只读',
  write: '写入',
  dangerous: '高风险',
  destructive: '破坏性',
};

export type WorkbenchView =
  | 'device'
  | 'mirror'
  | 'terminal'
  | 'diagnostics'
  | 'scripts'
  | 'session'
  | 'ai'
  | 'remote'
  | 'packages'
  | 'rom'
  | 'integrations'
  | 'settings';

interface WorkbenchState {
  activeView: WorkbenchView;
  devices: DeviceRef[];
  selectedDeviceId?: string;
  recipes: DebugRecipe[];
  artifacts: DiagnosticArtifact[];
  scripts: ReplayScript[];
  session?: DebugSession;
  issuePackage?: IssuePackage;
  agentTools: AgentTool[];
  agentOutput: string;
  selfDiagnostics: string[];
  commandOutput: string;
  mirrorSession?: MirrorSession;
  remoteInvite?: RemoteInvite;
  integrationSubmission?: IntegrationSubmissionResult;
  symbolicationResult?: SymbolicationResult;
  loading: boolean;
  setActiveView: (view: WorkbenchView) => void;
  selectDevice: (deviceId: string) => void;
  bootstrap: () => Promise<void>;
  runRecipe: (recipeId: string) => Promise<void>;
  exportIssuePackage: () => Promise<void>;
  askAgent: (prompt: string) => Promise<void>;
  executeTerminalCommand: (commandLine: string) => Promise<string>;
  startMirror: () => Promise<void>;
  createRemoteInvite: (permission?: string) => Promise<void>;
  submitIssue: (tracker: string) => Promise<void>;
  runSymbolication: () => Promise<void>;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  activeView: 'device',
  devices: [],
  recipes: [],
  artifacts: [],
  scripts: [],
  agentTools: [],
  agentOutput: '',
  selfDiagnostics: [],
  commandOutput: '',
  loading: true,
  setActiveView: (view) => set({ activeView: view }),
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  bootstrap: async () => {
    set({ loading: true });
    const [devices, recipes, artifacts, scripts, session, agentTools, selfDiagnostics] = await Promise.all([
      workbenchApi.listDevices(),
      workbenchApi.listRecipes(),
      workbenchApi.listArtifacts(),
      workbenchApi.listScripts(),
      workbenchApi.currentSession(),
      workbenchApi.listAgentTools(),
      workbenchApi.getSelfDiagnostics(),
    ]);
    set({
      devices,
      selectedDeviceId: devices[0]?.id,
      recipes,
      artifacts,
      scripts,
      session,
      agentTools,
      selfDiagnostics,
      loading: false,
    });
  },
  runRecipe: async (recipeId) => {
    const selectedDeviceId = get().selectedDeviceId ?? get().devices[0]?.id;
    if (!selectedDeviceId) return;
    const artifact = await workbenchApi.runRecipe(recipeId, selectedDeviceId);
    set({ artifacts: [artifact, ...get().artifacts], activeView: 'diagnostics' });
  },
  exportIssuePackage: async () => {
    const issuePackage = await workbenchApi.exportIssuePackage(get().session?.title ?? 'Droid 调试问题');
    set({ issuePackage, activeView: 'session' });
  },
  askAgent: async (prompt) => {
    const agentOutput = await workbenchApi.runAgentPrompt(prompt);
    set({ agentOutput, activeView: 'ai' });
  },
  executeTerminalCommand: async (commandLine) => {
    const selectedDevice = get().devices.find((device) => device.id === get().selectedDeviceId) ?? get().devices[0];
    const result = await workbenchApi.executeCommand(commandLine, selectedDevice?.id);
    const output = [
      `$ ${result.commandLine}`,
      result.status === 'blocked'
        ? `已拦截：${riskLabel[result.riskLevel]} 命令需要本地明确确认`
        : result.stdout.trim() || result.stderr.trim() || `退出码 ${result.exitCode ?? 'n/a'}`,
    ].join('\n');
    set({ commandOutput: output });
    return output;
  },
  startMirror: async () => {
    const selectedDeviceId = get().selectedDeviceId ?? get().devices[0]?.id;
    if (!selectedDeviceId) return;
    const mirrorSession = await workbenchApi.startMirror(selectedDeviceId);
    set({ mirrorSession, activeView: 'mirror' });
  },
  createRemoteInvite: async (permission = 'viewer') => {
    const remoteInvite = await workbenchApi.createRemoteInvite(permission);
    set({ remoteInvite, activeView: 'remote' });
  },
  submitIssue: async (tracker) => {
    const issuePackage = get().issuePackage ?? (await workbenchApi.exportIssuePackage(get().session?.title ?? 'Droid 调试问题'));
    const integrationSubmission = await workbenchApi.submitIssue(tracker, issuePackage.title);
    set({ issuePackage, integrationSubmission, activeView: 'integrations' });
  },
  runSymbolication: async () => {
    const stack = 'at a.a(SourceFile:42)\nat android.app.Activity.performCreate(Activity.java:9000)';
    const mapping = 'com.example.LoginActivity -> a:\n    42:42:void submit():42:42 -> a';
    const symbolicationResult = await workbenchApi.runSymbolication(stack, mapping);
    set({ symbolicationResult, activeView: 'rom' });
  },
}));
