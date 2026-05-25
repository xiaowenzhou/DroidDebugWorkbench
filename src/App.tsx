import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Boxes,
  Braces,
  Bug,
  Cable,
  CheckCircle2,
  ClipboardList,
  Code2,
  Cpu,
  Database,
  Download,
  FileArchive,
  Gauge,
  GitBranch,
  HardDrive,
  KeyRound,
  ListChecks,
  MonitorSmartphone,
  Network,
  Package,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Timer,
  UploadCloud,
  Wifi,
  Zap,
} from 'lucide-react';
import type { DebugRecipe, DeviceRef, SessionEvent } from './domain';
import { isRecipeAllowedForDevice, summarizeEvidenceType } from './domain';
import { useWorkbenchStore, type WorkbenchView } from './app/store';

const navItems: Array<{ id: WorkbenchView; label: string; icon: typeof Smartphone }> = [
  { id: 'device', label: 'Devices', icon: Smartphone },
  { id: 'mirror', label: 'Mirror', icon: MonitorSmartphone },
  { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'scripts', label: 'Scripts', icon: Play },
  { id: 'session', label: 'Session', icon: FileArchive },
  { id: 'ai', label: 'Agent', icon: Bot },
  { id: 'remote', label: 'Remote', icon: Radio },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'rom', label: 'ROM', icon: Cpu },
  { id: 'integrations', label: 'Integrations', icon: UploadCloud },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function App() {
  const {
    activeView,
    devices,
    selectedDeviceId,
    loading,
    setActiveView,
    selectDevice,
    bootstrap,
  } = useWorkbenchStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? devices[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DD</div>
          <div>
            <strong>Droid Debug</strong>
            <span>Workbench</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveView(item.id)}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <DeviceStatusBar device={selectedDevice} loading={loading} />
        <section className="workspace">
          <DeviceRail devices={devices} selectedDeviceId={selectedDevice?.id} onSelect={selectDevice} />
          <ActiveView view={activeView} device={selectedDevice} />
          <ContextPanel device={selectedDevice} />
        </section>
        <TaskBar />
      </main>
    </div>
  );
}

function ActiveView({ view, device }: { view: WorkbenchView; device?: DeviceRef }) {
  switch (view) {
    case 'device':
      return <DeviceView device={device} />;
    case 'mirror':
      return <MirrorView device={device} />;
    case 'terminal':
      return <TerminalView device={device} />;
    case 'diagnostics':
      return <DiagnosticsView device={device} />;
    case 'scripts':
      return <ScriptsView />;
    case 'session':
      return <SessionView />;
    case 'ai':
      return <AgentView />;
    case 'remote':
      return <RemoteView />;
    case 'packages':
      return <PackageView device={device} />;
    case 'rom':
      return <RomView device={device} />;
    case 'integrations':
      return <IntegrationsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DeviceView device={device} />;
  }
}

function DeviceStatusBar({ device, loading }: { device?: DeviceRef; loading: boolean }) {
  return (
    <header className="status-bar">
      <div className="status-cluster">
        <span className="status-pill strong">
          <Smartphone size={15} />
          {device?.alias ?? device?.model ?? 'No device'}
        </span>
        <span className={`status-dot ${device?.state === 'device' ? 'ok' : 'warn'}`} />
        <span>{device?.transport ?? 'transport unknown'}</span>
        <span>{device?.androidVersion ? `Android ${device.androidVersion}` : 'Android unknown'}</span>
        <span>{device?.rootState ?? 'root unknown'}</span>
      </div>
      <div className="status-cluster right">
        <span className="status-pill">
          <ShieldCheck size={15} />
          Evidence mode
        </span>
        <span className="status-pill">
          <Timer size={15} />
          {loading ? 'Loading' : 'Session live'}
        </span>
      </div>
    </header>
  );
}

function DeviceRail({
  devices,
  selectedDeviceId,
  onSelect,
}: {
  devices: DeviceRef[];
  selectedDeviceId?: string;
  onSelect: (deviceId: string) => void;
}) {
  return (
    <aside className="device-rail">
      <div className="rail-title">
        <Cable size={16} />
        Devices
      </div>
      {devices.map((device) => (
        <button key={device.id} className={selectedDeviceId === device.id ? 'device-tile selected' : 'device-tile'} onClick={() => onSelect(device.id)}>
          <span className={`status-dot ${device.state === 'device' ? 'ok' : 'warn'}`} />
          <strong>{device.alias ?? device.serial}</strong>
          <small>{device.model ?? device.transport}</small>
        </button>
      ))}
      <button className="ghost-action">
        <Wifi size={16} />
        Pair Wi-Fi
      </button>
    </aside>
  );
}

function DeviceView({ device }: { device?: DeviceRef }) {
  const { runRecipe, setActiveView } = useWorkbenchStore();
  const profile = device?.profile;
  return (
    <WorkbenchPanel
      title="Device Hub"
      kicker="ADB, serial, fastboot, recovery, and capability profile"
      actions={
        <>
          <button onClick={() => setActiveView('terminal')}>
            <TerminalSquare size={16} />
            Shell
          </button>
          <button onClick={() => runRecipe('collect-logcat')}>
            <Download size={16} />
            Logcat
          </button>
        </>
      }
    >
      <div className="metric-grid">
        <Metric label="Serial" value={device?.serial ?? 'none'} />
        <Metric label="State" value={device?.state ?? 'unknown'} tone={device?.state === 'device' ? 'ok' : 'warn'} />
        <Metric label="Screen" value={profile?.screen ? `${profile.screen.width}x${profile.screen.height} @ ${profile.screen.refreshRate ?? '?'}Hz` : 'unknown'} />
        <Metric label="SELinux" value={profile?.selinux ?? 'unknown'} />
        <Metric label="ADB" value={device?.capabilities.includes('adb') ? 'ready' : 'missing'} tone={device?.capabilities.includes('adb') ? 'ok' : 'warn'} />
        <Metric label="Perfetto" value={profile?.perfetto.available ? 'available' : 'missing'} tone={profile?.perfetto.available ? 'ok' : 'warn'} />
      </div>

      <section className="band">
        <h3>Capability Profile</h3>
        <div className="chip-row">
          {(device?.capabilities ?? []).map((capability) => (
            <span className="chip" key={capability}>
              {capability}
            </span>
          ))}
        </div>
      </section>

      <section className="split">
        <InfoList
          title="Connection Actions"
          items={[
            'Restart ADB server',
            'Pair wireless debugging',
            'Manage forward/reverse ports',
            'Open fastboot command templates',
            'Inspect serial COM configuration',
          ]}
        />
        <InfoList
          title="Profile Driven Decisions"
          items={[
            'Recipes check capabilities before running',
            'scrcpy and Perfetto expose version-specific availability',
            'Issue Packages capture build fingerprint and tool status',
            'High-risk commands require approval',
          ]}
        />
      </section>
    </WorkbenchPanel>
  );
}

function MirrorView({ device }: { device?: DeviceRef }) {
  const { setActiveView, startMirror, mirrorSession } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="Mirror Hub"
      kicker="scrcpy-managed device mirror, reverse control, screenshots, and script recording"
      actions={
        <>
          <button onClick={startMirror}>
            <MonitorSmartphone size={16} />
            Start Mirror
          </button>
          <button onClick={() => setActiveView('scripts')}>
            <Play size={16} />
            Record
          </button>
        </>
      }
    >
      <div className="mirror-layout">
        <div className="phone-preview" aria-label="Android mirror preview">
          <div className="phone-status">12:45  5G  84%</div>
          <div className="phone-app">
            <span className="phone-avatar" />
            <strong>LoginActivity</strong>
            <small>{device?.model ?? 'No active device'}</small>
            <button>Sign in</button>
          </div>
          <div className="phone-nav" />
        </div>
        <div className="mirror-controls">
          <Metric label="Mode" value="control enabled" tone="ok" />
          <Metric label="Session" value={mirrorSession?.status ?? 'not started'} tone={mirrorSession?.status === 'running' ? 'ok' : undefined} />
          <Metric label="Record" value="ready" />
          <Metric label="Clipboard" value="sync enabled" />
          <Metric label="Audio" value={device?.profile?.scrcpy.audio ? 'available' : 'unavailable'} />
          {mirrorSession && <small>{mirrorSession.message}</small>}
          <InfoList
            title="scrcpy Template"
            items={['max-size 1600', 'bitrate 8M', 'max-fps 60', 'stay-awake', 'turn-screen-off supported']}
          />
        </div>
      </div>
    </WorkbenchPanel>
  );
}

function TerminalView({ device }: { device?: DeviceRef }) {
  const executeTerminalCommand = useWorkbenchStore((state) => state.executeTerminalCommand);
  const [history, setHistory] = useState([
    '$ adb devices -l',
    `${device?.serial ?? 'R58T-demo'} device product:husky model:${device?.model ?? 'Pixel_8_Pro'}`,
    '$ adb shell getprop ro.build.fingerprint',
    device?.buildFingerprint ?? 'google/husky_beta/demo:userdebug/dev-keys',
  ]);
  const [command, setCommand] = useState('adb shell dumpsys activity top');

  return (
    <WorkbenchPanel title="Terminal Hub" kicker="Local shell, adb shell, serial console, and fastboot sessions">
      <div className="terminal-tabs">
        <span className="tab active">adb shell</span>
        <span className="tab">logcat</span>
        <span className="tab">serial COM5</span>
        <span className="tab">fastboot</span>
      </div>
      <pre className="terminal-output">{history.join('\n')}</pre>
      <form
        className="terminal-input"
        onSubmit={(event) => {
          event.preventDefault();
          const nextCommand = command.trim();
          if (!nextCommand) return;
          setCommand('');
          void executeTerminalCommand(nextCommand).then((output) => {
            setHistory((items) => [...items, ...output.split('\n')]);
          });
        }}
      >
        <input value={command} onChange={(event) => setCommand(event.target.value)} aria-label="Terminal command" />
        <button>
          <TerminalSquare size={16} />
          Run
        </button>
      </form>
    </WorkbenchPanel>
  );
}

function DiagnosticsView({ device }: { device?: DeviceRef }) {
  const { recipes, artifacts, runRecipe } = useWorkbenchStore();
  return (
    <WorkbenchPanel title="Diagnostic Hub" kicker="One-click logcat, bugreport, Perfetto, screenshots, and custom Recipes">
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} device={device} onRun={() => runRecipe(recipe.id)} />
        ))}
      </div>
      <section className="band">
        <h3>Recent Artifacts</h3>
        <div className="artifact-list">
          {artifacts.map((artifact) => (
            <div className="artifact-row" key={artifact.id}>
              <FileArchive size={18} />
              <div>
                <strong>{artifact.recipeId}</strong>
                <small>{artifact.summary}</small>
              </div>
              <span className={`badge ${artifact.status}`}>{artifact.status}</span>
            </div>
          ))}
        </div>
      </section>
    </WorkbenchPanel>
  );
}

function RecipeCard({ recipe, device, onRun }: { recipe: DebugRecipe; device?: DeviceRef; onRun: () => void }) {
  const availability = device ? isRecipeAllowedForDevice(recipe, device) : { allowed: false, missingCapabilities: ['device'] };
  return (
    <article className="tool-card">
      <div className="tool-card-head">
        <Gauge size={18} />
        <strong>{recipe.name}</strong>
      </div>
      <p>{recipe.steps.map((step) => step.label).join(' -> ')}</p>
      <div className="chip-row">
        {recipe.requiredCapabilities.map((capability) => (
          <span className="chip" key={capability}>
            {capability}
          </span>
        ))}
      </div>
      <button disabled={!availability.allowed} onClick={onRun} title={availability.allowed ? 'Run recipe' : availability.missingCapabilities.join(', ')}>
        <Play size={16} />
        {availability.allowed ? 'Run' : 'Missing capability'}
      </button>
    </article>
  );
}

function ScriptsView() {
  const { scripts, runRecipe } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="Script Hub"
      kicker="Record mirror gestures, terminal commands, waits, assertions, and regression runs"
      actions={
        <button onClick={() => runRecipe('collect-regression-report')}>
          <ListChecks size={16} />
          Regression
        </button>
      }
    >
      <div className="script-list">
        {scripts.map((script) => (
          <article className="wide-row" key={script.id}>
            <Play size={18} />
            <div>
              <strong>{script.name}</strong>
              <small>
                {script.steps.length} steps, base {script.coordinateSpace.width}x{script.coordinateSpace.height}
              </small>
            </div>
            <span className="badge success">ready</span>
          </article>
        ))}
      </div>
      <InfoList
        title="Replay Strategy"
        items={['UIAutomator selector first', 'Coordinate fallback', 'Evidence on failure', 'Regression report with screenshot and log window']}
      />
    </WorkbenchPanel>
  );
}

function SessionView() {
  const { session, issuePackage, exportIssuePackage } = useWorkbenchStore();
  const events = session?.events ?? [];
  return (
    <WorkbenchPanel
      title="Session & Report Hub"
      kicker="Debug Session timeline, EvidenceRef index, Issue Package export/import, and regression reports"
      actions={
        <button onClick={exportIssuePackage}>
          <FileArchive size={16} />
          Export Issue Package
        </button>
      }
    >
      <Timeline events={events} />
      {issuePackage && (
        <section className="band">
          <h3>Issue Package</h3>
          <div className="metric-grid">
            <Metric label="ID" value={issuePackage.id} />
            <Metric label="Evidence" value={`${issuePackage.evidenceIndex.length} refs`} />
            <Metric label="Redaction" value={issuePackage.redactionStatus} tone="ok" />
            <Metric label="Schema" value={`v${issuePackage.schemaVersion}`} />
          </div>
        </section>
      )}
    </WorkbenchPanel>
  );
}

function Timeline({ events }: { events: SessionEvent[] }) {
  return (
    <div className="timeline">
      {events.map((event) => (
        <div className="timeline-row" key={event.id}>
          <span className="timeline-pin" />
          <div>
            <strong>{event.title}</strong>
            <small>
              {new Date(event.timestamp).toLocaleTimeString()} | {event.kind} | {event.source}
            </small>
            <div className="chip-row">
              {event.evidenceRefs.map((evidence) => (
                <span className="chip" key={evidence.id}>
                  {summarizeEvidenceType(evidence.type)} {evidence.id}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentView() {
  const { agentTools, agentOutput, askAgent } = useWorkbenchStore();
  const [prompt, setPrompt] = useState('Analyze the current crash and create an evidence-backed summary.');
  return (
    <WorkbenchPanel title="AI Agent Hub" kicker="Provider-style chat, tool registry, evidence mode, and approval policy">
      <div className="agent-layout">
        <form
          className="agent-chat"
          onSubmit={(event) => {
            event.preventDefault();
            void askAgent(prompt);
          }}
        >
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <button>
            <Bot size={16} />
            Ask Agent
          </button>
          <pre>{agentOutput || 'Agent answers will include conclusion, evidence, actions taken, and unverified items.'}</pre>
        </form>
        <div className="tool-list">
          {agentTools.map((tool) => (
            <article className="tool-card compact" key={tool.name}>
              <strong>{tool.name}</strong>
              <small>{tool.description}</small>
              <span className={`badge ${tool.riskLevel === 'read' ? 'success' : 'warning'}`}>{tool.riskLevel}</span>
            </article>
          ))}
        </div>
      </div>
    </WorkbenchPanel>
  );
}

function RemoteView() {
  const { remoteInvite, createRemoteInvite } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="Remote Hub"
      kicker="LAN invite, scoped mirror and terminal control, audit-first collaboration"
      actions={
        <button onClick={() => createRemoteInvite('mirror-control')}>
          <Radio size={16} />
          Create Invite
        </button>
      }
    >
      <div className="metric-grid">
        <Metric label="Mode" value="LAN invite" />
        <Metric label="Invite" value={remoteInvite?.code ?? 'not created'} tone={remoteInvite ? 'ok' : undefined} />
        <Metric label="Permission" value={remoteInvite?.permission ?? 'viewer'} />
        <Metric label="Audit" value={remoteInvite?.auditEnabled ? 'enabled' : 'ready'} tone="ok" />
        <Metric label="Expires" value={remoteInvite ? new Date(remoteInvite.expiresAt).toLocaleTimeString() : '15 minutes'} />
      </div>
      <InfoList
        title="Permission Levels"
        items={['viewer', 'mirror-control', 'terminal-read', 'terminal-control', 'diagnostic-runner', 'admin with local confirmation']}
      />
    </WorkbenchPanel>
  );
}

function PackageView({ device }: { device?: DeviceRef }) {
  return (
    <WorkbenchPanel title="Package & App Inspection" kicker="APK/AAB install, package state, app data, database, preferences, and network clues">
      <section className="split">
        <InfoList title="Package Actions" items={['Install APK', 'Install split APK', 'Downgrade install with approval', 'Runtime permissions', 'AppOps']} />
        <InfoList
          title="Inspection"
          items={[
            'Database export for debuggable apps',
            'SharedPreferences viewer',
            'Background task state',
            'Network request clues',
            `Active package target: ${device?.model ?? 'none'}`,
          ]}
        />
      </section>
    </WorkbenchPanel>
  );
}

function RomView({ device }: { device?: DeviceRef }) {
  const { runSymbolication, symbolicationResult } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="ROM Hub"
      kicker="fastboot, SELinux, tombstones, kernel logs, Winscope, and symbolication"
      actions={
        <button onClick={runSymbolication}>
          <Braces size={16} />
          Symbolicate
        </button>
      }
    >
      <div className="metric-grid">
        <Metric label="SELinux" value={device?.profile?.selinux ?? 'unknown'} />
        <Metric label="Root" value={device?.rootState ?? 'unknown'} />
        <Metric label="Partitions" value={`${device?.profile?.partitions?.length ?? 0}`} />
        <Metric label="Symbolication" value="profiles ready" />
      </div>
      <InfoList
        title="ROM Diagnostics"
        items={['AVC denied aggregation', 'tombstone parsing', 'vmlinux/System.map profiles', 'Winscope capture entry', 'CTS/GTS/Tradefed templates']}
      />
      {symbolicationResult && <pre className="terminal-output compact-output">{symbolicationResult.output}</pre>}
    </WorkbenchPanel>
  );
}

function IntegrationsView() {
  const { integrationSubmission, submitIssue } = useWorkbenchStore();
  return (
    <WorkbenchPanel title="Integrations" kicker="Submit Issue Packages to defect systems with field and attachment preview">
      <div className="integration-grid">
        {['Jira', 'ZenTao', 'TAPD', 'GitHub Issues', 'GitLab Issues'].map((name) => (
          <article className="tool-card compact" key={name}>
            <UploadCloud size={18} />
            <strong>{name}</strong>
            <small>Token stored via secure storage in desktop runtime</small>
            <button onClick={() => submitIssue(name)}>
              <UploadCloud size={16} />
              Preview
            </button>
          </article>
        ))}
      </div>
      {integrationSubmission && <pre className="terminal-output compact-output">{integrationSubmission.payloadPreview}</pre>}
    </WorkbenchPanel>
  );
}

function SettingsView() {
  const { selfDiagnostics } = useWorkbenchStore();
  return (
    <WorkbenchPanel title="Settings & Self Diagnostics" kicker="Tool paths, providers, approvals, redaction, symbols, and app observability">
      <section className="split">
        <InfoList
          title="Configuration"
          items={['ADB path', 'scrcpy path', 'Perfetto path', 'Provider base URL and API key', 'Symbol and mapping folders', 'Redaction rules']}
        />
        <InfoList title="Self Diagnostics" items={selfDiagnostics} />
      </section>
    </WorkbenchPanel>
  );
}

function ContextPanel({ device }: { device?: DeviceRef }) {
  const { artifacts, session, issuePackage, setActiveView } = useWorkbenchStore();
  const latestArtifact = artifacts[0];
  return (
    <aside className="context-panel">
      <div className="context-section">
        <h3>Command Palette</h3>
        <button onClick={() => setActiveView('diagnostics')}>
          <Search size={16} />
          Run diagnostic
        </button>
        <button onClick={() => setActiveView('session')}>
          <FileArchive size={16} />
          Export issue package
        </button>
        <button onClick={() => setActiveView('ai')}>
          <Bot size={16} />
          Ask Agent
        </button>
      </div>
      <div className="context-section">
        <h3>Device Snapshot</h3>
        <Metric label="Model" value={device?.model ?? 'none'} />
        <Metric label="Build" value={device?.buildFingerprint?.split('/').slice(0, 2).join('/') ?? 'unknown'} />
        <Metric label="Capabilities" value={`${device?.capabilities.length ?? 0}`} />
      </div>
      <div className="context-section">
        <h3>Active Evidence</h3>
        <small>{session?.events.length ?? 0} timeline events</small>
        <small>{issuePackage?.evidenceIndex.length ?? 0} package evidence refs</small>
        <small>{latestArtifact?.summary ?? 'No artifact yet'}</small>
      </div>
    </aside>
  );
}

function TaskBar() {
  return (
    <footer className="task-bar">
      <span>
        <CheckCircle2 size={15} />
        Domain tests passing
      </span>
      <span>
        <GitBranch size={15} />
        Command Gateway ready
      </span>
      <span>
        <ShieldCheck size={15} />
        Approval policy active
      </span>
    </footer>
  );
}

function WorkbenchPanel({
  title,
  kicker,
  actions,
  children,
}: {
  title: string;
  kicker: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="workbench-panel">
      <div className="panel-header">
        <div>
          <p>{kicker}</p>
          <h1>{title}</h1>
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className={`metric ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="info-list">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
