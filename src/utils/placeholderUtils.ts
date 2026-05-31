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
  /\$\{[^}]+\}/g
];

export function extractPlaceholders(value: string): Set<string> {
  const placeholders = new Set<string>();
  let masked = value;
  for (const match of value.matchAll(PLACEHOLDER_PATTERNS[0])) {
    placeholders.add(match[0]);
    masked = masked.replace(match[0], ' '.repeat(match[0].length));
  }
  for (const pattern of PLACEHOLDER_PATTERNS.slice(1)) {
    for (const match of masked.matchAll(pattern)) {
      placeholders.add(match[0]);
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
