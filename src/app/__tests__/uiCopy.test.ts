import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Chinese desktop UI copy', () => {
  it('uses Chinese labels for the primary workbench surfaces', () => {
    const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
    for (const label of ['设备', '镜像', '终端', '诊断', '脚本', '会话', '远程', '设置']) {
      expect(source).toContain(label);
    }
  });

  it('does not leave the old English primary labels in the visible UI', () => {
    const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
    for (const label of ['Device Hub', 'Mirror Hub', 'Terminal Hub', 'Diagnostic Hub', 'Ask Agent', 'Create Invite']) {
      expect(source).not.toContain(label);
    }
  });
});
