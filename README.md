# Droid Debug Workbench / 安卓调试工作台

Droid Debug Workbench 是面向 Android ROM 工程师、Android App 工程师、测试工程师和 On-call 开发的 Windows 优先桌面调试客户端。

产品文档位于：

- [PRD](doc/PRD.md)
- [技术实现文档](doc/TECHNICAL_DESIGN.md)
- [实现与验证状态](doc/IMPLEMENTATION_STATUS.md)

## 当前实现

仓库当前包含一个可运行的 Tauri + React + TypeScript + Rust 桌面客户端工程骨架，并实现了 PRD 中的完整模块入口和可测试的本地工作流边界。

已实现的主要能力：

- 明亮中文工具型 UI：左侧导航、设备列表、顶部状态栏、中央工作区、右侧命令/上下文面板、底部状态栏。
- 设备工作台：ADB、无线 ADB、串口、fastboot、recovery 与设备能力画像入口。
- 终端中心：本地命令、ADB shell、串口控制台、fastboot 会话入口和高风险命令拦截。
- 镜像与反控：scrcpy 启动入口、镜像状态、反控和录制入口。
- 诊断中心：logcat、bugreport、Perfetto、ANR、Crash、性能、功耗、图形、问题包、回归报告等 Recipe。
- 脚本与回放：Replay Script 模型、脚本列表、回归执行入口。
- 会话与问题包：Debug Session 时间线、EvidenceRef、Issue Package。
- Agent：OpenAI-compatible Provider 的工具注册模型、审批策略、证据化回答 fallback。
- 局域网远程协作：邀请、权限、审计模型和 UI。
- 应用检查、ROM 调试、外部系统集成、设置与自检模块。

浏览器/Vite 模式使用安全 demo adapter；Tauri 桌面运行时提供同名命令边界，后续可逐步替换为生产级 ADB、串口、scrcpy、Perfetto、WebRTC、Provider 和缺陷系统适配器。

## 真实验证边界

当前不能声称所有真实功能都已经正常可用：

- 本机没有在线 Android 设备，无法实测真机 logcat、bugreport、dumpsys、截图、反控、脚本回放。
- 本机没有 `scrcpy`，真实镜像和反控无法启动。
- 本机没有 `perfetto`，真实 trace 抓取无法验证。
- 本机没有 MSVC `link.exe`，`cargo test` 会在依赖编译阶段被 Windows 链接器阻塞。

详细状态见 [实现与验证状态](doc/IMPLEMENTATION_STATUS.md)。

## 环境要求

- Node.js 24 或更高版本。
- npm 11 或更高版本。
- Rust 1.78 或更高版本。
- Windows 桌面构建需要 Visual Studio Build Tools，并安装 Desktop development with C++ 工作负载。

PowerShell 可能阻止 `npm.ps1`，Windows 上建议使用 `npm.cmd`。

## 常用命令

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev
npm.cmd run tauri -- dev
```

Rust 检查：

```powershell
cd src-tauri
cargo fmt --check
cargo test
```

如果 `cargo test` 报 `link.exe not found`，需要安装 Visual Studio Build Tools 的 C++ 工具链。

## 目录说明

- `src/App.tsx`：主桌面工作台界面。
- `src/styles.css`：明亮工具型 UI 样式。
- `src/app/api.ts`：前端到 Tauri 命令的适配层和浏览器 fallback。
- `src/app/fixtures.ts`：浏览器预览和测试用 demo 数据。
- `src/domain/`：设备、命令、Recipe、证据、问题包、权限、脱敏、符号化等共享领域逻辑。
- `src-tauri/src/lib.rs`：Tauri Rust 命令网关。
- `doc/`：产品、技术和实现状态文档。

高风险操作，例如刷机、清数据、卸载、降级安装、远程终端控制，后续接入真实适配器时必须继续经过命令网关、审批策略和审计记录。
