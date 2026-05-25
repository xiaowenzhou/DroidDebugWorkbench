# Droid Debug Workbench 技术实现文档

版本：1.0
日期：2026-05-26
对应 PRD：`doc/PRD.md`
产品名：Droid Debug Workbench / 安卓调试工作台
目标平台：Windows 优先，预留 macOS / Linux
实现目标：把 Android 设备调试、镜像反控、脚本复现、诊断抓取、局域网远程协作和 AI Agent 统一到一个安全、可审计、可扩展的桌面工作台。

## 1. 文档范围

本文档描述完整目标态技术方案，并标注当前仓库已经具备的基础能力和后续真实适配器工作。它用于指导后续工程实现、验收和迭代，不把当前预览版能力误写为已完成的真机闭环。

本文档覆盖：

- Windows 桌面客户端总体架构。
- Tauri / React / TypeScript / Rust 分层边界。
- 设备、终端、镜像、诊断、脚本、远程、Agent、Issue Package、ROM、App、集成等模块设计。
- IPC command / event 合约。
- Command Gateway、权限、审批、审计和脱敏模型。
- WebRTC 局域网远程协作设计。
- OpenAI-compatible Provider、Agent Tool Registry 和 MCP 扩展设计。
- 存储、产物目录、测试、构建发布和实施路线。

## 2. 当前仓库状态

截至 2026-05-26，仓库已经形成可运行的产品雏形：

- Desktop：Tauri v2 + React + TypeScript。
- Frontend：明亮中文工具型 UI、左侧导航、设备栏、主工作区、右侧上下文、底部任务栏。
- Domain：命令风险、设备解析、证据、Recipe、Issue Package、权限、脱敏、符号化、集成 payload 等领域模型。
- API：Tauri invoke adapter + 浏览器 fallback。
- Rust Core：Tauri command gateway 示例，可执行部分 adb / scrcpy / recipe / issue package / agent / remote invite / self diagnostics 命令。
- Tests：前端领域测试和 UI 文案测试。
- Build：前端生产构建可通过；Rust 格式检查可通过。

当前仍不能声称全部真实功能已完成：

- 当前环境无在线 Android 设备，无法实测真机 logcat、bugreport、dumpsys、截图、录屏、脚本回放。
- 当前环境缺少 scrcpy，无法实测真实镜像反控。
- 当前环境缺少 perfetto，trace 仍需真实采集适配。
- 当前环境缺少 MSVC `link.exe`，`cargo test` 会在依赖构建阶段被系统工具链阻塞。
- WebRTC 远程协作、Provider-backed Agent tool calling、真实串口读写、外部缺陷系统提交仍需产品级适配器。

因此工程推进时应把当前仓库视为“可运行工作台骨架 + 领域模型 + 部分命令网关 + fallback 演示”，后续以本文档拆分真实适配器和端到端验收。

## 3. 技术目标

技术实现需要同时满足六类目标：

- 稳定桌面体验：Windows 上可安装、可更新、可自检、低资源占用。
- 调试工具集成：可靠调用 adb、fastboot、scrcpy、Perfetto、串口、外部脚本。
- 实时交互：终端流、日志流、镜像控制、脚本录制、远程控制低延迟且可取消。
- 证据闭环：所有关键操作写入 Debug Session，并产出可引用的 EvidenceRef。
- 安全可控：UI、远程、Agent、Recipe 共用 Command Gateway、Tool Policy、Approval、Audit。
- 可扩展：Recipe、Agent Tool、MCP Tool、Issue Package schema、诊断模板和外部集成可扩展。

## 4. 技术栈

### 4.1 Desktop Shell

采用 Tauri v2 + Rust：

- Tauri 负责 Windows 桌面壳、窗口管理、打包、系统 API、IPC。
- Rust 负责外部进程、串口、文件、诊断产物、权限策略、审计、长任务调度。
- Windows 发布目标为 NSIS / MSI。
- 外部工具通过用户配置路径和 sidecar 两种方式支持。

### 4.2 Frontend

采用 React + TypeScript：

- UI：React 组件化工作台。
- 状态：当前仓库使用 Zustand，后续继续保持轻量 store。
- 图标：lucide-react。
- 终端：xterm.js。
- 构建：Vite。
- 测试：Vitest。

后续可按需要引入：

- TanStack Query：异步任务和服务端状态缓存。
- TanStack Virtual：日志、列表和表格虚拟滚动。
- Monaco Editor：脚本、Recipe、日志查询和 Perfetto 配置编辑。
- Dockview 或自研 dock layout：多面板停靠布局。

### 4.3 Rust Core

Rust Core 负责所有系统级能力：

- command：命令解析、风险分类、执行、取消、超时、流输出。
- device：ADB / fastboot / serial 设备发现和能力画像。
- terminal：PTY、终端会话、日志保存。
- mirror：scrcpy sidecar 生命周期管理。
- diagnostic：Recipe 引擎、logcat、bugreport、dumpsys、Perfetto、截图录屏。
- script：ReplayScript 录制、回放、断言、回归报告。
- remote：LAN discovery、WebRTC signaling、权限和审计。
- ai：Provider、Chat、Tool Registry、Agent Runner。
- session：Debug Session、EvidenceRef、timeline correlation。
- report：Issue Package 导入导出、证据索引、脱敏。
- symbolication：Java / native / kernel 符号化。
- integrations：外部缺陷系统 dry-run 和提交。
- observability：客户端日志、崩溃报告、自检。

## 5. 总体架构

系统分为六层：

```text
UI Layer
  React AppShell / Views / Panels / Command Palette

Application Layer
  Zustand Store / View Model / Workbench API / Browser Fallback

IPC Layer
  Tauri Commands / Event Streams / Typed DTO

Core Layer
  Rust Services / Command Gateway / Task Manager / Tool Policy

Adapter Layer
  ADB / Fastboot / Serial / Scrcpy / Perfetto / WebRTC / Provider

Artifact Layer
  Sessions / Logs / Traces / Screenshots / Scripts / Issue Packages
```

核心约束：

- UI 不直接执行系统命令。
- 所有外部进程必须经过 Command Gateway 或专用 adapter。
- 所有长任务返回 taskId，并通过事件流推送进度。
- Agent 和远程控制不绕过本地权限系统。
- 每个可交付产物都写入 metadata，并能映射到 Debug Session。

## 6. 工程目录规划

当前仓库目录已基本形成，后续可按模块继续拆分：

```text
DroidDebugWorkbench/
  doc/
    PRD.md
    TECHNICAL_DESIGN.md
    IMPLEMENTATION_STATUS.md
  src/
    App.tsx
    styles.css
    app/
      api.ts
      fixtures.ts
      store.ts
      __tests__/
    domain/
      commandGateway.ts
      deviceParsing.ts
      evidence.ts
      integrations.ts
      issuePackage.ts
      permissions.ts
      recipes.ts
      redaction.ts
      symbolication.ts
      types.ts
      __tests__/
  src-tauri/
    src/
      main.rs
      lib.rs
    tauri.conf.json
```

目标拆分：

```text
src/
  app/
    api/
    store/
    routing/
  features/
    device/
    terminal/
    mirror/
    diagnostics/
    scripts/
    remote/
    ai/
    session/
    reports/
    packages/
    rom/
    integrations/
    settings/
  domain/
  shared/

src-tauri/src/
  core/
    command/
    task/
    device/
    adb/
    fastboot/
    serial/
    terminal/
    mirror/
    diagnostic/
    script/
    remote/
    ai/
    session/
    report/
    permission/
    audit/
    redaction/
    symbolication/
    integration/
    observability/
```

拆分原则：

- `domain/` 放纯业务模型和纯函数，前后端可镜像实现或共享 schema。
- `features/` 放 UI、view model 和模块内状态。
- `src-tauri/src/core/` 放真实系统能力。
- `app/api.ts` 只保留 IPC facade，不承载业务规则。

## 7. UI 架构

### 7.1 App Shell

主界面结构：

- `Sidebar`：主导航。
- `DeviceRail`：设备列表、连接入口。
- `DeviceStatusBar`：当前设备和工具状态。
- `WorkbenchPanel`：模块主工作区。
- `ContextPanel`：命令面板、设备快照、证据摘要。
- `TaskBar`：长任务、远程、审批、Agent 调用状态。

目标新增：

- `CommandPalette`：键盘驱动的全局命令入口。
- `DockWorkspace`：终端、日志、镜像、时间线可停靠。
- `NotificationCenter`：任务完成、审批、远程请求、工具缺失提示。
- `SettingsDrawer`：轻量设置编辑。

### 7.2 现代明亮工具风格

视觉规范：

- 默认明亮主题。
- 白色侧边栏、浅灰工作区、蓝色主操作、低饱和状态色。
- 卡片、面板、按钮圆角不超过 8px。
- 高密度但不拥挤，避免营销式 hero。
- 表格、日志、终端使用清晰单行密度和等宽字体。
- 状态色固定语义：success、warning、danger、running、muted。
- 关键状态使用文字 + icon，不只依赖颜色。

### 7.3 中文与本地化

MVP 使用中文作为默认 UI 语言：

- 用户可见文案必须中文化。
- 工具名、命令、协议、配置字段保留英文。
- 日志原文不翻译。
- 术语统一：设备、镜像、终端、诊断、脚本、会话、Agent、远程、应用、ROM、集成、设置。
- 测试必须覆盖乱码回归，避免 Windows 控制台编码造成文件内容污染。

## 8. IPC 设计

### 8.1 命名约定

Tauri command 使用 snake_case：

- `list_devices`
- `execute_command`
- `start_mirror`
- `run_recipe`
- `list_recipes`
- `list_scripts`
- `export_issue_package`
- `create_remote_invite`
- `list_agent_tools`
- `run_agent_prompt`
- `self_diagnostics`

TypeScript facade 使用 camelCase：

- `workbenchApi.listDevices()`
- `workbenchApi.executeCommand()`
- `workbenchApi.startMirror()`

### 8.2 返回模型

短任务直接返回 DTO：

```ts
type DeviceRef = {
  id: string;
  serial: string;
  transport: 'adb-usb' | 'adb-wifi' | 'fastboot' | 'serial';
  state: string;
  model?: string;
  capabilities: string[];
  profile?: DeviceCapabilityProfile;
};
```

长任务返回 `TaskRef`：

```ts
type TaskRef = {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  createdAt: string;
};
```

事件流统一：

```ts
type WorkbenchEvent =
  | { type: 'task.progress'; taskId: string; percent?: number; message: string }
  | { type: 'task.output'; taskId: string; stream: 'stdout' | 'stderr'; chunk: string }
  | { type: 'task.completed'; taskId: string; artifactId?: string }
  | { type: 'device.changed'; device: DeviceRef }
  | { type: 'approval.requested'; request: ApprovalRequest }
  | { type: 'remote.action'; action: RemoteActionAudit }
  | { type: 'agent.toolCall'; call: AgentToolCall };
```

### 8.3 错误模型

所有 IPC 错误统一包装：

```ts
type WorkbenchError = {
  code: string;
  message: string;
  hint?: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
};
```

常见错误码：

- `TOOL_NOT_FOUND`
- `DEVICE_OFFLINE`
- `ADB_UNAUTHORIZED`
- `COMMAND_BLOCKED`
- `APPROVAL_REQUIRED`
- `TASK_TIMEOUT`
- `ARTIFACT_WRITE_FAILED`
- `REMOTE_PERMISSION_DENIED`
- `PROVIDER_AUTH_FAILED`
- `REDACTION_REQUIRED`

## 9. 数据模型

### 9.1 DeviceRef

设备模型用于所有模块绑定目标设备：

```ts
type DeviceRef = {
  id: string;
  serial: string;
  alias?: string;
  transport: 'adb-usb' | 'adb-wifi' | 'fastboot' | 'serial' | 'remote';
  state: 'device' | 'offline' | 'unauthorized' | 'fastboot' | 'serial' | 'unknown';
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  apiLevel?: number;
  buildFingerprint?: string;
  rootState?: 'unknown' | 'no-root' | 'adb-root' | 'su';
  capabilities: string[];
  profile?: DeviceCapabilityProfile;
  lastSeenAt: string;
};
```

### 9.2 DeviceCapabilityProfile

能力画像驱动 UI 可用性和 Recipe 校验：

```ts
type DeviceCapabilityProfile = {
  abi: string[];
  screen?: {
    width: number;
    height: number;
    density: number;
    refreshRate?: number;
  };
  selinux?: 'enforcing' | 'permissive' | 'unknown';
  partitions: Array<{ name: string; sizeBytes?: number; type?: string }>;
  toolAvailability: Record<string, boolean>;
  scrcpy: { available: boolean; version?: string; audio?: boolean; hid?: boolean };
  perfetto: { available: boolean; sdkSupported: boolean; dataSources: string[] };
  wirelessDebugging?: { paired: boolean; connected: boolean; port?: number };
};
```

### 9.3 CommandExecutionResult

```ts
type CommandExecutionResult = {
  commandLine: string;
  argv: string[];
  status: 'success' | 'failed' | 'blocked' | 'timeout' | 'cancelled';
  exitCode?: number;
  stdout: string;
  stderr: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  durationMs: number;
};
```

### 9.4 DebugRecipe

```ts
type DebugRecipe = {
  id: string;
  name: string;
  category: 'log' | 'trace' | 'screen' | 'rom' | 'app' | 'custom';
  requiredCapabilities: string[];
  riskLevel: RiskLevel;
  inputs: RecipeInput[];
  steps: RecipeStep[];
  outputPolicy: {
    rootDir: string;
    zipByDefault: boolean;
    redactByDefault: boolean;
  };
};
```

### 9.5 ReplayScript

```ts
type ReplayScript = {
  id: string;
  name: string;
  createdAt: string;
  targetPackage?: string;
  coordinateSpace: { width: number; height: number; rotation: number };
  steps: ReplayStep[];
};

type ReplayStep =
  | { id: string; type: 'tap'; payload: { x: number; y: number; selector?: string } }
  | { id: string; type: 'swipe'; payload: { from: Point; to: Point; durationMs: number } }
  | { id: string; type: 'text'; payload: { value: string } }
  | { id: string; type: 'key'; payload: { keyCode: number } }
  | { id: string; type: 'wait'; payload: { durationMs?: number; condition?: WaitCondition } }
  | { id: string; type: 'command'; payload: { commandLine: string } }
  | { id: string; type: 'assert'; payload: AssertionPayload };
```

### 9.6 EvidenceRef

```ts
type EvidenceRef = {
  id: string;
  type: 'log-line' | 'command-output' | 'trace-range' | 'screenshot' | 'screenrecord' | 'script-step' | 'artifact';
  artifactId?: string;
  filePath?: string;
  timestamp?: string;
  lineRange?: [number, number];
  traceTimeRangeNs?: [number, number];
  description?: string;
  eventId?: string;
};
```

### 9.7 IssuePackage

```ts
type IssuePackage = {
  id: string;
  schemaVersion: number;
  title: string;
  createdAt: string;
  deviceProfile: DeviceCapabilityProfile;
  buildInfo: Record<string, unknown>;
  sessionId: string;
  replayScriptIds: string[];
  artifactIds: string[];
  evidenceIndex: EvidenceRef[];
  agentSummary?: EvidenceBackedSummary;
  redactionStatus: 'raw' | 'redacted' | 'skipped';
};
```

## 10. Command Gateway

Command Gateway 是所有命令入口的强制边界。

职责：

- 命令解析和 argv 构造。
- 自动注入设备 serial。
- 风险分类。
- 权限校验。
- 审批请求。
- 命令执行、超时、取消、输出流。
- 审计记录。
- 产物落盘。

### 10.1 风险分类

风险等级：

- `read`：只读命令，例如 `adb devices`、`getprop`、`dumpsys`、`logcat -d`。
- `write`：改变运行状态但可逆，例如 `input tap`、`am start`、`settings put`、`push`。
- `dangerous`：影响设备稳定性或调试状态，例如 `reboot`、`root`、`remount`、`setprop`。
- `destructive`：可能删除数据、刷写或破坏环境，例如 `pm clear`、`uninstall`、`fastboot flash`、`erase`、`wipe`。

### 10.2 审批策略

审批来源：

- 本地用户。
- 远程测试端授权。
- Agent tool approval。
- Recipe run approval。

审批请求模型：

```ts
type ApprovalRequest = {
  id: string;
  actor: ActorRef;
  deviceId?: string;
  commandLine?: string;
  toolName?: string;
  riskLevel: RiskLevel;
  reason: string;
  impact: string;
  expiresAt: string;
};
```

审批要求：

- `read` 默认允许。
- `write` 可按策略免审批或提示。
- `dangerous` 必须确认。
- `destructive` 必须二次确认，并要求展示设备 ID、命令、影响范围。
- 远程和 Agent 发起的 `write` 以上操作默认需要本地确认。

### 10.3 审计日志

审计日志写入 JSONL：

```json
{
  "id": "audit-001",
  "timestamp": "2026-05-26T10:00:00Z",
  "actor": { "type": "local-user", "id": "local" },
  "deviceId": "adb-usb-R58T",
  "action": "execute_command",
  "riskLevel": "read",
  "status": "success",
  "argvRedacted": ["adb", "-s", "***", "shell", "getprop"],
  "artifactId": "artifact-001"
}
```

审计要求：

- 不记录 API key、token、明文密码。
- 串口输出可按配置保存，但默认不上传。
- Agent prompt 和诊断摘要需要脱敏后进入 Issue Package。

## 11. 设备与连接设计

### 11.1 ADB Adapter

基础命令：

- `adb devices -l`
- `adb start-server`
- `adb kill-server`
- `adb version`
- `adb -s <serial> shell getprop`
- `adb -s <serial> shell wm size`
- `adb -s <serial> shell wm density`
- `adb -s <serial> shell dumpsys SurfaceFlinger`

能力画像采集：

- Android 版本：`ro.build.version.release`
- API：`ro.build.version.sdk`
- ABI：`ro.product.cpu.abilist`
- fingerprint：`ro.build.fingerprint`
- SELinux：`getenforce`
- root：`adb root` 状态或 `id`
- screen：`wm size`、`wm density`、SurfaceFlinger refresh rate
- package：`pm list packages`
- Perfetto：版本和 data sources
- scrcpy：本机工具可用性和版本

### 11.2 Wireless ADB

流程：

1. 用户输入设备 IP、pairing port、pairing code。
2. 执行 `adb pair host:port code`。
3. 执行 `adb connect host:port`。
4. 保存最近连接和别名。
5. 失败时显示端口、防火墙、同网段、授权建议。

### 11.3 Fastboot Adapter

基础能力：

- `fastboot devices`
- `fastboot getvar all`
- 分区信息解析。
- reboot bootloader / reboot recovery 作为危险操作。
- flash / erase / wipe 作为 destructive 操作。

MVP 不做自动刷机流水线，只提供可审计命令模板。

### 11.4 Serial Adapter

Windows 串口能力：

- 枚举 COM 口、VID / PID、设备名。
- 配置 baud rate、data bits、stop bits、parity、flow control、encoding。
- 终端读写、日志保存、断线重连。
- 占用检测和失败提示。

建议 Rust 依赖：

- `serialport`：跨平台串口。
- `portable-pty` 或 Windows ConPTY：终端会话。

## 12. 终端设计

终端类型：

- local：本机 shell。
- adb shell：绑定具体 Android 设备。
- serial：串口控制台。
- fastboot：fastboot 命令模板和输出。

前端：

- 使用 xterm.js 渲染。
- 每个 tab 绑定 sessionId、deviceId、terminalType。
- 支持搜索、复制、保存、清屏、命令历史。

后端：

- 每个终端 session 有独立进程或串口句柄。
- 输出通过 `terminal.output` 事件推送。
- 输入通过 `terminal.write` command 发送。
- session 关闭时写入 Debug Session。

高风险命令处理：

- 终端输入进入 Command Gateway 解析。
- 检测危险模式时不直接执行，先发审批。
- 审批结果写入 session timeline。

## 13. 镜像与反控设计

### 13.1 MVP：scrcpy sidecar 独立窗口

流程：

1. UI 调用 `start_mirror(deviceId, profile)`。
2. Rust 检查 scrcpy 路径或 sidecar。
3. 构造参数：`-s <serial>`、`--max-size`、`--video-bit-rate`、`--max-fps`。
4. 启动 scrcpy 子进程。
5. 返回 `MirrorSession`，记录 pid、状态、参数。
6. 停止时 kill 子进程，并写审计。

优点：

- 快速可用。
- 复用成熟镜像和反控能力。
- 避免初期处理视频渲染、输入注入和音频转发复杂度。

限制：

- 窗口不是原生嵌入，布局一致性较弱。
- 脚本录制需要从 scrcpy 控制事件、ADB input 或 UI overlay 捕获。

### 13.2 后续：嵌入式镜像

可选方案：

- scrcpy server + 自研视频解码渲染。
- Windows 子窗口嵌入。
- WebRTC 本地流桥接。

必须满足：

- 不绕过 FLAG_SECURE。
- 延迟可接受。
- 反控事件进入 ReplayScript。
- 截图、录屏和 timeline 可关联。

## 14. 诊断 Recipe 引擎

Recipe 是一键诊断和自定义操作的声明式模型。

执行流程：

1. UI 展示 Recipe 步骤、风险、产物路径。
2. 用户选择设备和输入参数。
3. Core 校验设备能力。
4. Command Gateway 审批。
5. Task Manager 创建 task。
6. 逐步执行命令。
7. 输出写入 artifact root。
8. 生成 metadata、evidence-index、timeline。
9. 返回 DiagnosticArtifact。

### 14.1 内置 Recipe

MVP 内置：

- `collect-logcat`
- `collect-bugreport`
- `collect-perfetto-trace`
- `collect-screenshot`
- `collect-screenrecord`
- `collect-issue-package`
- `collect-regression-report`

扩展 Recipe：

- `collect-anr-package`
- `collect-crash-package`
- `collect-performance-package`
- `collect-power-package`
- `collect-graphics-package`
- `collect-network-package`
- `collect-ota-package`
- `collect-selinux-package`

### 14.2 产物目录

统一产物结构：

```text
artifacts/
  20260526-143000-collect-crash-package/
    metadata.json
    commands.jsonl
    audit.jsonl
    logcat/
      all.txt
      crash.txt
    bugreport/
      bugreport.zip
    dumpsys/
      activity.txt
      window.txt
    traces/
      main.perfetto-trace
    screenshots/
      current.png
    screenrecords/
      reproduction.mp4
    evidence-index.json
    timeline.json
```

### 14.3 Perfetto

支持两种采集模式：

- Android 设备端 `perfetto` 命令。
- 本机 perfetto 工具连接设备。

Trace 配置：

- UI 选择模板：启动、卡顿、功耗、图形、binder、sched。
- Monaco 编辑 raw config。
- 产物保存 `.perfetto-trace`。
- 后续可集成 Perfetto UI deep link 或内置 viewer。

## 15. 脚本录制与回放

### 15.1 录制来源

录制事件来源：

- 镜像点击、滑动、键盘。
- UIAutomator selector。
- 终端命令。
- ADB input 命令。
- 截图和断言。
- 等待条件。

MVP 录制策略：

- 先支持客户端内显式“添加步骤”和终端命令录入。
- scrcpy 独立窗口阶段，可通过 overlay、ADB input wrapper 或用户手动录制基础事件。
- 嵌入式镜像阶段完整捕获 pointer / key events。

### 15.2 回放引擎

回放流程：

1. 绑定目标设备和分辨率。
2. 校验设备能力。
3. 坐标归一化转换。
4. 优先使用 selector，失败 fallback 到坐标。
5. 每步执行后记录输出、截图或日志窗口。
6. 断言失败时停止或继续，取决于策略。
7. 生成 RegressionReport。

### 15.3 回归报告

```ts
type RegressionReport = {
  id: string;
  scriptId: string;
  deviceId: string;
  status: 'passed' | 'failed' | 'blocked';
  startedAt: string;
  endedAt: string;
  stepResults: Array<{
    stepId: string;
    status: 'passed' | 'failed' | 'skipped';
    evidenceRefs: string[];
    message?: string;
  }>;
  environmentDiff?: Record<string, unknown>;
};
```

## 16. Debug Session 与 Evidence

Debug Session 是问题闭环核心。

记录事件：

- 设备连接和切换。
- 终端命令。
- Recipe 任务。
- 镜像启动 / 停止。
- 脚本录制 / 回放。
- 远程用户加入和操作。
- Agent tool call。
- 关键日志自动标注。
- Issue Package 导出。

### 16.1 Timeline Correlation

时间线关联策略：

- 所有事件使用 UTC 时间。
- 设备日志尽量解析设备时间戳。
- 命令输出记录本机采集时间。
- Perfetto trace 使用 trace timestamp range。
- 截图 / 录屏记录开始结束时间。
- EvidenceRef 关联 file path、line range、trace range 或 media timestamp。

### 16.2 Evidence Backed Summary

Agent 或系统生成摘要必须是证据化：

```ts
type EvidenceBackedSummary = {
  conclusion: string;
  evidenceIds: string[];
  actionsTaken: string[];
  unverifiedItems: string[];
};
```

规则：

- 结论必须引用 EvidenceRef。
- 无证据的判断必须写入 unverifiedItems。
- 导出 Issue Package 时保留证据索引。

## 17. Issue Package

Issue Package 是可移交问题包。

目录结构：

```text
issue-packages/
  issue-login-crash-20260526/
    manifest.json
    README.md
    device-profile.json
    build-info.json
    debug-session.json
    evidence-index.json
    agent-summary.md
    replay-scripts/
    artifacts/
    screenshots/
    screenrecords/
    redaction-report.json
```

### 17.1 manifest

```json
{
  "schemaVersion": 1,
  "packageId": "issue-login-crash-20260526",
  "createdAt": "2026-05-26T10:00:00Z",
  "source": "Droid Debug Workbench",
  "deviceId": "adb-usb-R58T",
  "sessionId": "session-001",
  "redactionStatus": "redacted"
}
```

### 17.2 导出流程

1. 锁定 Debug Session 快照。
2. 收集 Artifact、ReplayScript、EvidenceRef。
3. 执行脱敏扫描。
4. 生成 manifest、README、redaction-report。
5. 打 zip。
6. 记录导出审计。

### 17.3 导入流程

1. 校验 manifest 和 schemaVersion。
2. 校验证据索引路径存在。
3. 展示只读时间线。
4. 允许查看日志、截图、trace 和 replay script。
5. 禁止自动执行导入包里的脚本，执行前必须本地审批。

## 18. 远程协作设计

### 18.1 范围

MVP 只做局域网远程协作：

- 不接管整台 PC。
- 不穿透公网。
- 不引入中心化账号。
- 只暴露 Droid Debug Workbench 内部的镜像、终端、诊断、产物和 Agent 能力。

### 18.2 连接流程

1. 测试端创建 invite。
2. 生成邀请码和 LAN candidates。
3. 开发端输入邀请码或打开局域网链接。
4. 使用 mDNS / UDP discovery 或手动 IP 建立 signaling。
5. WebRTC 建立 data channel。
6. 测试端确认身份和权限。
7. 双方进入远程会话。

### 18.3 通道

建议通道：

- `control`：远程操作请求。
- `terminal`：终端输入输出代理。
- `mirror`：镜像控制事件和状态。
- `artifact`：产物列表和下载。
- `audit`：审计事件。

若初期不传视频流，可让开发端通过远程控制测试端的本地 scrcpy 窗口状态和截图刷新；后续再传 mirror stream。

### 18.4 权限

权限模型：

```ts
type RemotePermission =
  | 'viewer'
  | 'mirror-control'
  | 'terminal-read'
  | 'terminal-control'
  | 'diagnostic-runner'
  | 'admin';
```

规则：

- 会话创建默认 viewer。
- 每次提权需测试端确认。
- 测试端可随时暂停、降权、踢出。
- 所有远程操作都带 actorId。
- 高风险命令仍走 Command Gateway。

## 19. AI Chat 与 Agent

### 19.1 Provider Manager

支持 OpenAI-compatible Provider：

```ts
type ProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyRef: string;
  models: string[];
  defaultModel?: string;
};
```

API key 存储：

- Windows Credential Manager 或 Tauri stronghold / 加密存储。
- 普通配置文件只保存 `apiKeyRef`。
- 自检不得输出密钥。

### 19.2 Chat

Chat 能力：

- 多 Provider。
- 选择模型。
- 会话历史。
- 引用当前 Debug Session、设备画像、产物索引。
- 输出支持证据卡片。

### 19.3 Agent Tool Registry

工具注册模型：

```ts
type AgentTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  riskLevel: RiskLevel;
  permission: string;
  supportsDryRun: boolean;
  handler: string;
};
```

内置工具：

- `device.list`
- `device.profile.read`
- `command.executeReadOnly`
- `logcat.capture`
- `bugreport.capture`
- `perfetto.capture`
- `dumpsys.capture`
- `artifact.search`
- `artifact.summarize`
- `script.generateDraft`
- `script.runRegression`
- `issuePackage.create`
- `issueDraft.create`
- `symbolication.run`
- `integration.submitIssue`

### 19.4 Agent 执行循环

流程：

1. 用户输入问题。
2. Agent 读取当前上下文摘要。
3. 模型选择工具。
4. Tool Policy 校验权限和风险。
5. 必要时发审批。
6. 执行工具。
7. 工具输出写入 EvidenceRef。
8. Agent 输出证据化回答。

输出格式：

```text
结论：
证据：
已执行动作：
未验证项：
建议下一步：
```

### 19.5 MCP 扩展

可支持 MCP server，但必须经过本地安全壳：

- MCP tool 导入时映射到 AgentTool。
- 要求声明 riskLevel 和 permission。
- 外部 MCP 不允许直接执行本机命令。
- MCP tool 输出进入审计和脱敏流程。

## 20. ROM 与 App 增强

### 20.1 ROM Hub

能力：

- fastboot 状态和 getvar。
- 分区信息查看。
- SELinux AVC 聚合。
- tombstone 解析。
- pstore / ramoops / dmesg 采集。
- framework service dumpsys 快捷模板。
- Winscope 采集入口。
- CTS / GTS / Tradefed 命令模板。

### 20.2 Symbolication

Java / Kotlin：

- 输入 stacktrace。
- 输入 ProGuard / R8 mapping。
- 输出反混淆结果。
- 记录 mapping hash。

Native：

- 解析 tombstone。
- 匹配 build id。
- 查找 so 符号目录。
- addr2line / llvm-symbolizer。
- 输出置信度。

Kernel / vendor：

- vmlinux / System.map / vendor symbols。
- build fingerprint 绑定。
- 结果缓存。

### 20.3 Package Hub

能力：

- package list。
- install / uninstall / downgrade approval。
- permission / appops。
- run-as 数据导出。
- SharedPreferences / database 查看。
- 非 debuggable 限制提示。

## 21. 外部集成

集成目标：

- Jira。
- 禅道。
- TAPD。
- GitHub Issues。
- GitLab Issues。

提交前流程：

1. 生成 payload preview。
2. 展示标题、描述、字段、附件。
3. 执行脱敏。
4. 用户确认。
5. 调用外部 API。
6. 保存 issue URL 和提交审计。

默认 dry-run：

- 未配置凭据时只生成 payload preview。
- Agent 发起提交也必须先 dry-run。

## 22. 存储设计

Windows 默认路径：

```text
%APPDATA%/DroidDebugWorkbench/
  config/
  sessions/
  artifacts/
  issue-packages/
  scripts/
  recipes/
  symbols/
  logs/
  cache/
```

当前仓库开发阶段使用项目内 `artifacts/` 作为产物目录。

配置：

- `settings.json`：非敏感设置。
- `providers.json`：provider 元数据，不含明文 key。
- `permissions.json`：权限策略。
- `recipes/`：自定义 Recipe。
- `scripts/`：ReplayScript。

数据保留：

- 默认保留最近 30 天产物。
- 用户可固定重要 Issue Package。
- 支持按设备、会话、大小清理。

## 23. 脱敏设计

脱敏对象：

- logcat。
- bugreport。
- dumpsys。
- terminal output。
- Agent prompt / response。
- Issue Package README。
- 外部缺陷 payload。

默认规则：

- 手机号。
- 邮箱。
- IP 地址。
- Wi-Fi SSID。
- Android serial。
- token / api key / bearer。
- URL query 中的敏感字段。

脱敏报告：

```json
{
  "status": "redacted",
  "rulesApplied": ["email", "token", "ip"],
  "filesScanned": 12,
  "matches": 38
}
```

## 24. 可观测性与自检

自检项：

- ADB 是否可用。
- fastboot 是否可用。
- scrcpy 是否可用。
- perfetto 是否可用。
- Tauri command gateway 是否可用。
- Windows 凭据存储是否可用。
- 当前设备数量。
- 最近失败任务。
- 产物目录是否可写。

客户端日志：

- app.log：普通运行日志。
- audit.jsonl：审计。
- crash.log：崩溃。
- tasks.jsonl：任务状态。

日志策略：

- 不记录密钥。
- 输出体默认截断。
- 可导出“客户端自身诊断包”。

## 25. 安全模型

Actor：

- local-user。
- remote-user。
- agent。
- recipe。
- system。

每个动作需要：

- actor。
- permission。
- riskLevel。
- target device。
- audit event。

安全边界：

- UI 不能绕过 Core。
- Agent 不能直接访问 shell。
- Remote 不能直接访问 shell。
- Recipe 不能隐藏 destructive 操作。
- 外部 MCP 不能直接拿到本机命令能力。
- 导入 Issue Package 不自动执行任何内容。

## 26. 测试策略

### 26.1 前端单元测试

覆盖：

- 设备解析。
- 权限策略。
- 命令风险分类。
- Recipe 可用性。
- EvidenceRef。
- Issue Package。
- 脱敏。
- 符号化。
- UI 中文文案和乱码回归。

当前命令：

```powershell
npm.cmd test
```

### 26.2 前端构建

```powershell
npm.cmd run build
```

覆盖：

- TypeScript 类型。
- Vite 生产构建。

### 26.3 Rust 测试

目标命令：

```powershell
cd src-tauri
cargo test
```

当前环境要求：

- Windows 需要安装 Visual Studio Build Tools。
- 必须包含 Desktop development with C++，确保 `link.exe` 可用。

### 26.4 真机 E2E

真机验收矩阵：

| 场景 | 依赖 | 验收 |
| --- | --- | --- |
| USB ADB 发现 | adb + 设备授权 | 设备列表显示真实 serial 和 model |
| ADB shell | 在线设备 | 命令输出正常，风险审批生效 |
| logcat | 在线设备 | 生成 logcat/all.txt |
| bugreport | 在线设备 | 生成 bugreport zip 或目录 |
| dumpsys | 在线设备 | 生成 service 输出 |
| screenshot | 在线设备 | 生成 png |
| screenrecord | 在线设备 | 生成 mp4 |
| Perfetto | Android 11+ + perfetto | 生成 `.perfetto-trace` |
| scrcpy | scrcpy + 在线设备 | 镜像和反控可用 |
| ReplayScript | 在线设备 | 基础 tap / swipe / input 可回放 |
| Remote | 两台同网段 PC | 邀请、加入、授权、断开、审计可用 |
| Agent | Provider 凭据 | 工具调用、审批、证据化输出可用 |

### 26.5 视觉验证

每次 UI 大改需截图验证：

- 1440 x 920 桌面。
- 1280 x 720 最小窗口。
- 中文不溢出。
- 明亮主题可读。
- 终端、日志、右侧面板不重叠。

### 26.6 文档验证

文档变更至少执行：

```powershell
git diff --check
node -e "const fs=require('fs'); const bad=[0xfffd]; for (const f of ['doc/PRD.md','doc/TECHNICAL_DESIGN.md']) { const s=fs.readFileSync(f,'utf8'); if ([...s].some(ch => bad.includes(ch.codePointAt(0)))) throw new Error(f+' contains replacement character'); console.log(f, s.length); }"
```

## 27. 构建与发布

开发：

```powershell
npm.cmd run dev
npm.cmd run tauri dev
```

前端构建：

```powershell
npm.cmd run build
```

桌面打包：

```powershell
npm.cmd run tauri build
```

发布产物：

- Windows NSIS installer。
- Windows MSI。

Sidecar 策略：

- 开发阶段优先使用 PATH 或用户配置路径。
- 发布阶段可选择随包分发 adb / fastboot / scrcpy / perfetto wrapper。
- 随包分发必须记录版本、license 和更新策略。

更新策略：

- MVP 可手动下载安装。
- 后续可接入 Tauri updater。

## 28. 性能设计

目标：

- 首屏可交互小于 2 秒。
- ADB 设备刷新小于 1 秒。
- logcat 流 UI 不阻塞。
- 单个日志视图支持百万行索引或虚拟滚动。
- Recipe 长任务可取消。
- Issue Package 导出大文件时不阻塞 UI。

技术措施：

- 后端流式输出。
- 前端虚拟列表。
- 大文件只索引摘要和偏移，不一次性读入内存。
- 产物写入后台 task。
- Agent 只读取相关证据片段。

## 29. 兼容性设计

Android：

- Android 8+：基础 ADB、logcat、dumpsys。
- Android 11+：Perfetto 体验更完整。
- 不同 ROM 对 shell 权限、log buffer、bugreport 输出有差异，必须在能力画像中体现。

Windows：

- Windows 10 / 11。
- PowerShell、cmd、Git Bash 不作为功能前提。
- 串口设备需要系统驱动。

工具：

- ADB / fastboot 可来自 Android SDK platform-tools。
- scrcpy 可来自系统 PATH、用户配置路径或 sidecar。
- perfetto 可来自设备端或本机工具。

## 30. 实施路线

### Phase 0：文档与验收口径

- 完整 PRD。
- 完整技术实现文档。
- 实现状态文档。
- 明确当前预览态和目标态差异。

### Phase 1：工作台骨架

- Tauri + React + TypeScript + Rust。
- 明亮中文 UI。
- 基础 store 和 API facade。
- Browser fallback。
- 基础领域模型和测试。

### Phase 2：真实设备与终端

- 生产级 ADB adapter。
- fastboot adapter。
- 串口 adapter。
- 终端多 tab 和流式输出。
- 命令风险、审批、审计闭环。

### Phase 3：镜像与诊断

- scrcpy sidecar。
- 镜像生命周期管理。
- logcat / bugreport / dumpsys / screenshot / screenrecord。
- Perfetto trace 模板和真实采集。
- Artifact metadata 和 evidence-index。

### Phase 4：脚本与问题包

- ReplayScript 录制。
- 回放引擎。
- 断言和等待条件。
- RegressionReport。
- Issue Package 导出 / 导入。

### Phase 5：局域网远程协作

- LAN discovery。
- WebRTC data channel。
- 邀请、加入、授权、降权、断开。
- 远程终端和镜像控制代理。
- 审计和异常恢复。

### Phase 6：AI Agent

- Provider Manager。
- Chat。
- Tool Registry。
- Tool calling。
- 审批流。
- 证据化输出。
- Playbook。

### Phase 7：ROM / App / QA / 集成增强

- Package Hub。
- ROM Hub。
- native / kernel symbolication。
- App Inspection。
- 外部缺陷系统。
- Lab 批量任务。
- 客户端可观测性。

## 31. PRD 映射

| PRD 需求 | 技术模块 |
| --- | --- |
| ADB / 串口连接切换和终端 | Device Hub、Serial Adapter、Terminal Hub、Command Gateway |
| 串口设备配置 / ADB 配置 | Settings、Device Core、Serial Core、ADB Adapter |
| QtScrcpy 类镜像和反控 | Mirror Hub、scrcpy sidecar、MirrorSession |
| 录制和执行脚本 | Script Hub、ReplayScript、Replay Engine、RegressionReport |
| 局域网远程协作 | Remote Hub、LAN discovery、WebRTC、Permission Policy、Audit |
| Cherry Studio 类聊天 | AI Hub、Provider Manager、Chat Session |
| Agent 操控工具能力 | Agent Tool Registry、Tool Policy、Command Gateway |
| 一键日志 / trace / 自定义操作 | Diagnostic Hub、Recipe Engine、Artifact Store |
| Android ROM 能力 | ROM Hub、fastboot、SELinux、tombstone、symbolication |
| Android App 能力 | Package Hub、App Inspection、permission、run-as |
| 测试工程能力 | ReplayScript、Issue Package、RegressionReport、Lab Hub |
| 模块化 | feature modules、Rust Core services、typed IPC |
| 默认明亮中文 UI | AppShell、styles、localization tests |
| 证据闭环 | Debug Session、EvidenceRef、Issue Package |
| 安全 | Permission Policy、Approval、Audit、Redaction |

## 32. 验收标准

完整实现后必须满足：

- Windows 客户端可安装并启动。
- 默认界面为明亮中文工具型工作台。
- 连接真实 Android 设备后显示真实能力画像。
- ADB / serial / fastboot 终端可用，危险命令有审批。
- scrcpy 镜像和反控可用。
- 一键 logcat、bugreport、Perfetto、截图、录屏能生成真实产物。
- 反控过程可录制脚本并回放。
- Debug Session 记录关键操作。
- Issue Package 可导出、导入、查看证据索引。
- 两台局域网 PC 可建立远程会话，并按权限控制镜像和终端。
- 配置 Provider 后可聊天，Agent 可在审批后调用工具。
- Agent 输出关键结论时引用 EvidenceRef。
- 外部缺陷系统提交前有 dry-run 预览和脱敏。
- 缺少设备或工具时 UI 明确提示，不伪装成功。

## 33. 关键风险与应对

| 风险 | 应对 |
| --- | --- |
| Windows 工具链不完整导致 Rust 构建失败 | 文档和自检提示安装 Visual Studio Build Tools C++ 工作负载 |
| scrcpy 嵌入复杂 | MVP 使用独立窗口，后续再嵌入 |
| Agent 越权执行危险命令 | Tool Policy、审批、denylist、audit、dry-run |
| 远程协作越权 | 只暴露客户端内部能力，所有操作带 actor 和 permission |
| 诊断包泄露隐私 | 默认脱敏、提交前预览、redaction report |
| Android ROM 差异 | 能力画像、版本判断、fallback 和明确错误提示 |
| 大日志卡顿 | 后端流式、索引、虚拟滚动、分段读取 |
| 脚本回放不稳定 | selector 优先、坐标归一化、等待条件、失败证据 |

## 34. 下一步工程优先级

短期优先：

1. 修复 / 确认 UTF-8 中文源文件显示与测试环境，避免乱码进入源码。
2. 安装 MSVC Build Tools，解除 `cargo test` 阻塞。
3. 接入真实 Android 设备，完成 ADB adapter E2E。
4. 安装 scrcpy 并验证 mirror sidecar。
5. 实现 terminal session 流式输出。
6. 让 Recipe 真实生成 logcat / bugreport / screenshot。

中期优先：

1. 实现 ReplayScript 录制 / 回放。
2. 实现 Issue Package 导入。
3. 实现 WebRTC LAN 远控。
4. 实现 Provider-backed Chat 和 tool calling。
5. 实现 Perfetto trace 配置模板。

长期优先：

1. 嵌入式镜像。
2. native / kernel 符号化。
3. App Inspection。
4. Lab 批量设备和稳定性任务。
5. 外部缺陷系统生产提交。
