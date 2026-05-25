import type { CommandRequest, RiskLevel } from './types';

const DESTRUCTIVE_PATTERNS = [
  ['shell', 'pm', 'clear'],
  ['shell', 'wipe'],
  ['shell', 'recovery', '--wipe_data'],
  ['fastboot', 'erase'],
  ['fastboot', 'flash'],
  ['uninstall'],
];

const DANGEROUS_PATTERNS = [
  ['reboot'],
  ['root'],
  ['remount'],
  ['shell', 'setprop'],
  ['install', '-d'],
  ['install', '--downgrade'],
];

const WRITE_PATTERNS = [
  ['install'],
  ['push'],
  ['shell', 'am'],
  ['shell', 'input'],
  ['shell', 'settings', 'put'],
  ['reverse'],
  ['forward'],
];

export function classifyCommandRisk(argv: string[]): RiskLevel {
  const normalized = argv.map((part) => part.toLowerCase());
  if (DESTRUCTIVE_PATTERNS.some((pattern) => containsPattern(normalized, pattern))) {
    return 'destructive';
  }
  if (DANGEROUS_PATTERNS.some((pattern) => containsPattern(normalized, pattern))) {
    return 'dangerous';
  }
  if (WRITE_PATTERNS.some((pattern) => containsPattern(normalized, pattern))) {
    return 'write';
  }
  return 'read';
}

export function createAdbCommandRequest(input: { deviceId?: string; argv: string[]; timeoutMs?: number; reason?: string }): CommandRequest {
  const riskLevel = classifyCommandRisk(input.argv);
  return {
    kind: 'adb',
    deviceId: input.deviceId,
    argv: input.deviceId ? ['-s', input.deviceId, ...input.argv] : input.argv,
    timeoutMs: input.timeoutMs,
    reason: input.reason,
    riskLevel,
    requiresApproval: riskLevel === 'dangerous' || riskLevel === 'destructive',
  };
}

function containsPattern(argv: string[], pattern: string[]): boolean {
  if (pattern.length === 1) {
    return argv.includes(pattern[0]);
  }
  return argv.some((_, index) => pattern.every((part, offset) => argv[index + offset] === part));
}
