import type { DebugRecipe, DeviceRef } from './types';

const outputPolicy = {
  rootDir: 'artifacts',
  zipByDefault: true,
  redactByDefault: true,
};

export const BUILTIN_RECIPES: DebugRecipe[] = [
  {
    id: 'collect-logcat',
    name: '一键 Logcat',
    category: 'log',
    requiredCapabilities: ['logcat'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'logcat-all', type: 'logcat', label: '抓取全部 logcat buffer', output: 'logcat/all.txt' }],
  },
  {
    id: 'collect-bugreport',
    name: '一键 Bugreport',
    category: 'log',
    requiredCapabilities: ['bugreport'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'bugreport', type: 'bugreport', label: '抓取 adb bugreport', output: 'bugreport/' }],
  },
  {
    id: 'collect-perfetto-trace',
    name: '一键 Perfetto Trace',
    category: 'trace',
    requiredCapabilities: ['perfetto'],
    riskLevel: 'read',
    inputs: [{ id: 'durationSeconds', label: '抓取时长', kind: 'number', defaultValue: 10 }],
    outputPolicy,
    steps: [{ id: 'perfetto', type: 'perfetto', label: '抓取 Perfetto trace', output: 'traces/main.perfetto-trace' }],
  },
  {
    id: 'collect-screenshot',
    name: '一键截图',
    category: 'screen',
    requiredCapabilities: ['screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'screenshot-current', type: 'captureScreenshot', label: '截取当前画面', output: 'screenshots/current.png' }],
  },
  {
    id: 'collect-screenrecord',
    name: '一键录屏',
    category: 'screen',
    requiredCapabilities: ['screenrecord'],
    riskLevel: 'read',
    inputs: [{ id: 'durationSeconds', label: '录制时长', kind: 'number', defaultValue: 10 }],
    outputPolicy,
    steps: [{ id: 'screenrecord-current', type: 'recordScreen', label: '录制当前画面', output: 'screenrecords/current.mp4' }],
  },
  {
    id: 'collect-anr-package',
    name: 'ANR 诊断包',
    category: 'anr',
    requiredCapabilities: ['logcat', 'bugreport', 'dumpsys', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'anr-logcat', type: 'logcat', label: '抓取 ANR logcat', output: 'logcat/anr.txt' },
      { id: 'anr-activity', type: 'dumpsys', label: '抓取 Activity 状态', output: 'dumpsys/activity.txt' },
      { id: 'anr-window', type: 'dumpsys', label: '抓取 Window 状态', output: 'dumpsys/window.txt' },
    ],
  },
  {
    id: 'collect-crash-package',
    name: '崩溃诊断包',
    category: 'crash',
    requiredCapabilities: ['logcat', 'bugreport', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'crash-logcat', type: 'logcat', label: '抓取崩溃 logcat', output: 'logcat/crash.txt' },
      { id: 'crash-bugreport', type: 'bugreport', label: '抓取 bugreport', output: 'bugreport/' },
      { id: 'crash-screenshot', type: 'captureScreenshot', label: '截取当前画面', output: 'screenshots/current.png' },
    ],
  },
  {
    id: 'collect-performance-package',
    name: '性能诊断包',
    category: 'performance',
    requiredCapabilities: ['perfetto', 'dumpsys'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'perf-trace', type: 'perfetto', label: '抓取性能 trace', output: 'traces/performance.perfetto-trace' },
      { id: 'gfxinfo', type: 'dumpsys', label: '抓取 gfxinfo', output: 'dumpsys/gfxinfo.txt' },
    ],
  },
  {
    id: 'collect-power-package',
    name: '功耗诊断包',
    category: 'power',
    requiredCapabilities: ['dumpsys'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'batterystats', type: 'dumpsys', label: '抓取 batterystats', output: 'dumpsys/batterystats.txt' }],
  },
  {
    id: 'collect-graphics-package',
    name: '图形诊断包',
    category: 'graphics',
    requiredCapabilities: ['dumpsys', 'perfetto'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'surfaceflinger', type: 'dumpsys', label: '抓取 SurfaceFlinger', output: 'dumpsys/surfaceflinger.txt' },
      { id: 'graphics-trace', type: 'perfetto', label: '抓取图形 trace', output: 'traces/graphics.perfetto-trace' },
    ],
  },
  {
    id: 'collect-issue-package',
    name: '问题复现包',
    category: 'custom',
    requiredCapabilities: ['logcat', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [
      { id: 'issue-correlate', type: 'correlateTimeline', label: '关联会话时间线' },
      { id: 'issue-create', type: 'createIssuePackage', label: '生成问题复现包', output: 'issue-package.zip' },
    ],
  },
  {
    id: 'collect-regression-report',
    name: '回归报告',
    category: 'custom',
    requiredCapabilities: ['adb', 'screenshot'],
    riskLevel: 'read',
    inputs: [],
    outputPolicy,
    steps: [{ id: 'regression', type: 'runRegression', label: '按回放脚本执行回归' }],
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
