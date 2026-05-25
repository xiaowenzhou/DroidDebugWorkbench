# Droid Debug Workbench PRD

版本：0.1  
日期：2026-05-25  
产品名：Droid Debug Workbench  
中文名：安卓调试工作台  
目标平台：Windows 优先，架构预留 macOS / Linux 扩展

## 1. 产品定位

Droid Debug Workbench 是面向 Android ROM 工程师、Android App 工程师和测试工程师的桌面调试客户端。它把日常分散在命令行、串口工具、scrcpy、日志脚本、远程协助工具和 AI Chat 中的工作流整合到一个现代工具型工作台里。

产品不做 Android Studio 的替代品，而是补齐 Android Studio 外部的设备调试、ROM 诊断、问题复现、远程协作和 Agent 自动化能力。核心价值是：

- 更快连接设备：ADB、无线 ADB、串口、fastboot、recovery 状态统一管理。
- 更快看到现象：镜像反控、截图、录屏、日志、trace 在同一工作区。
- 更快复现问题：录制脚本、回放脚本、导出复现包。
- 更快交给开发：测试端可发起局域网远程协助，开发直接看现象并操作终端。
- 更快定位根因：一键日志、trace、dumpsys、bugreport、Agent 辅助分析。
- 更快闭环问题：Debug Session 时间线、标准 Issue Package、回归验证和证据化 Agent 输出串起复现、定位、修复和验证。

## 2. 背景与参考

Android 官方 ADB 是用于与 Android 设备通信的通用命令行工具，支持设备连接、shell、文件、端口转发、无线调试等能力。官方 bugreport 文档说明 bug report 包含日志、堆栈和系统诊断信息，可通过 `adb bugreport` 采集。`dumpsys` 能输出系统服务状态，适合查看 input、memory、battery、network 等诊断信息。Perfetto 是 Android 系统级 tracing 的官方方向，适合采集跨进程、内核调度、atrace 等性能时间线。scrcpy 是成熟的开源 Android 镜像与控制工具，支持 USB / TCP-IP 连接、低延迟镜像、录制和反控。Cherry Studio 的 Provider 配置、模型选择、Agent 和 MCP 形态可作为 AI Chat 与工具调用体验参考。

参考链接：

- Android ADB: https://developer.android.com/tools/adb
- Android bugreport: https://developer.android.com/studio/debug/bug-report
- Android dumpsys: https://developer.android.com/tools/dumpsys
- Android Logcat: https://developer.android.google.cn/tools/logcat
- Perfetto system tracing: https://perfetto.dev/docs/getting-started/system-tracing
- scrcpy: https://github.com/Genymobile/scrcpy
- QtScrcpy: https://github.com/barry-ran/QtScrcpy
- Cherry Studio Providers: https://docs.cherry-ai.com/en-us/pre-basic/settings/providers
- Cherry Studio Agent: https://docs.cherry-ai.com/docs/en-us/advanced-basic/agent
- Model Context Protocol: https://modelcontextprotocol.io/docs/learn

## 3. 目标用户

### 3.1 Android ROM 工程师

关注系统问题、稳定性、启动、图形、输入、音频、电源、性能、SELinux、kernel、framework service、vendor service、CTS / GTS / Tradefed 等。常用 ADB、串口、fastboot、dmesg、logcat、bugreport、Perfetto、Winscope、tombstone、ANR、pstore。

### 3.2 Android App 工程师

关注应用崩溃、ANR、性能、启动、内存、网络、布局、权限、安装包、兼容性和用户复现路径。常用 logcat、bugreport、Perfetto、screenrecord、screencap、apk install、run-as、UIAutomator、dumpsys activity/window/package/meminfo/gfxinfo。

### 3.3 测试工程师

关注快速连接设备、执行测试步骤、记录问题现象、保存日志包、录制复现脚本、远程请求开发协助。需要低门槛 UI、明确状态、少命令记忆、可导出问题包。

### 3.4 开发支持 / 值班工程师

关注远程看现场、接管测试端工具、执行安全命令、抓取诊断材料、快速判断是否需要升级到 ROM / App / 设备厂商方向。

## 4. 产品原则

- 工作台优先：首屏就是可用工具，不做营销式首页。
- 信息密度适中：像专业 IDE / DevTools / 抓包工具，面向高频使用。
- 终端友好：每个 UI 操作都能看到底层命令或等价动作。
- 安全可控：远程控制和 Agent 操作必须可审计、可撤销、可限制。
- 插件化扩展：一键操作、脚本、Agent tool、诊断模板都可扩展。
- 离线可用：基础设备调试不依赖互联网。
- 少依赖设备端安装：MVP 优先依赖 ADB、scrcpy、UIAutomator，不默认安装常驻 APK。
- 证据优先：问题分析、Agent 结论和缺陷描述必须能回溯到日志行、命令、截图、trace 区间或脚本步骤。

## 5. UI / UX 需求

### 5.1 整体风格

UI 必须符合现代工具类桌面客户端风格：

- 左侧主导航：设备、工作区、脚本、诊断、远程、Agent、设置。
- 顶部设备状态栏：当前设备、连接方式、root 状态、电量、网络、系统版本、ADB 状态。
- 中央多面板工作区：镜像、终端、日志、文件、诊断结果可分屏、可停靠。
- 底部任务与事件栏：后台任务、抓日志进度、远程会话状态、Agent 调用状态。
- 命令面板：支持快速执行设备动作、脚本、诊断模板和设置跳转。
- 深浅色主题：默认明亮主题，支持深色模式和跟随系统。
- 工具式视觉：克制、清晰、可扫描，避免大面积渐变、营销卡片和装饰性背景。
- 可配置布局：常用面板可固定，设备多时支持设备墙和多标签。

### 5.2 首屏布局

首屏为设备工作台：

- 左侧：设备列表和连接入口。
- 中间：选中设备的镜像画面或空状态引导。
- 右侧：设备信息、快捷操作、最近诊断包、Agent 建议。
- 底部：终端和日志流，可折叠。

空状态只给必要动作，例如“连接 ADB 设备”“连接串口”“打开无线调试”“导入诊断包”，不展示产品宣传文案。

### 5.3 交互细节

- 所有危险操作显示风险等级，例如刷机、清数据、重启、修改系统属性。
- 一键操作执行前显示将运行的步骤，执行时显示实时日志，完成后生成产物摘要。
- 镜像反控时可一键开始脚本录制，录制中的点击、滑动、按键、文本输入和终端命令进入同一时间线。
- Agent 调用工具时展示工具名、参数摘要、风险级别和审批按钮。
- Agent 输出问题判断时必须展示证据引用，例如日志片段、命令输出、trace 时间段、截图或诊断产物路径。
- 远程控制时测试端始终可看到“谁在控制、正在做什么、可立即断开”。

## 6. 功能范围

### 6.1 设备与连接中心

必须支持：

- ADB 设备发现：USB、TCP-IP、wireless debugging pairing。
- ADB server 管理：start、kill、restart、版本检测、路径配置。
- 设备切换：多设备列表、默认设备、最近设备、设备别名。
- 串口设备发现：COM 口枚举、USB VID/PID、串口配置。
- 串口配置：baud rate、data bits、stop bits、parity、flow control、encoding。
- 连接状态：device、offline、unauthorized、recovery、sideload、fastboot。
- 终端入口：本机 shell、ADB shell、串口 shell、fastboot 命令。

应该支持：

- ADB over Wi-Fi 的 pair/connect 向导。
- 端口 forward/reverse 管理。
- 设备健康检查：USB 调试、授权、无线端口、root、storage、battery。
- 连接问题修复建议：kill-server、重新授权、切换 USB 模式、网络检查。
- 设备能力画像：Android 版本、ABI、分辨率、刷新率、root、SELinux、build fingerprint、分区、scrcpy 能力、Perfetto 能力、无线调试状态、可用外部工具。
- 能力画像驱动的一键操作可用性判断：不可执行的 Recipe 在执行前给出原因和替代方案。

### 6.2 终端模块

必须支持：

- 多标签终端。
- 终端类型：local、adb shell、serial、fastboot。
- 命令历史、复制粘贴、搜索、日志保存。
- 命令执行与设备绑定，避免多设备误操作。

应该支持：

- 命令片段收藏。
- 与脚本录制时间线联动。
- 输出高亮：crash、ANR、avc denied、tombstone、fatal、exception。

### 6.3 镜像与反控模块

必须支持：

- 镜像已连接 ADB 的 Android 设备。
- 鼠标键盘反控。
- 横竖屏处理。
- 截图、录屏、剪贴板同步。
- 多设备切换。

实现参考：

- MVP 使用 scrcpy sidecar。
- QtScrcpy 的多设备、批量投屏、无线连接和 GUI 参数配置作为体验参考。

应该支持：

- 镜像参数模板：码率、分辨率、fps、显示屏 id、窗口置顶、无控制模式。
- 设备屏幕关闭但保持镜像。
- 音频转发能力按 Android 版本和 scrcpy 能力暴露。

### 6.4 脚本录制与回放

必须支持：

- 在反控时开始/停止录制脚本。
- 录制点击、滑动、按键、文本输入、等待、截图、终端命令、ADB 命令。
- 保存录制脚本。
- 在客户端内选择设备执行脚本。
- 执行时显示实时步骤、失败位置和产物。

应该支持：

- 坐标与设备分辨率归一化。
- UIAutomator 节点定位增强回放稳定性。
- 等待条件：文本出现、包启动、Activity 切换、日志关键字出现。
- 断言：截图相似、控件存在、命令输出匹配。
- 脚本导出为问题复现包的一部分。
- 回归验证模式：复现脚本可在修复后作为验证脚本执行，生成通过/失败、失败步骤、截图、日志窗口和环境差异报告。

### 6.5 远程协作模块

必须支持：

- 局域网远程功能。
- 测试端发起协助请求，开发端输入邀请码或打开局域网链接加入。
- 开发端可查看并控制测试端客户端中的镜像和终端。
- 测试端可随时暂停/撤销控制。
- 远程会话全程有状态提示和操作审计。

不做：

- MVP 不接管测试人员整台电脑桌面。
- MVP 不穿透公网，不做中心化账号系统。

应该支持：

- 只读观看、镜像控制、终端控制、文件下载、诊断执行等权限级别。
- 会话录制和审计导出。
- 弱网断线重连。

### 6.6 AI Chat 与 Agent 模块

必须支持：

- 类 Cherry Studio 的 Provider 配置：provider name、base URL、API key、model list。
- 选择模型并对话。
- 保存会话历史。
- 让模型调用工具抓取日志、执行诊断、总结问题。
- Agent 能使用本客户端所有能力，但通过权限模型控制。

必须支持的 Agent 工具：

- 设备列表与状态读取。
- 执行只读 ADB 命令。
- 抓 logcat、bugreport、Perfetto trace。
- 搜索日志关键字。
- 读取诊断包摘要。
- 生成复现脚本草稿。
- 执行用户批准的一键操作。
- 生成带证据引用的问题分析：每个结论关联日志行、命令输出、trace 时间段、截图、脚本步骤或诊断文件。
- 基于 Issue Package 生成缺陷摘要、复现步骤、影响范围、疑似模块和后续排查建议。

高风险工具必须二次确认：

- reboot、root/remount、setprop、pm clear、uninstall、install downgrade、fastboot、flash、erase、wipe。

应该支持：

- MCP server 接入。
- 本地知识库：历史问题、命令手册、ROM 日志模式。
- Agent Playbook：Crash 分析、ANR 分析、启动慢分析、功耗分析、图形卡顿分析。
- Agent 证据模式：默认要求模型回答包含“结论、证据、已执行动作、未验证项”，避免无证据判断。

### 6.7 一键诊断与自定义操作

必须支持：

- 一键抓日志：`logcat -b all`、main/system/events/crash/kernel 分流。
- 一键抓 bugreport。
- 一键抓 Perfetto trace。
- 一键截图和录屏。
- 自定义一键操作。

应该支持：

- 一键 ANR 包：logcat、bugreport、traces、dumpsys activity、dumpsys window、截图。
- 一键 crash 包：logcat、tombstone、dropbox、bugreport、应用版本、系统属性。
- 一键性能包：Perfetto、dumpsys gfxinfo、meminfo、cpuinfo、top、binder stats。
- 一键功耗包：batterystats、thermal、wakelock、alarm、job scheduler。
- 一键图形包：SurfaceFlinger、WindowManager、Winscope、frame stats。
- 一键网络包：connectivity、netstats、iptables/nft、tcpdump 插件位。
- 一键 OTA / 升级问题包：recovery log、last_kmsg/pstore、update_engine log。
- 日志/trace 智能关联：将 logcat、bugreport、Perfetto、dumpsys、截图、录屏和用户操作按时间线对齐，自动标记 crash、ANR、binder timeout、input timeout、jank、thermal throttle、low memory、SELinux denied 等事件。
- Debug Session 时间线：记录用户操作、镜像事件、终端命令、远程控制、Agent tool call、诊断任务和关键系统事件。
- Issue Package 标准导出：包含设备画像、版本信息、Debug Session、复现脚本、日志、trace、截图、录屏、Agent 证据化总结、脱敏状态和导入说明。

### 6.8 文件与包管理

应该支持：

- 设备文件浏览：pull、push、删除、重命名、打开路径。
- 应用列表：包名、版本、uid、debuggable、安装位置。
- APK 安装：普通安装、覆盖安装、降级安装、split APK、AAB/bundletool 辅助。
- 权限管理：runtime permission、appops、notification permission。
- 应用数据：清数据、run-as、导出数据库、导出 shared prefs。
- App Inspection 类能力：查看 debuggable 应用的数据库、SharedPreferences、网络请求线索、后台任务和进程状态；对非 debuggable 应用明确提示系统限制。

危险操作必须审批。

### 6.9 ROM 开发增强能力

应该支持：

- fastboot 命令模板和分区信息查看。
- recovery / sideload 状态识别。
- SELinux AVC denied 聚合。
- tombstone / native crash 解析。
- native tombstone 符号化：支持配置符号目录、so 搜索路径、build id 匹配和符号化结果缓存。
- kernel / vendor crash 符号化：支持配置 vmlinux、System.map、vendor 符号文件路径，并在产物中保留匹配信息。
- kernel log / dmesg / pstore / ramoops 采集。
- framework service 快捷 dumpsys。
- binder、activity、window、input、surface、audio、power、thermal、display 诊断。
- Winscope trace 采集入口。
- Tradefed / CTS / GTS 命令模板与结果索引。

### 6.10 App 开发增强能力

应该支持：

- Activity / Service / Broadcast 快捷启动。
- deep link 测试。
- network security config 和代理状态提示。
- app startup 采集。
- method trace / heap dump / simpleperf 入口。
- Java/Kotlin crash 反混淆：支持配置 ProGuard/R8 mapping 文件，将堆栈还原并保留原始堆栈。
- shared prefs / sqlite 文件导出。
- UI 层级快照。
- logcat 智能过滤：package、pid、tag、level、正则。

### 6.11 测试工程增强能力

应该支持：

- 测试用例步骤模板。
- 复现包一键导出：脚本、日志、截图、录屏、设备信息、构建信息、Debug Session、Agent 证据化总结。
- 缺陷描述助手：根据脚本和日志生成复现步骤、实际结果、期望结果。
- 批量设备执行一键操作。
- 稳定性测试辅助：monkey、重复回放、定时抓包、异常监控。
- 环境检查：ADB 授权、系统版本、测试账号、网络、存储、电量。
- 回归验证报告：基于脚本回放、断言、日志关键字和截图对比生成验证结果。
- 外部缺陷系统集成：支持将 Issue Package 摘要、附件和复现步骤提交到 Jira、禅道、TAPD、GitHub Issues 或 GitLab Issues。

### 6.12 问题闭环与报告能力

必须支持：

- Debug Session：用户开始一次调试会话后，系统统一记录操作、命令、日志关键事件、诊断任务、远程协作和 Agent 调用。
- Issue Package：按固定目录结构导出问题包，并支持在另一个客户端导入查看。
- 证据索引：问题包内每个结论必须能定位到原始证据文件、时间戳和来源。

应该支持：

- 日志/trace 时间线对齐和关键事件自动标注。
- Java/Kotlin、native、kernel/vendor 三类符号化/反混淆配置。
- 回归验证模式和验证报告。
- 外部缺陷系统提交与附件同步。
- 工具自身诊断：记录 ADB 调用耗时、scrcpy 启动失败原因、远程连接失败原因、Provider/Agent 调用历史、客户端崩溃日志和性能指标。

## 7. 模块划分

MVP 模块：

1. Device Hub：设备发现、连接、状态、ADB/serial/fastboot 管理。
2. Terminal Hub：local/adb/serial/fastboot 终端。
3. Mirror Hub：scrcpy 镜像与反控。
4. Diagnostic Hub：一键日志、bugreport、Perfetto、截图录屏。
5. Script Hub：录制、编辑、回放脚本。
6. Remote Hub：局域网远程协作。
7. AI Hub：Provider、Chat、Agent 工具调用。
8. Settings：工具路径、Provider、权限、主题、快捷键。
9. Session & Report Hub：Debug Session、Issue Package、证据索引、回归验证报告。

扩展模块：

- Package Hub：APK / AAB / package / permission / app data。
- ROM Hub：fastboot、SELinux、tombstone、Winscope、Tradefed。
- Lab Hub：批量设备、稳定性、测试任务编排。
- Report Hub：诊断包、问题包、历史归档。

## 8. MVP 定义

MVP 必须能完成以下端到端场景：

1. 测试人员连接 USB ADB 设备，在客户端看到设备状态。
2. 打开镜像并反控设备。
3. 同时打开 ADB shell 和 logcat。
4. 点击“一键抓日志”生成诊断包。
5. 点击“一键抓 trace”生成 Perfetto trace 文件。
6. 在反控过程中录制复现脚本。
7. 保存脚本后重新执行，能复现基础点击/滑动/输入动作。
8. 测试人员发起局域网远程请求，开发人员加入并控制镜像与终端。
9. 配置 OpenAI-compatible Provider，选择模型对话。
10. Agent 在用户批准后抓取日志并总结异常线索。
11. 结束调试后导出 Issue Package，包内包含 Debug Session 时间线、诊断产物、复现脚本和证据化 Agent 摘要。
12. 修复后执行同一复现脚本进入回归验证模式，生成验证报告。

## 9. 成功指标

- 首次连接 USB ADB 设备到可反控：小于 30 秒。
- 一键日志成功率：常规已授权设备大于 95%。
- 一键 trace 成功率：Android 11+ 设备大于 90%。
- 录制脚本在同一设备回放成功率：基础交互大于 90%。
- 局域网远程连接建立：同网段无防火墙阻断场景小于 20 秒。
- 测试问题包可用率：开发能基于导出包判断下一步方向的比例大于 80%。
- Issue Package 导入可用率：开发端导入后能看到时间线、关键证据和产物索引的比例大于 90%。
- Agent 结论证据覆盖率：默认模式下关键结论带证据引用的比例大于 95%。

## 10. 权限与安全

- 所有工具调用进入审计日志。
- Agent 默认只能执行只读工具。
- 远程协作默认只读观看，控制需测试端授权。
- 高风险命令需要二次确认。
- API key 存储在系统安全凭据或加密存储中，不明文写入普通配置。
- 诊断包导出前支持敏感信息脱敏：手机号、邮箱、token、Wi-Fi SSID、IP、序列号。
- 自定义 Recipe 和 MCP 工具必须有权限声明。
- 外部缺陷系统提交前必须显示将上传的字段和附件，并支持脱敏预览。
- 工具自身诊断日志不得记录明文 API key、访问 token、用户隐私文本或未脱敏的问题包内容。

## 11. 非目标

MVP 不做以下能力：

- 替代 Android Studio 的代码编辑、Gradle 构建、断点调试。
- 公网远程控制平台。
- 云端设备农场。
- 默认安装设备端常驻服务。
- 自动刷机流水线。
- 企业账号、组织、权限后台。

## 12. 里程碑

### M1：基础工作台

- 仓库和工程脚手架。
- 设备列表、ADB 路径配置、ADB shell。
- 基础 UI 框架、主题、设置。

### M2：镜像与诊断

- scrcpy sidecar 集成。
- 镜像反控、截图、录屏。
- logcat、bugreport、Perfetto trace。

### M3：脚本与问题包

- 录制基础反控事件。
- 脚本回放。
- Debug Session 时间线。
- Issue Package 导出和导入。
- 回归验证报告。

### M4：远程协作

- LAN 邀请和加入。
- 镜像画面转发。
- 终端和控制事件代理。
- 审计与权限。

### M5：AI Agent

- Provider 配置和 Chat。
- 工具注册表。
- 日志抓取和异常总结。
- 高风险审批。
- Agent 证据模式和 Issue Package 摘要生成。

### M6：ROM / App / QA 增强

- 包管理、权限管理、文件浏览。
- ROM 诊断模板。
- 批量设备和稳定性任务。
- 符号化/反混淆、App Inspection、外部缺陷系统集成、工具自身诊断。

## 13. 验收清单

- PRD 中 10 项原始需求均已覆盖。
- UI 明确为现代工具型客户端，而不是 landing page。
- 功能模块边界明确。
- MVP 有可验证的端到端场景。
- Agent 拥有全工具能力，但通过权限与审计约束。
- 远程协作限定在客户端工作区内，避免误接管整台 PC。
- Android ROM、App、测试三类用户均有专属增强能力。
- Debug Session、Issue Package、证据索引、回归验证形成问题闭环。
