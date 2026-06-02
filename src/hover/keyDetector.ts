import { TextRange } from '../types';

export interface TranslationKeyMatch {
  key: string;
  dynamic?: boolean;
  resolvedKeys?: string[];
  start: number;
  end: number;
  range: TextRange;
}

type KeyFormat = 'dot' | 'snake';

const KNOWN_WRAPPERS = ['t', 'i18n.t', 'translate', '$t', 'tx', '__', '_t', '__t', 'i18n'];
const DEFAULT_COPY_FORMATTERS = ['copy', 'formatCopy', 'formatMessage', 'fmt'];
let copyFormatters = new Set(DEFAULT_COPY_FORMATTERS);

export function setCopyFormatters(names: string[]): void {
  copyFormatters = new Set(names);
}
const NAMESPACE_HELPERS = [
  'useTranslations',
  'getTranslations',
  'useTranslation',
  'useScopedI18n',
  'useI18n',
  'createTranslator',
  'createI18n'
];

export function findTranslationKeys(text: string, customWrappers: string[] = []): TranslationKeyMatch[] {
  const keyFormats: KeyFormat[] = ['dot', 'snake'];
  const matches: TranslationKeyMatch[] = [];
  const namespaces = findNamespaceBindings(text);
  const staticValues = findStaticRuntimeValues(text);
  const wrapperNames = [...new Set([...KNOWN_WRAPPERS, ...customWrappers, ...namespaces.keys()].filter(Boolean))];
  for (const name of wrapperNames) {
    matches.push(...findCallsForName(text, name, namespaces.get(name), keyFormats, staticValues, true));
  }
  for (const [name, namespace] of namespaces) {
    matches.push(...findRuntimeNamespaceCalls(text, name, namespace, staticValues));
  }
  for (const match of findAttributeKeys(text)) {
    matches.push(match);
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

function findCallsForName(
  text: string,
  name: string,
  namespace: string | undefined,
  keyFormats: KeyFormat[],
  staticValues: Map<string, string[]>,
  allowSingleSegment: boolean
): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  const pattern = new RegExp(`${callBoundaryForName(name)}${escapeRegExp(name)}\\s*\\(\\s*(['"\`])`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const quote = match[1];
    const contentStart = pattern.lastIndex;
    const contentEnd = findQuotedContentEnd(text, contentStart, quote);
    if (contentEnd === -1) break;
    const content = text.slice(contentStart, contentEnd);
    const key = parseKeyContent(content, quote, namespace, keyFormats, staticValues, allowSingleSegment);
    if (key) {
      const start = contentStart;
      const end = key.dynamic ? contentStart + content.indexOf('${') : contentEnd;
      matches.push({ ...key, start, end, range: rangeFromOffsets(text, start, end) });
    }
    pattern.lastIndex = contentEnd + 1;
  }
  return matches;
}

function findRuntimeNamespaceCalls(text: string, name: string, namespace: string, staticValues: Map<string, string[]>): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  const pattern = new RegExp(`${callBoundaryForName(name)}${escapeRegExp(name)}\\s*\\(\\s*([^\\s'"\`][^,)]*)`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const expression = match[1].trim();
    if (!expression || expression.startsWith('{') || expression.startsWith('[')) continue;
    const start = match.index + match[0].indexOf(expression);
    const end = start + expression.length;
    const resolvedKeys = resolveExpressionValues(expression, staticValues).map((value) => joinNamespace(namespace, value));
    const key = namespace.endsWith('.') || namespace.endsWith('_') ? namespace : `${namespace}.`;
    matches.push({
      key,
      dynamic: true,
      resolvedKeys: resolvedKeys.length ? resolvedKeys : undefined,
      start,
      end,
      range: rangeFromOffsets(text, start, end)
    });
  }
  return matches;
}

function parseKeyContent(
  content: string,
  quote: string,
  namespace: string | undefined,
  keyFormats: KeyFormat[],
  staticValues: Map<string, string[]>,
  allowSingleSegment: boolean
): Pick<TranslationKeyMatch, 'key' | 'dynamic' | 'resolvedKeys'> | undefined {
  const interpolationIndex = quote === '`' ? content.indexOf('${') : -1;
  if (interpolationIndex >= 0) {
    const prefix = content.slice(0, interpolationIndex);
    if (!prefix || !isLikelyKeyPrefix(prefix, keyFormats, allowSingleSegment)) return undefined;
    const resolvedKeys = resolveTemplateKeys(content, namespace, staticValues, keyFormats, allowSingleSegment);
    return {
      key: joinNamespace(namespace, prefix),
      dynamic: true,
      resolvedKeys: resolvedKeys.length ? resolvedKeys : undefined
    };
  }
  if (!isLikelyKey(content, keyFormats, allowSingleSegment || Boolean(namespace))) return undefined;
  return { key: joinNamespace(namespace, content), dynamic: false };
}

function findStaticRuntimeValues(text: string): Map<string, string[]> {
  const values = new Map<string, string[]>();
  const stringDeclaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`${}\\]*(?:\\.[^'"`${}\\]*)*)\2/g;
  let match: RegExpExecArray | null;
  while ((match = stringDeclaration.exec(text)) !== null) {
    values.set(match[1], [unescapeStringLiteral(match[3])]);
  }

  const arrayDeclaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]/g;
  while ((match = arrayDeclaration.exec(text)) !== null) {
    const entries = extractStringLiterals(match[2]);
    if (entries.length) values.set(match[1], entries);
  }

  const arrayIterator = /\b([A-Za-z_$][\w$]*)\s*\.\s*(?:map|forEach|filter|some|every)\s*\(\s*(?:async\s*)?\(?\s*([A-Za-z_$][\w$]*)/g;
  while ((match = arrayIterator.exec(text)) !== null) {
    const sourceValues = values.get(match[1]);
    if (sourceValues?.length) values.set(match[2], sourceValues);
  }
  return values;
}

function resolveTemplateKeys(
  content: string,
  namespace: string | undefined,
  staticValues: Map<string, string[]>,
  keyFormats: KeyFormat[],
  allowSingleSegment: boolean
): string[] {
  const parts: Array<string | string[]> = [];
  let cursor = 0;
  const interpolation = /\$\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = interpolation.exec(content)) !== null) {
    parts.push(content.slice(cursor, match.index));
    const values = resolveExpressionValues(match[1], staticValues);
    if (!values.length) return [];
    parts.push(values);
    cursor = match.index + match[0].length;
  }
  parts.push(content.slice(cursor));

  return [...new Set(expandTemplateParts(parts)
    .map((key) => joinNamespace(namespace, key))
    .filter((key) => isLikelyKey(key, keyFormats, allowSingleSegment || Boolean(namespace))))];
}

function resolveExpressionValues(expression: string, staticValues: Map<string, string[]>): string[] {
  const trimmed = expression.trim();
  const literal = /^(['"`])([^'"`${}\\]*(?:\\.[^'"`${}\\]*)*)\1$/.exec(trimmed);
  if (literal) return [unescapeStringLiteral(literal[2])];
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) return staticValues.get(trimmed) ?? [];
  return [];
}

function expandTemplateParts(parts: Array<string | string[]>): string[] {
  let results = [''];
  for (const part of parts) {
    const values = Array.isArray(part) ? part : [part];
    results = results.flatMap((prefix) => values.map((value) => `${prefix}${value}`));
  }
  return results;
}

function extractStringLiterals(value: string): string[] {
  const literals: string[] = [];
  const pattern = /(['"`])([^'"`${}\\]*(?:\\.[^'"`${}\\]*)*)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    literals.push(unescapeStringLiteral(match[2]));
  }
  return literals;
}

function unescapeStringLiteral(value: string): string {
  return value.replace(/\\(['"`\\])/g, '$1');
}

function findAttributeKeys(text: string): TranslationKeyMatch[] {
  const matches: TranslationKeyMatch[] = [];
  const patterns = [
    /i18nKey\s*=\s*{?['"`]([^'"`}]+)['"`]/g,
    /t-key\s*=\s*['"]([^'"]+)['"]/g,
    /data-i18n\s*=\s*['"]([^'"]+)['"]/g
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[1];
      const start = match.index + match[0].indexOf(key);
      const end = start + key.length;
      matches.push({ key, dynamic: false, start, end, range: rangeFromOffsets(text, start, end) });
    }
  }
  return matches;
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

export function findClientBoundaryLocaleImports(text: string): Array<{ importPath: string; message: string }> {
  const issues: Array<{ importPath: string; message: string }> = [];
  const isClient = /['"]use client['"]/.test(text) || /['"]use client['"]/.test(String(text || '').slice(0, 200));
  if (!isClient) return issues;
  const importPattern = /\bimport\s+\w+\s+from\s+['"]([^'"]+\.json)['"]/g;
  let match;
  while ((match = importPattern.exec(text)) !== null) {
    if (/\b(locales?|i18n|translations?)\b/i.test(match[1])) {
      issues.push({
        importPath: match[1],
        message: `"use client" file imports locale JSON (${match[1]}). This bypasses the translation runtime and increases client bundle size. Use a server bridge route instead.`,
      });
    }
  }
  return issues;
}

export function detectSuspectedCopyFormatters(text: string): Array<{ name: string; line: number; type: string; message: string }> {
  const formatters: Array<{ name: string; line: number; type: string; message: string }> = [];
  const declarationPattern = /\b(?:const|let|var)\s+(tx)\s*=\s*(?:useCallback\s*\(|useMemo\s*\(|\([^)]*\)\s*=>|function\s*\()/g;
  let match;
  while ((match = declarationPattern.exec(text)) !== null) {
    const afterEquals = text.slice(match.index + match[0].length, Math.min(match.index + match[0].length + 500, text.length));
    const callsTranslationRuntime = /\b(?:t|i18n\.t|\.getTranslation|translate)\s*\(/.test(afterEquals);
    if (!callsTranslationRuntime) {
      const before = text.slice(0, match.index);
      formatters.push({
        name: 'tx',
        line: before.split(/\r?\n/).length,
        type: 'suspectedCopyFormatter',
        message: `Local function "tx" does not call a known translation runtime and may be a copy formatter. Rename to "copy" or configure "copyFormatters" in .i18ntk-config to suppress.`,
      });
    }
  }
  return formatters;
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
      dynamic: false,
      resolvedKeys: [propertyPath],
      start,
      end,
      range: rangeFromOffsets(text, start, end)
    });
  }
  return matches;
}

function findNamespaceBindings(text: string): Map<string, string> {
  const bindings = new Map<string, string>();
  const helpers = NAMESPACE_HELPERS.map(escapeRegExp).join('|');
  const assignedHelper = new RegExp(`\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?(?:${helpers})\\s*\\(([^)]*)\\)`, 'g');
  let match: RegExpExecArray | null;
  while ((match = assignedHelper.exec(text)) !== null) {
    const namespace = extractNamespaceArgument(match[2]);
    if (namespace) bindings.set(match[1], namespace);
  }

  const destructuredHelper = new RegExp(`\\b(?:const|let|var)\\s*\\{\\s*(?:t\\s*:\\s*)?([A-Za-z_$][\\w$]*)\\s*\\}\\s*=\\s*(?:await\\s+)?(?:${helpers})\\s*\\(([^)]*)\\)`, 'g');
  while ((match = destructuredHelper.exec(text)) !== null) {
    const namespace = extractNamespaceArgument(match[2]);
    if (namespace) bindings.set(match[1], namespace);
  }
  return bindings;
}

function extractNamespaceArgument(args: string): string | undefined {
  const keyPrefix = /\bkeyPrefix\s*:\s*(['"`])([^'"`${}]+)\1/.exec(args);
  if (keyPrefix) return keyPrefix[2];
  const literal = /(['"`])([^'"`${}]+)\1/.exec(args);
  return literal?.[2];
}

function findQuotedContentEnd(text: string, start: number, quote: string): number {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === quote) return index;
  }
  return -1;
}

function callBoundaryForName(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? '(?<![\\w$.])' : '(?<![\\w$])';
}

function joinNamespace(namespace: string | undefined, key: string): string {
  if (!namespace) return key;
  if (!key) return namespace;
  if (namespace.endsWith('.') || namespace.endsWith('_')) return `${namespace}${key}`;
  if (namespace.includes('_') && !namespace.includes('.')) return `${namespace}_${key}`;
  return `${namespace}.${key}`;
}

function isLikelyKey(key: string, keyFormats: KeyFormat[], allowSingleSegment: boolean): boolean {
  if (!key || /\s/.test(key)) return false;
  if (allowSingleSegment && /^[A-Za-z][A-Za-z0-9-]*$/.test(key)) return true;
  if (keyFormats.includes('dot') && /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/.test(key)) return true;
  if (keyFormats.includes('snake') && /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z][A-Za-z0-9]*)+$/.test(key)) return true;
  return false;
}

function isLikelyKeyPrefix(prefix: string, keyFormats: KeyFormat[], allowSingleSegment: boolean): boolean {
  if (!prefix || /\s/.test(prefix)) return false;
  return isLikelyKey(prefix.replace(/[._-]$/, ''), keyFormats, allowSingleSegment);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
