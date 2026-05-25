# Droid Debug Workbench

Droid Debug Workbench is a Windows-first Android debugging desktop client for ROM engineers, Android app engineers, QA engineers, and on-call developers.

The application implements the product and technical direction in `doc/PRD.md` and `doc/TECHNICAL_DESIGN.md`:

- Device Hub for ADB, wireless ADB, serial, fastboot, and capability profiles.
- Terminal Hub for local, ADB shell, serial, and fastboot sessions.
- Mirror Hub for scrcpy-managed mirroring and reverse control.
- Diagnostic Hub for logcat, bugreport, Perfetto, screenshots, and custom Recipes.
- Script Hub for replay scripts and regression reports.
- Session & Report Hub for Debug Sessions, Issue Packages, and evidence indexes.
- AI Agent Hub with provider-style chat, tool registry, approval policy, and evidence mode.
- Remote, Package/App Inspection, ROM, Integration, Settings, and Self Diagnostics modules.

## Current Implementation

This repository now contains a runnable Tauri + React + TypeScript + Rust application skeleton with the full product module map and working local workflows. The frontend runs in browser/Vite mode with demo adapters, and the desktop runtime exposes matching Tauri commands for the same concepts.

Implemented foundations:

- Shared TypeScript domain models for devices, Recipes, Replay Scripts, Debug Sessions, EvidenceRefs, Issue Packages, Agent tools, permissions, and artifacts.
- Vitest coverage for evidence indexing, Issue Package manifest creation, built-in Recipes, and tool policy.
- Modern tool-client UI with dense navigation, device status bar, device rail, dock-like workspace, context panel, command palette actions, and all PRD module surfaces.
- Tauri Rust command gateway for devices, Recipes, scripts, artifacts, sessions, Issue Package export, Agent responses, and self diagnostics.
- Fallback frontend adapter so the app remains usable in browser mode when Tauri desktop APIs are unavailable.

The external tool adapters are intentionally boundary-based: when desktop runtime is available, Rust can probe local tools such as `adb`, `scrcpy`, `perfetto`, and `fastboot`; when unavailable, the UI shows capability state and safe demo data.

## Requirements

- Node.js 24 or later.
- npm 11 or later.
- Rust 1.78 or later.
- For Windows desktop builds: Visual Studio Build Tools with the C++ MSVC toolchain. Rust/Tauri needs `link.exe`.

PowerShell may block `npm.ps1`; use `npm.cmd` commands on Windows.

## Commands

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev
npm.cmd run tauri -- dev
```

Rust checks:

```powershell
cd src-tauri
cargo fmt --check
cargo test
```

If `cargo test` fails with `link.exe not found`, install Visual Studio Build Tools with the Desktop development with C++ workload.

## Development Notes

- Frontend fallback data lives in `src/app/fixtures.ts`.
- Frontend backend adapter lives in `src/app/api.ts`.
- Shared domain logic lives in `src/domain/`.
- Desktop commands live in `src-tauri/src/lib.rs`.
- Documentation lives in `doc/`.

High-risk operations such as flashing, wiping, clearing data, installing downgrades, or remote terminal control must remain behind approval policy and audit logging when real adapters are added.
