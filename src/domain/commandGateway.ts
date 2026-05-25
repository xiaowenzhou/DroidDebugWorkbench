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
  if (isFastbootDestructive(normalized)) {
    return 'destructive';
  }

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

function isFastbootDestructive(argv: string[]): boolean {
  return argv[0] === 'fastboot' && argv.some((part) => part === 'flash' || part === 'erase');
}

export function parseCommandLine(commandLine: string): string[] {
  const argv: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  const source = commandLine.trim();

  for (let index = 0; index < source.length; index += 1) {
    const ch = source[index];
    const next = source[index + 1];

    if (ch === '\\' && quote && next === quote) {
      current += next;
      index += 1;
      continue;
    }

    if ((ch === '"' || ch === "'") && !quote) {
      quote = ch;
      continue;
    }

    if (ch === quote) {
      quote = undefined;
      continue;
    }

    if (/\s/.test(ch) && !quote) {
      if (current) {
        argv.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    argv.push(current);
  }

  return argv;
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
