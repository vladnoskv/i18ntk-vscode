import { TextRange } from '../types';

export interface TranslationKeyMatch {
  key: string;
  start: number;
  end: number;
  range: TextRange;
}

const KEY_PATTERNS: { pattern: RegExp; keyIndex: number }[] = [
  { pattern: /\bi18n\.t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
  { pattern: /\bi18n\.t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  { pattern: /(?<![\w.])t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
  { pattern: /(?<![\w.])t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  { pattern: /\btranslate\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
  { pattern: /\btranslate\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  { pattern: /\$t\s*\(\s*`([^`]+)`/g, keyIndex: 1 },
  { pattern: /\$t\s*\(\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  { pattern: /i18nKey\s*=\s*{?['"`]([^'"`}]+)['"`]/g, keyIndex: 1 },
  { pattern: /t-key\s*=\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
  { pattern: /data-i18n\s*=\s*['"]([^'"]+)['"]/g, keyIndex: 1 },
];

export function findTranslationKeys(text: string): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  for (const { pattern, keyIndex } of KEY_PATTERNS) {
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
  return dedupe(matches).sort((a, b) => a.start - b.start);
}

export function detectTranslationKeysAt(text: string, offset: number): TranslationKeyMatch | undefined {
  return findTranslationKeys(text).find((match) => offset >= match.start && offset <= match.end);
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
