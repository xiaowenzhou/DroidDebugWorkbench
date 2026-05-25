import { describe, expect, it } from 'vitest';
import { redactText } from '../redaction';

describe('log redaction', () => {
  it('redacts common sensitive values while preserving diagnostic structure', () => {
    const input = [
      'User email test@example.com called phone +1 415 555 0101',
      'Authorization: Bearer abc.def.ghi',
      'ssid="OfficeLab"',
      'crash remains visible',
    ].join('\n');

    expect(redactText(input)).toContain('[EMAIL]');
    expect(redactText(input)).toContain('[PHONE]');
    expect(redactText(input)).toContain('Authorization: Bearer [TOKEN]');
    expect(redactText(input)).toContain('ssid="[SSID]"');
    expect(redactText(input)).toContain('crash remains visible');
  });
});
