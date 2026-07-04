export interface PlaceholderComparison {
  matches: boolean;
  missing: string[];
  extra: string[];
}

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\{\{[^}]+\}\}/g,
  /\{[a-zA-Z0-9_.-]+\}/g,
  /%\([^)]+\)[sdif]/g,
  /%[sdif]/g,
  /%\{[^}]+\}/g,
  /:[a-zA-Z_][a-zA-Z0-9_]*/g,
  /\$\{[^}]+\}/g,
  /\$[a-zA-Z_][a-zA-Z0-9_-]*(?:\s*\{\s*[^}]+\})?/g,
  /\{[a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*(?:plural|select|selectordinal|number|date|time|duration)\s*,\s*[^}]+)?\}/g,
  /\{[a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*(?:plural|select|selectordinal)\s*,\s*[^}]*offset\s*:\s*\d+[^}]*)\}/g
];

export function extractPlaceholders(value: string): Set<string> {
  const placeholders = new Set<string>();
  let masked = value;
  SCAN: for (const pattern of PLACEHOLDER_PATTERNS) {
    for (const match of masked.matchAll(pattern)) {
      const token = match[0];
      if (token.length > 500) continue;
      let skip = false;
      for (const existing of placeholders) {
        if (existing.includes(token) || token.includes(existing)) skip = true;
      }
      if (!skip) {
        placeholders.add(token);
        masked = masked.replaceAll(token, ' '.repeat(token.length));
      }
    }
  }
  return placeholders;
}

export function comparePlaceholders(sourceValue: string, targetValue: string): PlaceholderComparison {
  const source = extractPlaceholders(sourceValue);
  const target = extractPlaceholders(targetValue);
  const missing = [...source].filter((item) => !target.has(item)).sort();
  const extra = [...target].filter((item) => !source.has(item)).sort();
  return {
    matches: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}
