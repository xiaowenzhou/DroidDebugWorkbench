import { createEvidenceIndex, timelineFromEvents } from './evidence';
import type { DebugSession, DeviceCapabilityProfile, IssuePackage } from './types';

interface CreateIssuePackageManifestInput {
  title: string;
  createdAt: string;
  deviceProfile: DeviceCapabilityProfile;
  buildInfo: Record<string, string>;
  session: DebugSession;
  replayScriptIds: string[];
  artifactIds: string[];
  redactionStatus: IssuePackage['redactionStatus'];
}

export function createIssuePackageManifest(input: CreateIssuePackageManifestInput): IssuePackage {
  const timeline = timelineFromEvents(input.session.events);
  return {
    id: `issue-${slugify(input.title)}-${formatManifestTimestamp(input.createdAt)}`,
    schemaVersion: 1,
    title: input.title,
    createdAt: input.createdAt,
    deviceProfile: input.deviceProfile,
    buildInfo: input.buildInfo,
    sessionId: input.session.id,
    replayScriptIds: input.replayScriptIds,
    artifactIds: input.artifactIds,
    evidenceIndex: createEvidenceIndex(timeline),
    redactionStatus: input.redactionStatus,
  };
}

export function issuePackageDirectoryName(issuePackage: Pick<IssuePackage, 'id' | 'title'>): string {
  return `${issuePackage.id}-${slugify(issuePackage.title)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function formatManifestTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes(),
  )}${pad(date.getUTCSeconds())}`;
}
