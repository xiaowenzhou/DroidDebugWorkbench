import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Braces,
  Cable,
  CheckCircle2,
  Cpu,
  Download,
  FileArchive,
  Gauge,
  GitBranch,
  ListChecks,
  MonitorSmartphone,
  Package,
  Play,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Timer,
  UploadCloud,
  Wifi,
} from 'lucide-react';
import type { DebugRecipe, DeviceRef, SessionEvent } from './domain';
import { isRecipeAllowedForDevice, summarizeEvidenceType } from './domain';
import { useWorkbenchStore, type WorkbenchView } from './app/store';

const navItems: Array<{ id: WorkbenchView; label: string; icon: typeof Smartphone }> = [
  { id: 'device', label: '设备', icon: Smartphone },
  { id: 'mirror', label: '镜像', icon: MonitorSmartphone },
  { id: 'terminal', label: '终端', icon: TerminalSquare },
  { id: 'diagnostics', label: '诊断', icon: Activity },
  { id: 'scripts', label: '脚本', icon: Play },
  { id: 'session', label: '会话', icon: FileArchive },
  { id: 'ai', label: 'Agent', icon: Bot },
  { id: 'remote', label: '远程', icon: Radio },
  { id: 'packages', label: '应用', icon: Package },
  { id: 'rom', label: 'ROM', icon: Cpu },
  { id: 'integrations', label: '集成', icon: UploadCloud },
  { id: 'settings', label: '设置', icon: Settings },
];

const riskLabel = {
  read: '只读',
  write: '写入',
  dangerous: '高风险',
  destructive: '破坏性',
} as const;

export function App() {
  const { activeView, devices, selectedDeviceId, loading, setActiveView, selectDevice, bootstrap } = useWorkbenchStore();

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
            <strong>安卓调试工作台</strong>
            <span>Droid Debug Workbench</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="主导航">
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
          {device?.alias ?? device?.model ?? '未选择设备'}
        </span>
        <span className={`status-dot ${device?.state === 'device' ? 'ok' : 'warn'}`} />
        <span>{device?.transport ?? '连接未知'}</span>
        <span>{device?.androidVersion ? `Android ${device.androidVersion}` : '系统版本未知'}</span>
        <span>{device?.rootState ?? 'root 未知'}</span>
      </div>
      <div className="status-cluster right">
        <span className="status-pill">
          <ShieldCheck size={15} />
          证据模式
        </span>
        <span className="status-pill">
          <Timer size={15} />
          {loading ? '加载中' : '会话运行中'}
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
        设备列表
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
        配对无线调试
      </button>
    </aside>
  );
}

function DeviceView({ device }: { device?: DeviceRef }) {
  const { runRecipe, setActiveView } = useWorkbenchStore();
  const profile = device?.profile;
  return (
    <WorkbenchPanel
      title="设备工作台"
      kicker="统一管理 ADB、无线 ADB、串口、fastboot、recovery 与能力画像"
      actions={
        <>
          <button onClick={() => setActiveView('terminal')}>
            <TerminalSquare size={16} />
            打开终端
          </button>
          <button onClick={() => runRecipe('collect-logcat')}>
            <Download size={16} />
            抓取日志
          </button>
        </>
      }
    >
      <div className="metric-grid">
        <Metric label="序列号" value={device?.serial ?? '无'} />
        <Metric label="状态" value={device?.state ?? '未知'} tone={device?.state === 'device' ? 'ok' : 'warn'} />
        <Metric label="屏幕" value={profile?.screen ? `${profile.screen.width}x${profile.screen.height} @ ${profile.screen.refreshRate ?? '?'}Hz` : '未知'} />
        <Metric label="SELinux" value={profile?.selinux ?? '未知'} />
        <Metric label="ADB" value={device?.capabilities.includes('adb') ? '可用' : '缺失'} tone={device?.capabilities.includes('adb') ? 'ok' : 'warn'} />
        <Metric label="Perfetto" value={profile?.perfetto.available ? '可用' : '缺失'} tone={profile?.perfetto.available ? 'ok' : 'warn'} />
      </div>

      <section className="band">
        <h3>能力画像</h3>
        <div className="chip-row">
          {(device?.capabilities ?? []).map((capability) => (
            <span className="chip" key={capability}>
              {capability}
            </span>
          ))}
        </div>
      </section>

      <section className="split">
        <InfoList title="连接操作" items={['重启 ADB server', '配对无线调试', '管理 forward/reverse 端口', '打开 fastboot 模板', '检查串口参数']} />
        <InfoList
          title="工作流策略"
          items={['Recipe 运行前校验设备能力', 'scrcpy 与 Perfetto 展示版本能力', 'Issue Package 记录构建指纹和工具状态', '高风险命令必须本地确认']}
        />
      </section>
    </WorkbenchPanel>
  );
}

function MirrorView({ device }: { device?: DeviceRef }) {
  const { setActiveView, startMirror, mirrorSession } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="镜像与反控"
      kicker="通过 scrcpy 管理设备镜像、反控、截图与脚本录制"
      actions={
        <>
          <button onClick={startMirror}>
            <MonitorSmartphone size={16} />
            启动镜像
          </button>
          <button onClick={() => setActiveView('scripts')}>
            <Play size={16} />
            录制脚本
          </button>
        </>
      }
    >
      <div className="mirror-layout">
        <div className="phone-preview" aria-label="Android 镜像预览">
          <div className="phone-status">12:45  5G  84%</div>
          <div className="phone-app">
            <span className="phone-avatar" />
            <strong>登录页</strong>
            <small>{device?.model ?? '无活动设备'}</small>
            <button>登录</button>
          </div>
          <div className="phone-nav" />
        </div>
        <div className="mirror-controls">
          <Metric label="控制模式" value="已允许反控" tone="ok" />
          <Metric label="镜像会话" value={mirrorSession?.status ?? '未启动'} tone={mirrorSession?.status === 'running' ? 'ok' : undefined} />
          <Metric label="录制" value="就绪" />
          <Metric label="剪贴板" value="同步开启" />
          <Metric label="音频" value={device?.profile?.scrcpy.audio ? '可用' : '不可用'} />
          {mirrorSession && <small>{mirrorSession.message}</small>}
          <InfoList title="scrcpy 参数模板" items={['max-size 1600', 'bitrate 8M', 'max-fps 60', 'stay-awake', 'turn-screen-off 支持']} />
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
    <WorkbenchPanel title="终端中心" kicker="本地命令、ADB shell、串口控制台和 fastboot 会话统一入口">
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
        <input value={command} onChange={(event) => setCommand(event.target.value)} aria-label="终端命令" />
        <button>
          <TerminalSquare size={16} />
          执行
        </button>
      </form>
    </WorkbenchPanel>
  );
}

function DiagnosticsView({ device }: { device?: DeviceRef }) {
  const { recipes, artifacts, runRecipe } = useWorkbenchStore();
  return (
    <WorkbenchPanel title="诊断中心" kicker="一键 logcat、bugreport、Perfetto、截图和自定义 Recipe">
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} device={device} onRun={() => runRecipe(recipe.id)} />
        ))}
      </div>
      <section className="band">
        <h3>最近产物</h3>
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
      <button disabled={!availability.allowed} onClick={onRun} title={availability.allowed ? '运行 Recipe' : availability.missingCapabilities.join(', ')}>
        <Play size={16} />
        {availability.allowed ? '运行' : '能力缺失'}
      </button>
    </article>
  );
}

function ScriptsView() {
  const { scripts, runRecipe } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="脚本与回放"
      kicker="录制镜像手势、终端命令、等待、断言，并生成回归报告"
      actions={
        <button onClick={() => runRecipe('collect-regression-report')}>
          <ListChecks size={16} />
          回归执行
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
                {script.steps.length} 步，基准分辨率 {script.coordinateSpace.width}x{script.coordinateSpace.height}
              </small>
            </div>
            <span className="badge success">就绪</span>
          </article>
        ))}
      </div>
      <InfoList title="回放策略" items={['优先 UIAutomator selector', '坐标兜底', '失败时保留证据', '回归报告关联截图和日志窗口']} />
    </WorkbenchPanel>
  );
}

function SessionView() {
  const { session, issuePackage, exportIssuePackage } = useWorkbenchStore();
  const events = session?.events ?? [];
  return (
    <WorkbenchPanel
      title="会话与问题包"
      kicker="Debug Session 时间线、EvidenceRef 索引、Issue Package 导出和回归结果"
      actions={
        <button onClick={exportIssuePackage}>
          <FileArchive size={16} />
          导出问题包
        </button>
      }
    >
      <Timeline events={events} />
      {issuePackage && (
        <section className="band">
          <h3>Issue Package</h3>
          <div className="metric-grid">
            <Metric label="ID" value={issuePackage.id} />
            <Metric label="证据" value={`${issuePackage.evidenceIndex.length} 条`} />
            <Metric label="脱敏" value={issuePackage.redactionStatus} tone="ok" />
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
  const [prompt, setPrompt] = useState('请分析当前崩溃，并输出带证据引用的结论。');
  return (
    <WorkbenchPanel title="AI Agent 助手" kicker="OpenAI-compatible Provider、工具注册表、证据模式和审批策略">
      <div className="agent-layout">
        <form
          className="agent-chat"
          onSubmit={(event) => {
            event.preventDefault();
            void askAgent(prompt);
          }}
        >
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Agent 提示词" />
          <button>
            <Bot size={16} />
            询问 Agent
          </button>
          <pre>{agentOutput || 'Agent 回答会包含：结论、证据、已执行动作和未验证项。'}</pre>
        </form>
        <div className="tool-list">
          {agentTools.map((tool) => (
            <article className="tool-card compact" key={tool.name}>
              <strong>{tool.name}</strong>
              <small>{tool.description}</small>
              <span className={`badge ${tool.riskLevel === 'read' ? 'success' : 'warning'}`}>{riskLabel[tool.riskLevel]}</span>
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
      title="局域网远程协作"
      kicker="生成 LAN 邀请，按权限开放镜像、终端和诊断操作，并记录审计"
      actions={
        <button onClick={() => createRemoteInvite('mirror-control')}>
          <Radio size={16} />
          创建邀请
        </button>
      }
    >
      <div className="metric-grid">
        <Metric label="模式" value="LAN 邀请" />
        <Metric label="邀请码" value={remoteInvite?.code ?? '未创建'} tone={remoteInvite ? 'ok' : undefined} />
        <Metric label="权限" value={remoteInvite?.permission ?? 'viewer'} />
        <Metric label="审计" value={remoteInvite?.auditEnabled ? '已启用' : '就绪'} tone="ok" />
        <Metric label="过期时间" value={remoteInvite ? new Date(remoteInvite.expiresAt).toLocaleTimeString() : '15 分钟'} />
      </div>
      <InfoList title="权限级别" items={['viewer', 'mirror-control', 'terminal-read', 'terminal-control', 'diagnostic-runner', 'admin 需要本地确认']} />
    </WorkbenchPanel>
  );
}

function PackageView({ device }: { device?: DeviceRef }) {
  return (
    <WorkbenchPanel title="应用与包检查" kicker="APK/AAB 安装、包状态、应用数据、数据库、偏好和网络线索">
      <section className="split">
        <InfoList title="包操作" items={['安装 APK', '安装 split APK', '降级安装需确认', '运行时权限', 'AppOps']} />
        <InfoList
          title="应用检查"
          items={['导出 debuggable 应用数据库', 'SharedPreferences 查看器', '后台任务状态', '网络请求线索', `当前目标：${device?.model ?? '无'}`]}
        />
      </section>
    </WorkbenchPanel>
  );
}

function RomView({ device }: { device?: DeviceRef }) {
  const { runSymbolication, symbolicationResult } = useWorkbenchStore();
  return (
    <WorkbenchPanel
      title="ROM 调试"
      kicker="fastboot、SELinux、tombstone、kernel log、Winscope 和符号化"
      actions={
        <button onClick={runSymbolication}>
          <Braces size={16} />
          符号化
        </button>
      }
    >
      <div className="metric-grid">
        <Metric label="SELinux" value={device?.profile?.selinux ?? '未知'} />
        <Metric label="Root" value={device?.rootState ?? '未知'} />
        <Metric label="分区数" value={`${device?.profile?.partitions?.length ?? 0}`} />
        <Metric label="符号化" value="配置就绪" />
      </div>
      <InfoList title="ROM 诊断" items={['AVC denied 聚合', 'tombstone 解析', 'vmlinux/System.map 配置', 'Winscope 抓取入口', 'CTS/GTS/Tradefed 模板']} />
      {symbolicationResult && <pre className="terminal-output compact-output">{symbolicationResult.output}</pre>}
    </WorkbenchPanel>
  );
}

function IntegrationsView() {
  const { integrationSubmission, submitIssue } = useWorkbenchStore();
  return (
    <WorkbenchPanel title="外部系统集成" kicker="预览并提交 Issue Package 到缺陷系统，提交前展示字段和附件">
      <div className="integration-grid">
        {['Jira', '禅道', 'TAPD', 'GitHub Issues', 'GitLab Issues'].map((name) => (
          <article className="tool-card compact" key={name}>
            <UploadCloud size={18} />
            <strong>{name}</strong>
            <small>桌面运行时使用安全存储保存 Token</small>
            <button onClick={() => submitIssue(name)}>
              <UploadCloud size={16} />
              预览
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
    <WorkbenchPanel title="设置与自检" kicker="工具路径、Provider、审批、脱敏、符号目录和客户端可观测性">
      <section className="split">
        <InfoList title="配置项" items={['ADB 路径', 'scrcpy 路径', 'Perfetto 路径', 'Provider base URL 与 API key', '符号和 mapping 目录', '脱敏规则']} />
        <InfoList title="自检结果" items={selfDiagnostics} />
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
        <h3>命令面板</h3>
        <button onClick={() => setActiveView('diagnostics')}>
          <Search size={16} />
          执行诊断
        </button>
        <button onClick={() => setActiveView('session')}>
          <FileArchive size={16} />
          导出问题包
        </button>
        <button onClick={() => setActiveView('ai')}>
          <Bot size={16} />
          询问 Agent
        </button>
      </div>
      <div className="context-section">
        <h3>设备快照</h3>
        <Metric label="型号" value={device?.model ?? '无'} />
        <Metric label="构建" value={device?.buildFingerprint?.split('/').slice(0, 2).join('/') ?? '未知'} />
        <Metric label="能力数" value={`${device?.capabilities.length ?? 0}`} />
      </div>
      <div className="context-section">
        <h3>活动证据</h3>
        <small>{session?.events.length ?? 0} 条时间线事件</small>
        <small>{issuePackage?.evidenceIndex.length ?? 0} 条问题包证据</small>
        <small>{latestArtifact?.summary ?? '暂无产物'}</small>
      </div>
    </aside>
  );
}

function TaskBar() {
  return (
    <footer className="task-bar">
      <span>
        <CheckCircle2 size={15} />
        领域测试通过
      </span>
      <span>
        <GitBranch size={15} />
        命令网关就绪
      </span>
      <span>
        <ShieldCheck size={15} />
        审批策略启用
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
