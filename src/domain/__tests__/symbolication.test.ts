import { describe, expect, it } from 'vitest';
import { deobfuscateJavaStack } from '../symbolication';

describe('symbolication', () => {
  it('deobfuscates Java stack traces from simple R8 mapping entries', () => {
    const mapping = `com.example.LoginRepository -> a.b:
    42:42:void submit():12:12 -> a
com.example.LoginActivity -> c.d:
    10:10:void onClick(android.view.View):40:40 -> b
`;
    const stack = `java.lang.NullPointerException
  at a.b.a(SourceFile:42)
  at c.d.b(SourceFile:10)`;

    expect(deobfuscateJavaStack(stack, mapping)).toContain('at com.example.LoginRepository.submit(LoginRepository.java:12)');
    expect(deobfuscateJavaStack(stack, mapping)).toContain('at com.example.LoginActivity.onClick(LoginActivity.java:40)');
  });
});
