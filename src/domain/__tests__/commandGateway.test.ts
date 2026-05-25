import { describe, expect, it } from 'vitest';
import { classifyCommandRisk, createAdbCommandRequest } from '../commandGateway';

describe('command gateway', () => {
  it('classifies read, write, dangerous, and destructive adb commands', () => {
    expect(classifyCommandRisk(['shell', 'getprop'])).toBe('read');
    expect(classifyCommandRisk(['install', 'app.apk'])).toBe('write');
    expect(classifyCommandRisk(['reboot', 'bootloader'])).toBe('dangerous');
    expect(classifyCommandRisk(['shell', 'pm', 'clear', 'com.example'])).toBe('destructive');
    expect(classifyCommandRisk(['shell', 'wipe', 'data'])).toBe('destructive');
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
});
