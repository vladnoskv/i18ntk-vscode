import { TextRange } from '../types';

export interface TranslationKeyMatch {
  key: string;
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

const GENERIC_KEY_PATTERN = /\b[a-zA-Z_$][\w$]*\s*\(\s*(['"`])([a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+)\1/g;

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
  GENERIC_KEY_PATTERN.lastIndex = 0;
  let gMatch: RegExpExecArray | null;
  while ((gMatch = GENERIC_KEY_PATTERN.exec(text)) !== null) {
    const key = gMatch[2];
    if (/^(if|for|while|return|function|class|const|let|var|import|export|new|typeof|instanceof|delete|void|in|of|else|try|catch|throw)$/.test(key)) continue;
    const keyStart = gMatch.index + gMatch[0].indexOf(key);
    const keyEnd = keyStart + key.length;
    matches.push({
      key,
      start: keyStart,
      end: keyEnd,
      range: rangeFromOffsets(text, keyStart, keyEnd)
    });
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
