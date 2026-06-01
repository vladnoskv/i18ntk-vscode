import { TextRange } from '../types';

export interface TranslationKeyMatch {
  key: string;
  resolvedKeys?: string[];
  start: number;
  end: number;
  range: TextRange;
}

function buildPatterns(customWrappers: string[]): { pattern: RegExp; keyIndex: number }[] {
  const staticPatterns: { pattern: RegExp; keyIndex: number }[] = [
    { pattern: /\bi18n\.t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\bi18n\.t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /(?<![\w.])t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /(?<![\w.])t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\btranslate\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\btranslate\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\$t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\$t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\btx\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\btx\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\b__\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\b__\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\b_t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\b_t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\b__t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\b__t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /\bi18n\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
    { pattern: /\bi18n\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /i18nKey\s*=\s*{?['"`]([^'"`}]+)['"`]/g, keyIndex: 1 },
    { pattern: /t-key\s*=\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
    { pattern: /data-i18n\s*=\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  ];
  for (const name of customWrappers) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    staticPatterns.push(
      { pattern: new RegExp(`\\b${escaped}\\s*\\(\\s*\x60([^\x60]+)\x60`, 'g'), keyIndex: 1 },
      { pattern: new RegExp(`\\b${escaped}\\s*\\(\\s*['"]([^'"]+)['"]`, 'g'), keyIndex: 1 },
    );
  }
  return staticPatterns;
}

export function findTranslationKeys(text: string, customWrappers: string[] = []): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  const patterns = buildPatterns(customWrappers);
  for (const { pattern, keyIndex } of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[keyIndex];
      const keyStart = match.index + match[0].indexOf(key);
      const keyEnd = keyStart + key.length;
      matches.push({
        key,
        start: keyStart,
        end: keyEnd,
        range: rangeFromOffsets(text, keyStart, keyEnd)
      });
    }
  }
  for (const [name, namespace] of findImportedLocaleObjects(text)) {
    matches.push(...findImportedLocaleObjectReads(text, name, namespace));
  }
  return dedupe(matches).sort((a, b) => a.start - b.start);
}

export function detectTranslationKeysAt(text: string, offset: number, customWrappers: string[] = []): TranslationKeyMatch | undefined {
  return findTranslationKeys(text, customWrappers).find((match) => offset >= match.start && offset <= match.end);
}

export function rangeFromOffsets(text: string, start: number, end: number): TextRange {
  const startPos = positionAt(text, start);
  const endPos = positionAt(text, end);
  return {
    startLine: startPos.line,
    startCharacter: startPos.character,
    endLine: endPos.line,
    endCharacter: endPos.character
  };
}

function positionAt(text: string, offset: number): { line: number; character: number } {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length
  };
}

function dedupe(matches: TranslationKeyMatch[]): TranslationKeyMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const id = `${match.start}:${match.end}:${match.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function findImportedLocaleObjects(text: string): Map<string, string> {
  const imports = new Map<string, string>();
  const importPattern = /\bimport\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(text)) !== null) {
    const namespace = namespaceFromImport(match[1], match[2]);
    if (namespace) imports.set(match[1], namespace);
  }

  const requirePattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requirePattern.exec(text)) !== null) {
    const namespace = namespaceFromImport(match[1], match[2]);
    if (namespace) imports.set(match[1], namespace);
  }
  return imports;
}

function namespaceFromImport(localName: string, specifier: string): string | undefined {
  const normalized = specifier.replace(/\\/g, '/');
  if (!/\.json($|\?)/.test(normalized) && !/(^|\/)(locales|locale|i18n|translations)(\/|$)/i.test(normalized)) return undefined;
  return normalized.split('/').pop()?.replace(/\.json(?:\?.*)?$/, '') || localName;
}

function findImportedLocaleObjectReads(text: string, name: string, namespace: string): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  const pattern = new RegExp(`(?<![\\w$'"./-])${escapeRegExp(name)}\\.([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const propertyPath = match[1];
    const start = match.index;
    const end = start + match[0].length;
    matches.push({
      key: `${namespace}.${propertyPath}`,
      resolvedKeys: [propertyPath],
      start,
      end,
      range: rangeFromOffsets(text, start, end)
    });
  }
  return matches;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
