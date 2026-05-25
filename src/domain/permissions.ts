import type { Actor, RiskLevel } from './types';

interface ToolPolicyInput {
  actor: Actor;
  riskLevel: RiskLevel;
  permission: string;
}

interface ToolPolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export function evaluateToolPolicy(input: ToolPolicyInput): ToolPolicyResult {
  if (input.actor === 'remote-user' && input.riskLevel === 'destructive') {
    return {
      allowed: false,
      requiresApproval: true,
      reason: 'Remote users cannot run destructive tools by default.',
    };
  }

  if (input.actor === 'agent') {
    return {
      allowed: input.riskLevel !== 'destructive',
      requiresApproval: input.permission.startsWith('diagnostic.') || input.riskLevel !== 'read',
      reason: input.riskLevel === 'destructive' ? 'Agent destructive tools are disabled by default.' : undefined,
    };
  }

  if (input.riskLevel === 'dangerous' || input.riskLevel === 'destructive') {
    return {
      allowed: true,
      requiresApproval: true,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
  };
}
