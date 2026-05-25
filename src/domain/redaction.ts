const DEFAULT_RULES: Array<[RegExp, string]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]'],
  [/\+?\d[\d\s().-]{7,}\d/g, '[PHONE]'],
  [/(Authorization:\s*Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[TOKEN]'],
  [/(token["'=:\s]+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[TOKEN]'],
  [/(ssid=)"[^"]*"/gi, '$1"[SSID]"'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]'],
];

export function redactText(input: string, rules = DEFAULT_RULES): string {
  return rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input);
}
