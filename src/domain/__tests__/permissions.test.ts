import { describe, expect, it } from 'vitest';
import { evaluateToolPolicy } from '../permissions';

describe('tool permission policy', () => {
  it('allows local read tools and requires approval for agent diagnostics', () => {
    expect(evaluateToolPolicy({ actor: 'local-user', riskLevel: 'read', permission: 'device.read' })).toMatchObject({
      allowed: true,
      requiresApproval: false,
    });

    expect(evaluateToolPolicy({ actor: 'agent', riskLevel: 'read', permission: 'diagnostic.run' })).toMatchObject({
      allowed: true,
      requiresApproval: true,
    });
  });

  it('blocks destructive remote actions by default', () => {
    expect(evaluateToolPolicy({ actor: 'remote-user', riskLevel: 'destructive', permission: 'fastboot.flash' })).toEqual({
      allowed: false,
      requiresApproval: true,
      reason: 'Remote users cannot run destructive tools by default.',
    });
  });
});
