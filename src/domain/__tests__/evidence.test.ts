import { describe, expect, it } from 'vitest';
import { createEvidenceIndex, timelineFromEvents } from '../evidence';
import type { SessionEvent } from '../types';

describe('evidence model', () => {
  it('orders debug session events by timestamp and preserves evidence references', () => {
    const events: SessionEvent[] = [
      {
        id: 'evt-2',
        timestamp: '2026-05-25T10:00:02.000Z',
        kind: 'log-event',
        source: 'system',
        title: 'Fatal exception',
        evidenceRefs: [{ id: 'ev-log', type: 'log-line', filePath: 'logcat/all.txt', lineRange: [42, 45] }],
      },
      {
        id: 'evt-1',
        timestamp: '2026-05-25T10:00:01.000Z',
        kind: 'user-action',
        source: 'local-user',
        title: 'Tap login',
        evidenceRefs: [{ id: 'ev-step', type: 'script-step', description: 'tap login button' }],
      },
    ];

    const timeline = timelineFromEvents(events);

    expect(timeline.map((event) => event.id)).toEqual(['evt-1', 'evt-2']);
    expect(createEvidenceIndex(timeline)).toEqual([
      { id: 'ev-step', type: 'script-step', description: 'tap login button', eventId: 'evt-1' },
      { id: 'ev-log', type: 'log-line', filePath: 'logcat/all.txt', lineRange: [42, 45], eventId: 'evt-2' },
    ]);
  });
});
