import { describe, expect, it } from 'vitest';
import { classifyCommandRisk, createAdbCommandRequest, parseCommandLine } from '../commandGateway';

describe('command gateway', () => {
  it('classifies read, write, dangerous, and destructive adb commands', () => {
    expect(classifyCommandRisk(['shell', 'getprop'])).toBe('read');
    expect(classifyCommandRisk(['install', 'app.apk'])).toBe('write');
    expect(classifyCommandRisk(['reboot', 'bootloader'])).toBe('dangerous');
    expect(classifyCommandRisk(['shell', 'pm', 'clear', 'com.example'])).toBe('destructive');
    expect(classifyCommandRisk(['shell', 'wipe', 'data'])).toBe('destructive');
    expect(classifyCommandRisk(['fastboot', '-s', 'ABC123', 'flash', 'boot', 'boot.img'])).toBe('destructive');
    expect(classifyCommandRisk(['fastboot', '--slot', 'all', 'erase', 'userdata'])).toBe('destructive');
  });

  it('creates approval-aware adb command requests', () => {
    expect(createAdbCommandRequest({ deviceId: 'device-1', argv: ['shell', 'getprop'] })).toMatchObject({
      kind: 'adb',
      deviceId: 'device-1',
      argv: ['-s', 'device-1', 'shell', 'getprop'],
      riskLevel: 'read',
      requiresApproval: false,
    });

    expect(createAdbCommandRequest({ deviceId: 'device-1', argv: ['shell', 'pm', 'clear', 'com.example'] })).toMatchObject({
      riskLevel: 'destructive',
      requiresApproval: true,
    });
  });

  it('parses quoted terminal command lines before risk classification', () => {
    expect(parseCommandLine('adb shell am start -n "com.example/.Login Activity"')).toEqual([
      'adb',
      'shell',
      'am',
      'start',
      '-n',
      'com.example/.Login Activity',
    ]);

    expect(parseCommandLine('adb shell setprop persist.demo "hello world"')).toEqual([
      'adb',
      'shell',
      'setprop',
      'persist.demo',
      'hello world',
    ]);
  });

  it('preserves Windows paths while still allowing escaped quotes', () => {
    expect(parseCommandLine('adb install C:\\tmp\\debug app\\demo.apk')).toEqual(['adb', 'install', 'C:\\tmp\\debug', 'app\\demo.apk']);
    expect(parseCommandLine('adb shell input text "hello \\"debug\\" user"')).toEqual(['adb', 'shell', 'input', 'text', 'hello "debug" user']);
  });
});
