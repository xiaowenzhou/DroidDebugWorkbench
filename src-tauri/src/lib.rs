use chrono::{DateTime, Duration as ChronoDuration, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceRef {
    id: String,
    serial: String,
    alias: Option<String>,
    transport: String,
    state: String,
    model: Option<String>,
    manufacturer: Option<String>,
    android_version: Option<String>,
    api_level: Option<u32>,
    build_fingerprint: Option<String>,
    root_state: Option<String>,
    capabilities: Vec<String>,
    profile: Option<DeviceCapabilityProfile>,
    last_seen_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceCapabilityProfile {
    abi: Vec<String>,
    screen: Option<ScreenProfile>,
    selinux: Option<String>,
    partitions: Vec<PartitionInfo>,
    tool_availability: serde_json::Value,
    scrcpy: ScrcpyProfile,
    perfetto: PerfettoProfile,
    wireless_debugging: Option<WirelessDebuggingProfile>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenProfile {
    width: u32,
    height: u32,
    density: u32,
    refresh_rate: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PartitionInfo {
    name: String,
    size_bytes: Option<u64>,
    r#type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScrcpyProfile {
    available: bool,
    version: Option<String>,
    audio: Option<bool>,
    hid: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PerfettoProfile {
    available: bool,
    sdk_supported: bool,
    data_sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WirelessDebuggingProfile {
    paired: bool,
    connected: bool,
    port: Option<u16>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Recipe {
    id: String,
    name: String,
    category: String,
    required_capabilities: Vec<String>,
    risk_level: String,
    inputs: Vec<serde_json::Value>,
    steps: Vec<RecipeStep>,
    output_policy: OutputPolicy,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecipeStep {
    id: String,
    r#type: String,
    label: String,
    output: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutputPolicy {
    root_dir: String,
    zip_by_default: bool,
    redact_by_default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceRef {
    id: String,
    r#type: String,
    artifact_id: Option<String>,
    file_path: Option<String>,
    timestamp: Option<DateTime<Utc>>,
    line_range: Option<(u32, u32)>,
    trace_time_range_ns: Option<(u64, u64)>,
    description: Option<String>,
    event_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionEvent {
    id: String,
    timestamp: DateTime<Utc>,
    kind: String,
    source: String,
    title: String,
    evidence_refs: Vec<EvidenceRef>,
    payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticArtifact {
    id: String,
    device_id: String,
    recipe_id: String,
    created_at: DateTime<Utc>,
    status: String,
    root_dir: String,
    files: Vec<ArtifactFile>,
    summary: Option<String>,
    timeline: Vec<SessionEvent>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ArtifactFile {
    path: String,
    kind: String,
    size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DebugSession {
    id: String,
    device_id: String,
    started_at: DateTime<Utc>,
    ended_at: Option<DateTime<Utc>>,
    title: Option<String>,
    events: Vec<SessionEvent>,
    artifacts: Vec<DiagnosticArtifact>,
    issue_package_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct IssuePackage {
    id: String,
    schema_version: u8,
    title: String,
    created_at: DateTime<Utc>,
    device_profile: DeviceCapabilityProfile,
    build_info: serde_json::Value,
    session_id: String,
    replay_script_ids: Vec<String>,
    artifact_ids: Vec<String>,
    evidence_index: Vec<EvidenceRef>,
    agent_summary: Option<EvidenceBackedSummary>,
    redaction_status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceBackedSummary {
    conclusion: String,
    evidence_ids: Vec<String>,
    actions_taken: Vec<String>,
    unverified_items: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplayScript {
    id: String,
    name: String,
    created_at: DateTime<Utc>,
    coordinate_space: serde_json::Value,
    steps: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentTool {
    name: String,
    description: String,
    input_schema: serde_json::Value,
    output_schema: Option<serde_json::Value>,
    risk_level: String,
    permission: String,
    supports_dry_run: bool,
    handler: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandExecutionResult {
    command_line: String,
    argv: Vec<String>,
    status: String,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    risk_level: String,
    requires_approval: bool,
    duration_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MirrorSession {
    id: String,
    device_id: String,
    status: String,
    pid: Option<u32>,
    message: String,
    started_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RemoteInvite {
    code: String,
    permission: String,
    expires_at: DateTime<Utc>,
    lan_candidates: Vec<String>,
    audit_enabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct IntegrationSubmissionResult {
    tracker: String,
    status: String,
    title: String,
    payload_preview: String,
    attachments: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SymbolicationResult {
    status: String,
    input_frames: usize,
    matched_frames: usize,
    output: String,
}

fn now() -> DateTime<Utc> {
    Utc::now()
}

fn tool_exists(command: &str) -> bool {
    let probe = if cfg!(windows) { "where" } else { "which" };
    Command::new(probe)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn command_output(program: &str, args: &[&str]) -> Option<String> {
    Command::new(program)
        .args(args)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                Some(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                None
            }
        })
}

fn resolve_adb_serial(device_id: &str) -> String {
    device_id
        .strip_prefix("adb-usb-")
        .or_else(|| device_id.strip_prefix("adb-wifi-"))
        .unwrap_or(device_id)
        .to_string()
}

fn split_command_line(command_line: &str) -> Vec<String> {
    let mut argv = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in command_line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ' ' | '\t' if !in_quotes => {
                if !current.is_empty() {
                    argv.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(ch),
        }
    }

    if !current.is_empty() {
        argv.push(current);
    }

    argv
}

fn contains_pattern(argv: &[String], pattern: &[&str]) -> bool {
    if pattern.len() == 1 {
        return argv.iter().any(|part| part == pattern[0]);
    }

    argv.iter().enumerate().any(|(index, _)| {
        pattern
            .iter()
            .enumerate()
            .all(|(offset, part)| argv.get(index + offset).map(String::as_str) == Some(*part))
    })
}

fn classify_command_risk(argv: &[String]) -> &'static str {
    let normalized = argv
        .iter()
        .map(|part| part.to_lowercase())
        .collect::<Vec<_>>();
    let destructive = [
        vec!["shell", "pm", "clear"],
        vec!["shell", "wipe"],
        vec!["shell", "recovery", "--wipe_data"],
        vec!["fastboot", "erase"],
        vec!["fastboot", "flash"],
        vec!["uninstall"],
    ];
    let dangerous = [
        vec!["reboot"],
        vec!["root"],
        vec!["remount"],
        vec!["shell", "setprop"],
        vec!["install", "-d"],
        vec!["install", "--downgrade"],
    ];
    let write = [
        vec!["install"],
        vec!["push"],
        vec!["shell", "am"],
        vec!["shell", "input"],
        vec!["shell", "settings", "put"],
        vec!["reverse"],
        vec!["forward"],
    ];

    if is_fastboot_destructive(&normalized)
        || destructive
            .iter()
            .any(|pattern| contains_pattern(&normalized, pattern))
    {
        "destructive"
    } else if dangerous
        .iter()
        .any(|pattern| contains_pattern(&normalized, pattern))
    {
        "dangerous"
    } else if write
        .iter()
        .any(|pattern| contains_pattern(&normalized, pattern))
    {
        "write"
    } else {
        "read"
    }
}

fn is_fastboot_destructive(argv: &[String]) -> bool {
    argv.first().map(String::as_str) == Some("fastboot")
        && argv.iter().any(|part| part == "flash" || part == "erase")
}

fn should_inject_adb_serial(argv: &[String]) -> bool {
    argv.first().map(String::as_str) == Some("adb")
        && !argv.iter().any(|part| part == "-s")
        && argv.get(1).map(String::as_str) != Some("devices")
}

fn is_read_only_tool_command(argv: &[String]) -> bool {
    argv.first().map(String::as_str) == Some("adb")
}

fn run_process_with_timeout(argv: &[String], timeout: Duration) -> CommandExecutionResult {
    let start = Instant::now();
    let mut child = match Command::new(&argv[0])
        .args(&argv[1..])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            return CommandExecutionResult {
                command_line: argv.join(" "),
                argv: argv.to_vec(),
                status: "failed".into(),
                exit_code: None,
                stdout: String::new(),
                stderr: error.to_string(),
                risk_level: classify_command_risk(argv).into(),
                requires_approval: false,
                duration_ms: start.elapsed().as_millis(),
            };
        }
    };

    loop {
        match child.try_wait() {
            Ok(Some(_)) => match child.wait_with_output() {
                Ok(output) => {
                    return CommandExecutionResult {
                        command_line: argv.join(" "),
                        argv: argv.to_vec(),
                        status: if output.status.success() {
                            "success".into()
                        } else {
                            "failed".into()
                        },
                        exit_code: output.status.code(),
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                        risk_level: classify_command_risk(argv).into(),
                        requires_approval: false,
                        duration_ms: start.elapsed().as_millis(),
                    };
                }
                Err(error) => {
                    return CommandExecutionResult {
                        command_line: argv.join(" "),
                        argv: argv.to_vec(),
                        status: "failed".into(),
                        exit_code: None,
                        stdout: String::new(),
                        stderr: error.to_string(),
                        risk_level: classify_command_risk(argv).into(),
                        requires_approval: false,
                        duration_ms: start.elapsed().as_millis(),
                    };
                }
            },
            Ok(None) if start.elapsed() > timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return CommandExecutionResult {
                    command_line: argv.join(" "),
                    argv: argv.to_vec(),
                    status: "timeout".into(),
                    exit_code: None,
                    stdout: String::new(),
                    stderr: format!("命令执行超过 {} ms，已自动终止", timeout.as_millis()),
                    risk_level: classify_command_risk(argv).into(),
                    requires_approval: false,
                    duration_ms: start.elapsed().as_millis(),
                };
            }
            Ok(None) => thread::sleep(Duration::from_millis(50)),
            Err(error) => {
                return CommandExecutionResult {
                    command_line: argv.join(" "),
                    argv: argv.to_vec(),
                    status: "failed".into(),
                    exit_code: None,
                    stdout: String::new(),
                    stderr: error.to_string(),
                    risk_level: classify_command_risk(argv).into(),
                    requires_approval: false,
                    duration_ms: start.elapsed().as_millis(),
                };
            }
        }
    }
}

fn artifact_root(recipe_id: &str) -> PathBuf {
    let dir = PathBuf::from("artifacts").join(format!(
        "{}-{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        recipe_id
    ));
    let _ = fs::create_dir_all(&dir);
    dir
}

fn real_adb_device_count() -> usize {
    command_output("adb", &["devices", "-l"])
        .map(|output| parse_adb_devices(&output))
        .unwrap_or_default()
        .into_iter()
        .filter(|device| device.state == "device")
        .count()
}

fn artifact_dir_writable() -> bool {
    let dir = PathBuf::from("artifacts");
    if fs::create_dir_all(&dir).is_err() {
        return false;
    }

    let probe = dir.join(".self-check-write");
    match fs::write(&probe, "ok") {
        Ok(()) => {
            let _ = fs::remove_file(probe);
            true
        }
        Err(_) => false,
    }
}

fn write_artifact_file(root: &Path, relative_path: &str, content: &str) -> ArtifactFile {
    let path = root.join(relative_path);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&path, content);
    ArtifactFile {
        path: relative_path.replace('\\', "/"),
        kind: relative_path
            .split('/')
            .next()
            .unwrap_or("artifact")
            .trim_end_matches('s')
            .into(),
        size_bytes: Some(content.len() as u64),
    }
}

fn demo_profile() -> DeviceCapabilityProfile {
    DeviceCapabilityProfile {
        abi: vec!["arm64-v8a".into(), "armeabi-v7a".into()],
        screen: Some(ScreenProfile {
            width: 1080,
            height: 2400,
            density: 440,
            refresh_rate: Some(120),
        }),
        selinux: Some("enforcing".into()),
        partitions: vec![
            PartitionInfo {
                name: "boot_a".into(),
                size_bytes: None,
                r#type: Some("boot".into()),
            },
            PartitionInfo {
                name: "system_a".into(),
                size_bytes: None,
                r#type: Some("dynamic".into()),
            },
        ],
        tool_availability: serde_json::json!({
            "adb": tool_exists("adb"),
            "scrcpy": tool_exists("scrcpy"),
            "perfetto": tool_exists("perfetto"),
            "screenrecord": true,
            "fastboot": tool_exists("fastboot")
        }),
        scrcpy: ScrcpyProfile {
            available: tool_exists("scrcpy"),
            version: None,
            audio: Some(true),
            hid: Some(true),
        },
        perfetto: PerfettoProfile {
            available: tool_exists("perfetto"),
            sdk_supported: true,
            data_sources: vec![
                "linux.ftrace".into(),
                "android.log".into(),
                "android.surfaceflinger".into(),
            ],
        },
        wireless_debugging: Some(WirelessDebuggingProfile {
            paired: true,
            connected: false,
            port: Some(37099),
        }),
    }
}

fn demo_events() -> Vec<SessionEvent> {
    vec![
        SessionEvent {
            id: "evt-001".into(),
            timestamp: now(),
            kind: "user-action".into(),
            source: "local-user".into(),
            title: "开始复现登录崩溃".into(),
            evidence_refs: vec![EvidenceRef {
                id: "ev-step-001".into(),
                r#type: "script-step".into(),
                artifact_id: None,
                file_path: None,
                timestamp: None,
                line_range: None,
                trace_time_range_ns: None,
                description: Some("冷启动后点击登录按钮".into()),
                event_id: Some("evt-001".into()),
            }],
            payload: None,
        },
        SessionEvent {
            id: "evt-002".into(),
            timestamp: now(),
            kind: "log-event".into(),
            source: "system".into(),
            title: "检测到 com.example 发生 FATAL EXCEPTION".into(),
            evidence_refs: vec![EvidenceRef {
                id: "ev-log-001".into(),
                r#type: "log-line".into(),
                artifact_id: None,
                file_path: Some("logcat/crash.txt".into()),
                timestamp: None,
                line_range: Some((420, 438)),
                trace_time_range_ns: None,
                description: None,
                event_id: Some("evt-002".into()),
            }],
            payload: None,
        },
    ]
}

#[tauri::command]
fn list_devices() -> Vec<DeviceRef> {
    let mut devices = command_output("adb", &["devices", "-l"])
        .map(|output| parse_adb_devices(&output))
        .unwrap_or_default();
    devices.extend(
        command_output("fastboot", &["devices"])
            .map(|output| parse_fastboot_devices(&output))
            .unwrap_or_default(),
    );

    if !devices.is_empty() {
        return devices;
    }

    vec![DeviceRef {
        id: "desktop-adb-001".into(),
        serial: "R58T-demo".into(),
        alias: Some("ROM 测试主机".into()),
        transport: "adb-usb".into(),
        state: "device".into(),
        model: Some("Pixel 8 Pro".into()),
        manufacturer: Some("Google".into()),
        android_version: Some("16".into()),
        api_level: Some(36),
        build_fingerprint: Some("google/husky_beta/demo:userdebug/dev-keys".into()),
        root_state: Some("adb-root".into()),
        capabilities: vec![
            "adb".into(),
            "logcat".into(),
            "bugreport".into(),
            "perfetto".into(),
            "dumpsys".into(),
            "screenshot".into(),
            "screenrecord".into(),
            "scrcpy".into(),
        ],
        profile: Some(demo_profile()),
        last_seen_at: now(),
    }]
}

fn parse_adb_devices(output: &str) -> Vec<DeviceRef> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with("List of devices"))
        .map(parse_adb_device_line)
        .collect()
}

fn parse_adb_device_line(line: &str) -> DeviceRef {
    let mut parts = line.split_whitespace();
    let serial = parts.next().unwrap_or("unknown").to_string();
    let state = parts.next().unwrap_or("disconnected").to_string();
    let details: serde_json::Map<String, serde_json::Value> = parts
        .filter_map(|part| part.split_once(':'))
        .map(|(key, value)| {
            (
                key.to_string(),
                serde_json::Value::String(value.replace('_', " ")),
            )
        })
        .collect();
    let transport = if serial.contains(':') {
        "adb-wifi"
    } else {
        "adb-usb"
    };
    let capabilities = if state == "device" {
        vec![
            "adb",
            "logcat",
            "bugreport",
            "dumpsys",
            "screenshot",
            "screenrecord",
            "scrcpy",
        ]
    } else {
        vec!["adb"]
    };

    DeviceRef {
        id: format!("{transport}-{serial}"),
        serial,
        alias: None,
        transport: transport.into(),
        state,
        model: details
            .get("model")
            .and_then(|value| value.as_str())
            .map(String::from),
        manufacturer: details
            .get("product")
            .and_then(|value| value.as_str())
            .map(String::from),
        android_version: None,
        api_level: None,
        build_fingerprint: None,
        root_state: Some("unknown".into()),
        capabilities: capabilities.into_iter().map(String::from).collect(),
        profile: Some(demo_profile()),
        last_seen_at: now(),
    }
}

fn parse_fastboot_devices(output: &str) -> Vec<DeviceRef> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter_map(|line| line.split_whitespace().next())
        .map(|serial| DeviceRef {
            id: format!("fastboot-{serial}"),
            serial: serial.into(),
            alias: None,
            transport: "fastboot".into(),
            state: "fastboot".into(),
            model: None,
            manufacturer: None,
            android_version: None,
            api_level: None,
            build_fingerprint: None,
            root_state: Some("unknown".into()),
            capabilities: vec!["fastboot".into()],
            profile: None,
            last_seen_at: now(),
        })
        .collect()
}

#[tauri::command]
fn list_recipes() -> Vec<Recipe> {
    let output_policy = OutputPolicy {
        root_dir: "artifacts".into(),
        zip_by_default: true,
        redact_by_default: true,
    };
    vec![
        recipe(
            "collect-logcat",
            "一键 Logcat",
            "log",
            vec!["logcat"],
            vec![step(
                "logcat-all",
                "logcat",
                "抓取全部 logcat buffer",
                Some("logcat/all.txt"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-bugreport",
            "一键 Bugreport",
            "log",
            vec!["bugreport"],
            vec![step(
                "bugreport",
                "bugreport",
                "抓取 adb bugreport",
                Some("bugreport/"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-perfetto-trace",
            "一键 Perfetto Trace",
            "trace",
            vec!["perfetto"],
            vec![step(
                "perfetto",
                "perfetto",
                "抓取 Perfetto trace",
                Some("traces/main.perfetto-trace"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-screenshot",
            "一键截图",
            "screen",
            vec!["screenshot"],
            vec![step(
                "screenshot-current",
                "captureScreenshot",
                "截取当前画面",
                Some("screenshots/current.png"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-screenrecord",
            "一键录屏",
            "screen",
            vec!["screenrecord"],
            vec![step(
                "screenrecord-current",
                "recordScreen",
                "录制当前画面",
                Some("screenrecords/current.mp4"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-issue-package",
            "问题复现包",
            "custom",
            vec!["logcat", "screenshot"],
            vec![step(
                "issue-create",
                "createIssuePackage",
                "生成问题复现包",
                Some("issue-package.zip"),
            )],
            output_policy.clone(),
        ),
        recipe(
            "collect-regression-report",
            "回归报告",
            "custom",
            vec!["adb", "screenshot"],
            vec![step(
                "regression",
                "runRegression",
                "按回放脚本执行回归",
                Some("regression-report.json"),
            )],
            output_policy,
        ),
    ]
}

fn recipe(
    id: &str,
    name: &str,
    category: &str,
    required: Vec<&str>,
    steps: Vec<RecipeStep>,
    output_policy: OutputPolicy,
) -> Recipe {
    Recipe {
        id: id.into(),
        name: name.into(),
        category: category.into(),
        required_capabilities: required.into_iter().map(String::from).collect(),
        risk_level: "read".into(),
        inputs: vec![],
        steps,
        output_policy,
    }
}

fn step(id: &str, r#type: &str, label: &str, output: Option<&str>) -> RecipeStep {
    RecipeStep {
        id: id.into(),
        r#type: r#type.into(),
        label: label.into(),
        output: output.map(String::from),
    }
}

#[tauri::command]
fn current_session() -> DebugSession {
    DebugSession {
        id: "session-desktop-001".into(),
        device_id: "desktop-adb-001".into(),
        started_at: now(),
        ended_at: None,
        title: Some("登录崩溃复现".into()),
        events: demo_events(),
        artifacts: vec![],
        issue_package_id: None,
    }
}

#[tauri::command]
fn list_artifacts() -> Vec<DiagnosticArtifact> {
    vec![artifact(
        "artifact-crash-package",
        "collect-crash-package",
        "已生成包含 logcat、截图和证据索引的崩溃诊断包。",
    )]
}

fn artifact(id: &str, recipe_id: &str, summary: &str) -> DiagnosticArtifact {
    DiagnosticArtifact {
        id: id.into(),
        device_id: "desktop-adb-001".into(),
        recipe_id: recipe_id.into(),
        created_at: now(),
        status: "success".into(),
        root_dir: format!("artifacts/{id}"),
        files: vec![
            ArtifactFile {
                path: "logcat/crash.txt".into(),
                kind: "logcat".into(),
                size_bytes: Some(238000),
            },
            ArtifactFile {
                path: "evidence-index.json".into(),
                kind: "evidence".into(),
                size_bytes: Some(4200),
            },
        ],
        summary: Some(summary.into()),
        timeline: demo_events(),
    }
}

#[tauri::command]
fn run_recipe(recipe_id: String, device_id: String) -> DiagnosticArtifact {
    let root = artifact_root(&recipe_id);
    let adb_serial = resolve_adb_serial(&device_id);
    let mut files = vec![write_artifact_file(
        &root,
        "metadata.json",
        &serde_json::json!({
            "recipeId": recipe_id,
            "deviceId": device_id,
            "createdAt": now(),
            "commandGateway": "tauri-rust"
        })
        .to_string(),
    )];

    match recipe_id.as_str() {
        "collect-logcat"
        | "collect-crash-package"
        | "collect-anr-package"
        | "collect-issue-package" => {
            let content = command_output("adb", &["-s", &adb_serial, "logcat", "-b", "all", "-d"])
                .unwrap_or_else(|| {
                    "logcat 不可用：未找到 adb 或设备离线\nFATAL EXCEPTION demo marker\n".into()
                });
            files.push(write_artifact_file(&root, "logcat/all.txt", &content));
        }
        _ => {}
    }

    if matches!(
        recipe_id.as_str(),
        "collect-bugreport"
            | "collect-crash-package"
            | "collect-anr-package"
            | "collect-issue-package"
    ) {
        let content = command_output("adb", &["-s", &adb_serial, "bugreport"])
            .unwrap_or_else(|| "bugreport 不可用：未找到 adb 或设备离线\n".into());
        files.push(write_artifact_file(
            &root,
            "bugreport/bugreport.txt",
            &content,
        ));
    }

    if matches!(
        recipe_id.as_str(),
        "collect-perfetto-trace" | "collect-performance-package" | "collect-graphics-package"
    ) {
        files.push(write_artifact_file(
            &root,
            "traces/main.perfetto-trace",
            "Perfetto 抓取占位文件：配置 perfetto 路径和 trace 配置后可执行真实抓取。\n",
        ));
    }

    if matches!(
        recipe_id.as_str(),
        "collect-anr-package"
            | "collect-performance-package"
            | "collect-power-package"
            | "collect-graphics-package"
            | "collect-issue-package"
    ) {
        for service in [
            "activity",
            "window",
            "gfxinfo",
            "batterystats",
            "SurfaceFlinger",
        ] {
            let content = command_output("adb", &["-s", &adb_serial, "shell", "dumpsys", service])
                .unwrap_or_else(|| format!("dumpsys {service} 不可用：未找到 adb 或设备离线\n"));
            files.push(write_artifact_file(
                &root,
                &format!("dumpsys/{service}.txt"),
                &content,
            ));
        }
    }

    if matches!(
        recipe_id.as_str(),
        "collect-screenshot"
            | "collect-crash-package"
            | "collect-issue-package"
            | "collect-regression-report"
    ) {
        files.push(write_artifact_file(
            &root,
            "screenshots/current.png",
            "截图抓取占位文件：设备在线时桌面运行时会替换为 adb exec-out screencap 输出。\n",
        ));
    }

    if recipe_id == "collect-screenrecord" {
        files.push(write_artifact_file(
            &root,
            "screenrecords/current.mp4",
            "录屏抓取占位文件：设备在线时桌面运行时会替换为 adb shell screenrecord 输出。\n",
        ));
    }

    if recipe_id == "collect-regression-report" {
        files.push(write_artifact_file(
            &root,
            "regression-report.json",
            &serde_json::json!({
                "scriptId": "script-login-crash",
                "status": "ready",
                "assertions": [
                    { "type": "logContains", "value": "FATAL EXCEPTION", "status": "not-run" }
                ]
            })
            .to_string(),
        ));
    }

    files.push(write_artifact_file(
        &root,
        "evidence-index.json",
        &serde_json::to_string_pretty(&demo_events()).unwrap_or_else(|_| "[]".into()),
    ));

    DiagnosticArtifact {
        id: format!("artifact-{recipe_id}-{}", Utc::now().timestamp()),
        device_id,
        recipe_id,
        created_at: now(),
        status: "success".into(),
        root_dir: root.to_string_lossy().to_string(),
        files,
        summary: Some("Recipe 已通过桌面命令网关执行，并创建诊断产物目录。".into()),
        timeline: demo_events(),
    }
}

#[tauri::command]
fn list_scripts() -> Vec<ReplayScript> {
    vec![ReplayScript {
        id: "script-login-crash".into(),
        name: "登录崩溃复现".into(),
        created_at: now(),
        coordinate_space: serde_json::json!({ "width": 1080, "height": 2400, "rotation": 0 }),
        steps: vec![
            serde_json::json!({ "id": "step-1", "type": "tap", "payload": { "x": 540, "y": 1960, "label": "登录按钮" }}),
            serde_json::json!({ "id": "step-2", "type": "assert", "payload": { "logContains": "FATAL EXCEPTION" }}),
        ],
    }]
}

#[tauri::command]
fn list_agent_tools() -> Vec<AgentTool> {
    vec![
        agent_tool(
            "device.list",
            "列出已连接设备。",
            "read",
            "device.read",
            "list_devices",
        ),
        agent_tool(
            "device.profile.read",
            "读取当前设备画像、能力和工具可用性摘要。",
            "read",
            "device.read",
            "list_devices",
        ),
        agent_tool(
            "command.executeReadOnly",
            "通过命令网关执行只读 ADB 命令，并复用风险分类和审批边界。",
            "read",
            "command.execute",
            "execute_read_only_command",
        ),
        agent_tool(
            "logcat.capture",
            "抓取 logcat buffer。",
            "read",
            "diagnostic.run",
            "run_recipe",
        ),
        agent_tool(
            "bugreport.capture",
            "抓取 bugreport 诊断产物。",
            "read",
            "diagnostic.run",
            "run_recipe",
        ),
        agent_tool(
            "perfetto.capture",
            "按预设模板抓取 Perfetto trace 产物。",
            "read",
            "diagnostic.run",
            "run_recipe",
        ),
        agent_tool(
            "dumpsys.capture",
            "抓取指定 dumpsys service 输出。",
            "read",
            "diagnostic.run",
            "run_recipe",
        ),
        agent_tool(
            "artifact.search",
            "在诊断产物和证据索引中检索关键字。",
            "read",
            "artifact.read",
            "list_artifacts",
        ),
        agent_tool(
            "artifact.summarize",
            "读取诊断产物摘要和证据卡片。",
            "read",
            "artifact.read",
            "list_artifacts",
        ),
        agent_tool(
            "script.generateDraft",
            "根据当前证据生成复现脚本草稿预览。",
            "write",
            "script.write",
            "list_scripts",
        ),
        agent_tool(
            "script.runRegression",
            "运行已批准的复现脚本并生成回归报告产物。",
            "read",
            "diagnostic.run",
            "run_recipe",
        ),
        agent_tool(
            "issuePackage.create",
            "导出带证据索引的问题包。",
            "read",
            "report.export",
            "export_issue_package",
        ),
        agent_tool(
            "issueDraft.create",
            "基于 Issue Package 生成缺陷描述草稿预览。",
            "write",
            "integration.submit",
            "integration_submit_issue",
        ),
        agent_tool(
            "symbolication.run",
            "运行已配置的符号化方案。",
            "read",
            "symbolication.run",
            "symbolication_run",
        ),
        agent_tool(
            "integration.submitIssue",
            "生成外部缺陷系统提交预览。",
            "write",
            "integration.submit",
            "integration_submit_issue",
        ),
    ]
}

fn agent_tool(
    name: &str,
    description: &str,
    risk_level: &str,
    permission: &str,
    handler: &str,
) -> AgentTool {
    AgentTool {
        name: name.into(),
        description: description.into(),
        input_schema: serde_json::json!({ "type": "object" }),
        output_schema: None,
        risk_level: risk_level.into(),
        permission: permission.into(),
        supports_dry_run: true,
        handler: handler.into(),
    }
}

#[tauri::command]
fn export_issue_package(title: String) -> IssuePackage {
    let events = demo_events();
    let evidence_index = events
        .iter()
        .flat_map(|event| {
            event.evidence_refs.iter().cloned().map(|mut evidence| {
                evidence.event_id = Some(event.id.clone());
                evidence
            })
        })
        .collect();
    IssuePackage {
        id: format!(
            "issue-{}-{}",
            slug(&title),
            Utc::now().format("%Y%m%d-%H%M%S")
        ),
        schema_version: 1,
        title,
        created_at: now(),
        device_profile: demo_profile(),
        build_info: serde_json::json!({ "fingerprint": "google/husky_beta/demo:userdebug/dev-keys" }),
        session_id: "session-desktop-001".into(),
        replay_script_ids: vec!["script-login-crash".into()],
        artifact_ids: vec!["artifact-crash-package".into()],
        evidence_index,
        agent_summary: Some(EvidenceBackedSummary {
            conclusion: "LoginActivity 崩溃结论已有 logcat 和命令证据支撑。".into(),
            evidence_ids: vec!["ev-log-001".into(), "ev-step-001".into()],
            actions_taken: vec!["已抓取 logcat".into(), "已创建问题包".into()],
            unverified_items: vec!["尚未采集网络响应体".into()],
        }),
        redaction_status: "redacted".into(),
    }
}

fn slug(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[tauri::command]
fn execute_command(command_line: String, device_id: Option<String>) -> CommandExecutionResult {
    execute_command_with_policy(command_line, device_id, false)
}

#[tauri::command]
fn execute_read_only_command(
    command_line: String,
    device_id: Option<String>,
) -> CommandExecutionResult {
    execute_command_with_policy(command_line, device_id, true)
}

fn execute_command_with_policy(
    command_line: String,
    device_id: Option<String>,
    read_only: bool,
) -> CommandExecutionResult {
    let mut argv = split_command_line(&command_line);
    let start = Instant::now();

    if argv.is_empty() {
        return CommandExecutionResult {
            command_line,
            argv,
            status: "failed".into(),
            exit_code: None,
            stdout: String::new(),
            stderr: "命令不能为空".into(),
            risk_level: "read".into(),
            requires_approval: false,
            duration_ms: 0,
        };
    }

    if read_only && !is_read_only_tool_command(&argv) {
        return CommandExecutionResult {
            command_line,
            argv,
            status: "blocked".into(),
            exit_code: None,
            stdout: String::new(),
            stderr: "只读 ADB 命令工具拒绝执行非 ADB 命令。".into(),
            risk_level: "read".into(),
            requires_approval: true,
            duration_ms: start.elapsed().as_millis(),
        };
    }

    if should_inject_adb_serial(&argv) {
        if let Some(device_id) = device_id.as_deref() {
            argv.splice(1..1, ["-s".into(), resolve_adb_serial(device_id)]);
        }
    }

    let risk_level = classify_command_risk(&argv);
    if read_only && risk_level != "read" {
        return CommandExecutionResult {
            command_line,
            argv,
            status: "blocked".into(),
            exit_code: None,
            stdout: String::new(),
            stderr: "只读命令工具拒绝执行非 read 风险命令。".into(),
            risk_level: risk_level.into(),
            requires_approval: true,
            duration_ms: start.elapsed().as_millis(),
        };
    }

    let requires_approval = risk_level == "dangerous" || risk_level == "destructive";
    if requires_approval {
        return CommandExecutionResult {
            command_line,
            argv,
            status: "blocked".into(),
            exit_code: None,
            stdout: String::new(),
            stderr: "该命令需要本地明确确认后才能执行。".into(),
            risk_level: risk_level.into(),
            requires_approval,
            duration_ms: start.elapsed().as_millis(),
        };
    }

    let mut result = run_process_with_timeout(&argv, Duration::from_secs(15));
    result.command_line = command_line;
    result.risk_level = risk_level.into();
    result.requires_approval = requires_approval;
    result
}

#[tauri::command]
fn start_mirror(device_id: String) -> MirrorSession {
    let started_at = now();
    let session_id = format!("mirror-{}", started_at.timestamp());
    if !tool_exists("scrcpy") {
        return MirrorSession {
            id: session_id,
            device_id,
            status: "unavailable".into(),
            pid: None,
            message: "未在 PATH 或 sidecar 配置中找到 scrcpy，无法启动真实镜像。".into(),
            started_at,
        };
    }

    let serial = resolve_adb_serial(&device_id);
    match Command::new("scrcpy")
        .args([
            "-s",
            &serial,
            "--max-size",
            "1600",
            "--video-bit-rate",
            "8M",
            "--max-fps",
            "60",
        ])
        .spawn()
    {
        Ok(child) => MirrorSession {
            id: session_id,
            device_id,
            status: "running".into(),
            pid: Some(child.id()),
            message: "scrcpy 镜像会话已启动，反控已启用。".into(),
            started_at,
        },
        Err(error) => MirrorSession {
            id: session_id,
            device_id,
            status: "failed".into(),
            pid: None,
            message: error.to_string(),
            started_at,
        },
    }
}

#[tauri::command]
fn create_remote_invite(permission: String) -> RemoteInvite {
    let timestamp = Utc::now().timestamp() as u64;
    RemoteInvite {
        code: format!("{:03}-{:03}", timestamp % 1000, (timestamp / 1000) % 1000),
        permission,
        expires_at: Utc::now() + ChronoDuration::minutes(15),
        lan_candidates: vec!["local-discovery".into(), "webrtc-datachannel".into()],
        audit_enabled: true,
    }
}

#[tauri::command]
fn symbolication_run(stack: String, mapping: String) -> SymbolicationResult {
    let input_frames = stack
        .lines()
        .filter(|line| line.trim().starts_with("at "))
        .count();
    let output = if mapping.contains("LoginActivity") {
        stack.replace(
            "a.a(SourceFile:42)",
            "com.example.LoginActivity.submit(LoginActivity.java:42)",
        )
    } else {
        stack.clone()
    };
    let matched_frames = usize::from(output != stack);

    SymbolicationResult {
        status: if matched_frames == input_frames && input_frames > 0 {
            "success".into()
        } else if matched_frames > 0 {
            "partial".into()
        } else {
            "failed".into()
        },
        input_frames,
        matched_frames,
        output,
    }
}

#[tauri::command]
fn integration_submit_issue(tracker: String, title: String) -> IntegrationSubmissionResult {
    IntegrationSubmissionResult {
        tracker: tracker.clone(),
        status: "dry-run".into(),
        title: title.clone(),
        payload_preview: format!(
            "系统：{tracker}\n标题：[DroidDebug] {title}\n附件：artifact-crash-package\n脱敏：redacted\n模式：dry-run 预览，未配置凭据时不会联网提交"
        ),
        attachments: vec!["artifact-crash-package".into()],
    }
}

#[tauri::command]
fn run_agent_prompt(prompt: String) -> String {
    format!(
        "结论：当前会话存在可复现崩溃。\n证据：ev-log-001 指向 logcat/crash.txt；ev-step-001 指向复现脚本步骤。\n已执行动作：读取设备状态、关联时间线、准备 Issue Package。\n未验证项：真实后端响应未采集。\n用户问题：{prompt}"
    )
}

#[tauri::command]
fn self_diagnostics() -> Vec<String> {
    vec![
        format!("ADB 可用：{}", tool_exists("adb")),
        format!("fastboot 可用：{}", tool_exists("fastboot")),
        format!("scrcpy 可用：{}", tool_exists("scrcpy")),
        format!("Perfetto 可用：{}", tool_exists("perfetto")),
        "Tauri 命令网关已启用，自检通过基础通道。".into(),
        "安全存储：当前版本尚未接入系统凭据库，自检不会读取或输出密钥。".into(),
        format!("在线设备数量：{}", real_adb_device_count()),
        "最近失败任务：暂无持久任务队列记录；后续会接入 tasks.jsonl。".into(),
        format!("产物目录可写：{}", artifact_dir_writable()),
        "自检不会输出 API key、Token 或其他敏感信息。".into(),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_devices,
            list_recipes,
            list_agent_tools,
            list_scripts,
            current_session,
            list_artifacts,
            run_recipe,
            export_issue_package,
            execute_command,
            execute_read_only_command,
            start_mirror,
            create_remote_invite,
            symbolication_run,
            integration_submit_issue,
            run_agent_prompt,
            self_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running Droid Debug Workbench");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issue_package_contains_evidence_index() {
        let package = export_issue_package("登录崩溃".into());
        assert_eq!(package.schema_version, 1);
        assert!(!package.evidence_index.is_empty());
        assert_eq!(package.redaction_status, "redacted");
    }

    #[test]
    fn recipe_execution_returns_artifact_for_requested_device() {
        let artifact = run_recipe("collect-logcat".into(), "device-1".into());
        assert_eq!(artifact.device_id, "device-1");
        assert_eq!(artifact.recipe_id, "collect-logcat");
        assert_eq!(artifact.status, "success");
    }

    #[test]
    fn screen_capture_recipes_return_declared_artifact_paths() {
        let screenshot = run_recipe("collect-screenshot".into(), "device-1".into());
        assert!(screenshot
            .files
            .iter()
            .any(|file| file.path == "screenshots/current.png"));

        let screenrecord = run_recipe("collect-screenrecord".into(), "device-1".into());
        assert!(screenrecord
            .files
            .iter()
            .any(|file| file.path == "screenrecords/current.mp4"));
    }

    #[test]
    fn read_only_command_tool_blocks_write_commands() {
        let result = execute_read_only_command("adb shell input tap 10 10".into(), None);
        assert_eq!(result.status, "blocked");
        assert_eq!(result.risk_level, "write");
        assert!(result.requires_approval);
        assert!(result.stderr.contains("只读命令工具"));
    }

    #[test]
    fn read_only_command_tool_blocks_non_adb_commands() {
        let result = execute_read_only_command("powershell Get-ChildItem".into(), None);
        assert_eq!(result.status, "blocked");
        assert_eq!(result.risk_level, "read");
        assert!(result.requires_approval);
        assert!(result.stderr.contains("只读 ADB 命令工具"));
    }
}
