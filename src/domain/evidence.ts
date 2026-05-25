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
    'log-line': 'Log line',
    'command-output': 'Command output',
    'trace-slice': 'Trace slice',
    screenshot: 'Screenshot',
    screenrecord: 'Screen recording',
    'script-step': 'Script step',
    'artifact-file': 'Artifact file',
  };
  return labels[type];
}
