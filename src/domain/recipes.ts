import type { DebugRecipe, DeviceRef } from './types';

const outputPolicy = {
  rootDir: 'artifacts',
  zipByDefault: true,
  redactByDefault: true,
};

export const BUILTIN_RECIPES: DebugRecipe[] = [
  {
    id: 'collect-logcat',
    name: 'One-click Logcat',
    category: 'log',
    requiredCapabilities: ['logcat'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'logcat-all', type: 'logcat', label: 'Capture logcat -b all', output: 'logcat/all.txt' }],
  },
  {
    id: 'collect-bugreport',
    name: 'One-click Bugreport',
    category: 'log',
    requiredCapabilities: ['bugreport'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'bugreport', type: 'bugreport', label: 'Capture adb bugreport', output: 'bugreport/' }],
  },
  {
    id: 'collect-perfetto-trace',
    name: 'One-click Perfetto Trace',
    category: 'trace',
    requiredCapabilities: ['perfetto'],
    riskLevel: 'read',
    inputs: [{ id: 'durationSeconds', label: 'Duration', kind: 'number', defaultValue: 10 }],
    outputPolicy,
    steps: [{ id: 'perfetto', type: 'perfetto', label: 'Capture Perfetto trace', output: 'traces/main.perfetto-trace' }],
  },
  {
    id: 'collect-anr-package',
    name: 'ANR Package',
    category: 'anr',
    requiredCapabilities: ['logcat', 'bugreport', 'dumpsys', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'anr-logcat', type: 'logcat', label: 'Capture ANR logcat', output: 'logcat/anr.txt' },
      { id: 'anr-activity', type: 'dumpsys', label: 'Capture activity state', output: 'dumpsys/activity.txt' },
      { id: 'anr-window', type: 'dumpsys', label: 'Capture window state', output: 'dumpsys/window.txt' },
    ],
  },
  {
    id: 'collect-crash-package',
    name: 'Crash Package',
    category: 'crash',
    requiredCapabilities: ['logcat', 'bugreport', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'crash-logcat', type: 'logcat', label: 'Capture crash logcat', output: 'logcat/crash.txt' },
      { id: 'crash-bugreport', type: 'bugreport', label: 'Capture bugreport', output: 'bugreport/' },
      { id: 'crash-screenshot', type: 'captureScreenshot', label: 'Capture current screen', output: 'screenshots/current.png' },
    ],
  },
  {
    id: 'collect-performance-package',
    name: 'Performance Package',
    category: 'performance',
    requiredCapabilities: ['perfetto', 'dumpsys'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'perf-trace', type: 'perfetto', label: 'Capture performance trace', output: 'traces/performance.perfetto-trace' },
      { id: 'gfxinfo', type: 'dumpsys', label: 'Capture gfxinfo', output: 'dumpsys/gfxinfo.txt' },
    ],
  },
  {
    id: 'collect-power-package',
    name: 'Power Package',
    category: 'power',
    requiredCapabilities: ['dumpsys'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'batterystats', type: 'dumpsys', label: 'Capture batterystats', output: 'dumpsys/batterystats.txt' }],
  },
  {
    id: 'collect-graphics-package',
    name: 'Graphics Package',
    category: 'graphics',
    requiredCapabilities: ['dumpsys', 'perfetto'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'surfaceflinger', type: 'dumpsys', label: 'Capture SurfaceFlinger', output: 'dumpsys/surfaceflinger.txt' },
      { id: 'graphics-trace', type: 'perfetto', label: 'Capture graphics trace', output: 'traces/graphics.perfetto-trace' },
    ],
  },
  {
    id: 'collect-issue-package',
    name: 'Issue Package',
    category: 'custom',
    requiredCapabilities: ['logcat', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'issue-correlate', type: 'correlateTimeline', label: 'Correlate session timeline' },
      { id: 'issue-create', type: 'createIssuePackage', label: 'Create issue package', output: 'issue-package.zip' },
    ],
  },
  {
    id: 'collect-regression-report',
    name: 'Regression Report',
    category: 'custom',
    requiredCapabilities: ['adb', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'regression', type: 'runRegression', label: 'Run replay script as regression' }],
  },
];

export function isRecipeAllowedForDevice(recipe: DebugRecipe, device: DeviceRef): { allowed: boolean; missingCapabilities: string[] } {
  const deviceCapabilities = new Set(device.capabilities);
  const missingCapabilities = recipe.requiredCapabilities.filter((capability) => !deviceCapabilities.has(capability));
  return {
    allowed: missingCapabilities.length === 0,
    missingCapabilities,
  };
}
