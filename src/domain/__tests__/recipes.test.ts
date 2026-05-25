import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES, isRecipeAllowedForDevice } from '../recipes';
import type { DeviceRef } from '../types';

describe('debug recipes', () => {
  const device: DeviceRef = {
    id: 'device-1',
    serial: 'ABC123',
    transport: 'adb-usb',
    state: 'device',
    model: 'Pixel Dev',
    rootState: 'adb-root',
    capabilities: ['adb', 'logcat', 'bugreport', 'perfetto', 'screenshot'],
    lastSeenAt: '2026-05-25T10:00:00.000Z',
  };

  it('contains the core built-in diagnostic and report recipes', () => {
    expect(BUILTIN_RECIPES.map((recipe) => recipe.id)).toEqual(
      expect.arrayContaining([
        'collect-logcat',
        'collect-bugreport',
        'collect-perfetto-trace',
        'collect-screenshot',
        'collect-screenrecord',
        'collect-issue-package',
        'collect-regression-report',
      ]),
    );
  });

  it('checks recipe availability against device capabilities before execution', () => {
    expect(isRecipeAllowedForDevice(BUILTIN_RECIPES.find((recipe) => recipe.id === 'collect-logcat')!, device)).toEqual({
      allowed: true,
      missingCapabilities: [],
    });

    expect(
      isRecipeAllowedForDevice(BUILTIN_RECIPES.find((recipe) => recipe.id === 'collect-perfetto-trace')!, {
        ...device,
        capabilities: ['adb', 'logcat'],
      }),
    ).toEqual({
      allowed: false,
      missingCapabilities: ['perfetto'],
    });

    expect(
      isRecipeAllowedForDevice(BUILTIN_RECIPES.find((recipe) => recipe.id === 'collect-screenrecord')!, {
        ...device,
        capabilities: ['adb', 'screenshot'],
      }),
    ).toEqual({
      allowed: false,
      missingCapabilities: ['screenrecord'],
    });
  });
});
