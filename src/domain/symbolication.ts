interface MethodMapping {
  obfuscatedClass: string;
  originalClass: string;
  obfuscatedMethod: string;
  originalMethod: string;
  originalLine: number;
}

export function deobfuscateJavaStack(stack: string, mapping: string): string {
  const methodMappings = parseR8Mapping(mapping);
  return stack.replace(/at\s+([A-Za-z0-9_.$]+)\.([A-Za-z0-9_$<>]+)\(SourceFile:(\d+)\)/g, (line, obfuscatedClass, obfuscatedMethod, sourceLine) => {
    const match = methodMappings.find(
      (entry) =>
        entry.obfuscatedClass === obfuscatedClass &&
        entry.obfuscatedMethod === obfuscatedMethod &&
        Number(sourceLine) >= 0,
    );

    if (!match) {
      return line;
    }

    const simpleClassName = match.originalClass.split('.').at(-1) ?? match.originalClass;
    return `at ${match.originalClass}.${match.originalMethod}(${simpleClassName}.java:${match.originalLine})`;
  });
}

function parseR8Mapping(mapping: string): MethodMapping[] {
  const entries: MethodMapping[] = [];
  let originalClass = '';
  let obfuscatedClass = '';

  for (const rawLine of mapping.split(/\r?\n/)) {
    const classMatch = rawLine.match(/^(\S+) -> (\S+):$/);
    if (classMatch) {
      originalClass = classMatch[1];
      obfuscatedClass = classMatch[2];
      continue;
    }

    const methodMatch = rawLine.trim().match(/^(?:\d+:\d+:)?(?:[\w.$<>\[\]]+\s+)+([A-Za-z0-9_$<>]+)\([^)]*\):(\d+):\d+ -> ([A-Za-z0-9_$<>]+)$/);
    if (methodMatch && originalClass && obfuscatedClass) {
      entries.push({
        originalClass,
        obfuscatedClass,
        originalMethod: methodMatch[1],
        originalLine: Number(methodMatch[2]),
        obfuscatedMethod: methodMatch[3],
      });
    }
  }

  return entries;
}
