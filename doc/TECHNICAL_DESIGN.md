# Droid Debug Workbench Technical Design

版本：0.1  
日期：2026-05-25  
对应 PRD：`doc/PRD.md`  
目标：提供可直接进入工程实现的技术方案，不创建应用源码或依赖。

## 1. 技术目标

Droid Debug Workbench 的技术架构需要同时满足四类诉求：

- 桌面工具体验：Windows 上稳定、轻量、可打包、可更新。
- 调试工具集成：可靠调用 ADB、fastboot、scrcpy、Perfetto、外部脚本和串口。
- 实时交互：终端流、日志流、镜像控制、远程控制都需要低延迟和可取消。
- Agent 安全：AI 可以调用工具，但每次调用都必须被 schema、权限、审计和风险等级约束。

## 2. 推荐技术栈

### 2.1 Desktop Shell

采用 Tauri v2 + React + TypeScript。

原因：

- Tauri v2 支持 Windows 应用打包，Windows 可输出 MSI 或 NSIS installer。
- Tauri shell plugin 支持 sidecar 机制，适合随应用分发 `adb.exe`、`fastboot.exe`、`scrcpy.exe`、Perfetto 工具包装器等外部二进制。
- Rust 后端适合管理进程、串口、文件、权限和高并发日志流。
- React/TypeScript 适合实现复杂工具型 UI、多面板状态、命令面板、虚拟列表和可扩展插件视图。

参考：

- Tauri Windows installer: https://v2.tauri.app/distribute/windows-installer/
- Tauri shell sidecar: https://v2.tauri.app/reference/javascript/shell/

### 2.2 Core Runtime

Rust Core 负责：

- 设备发现和状态机。
- ADB / fastboot / scrcpy / perfetto 进程管理。
- 串口枚举、连接和读写。
- 终端 PTY 或伪终端适配。
- 日志流分发。
- 文件系统产物管理。
- 权限、审计和 Agent 工具执行。

串口库建议使用 Rust `serialport` crate。它提供跨平台串口 API，包含 Windows COMPort 支持和端口枚举能力。

参考：

- serialport-rs: https://github.com/serialport/serialport-rs
- serialport docs: https://docs.rs/serialport/latest/x86_64-pc-windows-msvc/serialport/

### 2.3 Frontend

React/TypeScript 负责：

- 多面板工作台 UI。
- 设备列表和状态栏。
- 终端视图。
- 日志视图。
- 镜像容器和控制状态。
- 脚本编辑器。
- 诊断任务向导。
- AI Chat 和 Agent 工具审批 UI。

建议库：

- UI 状态：Zustand 或 Redux Toolkit。
- 数据请求：TanStack Query。
- 终端：xterm.js。
- 编辑器：Monaco Editor，用于脚本/Recipe/日志查询。
- 布局：dockview 或自研 dock layout。
- 图标：lucide-react。
- 表格/虚拟列表：TanStack Table + virtual。

不在文档阶段引入依赖，工程实现阶段再按实际选择落地。

## 3. 总体架构

系统分为五层：

1. UI Layer：React 工作台。
2. Application Service Layer：TypeScript service、view model、命令面板、状态编排。
3. Tauri IPC Layer：严格 schema 的 command/event 接口。
4. Rust Core Layer：设备、进程、串口、诊断、脚本、远程、Agent 工具。
5. External Tool Layer：adb、fastboot、scrcpy、perfetto、用户脚本、MCP server。

数据流原则：

- UI 不直接调用系统命令。
- 所有命令通过 Rust Core 的 Command Gateway。
- 所有长任务返回 task id，并通过 event stream 推送进度。
- 所有外部工具调用必须记录审计日志。
- Agent 和远程控制复用同一套工具权限系统。

## 4. 工程目录建议

```text
DroidDebugWorkbench/
  doc/
    PRD.md
    TECHNICAL_DESIGN.md
  src/
    app/
    features/
      device/
      terminal/
      mirror/
      diagnostics/
      script/
      remote/
      ai/
      settings/
    shared/
  src-tauri/
    src/
      core/
        command/
        device/
        adb/
        serial/
        mirror/
        diagnostics/
        script/
        remote/
        ai/
        audit/
      main.rs
    binaries/
      windows/
        adb.exe
        fastboot.exe
        scrcpy.exe
```

说明：

- `doc/` 是当前文档目录。
- `src/` 和 `src-tauri/` 是后续实现建议，本次不创建。
- 外部二进制是否随仓库提交需要工程阶段再决定；通常不建议把大二进制直接提交到源码仓库，可在 release / setup 脚本中下载校验。

## 5. 核心领域模型

### 5.1 DeviceRef

```ts
type DeviceTransport = 'adb-usb' | 'adb-wifi' | 'serial' | 'fastboot' | 'remote';
type DeviceState = 'device' | 'offline' | 'unauthorized' | 'recovery' | 'sideload' | 'fastboot' | 'disconnected';

interface DeviceRef {
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
  lastSeenAt: string;
}
```

### 5.2 CommandRequest

```ts
type CommandKind = 'local' | 'adb' | 'adb-shell' | 'fastboot' | 'serial' | 'scrcpy' | 'perfetto';
type RiskLevel = 'read' | 'write' | 'dangerous' | 'destructive';

interface CommandRequest {
  id?: string;
  kind: CommandKind;
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
```

### 5.3 DiagnosticArtifact

```ts
interface DiagnosticArtifact {
  id: string;
  deviceId: string;
  recipeId: string;
  createdAt: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  rootDir: string;
  files: ArtifactFile[];
  summary?: string;
  timeline?: TimelineEvent[];
}
```

### 5.4 DebugRecipe

```ts
interface DebugRecipe {
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
```

### 5.5 ReplayScript

```ts
interface ReplayScript {
  id: string;
  name: string;
  createdAt: string;
  sourceDevice?: DeviceRef;
  coordinateSpace: { width: number; height: number; rotation: number };
  steps: ReplayStep[];
}
```

`ReplayStep` 类型包括：

- `tap`
- `swipe`
- `key`
- `text`
- `terminal`
- `adb`
- `wait`
- `assert`
- `capture`
- `marker`

### 5.6 AgentTool

```ts
interface AgentTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  riskLevel: RiskLevel;
  permission: string;
  supportsDryRun: boolean;
  handler: string;
}
```

## 6. 模块设计

### 6.1 Device Hub

职责：

- 定时执行 `adb devices -l`。
- 解析 USB、Wi-Fi、recovery、sideload 状态。
- 执行 `fastboot devices`。
- 枚举串口。
- 合并设备状态为统一 DeviceRef。
- 提供设备选择、别名、最近使用记录。

关键接口：

- `device.list()`
- `device.watch()`
- `device.setAlias(deviceId, alias)`
- `adb.configurePath(path)`
- `adb.restartServer()`
- `adb.pair(host, port, code)`
- `adb.connect(host, port)`
- `serial.listPorts()`

状态机：

- `disconnected -> unauthorized -> device`
- `device -> offline -> disconnected`
- `device -> recovery`
- `device -> fastboot`
- `adb-wifi paired -> connected -> offline`

异常处理：

- `unauthorized`：提示重新授权 RSA。
- `offline`：提供 kill-server / reconnect。
- 多设备：所有命令必须绑定 device id。
- ADB path 不可用：阻止相关功能并进入设置引导。

### 6.2 Terminal Hub

职责：

- 提供 local / adb shell / serial / fastboot 终端会话。
- 管理输入、输出、resize、退出码。
- 支持保存日志和搜索。
- 支持录制终端命令到 ReplayScript。

技术点：

- Windows local shell 可用 PowerShell 或 cmd。
- adb shell 和 fastboot 使用 child process。
- 串口 shell 直接读写 COMPort。
- 输出通过 Tauri event 分块推送。

接口：

- `terminal.create(kind, deviceId, options)`
- `terminal.write(sessionId, bytes)`
- `terminal.resize(sessionId, cols, rows)`
- `terminal.close(sessionId)`
- `terminal.save(sessionId, path)`

### 6.3 Mirror Hub

职责：

- 启动和管理 scrcpy sidecar。
- 处理镜像参数模板。
- 监听 scrcpy 进程状态。
- 将镜像控制事件纳入脚本录制。

MVP 方案：

- 直接启动 scrcpy 独立窗口，先保证稳定。
- UI 中维护 scrcpy 会话状态、参数和录制入口。
- 后续再探索嵌入窗口或虚拟显示流集成。

参数模板：

- device serial
- max size
- video bit rate
- max fps
- record path
- no control
- turn screen off
- stay awake
- show touches
- audio policy

风险：

- scrcpy 窗口嵌入跨平台复杂，MVP 不要求嵌入。
- 部分 App 设置 FLAG_SECURE 时镜像可能黑屏，客户端应提示限制而不是绕过。

### 6.4 Diagnostic Hub

职责：

- 执行 DebugRecipe。
- 采集 logcat、bugreport、Perfetto、dumpsys、截图、录屏等产物。
- 管理产物目录、摘要、脱敏和导出。

内置 Recipe：

- `collect-logcat`
- `collect-bugreport`
- `collect-perfetto-trace`
- `collect-anr-package`
- `collect-crash-package`
- `collect-performance-package`
- `collect-power-package`
- `collect-graphics-package`

产物目录：

```text
artifacts/
  yyyyMMdd-HHmmss-deviceAlias-recipeName/
    metadata.json
    timeline.json
    commands.log
    logcat/
    bugreport/
    traces/
    screenshots/
    screenrecords/
    dumpsys/
```

Perfetto：

- Android 11+ 优先使用 on-device perfetto。
- 支持预设 trace config。
- 输出 `.perfetto-trace`。
- 产物可提示用户用 Perfetto UI 打开。

bugreport：

- 使用 `adb bugreport`。
- 若生成 zip，记录 zip 路径。
- 若老版本设备写入 `/bugreports`，执行 pull。

logcat：

- 支持 `-b all`。
- 支持按时间、包名、pid、tag、level 过滤。
- 支持 ring buffer 和持续采集。

### 6.5 Script Hub

职责：

- 录制用户对镜像和终端的操作。
- 保存 ReplayScript。
- 回放脚本。
- 失败时生成定位信息。

录制来源：

- scrcpy 控制事件。
- 客户端内终端命令。
- 客户端一键操作。
- 手动 marker。

回放策略：

1. 如果步骤有 UIAutomator selector，优先按 selector 查找控件。
2. 如果 selector 缺失或查找失败，按归一化坐标回放。
3. 每个关键步骤后允许等待条件。
4. 失败时截图、保存当前 Activity、保存 logcat 窗口。

MVP 限制：

- 不承诺跨设备、跨分辨率 100% 成功。
- 不承诺复杂游戏/高频手势稳定回放。

### 6.6 Remote Hub

职责：

- 局域网会话发现、邀请、加入。
- 传输镜像画面、控制事件、终端输入输出、诊断请求。
- 权限和审计。

技术方案：

- WebRTC 传输实时视频和控制数据。
- DataChannel 传输控制事件、终端输入、任务事件。
- 局域网内可用 mDNS/局域网广播发现；失败时使用邀请码手动连接。
- 信令 MVP 可由测试端本地启动轻量 HTTP/WebSocket 服务。

权限级别：

- `viewer`：只能看镜像和任务状态。
- `mirror-control`：可控制镜像。
- `terminal-read`：可查看终端输出。
- `terminal-control`：可输入终端。
- `diagnostic-runner`：可执行低风险诊断。
- `admin`：可执行高风险操作，但仍需测试端确认。

安全要求：

- 邀请码短时有效。
- 会话内显示远端身份。
- 测试端一键断开。
- 所有远端命令进入审计。
- 默认不同意 destructive 操作。

### 6.7 AI Hub

职责：

- 管理 Provider。
- 提供 Chat。
- 管理 Agent 工具调用。
- 维护会话和上下文。

Provider 模型：

```ts
interface ModelProvider {
  id: string;
  name: string;
  kind: 'openai-compatible' | 'anthropic-compatible' | 'local-compatible';
  baseUrl: string;
  apiKeyRef: string;
  models: ModelInfo[];
  defaultModelId?: string;
}
```

Agent 调用流程：

1. 用户输入问题。
2. AI Hub 发送上下文和可用 tool schema。
3. 模型返回 tool call。
4. Tool Policy 判断风险。
5. 只读工具可直接执行。
6. 写入/危险/破坏性工具显示审批 UI。
7. Rust Core 执行工具。
8. 工具结果写入会话和审计。
9. 模型生成最终回复。

工具分层：

- Read tools：设备状态、日志摘要、文件列表、命令 dry-run。
- Diagnostic tools：抓日志、抓 trace、抓 bugreport。
- Action tools：点击、输入、安装、清数据、重启。
- Dangerous tools：fastboot、flash、erase、wipe、root/remount。

MCP：

- 可支持 MCP server 接入，但必须通过权限映射。
- 不允许 MCP server 获得无限本机命令执行能力。
- STDIO 类工具需要命令 allowlist 和参数校验。

### 6.8 Settings

职责：

- ADB / fastboot / scrcpy / perfetto 路径配置。
- Provider 配置。
- API key 安全存储。
- 主题、快捷键、布局。
- 远程协作策略。
- Agent 权限策略。
- 诊断包保存路径与脱敏规则。

配置存储：

- 普通配置：应用配置目录 JSON / SQLite。
- 密钥：Windows Credential Manager 或 Tauri 安全存储插件。
- 审计日志：本地 append-only 文件或 SQLite 表。

## 7. IPC 设计

Tauri command 原则：

- 所有入参有 schema。
- 所有长任务返回 task id。
- 所有 stream 通过 event 订阅。
- 错误返回结构化 code。

示例：

```ts
interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}

interface TaskEvent {
  taskId: string;
  type: 'started' | 'stdout' | 'stderr' | 'progress' | 'artifact' | 'approval-required' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  payload: unknown;
}
```

关键命令：

- `device_list`
- `device_watch_start`
- `command_run`
- `command_spawn`
- `terminal_create`
- `terminal_write`
- `mirror_start`
- `mirror_stop`
- `diagnostic_run_recipe`
- `script_start_recording`
- `script_stop_recording`
- `script_run`
- `remote_create_invite`
- `remote_join`
- `ai_chat_send`
- `agent_tool_approve`

## 8. 权限模型

权限维度：

- Actor：local-user、remote-user、agent、recipe。
- Tool：ADB、serial、fastboot、mirror、diagnostic、filesystem、package、remote。
- Risk：read、write、dangerous、destructive。
- Scope：device、session、artifact、workspace。

默认策略：

- local-user 可以执行 read/write，但 dangerous/destructive 需要确认。
- remote-user 默认 read，需要测试端授权提升。
- agent 默认 read，diagnostic 需要一次性授权，dangerous/destructive 每次授权。
- recipe 按声明风险运行，用户执行前可查看步骤。

审计字段：

- actor
- tool
- request
- riskLevel
- approval
- start/end time
- exit code
- output path
- redaction status

## 9. 数据与持久化

建议使用 SQLite 存储：

- device aliases
- recent devices
- command history
- terminal sessions metadata
- scripts
- recipes
- diagnostic artifacts metadata
- AI conversations metadata
- remote session audit
- settings excluding secrets

文件系统存储：

- 大日志
- bugreport zip
- trace 文件
- 截图/录屏
- 导出的复现包

数据保留：

- 默认保留最近 30 天诊断包。
- 用户可固定重要产物。
- 支持一键清理缓存。

## 10. UI 技术设计

### 10.1 Layout

主框架：

- `AppShell`
- `Sidebar`
- `DeviceStatusBar`
- `DockWorkspace`
- `TaskBar`
- `CommandPalette`

主要视图：

- `DeviceView`
- `MirrorPanel`
- `TerminalPanel`
- `LogcatPanel`
- `DiagnosticPanel`
- `ScriptPanel`
- `RemotePanel`
- `AiChatPanel`
- `SettingsPanel`

### 10.2 现代工具型 UI 规范

- 面板半径不超过 8px。
- 工具按钮使用图标和 tooltip。
- 高频操作放工具栏，低频操作放菜单。
- 表格、列表和日志优先虚拟滚动。
- 状态颜色语义固定：connected、warning、danger、running、muted。
- 大段解释文字只放在空状态或帮助抽屉，不占据工作区主面积。
- 禁止营销式 hero、装饰性渐变、纯展示卡片首页。

### 10.3 状态同步

- 设备状态由 Rust Core 推送，前端只做缓存。
- 长任务状态由 task event 驱动。
- Agent tool call 状态与 task 状态统一显示。
- 远程会话状态常驻顶部或底部状态栏。

## 11. 诊断 Recipe 设计

Recipe 步骤类型：

- `command`
- `parallel`
- `wait`
- `pull`
- `captureScreenshot`
- `recordScreen`
- `perfetto`
- `bugreport`
- `logcat`
- `dumpsys`
- `packageInfo`
- `redact`
- `zip`

示例：

```json
{
  "id": "collect-crash-package",
  "name": "一键 Crash 包",
  "category": "crash",
  "riskLevel": "read",
  "steps": [
    { "type": "logcat", "args": ["-b", "all", "-d"], "output": "logcat/all.txt" },
    { "type": "command", "kind": "adb-shell", "argv": ["ls", "-R", "/data/tombstones"], "output": "tombstones/list.txt" },
    { "type": "bugreport", "output": "bugreport/" },
    { "type": "dumpsys", "service": "dropbox", "output": "dumpsys/dropbox.txt" },
    { "type": "captureScreenshot", "output": "screenshots/current.png" },
    { "type": "redact" },
    { "type": "zip" }
  ]
}
```

## 12. 远程协作数据流

测试端：

1. 创建 remote session。
2. 生成邀请码。
3. 启动信令服务。
4. 发送镜像帧或共享 scrcpy 显示流。
5. 接收开发端控制事件。
6. 将控制事件转为本地工具调用。
7. 写入审计。

开发端：

1. 输入邀请码加入。
2. 建立 WebRTC peer connection。
3. 查看镜像和终端。
4. 请求权限提升。
5. 发送控制事件或诊断请求。

关键限制：

- 开发端不能直接访问测试端文件系统。
- 开发端不能绕过测试端权限模型。
- 远程会话断开后 token 失效。

## 13. Agent 工具映射

PRD 要求 Agent 能使用客户端所有功能。技术上通过工具注册表实现，而不是让模型直接执行 shell。

工具示例：

- `device.list`
- `device.describe`
- `logcat.capture`
- `logcat.search`
- `bugreport.capture`
- `perfetto.capture`
- `dumpsys.run`
- `screenshot.capture`
- `screenrecord.start`
- `script.run`
- `recipe.run`
- `terminal.runCommand`
- `package.list`
- `package.install`
- `remote.requestPermission`

每个工具必须定义：

- input schema
- output schema
- risk level
- permission
- timeout
- redaction policy
- audit policy
- dry-run support

## 14. 错误处理

错误码分类：

- `ADB_NOT_FOUND`
- `ADB_UNAUTHORIZED`
- `ADB_OFFLINE`
- `DEVICE_NOT_FOUND`
- `MULTIPLE_DEVICES`
- `SERIAL_PORT_BUSY`
- `SCRCPY_START_FAILED`
- `PERFETTO_UNSUPPORTED`
- `BUGREPORT_TIMEOUT`
- `REMOTE_SIGNAL_FAILED`
- `REMOTE_PERMISSION_DENIED`
- `AGENT_TOOL_DENIED`
- `SECRET_STORE_FAILED`

错误 UI：

- 显示短错误。
- 提供“查看详情”。
- 提供建议动作。
- 对可恢复错误提供一键修复。

## 15. 测试策略

### 15.1 单元测试

- ADB devices 输出解析。
- fastboot devices 输出解析。
- serial port 映射。
- CommandRequest 风险分类。
- Recipe schema 校验。
- ReplayScript 坐标归一化。
- Agent tool permission policy。
- 日志脱敏规则。

### 15.2 集成测试

- ADB path 配置和版本检测。
- 启动/停止 adb server。
- 启动/停止 scrcpy sidecar。
- 串口 mock server。
- Recipe dry-run。
- Provider 连通性测试。

### 15.3 端到端测试

- 连接设备 -> 打开镜像 -> 打开 shell -> 抓日志。
- 录制脚本 -> 保存 -> 回放。
- 创建远程邀请 -> 加入 -> 控制镜像 -> 执行诊断。
- Chat -> Agent 抓日志 -> 总结异常。

### 15.4 人工验收

- Windows 10 / 11。
- Android 8 到最新版本。
- USB ADB、无线 ADB、串口转 USB。
- 普通用户权限和管理员权限。
- 企业防火墙或杀软场景。

## 16. 构建与发布

MVP 发布策略：

- Windows x64 portable zip。
- Windows installer：NSIS 或 MSI。
- 工具二进制版本固定并校验 hash。
- 首次启动检查工具可用性。

更新策略：

- Tauri updater 可在后续版本接入。
- 企业内部分发可先使用 GitHub Releases 或内网制品库。

## 17. 风险与对策

### 17.1 scrcpy 嵌入难度

风险：把 scrcpy 画面嵌入 React 面板可能涉及窗口句柄、渲染和输入焦点问题。  
对策：MVP 使用独立 scrcpy 窗口，由客户端管理生命周期和参数；后续再做嵌入式体验。

### 17.2 Agent 执行危险命令

风险：模型误调用破坏性命令。  
对策：工具注册表、风险等级、审批、审计、dry-run、denylist。

### 17.3 远程协作安全边界

风险：开发端越权操作测试端电脑。  
对策：只暴露客户端工具能力，不暴露整机远程桌面；权限由测试端审批。

### 17.4 Android 版本差异

风险：Perfetto、scrcpy 音频、无线调试、bugreport 行为随 Android 版本不同。  
对策：能力检测 + 版本提示 + fallback。

### 17.5 日志隐私

风险：诊断包包含敏感信息。  
对策：脱敏规则、导出预览、按团队策略启用强制脱敏。

## 18. PRD 映射

| PRD 需求 | 技术模块 |
| --- | --- |
| ADB / 串口切换和终端 | Device Hub, Terminal Hub, Command Gateway |
| 串口设备配置 / ADB 配置 | Settings, Device Hub, Serial Core |
| QtScrcpy 类镜像和反控 | Mirror Hub, scrcpy sidecar |
| 录制和执行脚本 | Script Hub, ReplayScript |
| 局域网远程控制 | Remote Hub, WebRTC, Permission Policy |
| Cherry Studio 类 Chat / Provider / Agent | AI Hub, Provider Manager, Agent Tool Registry |
| 一键日志 / trace / 自定义操作 | Diagnostic Hub, DebugRecipe |
| ROM / App / QA 增强 | ROM Hub, Package Hub, Lab Hub, Report Hub |
| 模块化 | feature modules, Rust Core domains |
| Agent 使用所有功能 | Unified Tool Registry + permission/audit |

## 19. 实施顺序

### Phase 0：仓库与文档

- 落盘 PRD 和技术设计。
- 建立基本 README 和工程计划。

### Phase 1：工程骨架

- Tauri + React + TypeScript 初始化。
- Rust Core 基础 IPC。
- AppShell、Sidebar、DeviceStatusBar。

### Phase 2：设备与终端

- ADB path 配置。
- `adb devices` 解析。
- Terminal Hub。
- 串口枚举与连接。

### Phase 3：镜像与诊断

- scrcpy sidecar。
- 一键 logcat。
- 一键 bugreport。
- 一键 Perfetto。
- 诊断产物目录。

### Phase 4：脚本

- 录制事件模型。
- ReplayScript 保存。
- 基础回放。
- 失败产物。

### Phase 5：远程

- LAN invite。
- WebRTC 连接。
- 镜像观看和控制。
- 终端代理和审计。

### Phase 6：AI Agent

- Provider 配置。
- Chat。
- Tool Registry。
- 审批流。
- 日志总结 Playbook。

### Phase 7：扩展能力

- Package Hub。
- ROM Hub。
- Lab Hub。
- Report Hub。

## 20. 验收标准

技术设计完成后，工程实现应能逐步验证：

- 文档中每个 MVP 需求有对应模块。
- 每个外部命令都经过 Command Gateway。
- 每个 Agent tool 都有 schema、风险等级和审计。
- 每个远程操作都能追踪 actor。
- 每个诊断任务都有产物目录和 metadata。
- UI 首屏是工具工作台，不是营销页。
