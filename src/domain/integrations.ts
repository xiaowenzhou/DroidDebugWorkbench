import type { IssuePackage } from './types';

export type IssueTracker = 'jira' | 'zentao' | 'tapd' | 'github' | 'gitlab';

export interface IssueSubmissionPayload {
  tracker: IssueTracker;
  title: string;
  description: string;
  attachments: string[];
  evidenceIds: string[];
  redactionStatus: IssuePackage['redactionStatus'];
}

export function buildIssueSubmissionPayload(input: { tracker: IssueTracker; issuePackage: IssuePackage }): IssueSubmissionPayload {
  const summary = input.issuePackage.agentSummary;
  const evidenceIds = summary?.evidenceIds ?? input.issuePackage.evidenceIndex.map((evidence) => evidence.id);

  return {
    tracker: input.tracker,
    title: `[DroidDebug] ${input.issuePackage.title}`,
    description: [
      `Issue Package: ${input.issuePackage.id}`,
      `Session: ${input.issuePackage.sessionId}`,
      `Redaction: ${input.issuePackage.redactionStatus}`,
      '',
      'Conclusion:',
      summary?.conclusion ?? 'No Agent summary is attached.',
      '',
      'Evidence:',
      evidenceIds.map((id) => `- ${id}`).join('\n'),
      '',
      'Unverified:',
      (summary?.unverifiedItems ?? []).map((item) => `- ${item}`).join('\n') || '- none recorded',
    ].join('\n'),
    attachments: input.issuePackage.artifactIds,
    evidenceIds,
    redactionStatus: input.issuePackage.redactionStatus,
  };
}
