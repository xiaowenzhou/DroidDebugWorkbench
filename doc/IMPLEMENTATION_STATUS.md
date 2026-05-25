# Implementation Status

日期：2026-05-25

## Completed

- Created the Tauri + React + TypeScript + Rust project structure.
- Added dependency and build configuration for Vite, Vitest, React, Zustand, lucide icons, Tauri CLI/API, and Tauri Rust crates.
- Implemented shared TypeScript domain models and tests for:
  - Debug Session timeline ordering.
  - Evidence index creation.
  - Issue Package manifest generation.
  - Built-in Recipe availability checks.
  - Tool permission policy.
- Implemented the modern tool-client UI described by the PRD:
  - Sidebar navigation.
  - Device status bar.
  - Device rail.
  - Main workspace.
  - Context panel.
  - Task/status bar.
  - Device, Mirror, Terminal, Diagnostic, Script, Session, Agent, Remote, Package, ROM, Integration, and Settings panels.
- Implemented frontend service adapters:
  - Tauri command invocation in desktop runtime.
  - Browser fallback fixtures for local development and UI verification.
- Implemented Tauri Rust command gateway:
  - `list_devices`
  - `list_recipes`
  - `list_agent_tools`
  - `list_scripts`
  - `current_session`
  - `list_artifacts`
  - `run_recipe`
  - `export_issue_package`
  - `execute_command`
  - `start_mirror`
  - `create_remote_invite`
  - `symbolication_run`
  - `integration_submit_issue`
  - `run_agent_prompt`
  - `self_diagnostics`
- Connected UI actions to backend-capable workflows for terminal execution, scrcpy mirror startup, LAN remote invites, symbolication preview, and issue tracker dry-run submission.
- Expanded recipe execution to create auditable artifact directories with metadata, evidence indexes, logcat/bugreport/dumpsys outputs when available, and safe placeholders when desktop tools or devices are missing.

## Verified

- `npm.cmd test` passes.
- `npm.cmd run build` passes.
- `cargo fmt --check` passes.
- Frontend production bundle is generated in `dist/`.

## Environment Blocker

`cargo test` currently fails before compiling project code because this Windows environment does not have the MSVC linker `link.exe`.

Required fix:

- Install Visual Studio Build Tools.
- Enable the Desktop development with C++ workload.
- Re-run:

```powershell
cd src-tauri
cargo test
```

## Remaining Real-Adapter Work

The application now has complete module surfaces and stable command boundaries. The next implementation slices should replace demo-safe behavior with real adapters:

- Production-grade ADB process adapter and parser.
- Serial port adapter.
- Full scrcpy sidecar lifecycle management.
- Production Perfetto and bugreport collectors.
- Replay recorder event capture from mirror and terminal sessions.
- WebRTC LAN remote transport.
- Provider-backed Agent tool calling.
- Production symbolication profiles and external issue tracker submission adapters.
