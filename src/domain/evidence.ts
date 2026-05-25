import type { EvidenceRef, SessionEvent } from './types';

export function timelineFromEvents(events: SessionEvent[]): SessionEvent[] {
  return [...events].sort((left, right) => {
    const byTime = Date.parse(left.timestamp) - Date.parse(right.timestamp);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
}

export function createEvidenceIndex(events: SessionEvent[]): EvidenceRef[] {
  return events.flatMap((event) =>
    event.evidenceRefs.map((evidence) => ({
      ...evidence,
      eventId: event.id,
    })),
  );
}

export function summarizeEvidenceType(type: EvidenceRef['type']): string {
  const labels: Record<EvidenceRef['type'], string> = {
    'log-line': '日志行',
    'command-output': '命令输出',
    'trace-slice': 'Trace 片段',
    screenshot: '截图',
    screenrecord: '录屏',
    'script-step': '脚本步骤',
    'artifact-file': '产物文件',
  };
  return labels[type];
}
