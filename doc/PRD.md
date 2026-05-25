# Droid Debug Workbench PRD

版本：1.0
日期：2026-05-26
产品名：Droid Debug Workbench
中文名：安卓调试工作台
目标平台：Windows 优先，架构预留 macOS / Linux 扩展
产品类型：Android 调试、复现、诊断、远程协作与 Agent 自动化桌面客户端

## 1. 产品定位

Droid Debug Workbench 是面向 Android ROM 工程师、Android App 工程师、测试工程师和 on-call 开发支持人员的桌面调试客户端。它把日常分散在命令行、串口工具、scrcpy、日志脚本、Perfetto、远程协助工具、缺陷系统和 AI Chat 中的工作流整合到一个现代工具型工作台里。

产品不是 Android Studio 的替代品，而是补齐 Android Studio 外部的设备调试、问题复现、ROM 诊断、远程协作、证据打包和 Agent 自动化能力。

核心价值：

- 更快连接设备：统一管理 USB ADB、无线 ADB、串口、fastboot、recovery、sideload、远程设备。
- 更快看到现象：镜像反控、截图、录屏、终端、日志、trace 在同一工作区。
- 更快复现问题：录制反控脚本、终端命令和断言，回放并生成回归报告。
- 更快交给开发：测试端可发起局域网远程协作，开发直接查看现象并操作授权范围内的工具。
- 更快定位根因：一键 logcat、bugreport、dumpsys、Perfetto、符号化、Agent 证据化分析。
- 更快闭环问题：Debug Session、EvidenceRef、Issue Package、回归验证和外部缺陷系统提交形成完整证据链。

## 2. 背景与参考

Android 调试高度依赖多个独立工具：

- ADB 用于设备通信、shell、文件传输、端口转发、安装、无线调试和 bugreport。
- logcat 用于读取 Android 日志缓冲区，常见缓冲区包括 main、system、crash、events、radio、kernel。
- dumpsys 用于读取系统服务状态，例如 activity、window、input、meminfo、gfxinfo、batterystats。
- Perfetto 是 Android 系统级 tracing 的主流方案，用于性能、调度、图形、启动、功耗等时间线分析。
- scrcpy 是成熟的 Android 镜像与控制工具，适合作为桌面客户端镜像反控能力的基础 sidecar。
- Tauri v2 适合实现 Windows 桌面壳，Rust 后端负责进程、串口、文件、权限和审计，React 前端负责复杂工作台 UI。
- Cherry Studio 的 Provider / Model / Chat 形态可作为 AI Chat 体验参考；MCP 的工具协议可作为 Agent 工具生态参考，但本产品必须增加本地权限、审批和审计边界。

参考链接：

- Android ADB：https://developer.android.com/tools/adb
- Android logcat：https://developer.android.com/studio/command-line/logcat
- Android dumpsys：https://developer.android.com/tools/dumpsys
- Android bugreport：https://source.android.com/docs/core/tests/debug/read-bug-reports
- Android Perfetto：https://developer.android.com/tools/perfetto
- Perfetto Android tracing：https://perfetto.dev/docs/learning-more/android
- scrcpy：https://github.com/Genymobile/scrcpy
- Tauri sidecar：https://v2.tauri.app/develop/sidecar/
- Tauri Windows installer：https://v2.tauri.app/distribute/windows-installer/
- WebRTC Data Channels：https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- Model Context Protocol：https://modelcontextprotocol.io/docs

## 3. 目标用户

### 3.1 Android ROM 工程师

关注系统稳定性、framework、system service、vendor service、SELinux、kernel、boot、recovery、fastboot、graphics、input、audio、power、thermal、CTS/GTS/Tradefed 等问题。

典型需求：

- 快速抓取 bugreport、dumpsys、Perfetto、tombstone、pstore、kernel log、recovery log。
- 聚合 AVC denied、binder timeout、ANR、native crash、system_server crash。
- 配置 native / kernel / vendor 符号目录并做符号化。
- 从测试端远程查看现场，不需要测试人员反复口述现象。

### 3.2 Android App 工程师

关注应用 crash、ANR、启动慢、卡顿、内存、网络、权限、安装包、兼容性和用户复现路径。

典型需求：

- 基于包名过滤 logcat。
- 抓取 app 相关 bugreport、Perfetto、gfxinfo、meminfo、screenrecord。
- 使用 ProGuard / R8 mapping 做 Java / Kotlin 反混淆。
- 导出 debuggable 应用数据库、SharedPreferences 和关键文件。
- 将复现脚本作为修复后的回归验证脚本。

### 3.3 测试工程师

关注快速连接设备、执行标准操作、记录问题现场、导出问题包、发起远程协作。

典型需求：

- 少写命令，通过清晰按钮完成抓日志、抓 trace、截图、录屏。
- 录制复现脚本并附带问题包。
- 一键邀请开发加入局域网远程协作。
- 自动生成缺陷描述草稿、复现步骤、实际结果、期望结果。

### 3.4 On-call / 开发支持工程师

关注快速接管问题现场，远程执行只读诊断，判断问题归属和下一步排查方向。

典型需求：

- 加入测试端会话后查看镜像、终端输出、诊断产物和时间线。
- 在授权后执行低风险诊断命令。
- 使用 Agent 快速总结日志线索和证据。

## 4. 产品原则

- 工作台优先：首屏就是可操作的设备工作台，不做营销式首页。
- 默认明亮主题：整体克制、清晰、可扫描，支持深色模式和跟随系统作为增强。
- 信息密度适中：像 IDE、DevTools、抓包工具，适合高频专业使用。
- 终端友好：关键 UI 操作能查看等价命令、执行日志和产物路径。
- 证据优先：问题结论必须能回溯到日志行、命令输出、截图、trace 区间、脚本步骤或诊断产物。
- 安全可控：远程控制、Agent 工具调用和高风险命令必须可审批、可撤销、可审计。
- 离线可用：基础设备调试不依赖互联网，AI 和外部系统集成是增强能力。
- 少设备侵入：MVP 优先使用 ADB、scrcpy、UIAutomator，不默认安装设备端常驻服务。
- 模块化扩展：Recipe、脚本、Agent Tool、诊断模板、外部集成都可扩展。
- 真实状态透明：预览模式、占位产物、缺少外部工具、未连接设备必须明确提示。

## 5. UI / UX 需求

### 5.1 整体风格

UI 必须符合现代工具型桌面客户端风格：

- 默认明亮主题，白色侧边栏、浅色工作区、蓝色主操作、低饱和状态色、清晰分隔线。
- 左侧主导航：设备、镜像、终端、诊断、脚本、会话、Agent、远程、应用、ROM、集成、设置。
- 顶部设备状态栏：当前设备、连接方式、系统版本、root 状态、ADB 状态、会话状态、证据模式。
- 中央工作区：当前模块主操作区，支持后续扩展为可停靠多面板。
- 左侧设备栏：设备列表、连接入口、无线调试入口、串口入口。
- 右侧上下文面板：命令面板、设备快照、活动证据、最近产物、Agent 建议。
- 底部任务栏：后台任务、诊断进度、远程会话状态、审批状态、Agent 调用状态。
- 终端和日志视图：等宽字体、搜索、过滤、复制、保存、颜色高亮。
- 卡片半径不超过 8px，避免过度圆角、装饰性渐变和营销式 hero。
- 按钮优先使用图标加短文本，工具栏操作需要 tooltip。
- 所有中文文案必须完整翻译，不允许中英文混杂导致用户理解成本上升；命令、协议名、工具名保留英文。

### 5.2 首屏布局

首屏为设备工作台：

- 左侧：设备列表和连接操作。
- 中间：设备状态、能力画像、快捷动作、连接策略。
- 右侧：命令面板、设备快照、活动证据。
- 底部：任务状态和审批策略状态。

空状态只提供必要动作：

- 连接 USB ADB 设备。
- 配对无线调试。
- 打开串口连接。
- 导入 Issue Package。
- 配置工具路径。

### 5.3 交互细节

- 高风险操作必须显示风险级别、影响范围、设备 ID 和审批按钮。
- 一键操作执行前展示步骤清单，执行中展示进度，完成后展示产物摘要。
- 镜像反控时可一键开始脚本录制。
- 录制脚本时，点击、滑动、按键、文本输入、等待、截图、终端命令进入同一时间线。
- Agent 调用工具时展示工具名、参数摘要、风险级别、审批状态和结果证据。
- 远程控制时测试端始终可见远端身份、当前操作和断开按钮。
- 所有失败状态必须给出可执行建议，例如配置路径、安装工具、重新授权、切换设备。

## 6. 功能范围

### 6.1 设备与连接中心

必须支持：

- ADB 设备发现：USB、TCP/IP、wireless debugging pairing。
- ADB server 管理：start、kill、restart、version、path 配置。
- 多设备切换：默认设备、最近设备、设备别名、设备快照。
- 串口设备发现：COM 口、USB VID/PID、端口占用提示。
- 串口配置：baud rate、data bits、stop bits、parity、flow control、encoding。
- fastboot / recovery / sideload 状态识别。
- 设备能力画像：Android 版本、API、ABI、分辨率、刷新率、root、SELinux、build fingerprint、分区、scrcpy 能力、Perfetto 能力、无线调试状态、外部工具可用性。
- 能力画像驱动的一键操作可用性判断。

应该支持：

- ADB over Wi-Fi pair / connect 向导。
- forward / reverse 端口管理。
- 连接问题修复建议。
- 设备健康检查：授权、USB 模式、网络、电量、存储、root。

### 6.2 终端中心

必须支持：

- local、adb shell、serial、fastboot 多类型终端。
- 多 tab、命令历史、复制粘贴、搜索、日志保存。
- 命令与设备绑定，避免多设备误操作。
- 命令风险分类：read、write、dangerous、destructive。
- 高风险命令审批和审计。

应该支持：

- 命令片段收藏。
- 输出高亮：crash、ANR、fatal、exception、avc denied、tombstone、timeout。
- 终端命令录入 ReplayScript。

### 6.3 镜像与反控

必须支持：

- 镜像已连接 ADB 的 Android 设备。
- 鼠标键盘反控。
- 横竖屏处理。
- 截图、录屏、剪贴板同步入口。
- 多设备切换。
- scrcpy 启动、停止、重连、参数模板。

MVP 策略：

- 使用 scrcpy sidecar。
- 先支持独立 scrcpy 窗口，由客户端管理生命周期、参数和会话状态。
- 后续再做窗口嵌入或原生流渲染。

应该支持：

- 码率、分辨率、FPS、display id、stay-awake、turn-screen-off、no-control 参数模板。
- FLAG_SECURE 黑屏限制提示。
- 音频转发能力按 Android / scrcpy 版本展示。

### 6.4 脚本录制与回放

必须支持：

- 在反控过程中开始、暂停、停止录制。
- 录制点击、滑动、按键、文本输入、等待、截图、终端命令、ADB 命令、断言。
- 保存 ReplayScript。
- 在客户端内选择设备执行脚本。
- 执行时显示实时步骤、失败位置和产物。

应该支持：

- 坐标按设备分辨率归一化。
- UIAutomator selector 增强回放稳定性。
- 等待条件：文本出现、包启动、Activity 切换、日志关键字出现。
- 断言：截图相似、控件存在、命令输出匹配、日志匹配。
- 回归验证模式：复现脚本可在修复后执行，生成通过/失败、失败步骤、截图、日志窗口和环境差异报告。

### 6.5 诊断与一键操作

必须支持：

- 一键 logcat：`logcat -b all`，支持 main/system/events/crash/kernel 分流。
- 一键 bugreport。
- 一键 Perfetto trace。
- 一键截图和录屏。
- 自定义一键操作。
- 诊断产物目录、metadata、evidence-index、timeline。

应该支持：

- 一键 ANR 包：logcat、bugreport、traces、dumpsys activity/window、截图。
- 一键 crash 包：logcat、tombstone、dropbox、bugreport、应用版本、系统属性。
- 一键性能包：Perfetto、gfxinfo、meminfo、cpuinfo、top、binder stats。
- 一键功耗包：batterystats、thermal、wakelock、alarm、job scheduler。
- 一键图形包：SurfaceFlinger、WindowManager、Winscope、frame stats。
- 一键网络包：connectivity、netstats、iptables/nft、tcpdump 插件位。
- 一键 OTA / 升级问题包：recovery log、last_kmsg/pstore、update_engine log。
- 日志 / trace 智能关联：按时间线对齐 logcat、bugreport、Perfetto、dumpsys、截图、录屏和用户操作。
- 自动标注 crash、ANR、binder timeout、input timeout、jank、thermal throttle、low memory、SELinux denied。

### 6.6 局域网远程协作

必须支持：

- 测试端创建局域网远程会话。
- 邀请码或局域网链接加入。
- 开发端查看测试端客户端里的镜像、终端、诊断任务和产物。
- 测试端授权后，开发端可操作镜像、终端或诊断功能。
- 测试端可随时暂停、降权、断开。
- 全程状态提示和审计日志。

不做：

- MVP 不接管测试人员整台 PC 桌面。
- MVP 不穿透公网，不做中心化账号系统。

权限级别：

- viewer：只读观看。
- mirror-control：可控制镜像。
- terminal-read：可查看终端输出。
- terminal-control：可输入终端命令。
- diagnostic-runner：可执行低风险诊断。
- admin：可请求高风险操作，但仍需测试端确认。

### 6.7 AI Chat 与 Agent

必须支持：

- OpenAI-compatible Provider 配置：provider name、base URL、API key、model list。
- 选择模型并对话。
- 保存会话历史。
- Agent Tool Registry。
- Agent 可在授权范围内调用本客户端所有能力。
- Agent 输出证据化回答，默认包含：结论、证据、已执行动作、未验证项。

Agent 必须支持的工具：

- 设备列表与状态读取。
- 只读 ADB 命令。
- logcat / bugreport / Perfetto / dumpsys 抓取。
- 日志关键字搜索。
- 诊断产物摘要读取。
- 复现脚本草稿生成。
- 用户批准的一键操作执行。
- Issue Package 摘要生成。
- 缺陷描述草稿生成。
- 回归验证报告摘要。

高风险工具必须二次确认：

- reboot、root/remount、setprop、pm clear、uninstall、install downgrade、fastboot、flash、erase、wipe。

应该支持：

- MCP server 接入，但必须经过权限映射。
- 本地知识库：历史问题、命令手册、ROM 日志模式、团队 Playbook。
- Agent Playbook：Crash、ANR、启动慢、功耗、图形卡顿、网络、SELinux、native crash。

### 6.8 Debug Session 与 Issue Package

必须支持：

- Debug Session：统一记录用户操作、终端命令、镜像事件、诊断任务、远程动作、Agent tool call、关键系统事件。
- EvidenceRef：将结论定位到日志行、命令输出、trace 区间、截图、录屏、脚本步骤或产物文件。
- Issue Package：按固定目录结构导出问题包，支持导入查看。
- 证据索引：问题包内每个结论可定位到原始证据文件、时间戳和来源。

Issue Package 必须包含：

- manifest。
- device profile。
- build info。
- debug session。
- evidence index。
- replay scripts。
- diagnostic artifacts。
- screenshots / screenrecords。
- agent evidence-backed summary。
- redaction status。
- import instructions。

应该支持：

- 日志 / trace 时间线对齐和关键事件自动标注。
- Java / Kotlin、native、kernel / vendor 三类符号化 / 反混淆配置。
- 回归验证报告。
- 外部缺陷系统提交和附件同步。

### 6.9 应用与包检查

应该支持：

- 设备文件浏览：pull、push、删除、重命名、打开路径。
- 应用列表：包名、版本、uid、debuggable、安装位置。
- APK / split APK / AAB 安装辅助。
- 权限管理：runtime permission、appops、notification permission。
- 应用数据：清数据、run-as、数据库导出、SharedPreferences 导出。
- App Inspection：对 debuggable 应用查看数据库、SharedPreferences、网络线索、后台任务、进程状态。
- 非 debuggable 应用明确展示系统限制。

危险操作必须审批。

### 6.10 ROM 调试增强

应该支持：

- fastboot 命令模板和分区信息查看。
- recovery / sideload 状态识别。
- SELinux AVC denied 聚合。
- tombstone / native crash 解析。
- native tombstone 符号化：符号目录、so 搜索路径、build id 匹配、结果缓存。
- kernel / vendor crash 符号化：vmlinux、System.map、vendor symbols。
- kernel log / dmesg / pstore / ramoops 采集。
- framework service 快捷 dumpsys。
- binder、activity、window、input、surface、audio、power、thermal、display 诊断模板。
- Winscope trace 采集入口。
- Tradefed / CTS / GTS 命令模板和结果索引。

### 6.11 测试工程增强

应该支持：

- 测试用例步骤模板。
- 复现包一键导出：脚本、日志、截图、录屏、设备信息、构建信息、Debug Session、Agent 摘要。
- 缺陷描述助手：生成复现步骤、实际结果、期望结果、影响范围。
- 批量设备执行一键操作。
- 稳定性测试辅助：monkey、重复回放、定时抓包、异常监控。
- 环境检查：ADB 授权、系统版本、测试账号、网络、存储、电量。
- 回归验证报告：基于脚本回放、断言、日志关键字和截图对比生成验证结论。

### 6.12 设置与自检

必须支持：

- ADB / fastboot / scrcpy / Perfetto 路径配置。
- Provider base URL、API key、模型列表配置。
- 主题、快捷键、布局、默认工作区配置。
- 远程协作权限策略。
- Agent 工具权限策略。
- 诊断包保存路径与脱敏规则。
- 符号、mapping、Issue Package 保存路径。
- 工具自身诊断和日志保留策略。

工具自检必须展示：

- ADB / fastboot / scrcpy / Perfetto 是否可用。
- Tauri 命令网关是否可用。
- 当前是否有在线设备。
- 安全存储是否可用。
- 最近失败任务和可恢复建议。

## 7. 模块划分

MVP 模块：

1. Device Hub：设备发现、连接、状态、ADB / serial / fastboot 管理。
2. Terminal Hub：local / adb / serial / fastboot 终端。
3. Mirror Hub：scrcpy 镜像与反控。
4. Diagnostic Hub：一键日志、bugreport、Perfetto、截图录屏、自定义 Recipe。
5. Script Hub：录制、编辑、回放脚本，生成回归报告。
6. Remote Hub：局域网远程协作。
7. AI Hub：Provider、Chat、Agent 工具调用。
8. Session & Report Hub：Debug Session、Issue Package、EvidenceRef、回归验证报告。
9. Settings：工具路径、Provider、权限、主题、快捷键、自检。

扩展模块：

- Package Hub：APK / AAB / package / permission / app data。
- ROM Hub：fastboot、SELinux、tombstone、Winscope、Tradefed、符号化。
- Lab Hub：批量设备、稳定性任务、测试编排。
- Integration Hub：Jira、禅道、TAPD、GitHub Issues、GitLab Issues。
- Observability Hub：工具自身诊断、崩溃日志、性能指标。

## 8. MVP 定义

MVP 必须完成以下端到端场景：

1. 测试人员连接 USB ADB 设备，在客户端看到设备状态和能力画像。
2. 打开镜像并反控设备。
3. 同时打开 ADB shell 和 logcat。
4. 点击一键抓日志生成诊断产物。
5. 点击一键抓 trace 生成 Perfetto trace 文件。
6. 在反控过程中录制复现脚本。
7. 保存脚本后重新执行，复现基础点击、滑动、输入动作。
8. 测试人员发起局域网远程请求，开发人员加入并在授权后控制镜像与终端。
9. 配置 OpenAI-compatible Provider，选择模型对话。
10. Agent 在用户批准后抓取日志并总结异常线索。
11. 结束调试后导出 Issue Package，包含 Debug Session、诊断产物、复现脚本、证据化 Agent 摘要。
12. 修复后执行同一复现脚本进入回归验证模式，生成验证报告。

## 9. 成功指标

- 首次连接 USB ADB 设备到可反控：小于 30 秒。
- 一键日志成功率：常规已授权设备大于 95%。
- 一键 trace 成功率：Android 11+ 设备大于 90%。
- scrcpy 启动成功率：已安装 scrcpy 且设备授权场景大于 95%。
- 录制脚本在同一设备回放成功率：基础交互大于 90%。
- 局域网远程连接建立：同网段无防火墙阻断场景小于 20 秒。
- 测试问题包可用率：开发能基于导出包判断下一步方向的比例大于 80%。
- Issue Package 导入可用率：开发端导入后能看到时间线、关键证据和产物索引的比例大于 90%。
- Agent 结论证据覆盖率：默认模式下关键结论带证据引用的比例大于 95%。
- 高风险命令绕过审批次数：0。

## 10. 权限与安全

- 所有工具调用进入审计日志。
- UI、远程、Agent、Recipe 统一走 Command Gateway 和 Tool Policy。
- Agent 默认只能执行只读工具。
- 远程协作默认只读观看，控制需测试端授权。
- 高风险命令需要二次确认。
- destructive 操作必须显示设备 ID、命令、影响范围和回滚可能性。
- API key 存储在系统安全凭据或加密存储中，不明文写入普通配置。
- 诊断包导出前支持敏感信息脱敏：手机号、邮箱、token、Wi-Fi SSID、IP、序列号。
- 自定义 Recipe、Agent Tool、MCP Tool 必须有权限声明和 riskLevel。
- 外部缺陷系统提交前必须显示将上传的字段和附件，并支持脱敏预览。
- 工具自身诊断日志不得记录明文 API key、访问 token、用户隐私文本或未脱敏的问题包正文。

## 11. 非目标

MVP 不做以下能力：

- 替代 Android Studio 的代码编辑、Gradle 构建、断点调试。
- 公网远程控制平台。
- 云端设备农场。
- 默认安装设备端常驻服务。
- 自动刷机流水线。
- 企业账号、组织、权限后台。
- 绕过 Android 安全策略或 FLAG_SECURE 限制。

## 12. 里程碑

### M1：基础工作台

- Tauri + React + TypeScript + Rust 工程骨架。
- 明亮中文 UI。
- 设备列表、ADB 路径配置、ADB shell。
- 基础设置、自检、权限模型。

### M2：真实设备与终端

- 生产级 ADB adapter。
- fastboot adapter。
- 串口 adapter。
- 终端多 tab、历史、搜索、保存、审批。

### M3：镜像与诊断

- scrcpy sidecar 集成。
- 镜像反控、截图、录屏。
- logcat、bugreport、dumpsys、Perfetto trace。
- 诊断产物目录、metadata、evidence-index。

### M4：脚本与问题包

- 录制反控事件和终端命令。
- 脚本编辑、保存、回放。
- Debug Session 时间线。
- Issue Package 导出和导入。
- 回归验证报告。

### M5：远程协作

- LAN 邀请和加入。
- 镜像画面转发。
- 终端和控制事件代理。
- 权限、审计、断线重连。

### M6：AI Agent

- Provider 配置和 Chat。
- Tool Registry。
- 日志抓取和异常总结。
- 高风险审批。
- Agent 证据模式和 Issue Package 摘要生成。

### M7：ROM / App / QA 增强

- Package Hub。
- ROM 诊断模板。
- 符号化 / 反混淆。
- App Inspection。
- 外部缺陷系统集成。
- 批量设备和稳定性任务。
- 工具自身诊断。

## 13. 当前实现状态边界

截至 2026-05-26，当前仓库已经包含明亮中文 UI、模块入口、浏览器 fallback、Tauri 命令网关示例、领域模型和自动测试，但不能声称全部真实功能已经完成闭环。

当前可作为已实现基础：

- 明亮中文桌面工作台 UI。
- 设备、诊断、脚本、会话、Agent、远程、ROM、集成、设置等入口。
- 浏览器预览 fallback。
- Tauri command gateway 示例。
- 命令风险分类、权限、证据、Recipe、Issue Package、符号化、集成 payload 等领域模型。
- 前端测试、生产构建、Rust 格式检查、UI 截图验证。

当前仍需真实适配器继续落地：

- 真机 ADB shell / logcat / bugreport / dumpsys / 截图 / 录屏。
- scrcpy sidecar 实际镜像反控。
- Perfetto trace 实际采集。
- 串口真实读写。
- WebRTC LAN 远控。
- Provider-backed Agent tool calling。
- 真实外部缺陷系统提交。
- 真实设备脚本录制 / 回放闭环。

## 14. 原始需求覆盖

| 原始需求 | PRD 覆盖位置 | 技术实现文档覆盖位置 |
| --- | --- | --- |
| ADB / 串口连接切换和终端 | 6.1、6.2、7 | 11、12、31 |
| 串口设备配置、ADB 配置 | 6.1、6.12 | 11、22、31 |
| QtScrcpy 类镜像和反控 | 6.3 | 13、31 |
| 录制和执行脚本 | 6.4 | 15、31 |
| 局域网远程协作 | 6.6 | 18、31 |
| Cherry Studio 类聊天、Provider 和模型配置 | 6.7 | 19、31 |
| Agent 操控 ADB 抓日志等工具能力 | 6.7、10 | 19、25、31 |
| 一键抓日志、一键抓 trace、自定义一键操作 | 6.5 | 14、31 |
| 补充 Android ROM、App、测试工程能力 | 6.9、6.10、6.11 | 20、21、31 |
| 分好模块，Agent 能使用工具所有功能 | 7、10 | 5、19、25、31 |
| 现代明亮中文桌面客户端 UI | 5 | 7、26 |
| PRD 与技术实现文档落盘到 doc 目录 | 本文档 | `doc/TECHNICAL_DESIGN.md` |

## 15. 验收清单

- PRD 中原始 10 项需求均有模块覆盖。
- 默认界面是明亮的现代桌面工具，而不是 landing page。
- 中文文案完整，核心用户路径无乱码。
- 功能模块边界明确，核心入口可在首屏或导航中找到。
- MVP 有可验证的端到端场景。
- Agent 拥有全工具能力，但通过权限、审批和审计约束。
- 远程协作限定在客户端工作区内，避免误接管整台 PC。
- Android ROM、App、测试三类用户均有专属增强能力。
- Debug Session、Issue Package、EvidenceRef、回归验证形成问题闭环。
- 所有一键操作都有产物目录和执行摘要。
- 缺少真实工具或设备时，UI 明确提示真实状态，不伪装成功。

## 16. 风险

- scrcpy 嵌入复杂：MVP 先使用独立窗口，后续再嵌入。
- Agent 误执行危险命令：必须通过 Tool Policy、审批、denylist 和 dry-run。
- 远程协作越权：只暴露客户端工具能力，不暴露整机桌面。
- Android 版本差异：通过能力画像、版本提示和 fallback 降低失败率。
- 诊断包隐私：导出前脱敏，外部上传前预览。
- 符号化误匹配：必须记录 build fingerprint、mapping hash、symbol path、置信度。
- 外部工具缺失：自检明确提示安装路径和解决建议。

## 17. 术语表

- Debug Session：一次调试会话，包含用户操作、命令、诊断任务、远程动作和 Agent 调用。
- EvidenceRef：证据引用，指向日志行、命令输出、trace 区间、截图、录屏、脚本步骤或产物文件。
- Issue Package：可移交问题包，包含设备画像、会话、产物、脚本、证据索引和摘要。
- ReplayScript：录制的复现脚本，可回放并用于回归验证。
- DebugRecipe：一键诊断或自定义操作的声明式步骤。
- Command Gateway：统一命令执行入口，负责风险分类、审批、审计、超时和输出管理。
- Agent Tool Registry：Agent 可调用工具的注册表，包含 schema、权限、风险和审计策略。
