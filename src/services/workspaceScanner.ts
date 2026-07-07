import fs from 'node:fs';
import path from 'node:path';
import { findTranslationKeys, findClientBoundaryLocaleImports, detectSuspectedCopyFormatters } from '../hover/keyDetector';

function normalizeWithinRoot(root: string, ...segments: string[]): string {
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.resolve(root, path.basename(segments[segments.length - 1] || ''));
  }
  return resolved;
}
import { comparePlaceholders } from '../utils/placeholderUtils';
import { findFiles } from '../utils/fsUtils';
import {
  ClientBoundaryIssue,
  CopyFormatterIssue,
  ExpansionRiskIssue,
  I18nScanResult,
  InvalidKeyNameIssue,
  MissingKeyIssue,
  ResolvedI18ntkConfig,
  RiskyContentIssue,
  TextRange,
  TranslationKeyUsage,
  UnusedKeyIssue
} from '../types';
import { LocaleFileService } from './localeFileService';
import { Logger } from './logger';

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', '.cjs', '.cts', '.vue', '.svelte', '.astro', '.mdx', '.html', '.rs', '.py', '.pyx', '.pyi', '.go', '.rb', '.java', '.php', '.hbs']);
const MAX_SOURCE_USAGE_SCAN_BYTES = 2 * 1024 * 1024;
const MAX_KNOWN_KEY_LITERAL_SCAN_BYTES = 512 * 1024;

function throwIfCancelled(token?: { isCancellationRequested: boolean }): void {
  if (token?.isCancellationRequested) {
    try {
      const vscode = require('vscode');
      throw new vscode.CancellationError();
    } catch (e: any) {
      if (e?.name === 'CancellationError' || String(e?.code) === 'ERR_MODULE_NOT_FOUND') {
        throw new Error('Operation cancelled');
      }
      throw e;
    }
  }
}

export class WorkspaceScanner {
  private readonly localeFiles = new LocaleFileService();

  constructor(private readonly logger: Logger) {}

  async scan(rootPath: string, config: ResolvedI18ntkConfig, token?: { isCancellationRequested: boolean }): Promise<I18nScanResult> {
    const localeFiles = await this.localeFiles.discover(config);
    if (token?.isCancellationRequested) throwIfCancelled(token);
    const locales = [...new Set(localeFiles.map((file) => file.locale))].sort();
    const keyValues: Record<string, Record<string, string>> = {};

    for (const file of localeFiles) {
      keyValues[file.locale] = { ...(keyValues[file.locale] ?? {}), ...file.values };
    }

    const sourceValues = keyValues[config.sourceLocale] ?? {};
    const sourceFiles = await findFiles(rootPath, SOURCE_EXTENSIONS, config.exclude, config.maxScanFiles);
    throwIfCancelled(token);
    const sourceUsages = await this.scanSourceUsages(sourceFiles, config.customWrappers, keyValues, locales, token);
    throwIfCancelled(token);

    const clientBoundaryIssues: Array<{ filePath: string; importPath: string; message: string }> = [];
    const copyFormatters: Array<{ filePath: string; name: string; line: number; type: string; message: string }> = [];
    for (const filePath of sourceFiles) {
      let content = '';
      try { content = await fs.promises.readFile(filePath, 'utf8'); } catch { continue; }
      for (const issue of findClientBoundaryLocaleImports(content)) {
        clientBoundaryIssues.push({ filePath, ...issue });
      }
      for (const formatter of detectSuspectedCopyFormatters(content)) {
        copyFormatters.push({ filePath, ...formatter });
      }
    }
    const allLocaleKeys = new Set<string>();
    Object.values(keyValues).forEach((values) => Object.keys(values).forEach((key) => allLocaleKeys.add(key)));

    const missingKeys = this.collectMissingKeys(config, locales, keyValues, sourceUsages, sourceFiles);
    const placeholderMismatches = this.collectPlaceholderMismatches(config, locales, keyValues, localeFiles);
    const unusedKeys = this.collectUnusedKeys(config, sourceValues, sourceUsages, localeFiles);
    const invalidKeyNames = this.collectInvalidKeyNames(config, allLocaleKeys, localeFiles);
    const riskyContent = this.collectRiskyContent(config, locales, keyValues, localeFiles);
    const expansionRisks = this.collectExpansionRisks(config, locales, keyValues, localeFiles);
    const autoTranslateResiduals = await this.collectAutoTranslateResiduals(rootPath, localeFiles);
    const healthScore = this.calculateHealthScore(allLocaleKeys.size, missingKeys.length, placeholderMismatches.length, riskyContent.length);

    this.logger.info(`Scanned ${sourceFiles.length} source files and ${localeFiles.length} locale files.`);
    return {
      rootPath,
      sourceLocale: config.sourceLocale,
      localeDirectory: config.localeDirectory,
      localeDirectorySource: config.localeDirectorySource,
      localeDirectoryFound: config.localeDirectoryFound,
      localeDirectoryRelativePath: config.localeDirectoryRelativePath,
      localeFileCount: localeFiles.length,
      scannedAt: new Date().toISOString(),
      locales,
      totalKeys: Object.keys(sourceValues).length || allLocaleKeys.size,
      healthScore,
      localeFiles: localeFiles.map(({ locale, namespace, filePath, keys, keyRanges }) => ({ locale, namespace, filePath, keys, keyRanges })),
      keyValues,
      sourceUsages,
      missingKeys,
      placeholderMismatches,
      unusedKeys,
      invalidKeyNames,
      riskyContent,
      expansionRisks,
      autoTranslateResiduals,
      clientBoundaryIssues,
      copyFormatters
    };
  }

  private async scanSourceUsages(
    files: string[],
    customWrappers: string[],
    keyValues: Record<string, Record<string, string>>,
    locales: string[],
    token?: { isCancellationRequested: boolean }
  ): Promise<TranslationKeyUsage[]> {
    const usages: TranslationKeyUsage[] = [];
    const allKnownKeys = knownKeys(keyValues);
    for (const filePath of files) {
      if (token?.isCancellationRequested) break;
      let content = '';
      try {
        content = await fs.promises.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      if (content.length > MAX_SOURCE_USAGE_SCAN_BYTES) {
        this.logger.info(`Skipping large source file during usage scan: ${filePath}`);
        continue;
      }
      for (const match of findTranslationKeys(content, customWrappers)) {
        const keys = this.selectUsageKeys(match, keyValues, locales);
        for (const key of keys) {
          usages.push({ key, dynamic: match.dynamic, filePath, range: match.range });
        }
      }
      for (const usage of findKnownKeyLiteralUsages(content, filePath, allKnownKeys)) {
        usages.push(usage);
      }
    }
    return usages;
  }

  private selectUsageKeys(match: { key: string; dynamic?: boolean; resolvedKeys?: string[] }, keyValues: Record<string, Record<string, string>>, locales: string[]): string[] {
    const candidates = [match.key, ...(match.resolvedKeys ?? [])];
    const known = candidates.filter((key) => locales.some((locale) => usageExistsInLocale({ key, dynamic: false }, keyValues[locale] ?? {})));
    if (known.length) return [...new Set(known)];
    return [...new Set(match.dynamic ? (match.resolvedKeys ?? [match.key]) : candidates)];
  }

  private collectMissingKeys(
    config: ResolvedI18ntkConfig,
    locales: string[],
    keyValues: Record<string, Record<string, string>>,
    usages: TranslationKeyUsage[],
    sourceFiles: string[]
  ): MissingKeyIssue[] {
    const issues: MissingKeyIssue[] = [];
    const usageByKey = new Map<string, TranslationKeyUsage[]>();
    usages.forEach((usage) => {
      usageByKey.set(usage.key, [...(usageByKey.get(usage.key) ?? []), usage]);
    });
    const keysToCheck = new Set(usageByKey.keys());
    for (const key of keysToCheck) {
      for (const locale of locales) {
        const usage = usageByKey.get(key)?.[0];
        if (!usageExistsInLocale(usage ?? { key }, keyValues[locale] ?? {})) {
          issues.push({
            key,
            locale,
            sourceFilePath: usage?.filePath ?? sourceFiles[0],
            sourceRange: usage?.range
          });
        }
      }
    }
    return issues;
  }

  private collectPlaceholderMismatches(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>) {
    const issues = [];
    const sourceValues = keyValues[config.sourceLocale] ?? {};
    for (const locale of locales) {
      if (locale === config.sourceLocale) continue;
      for (const [key, sourceValue] of Object.entries(sourceValues)) {
        const targetValue = keyValues[locale]?.[key];
        if (targetValue === undefined) continue;
        const comparison = comparePlaceholders(sourceValue, targetValue);
        if (!comparison.matches) {
          issues.push({
            key,
            locale,
            sourceValue,
            targetValue,
            missing: comparison.missing,
            extra: comparison.extra,
            ...this.findLocaleKeyLocation(localeFiles, key, locale)
          });
        }
      }
    }
    return issues;
  }

  private collectUnusedKeys(config: ResolvedI18ntkConfig, sourceValues: Record<string, string>, usages: TranslationKeyUsage[], localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>): UnusedKeyIssue[] {
    return Object.keys(sourceValues)
      .filter((key) => !usages.some((usage) => usageMatchesKey(usage, key)))
      .map((key) => ({
        key,
        locale: config.sourceLocale,
        confidence: 0.8,
        ...this.findLocaleKeyLocation(localeFiles, key, config.sourceLocale)
      }));
  }

  private collectInvalidKeyNames(config: ResolvedI18ntkConfig, keys: Set<string>, localeFiles: Array<{ filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>): InvalidKeyNameIssue[] {
    return [...keys]
      .filter((key) => !matchesStyle(key, config.keyStyle))
      .map((key) => ({
        key,
        expectedStyle: config.keyStyle,
        ...this.findLocaleKeyLocation(localeFiles, key)
      }));
  }

  private collectRiskyContent(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>): RiskyContentIssue[] {
    const issues: RiskyContentIssue[] = [];
    const sourceValues = keyValues[config.sourceLocale] ?? {};
    for (const locale of locales) {
      for (const [key, value] of Object.entries(keyValues[locale] ?? {})) {
        if (!value) continue;
        const location = this.findLocaleKeyLocation(localeFiles, key, locale);

        if (locale !== config.sourceLocale && sourceValues[key] && sourceValues[key] === value) {
          issues.push({
            key,
            locale,
            message: 'Value matches source locale and may be untranslated.',
            severity: 'warning',
            ...location
          });
        }

        if (/https?:\/\/[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
          issues.push({
            key,
            locale,
            message: 'Value contains URL or email content that should be reviewed.',
            severity: 'info',
            ...location
          });
        }

        if (/<[a-z][\s\S]*?>/i.test(value)) {
          issues.push({
            key,
            locale,
            message: 'Value appears to contain HTML markup. Verify it is intentional.',
            severity: 'warning',
            ...location
          });
        }

        if (/[\n\r\t]/.test(value) && !/[\n\r\t]/.test(sourceValues[key] ?? '')) {
          issues.push({
            key,
            locale,
            message: 'Value contains escape sequences. Verify it matches source conventions.',
            severity: 'info',
            ...location
          });
        }

        if (value.length > 1000) {
          issues.push({
            key,
            locale,
            message: `Value is unusually long (${value.length} characters).`,
            severity: 'info',
            ...location
          });
        }
      }
    }
    return issues;
  }

  private collectExpansionRisks(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>): ExpansionRiskIssue[] {
    const issues: ExpansionRiskIssue[] = [];
    const sourceValues = keyValues[config.sourceLocale] ?? {};
    for (const locale of locales) {
      if (locale === config.sourceLocale) continue;
      for (const [key, sourceValue] of Object.entries(sourceValues)) {
        const targetValue = keyValues[locale]?.[key];
        if (!targetValue || sourceValue.length === 0) continue;
        const expansionPercent = Math.round(((targetValue.length - sourceValue.length) / sourceValue.length) * 100);
        if (expansionPercent >= 30) {
          issues.push({
            key,
            locale,
            sourceLength: sourceValue.length,
            targetLength: targetValue.length,
            expansionPercent,
            ...this.findLocaleKeyLocation(localeFiles, key, locale)
          });
        }
      }
    }
    return issues;
  }

  private findLocaleKeyLocation(localeFiles: Array<{ locale?: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>, key: string, locale?: string): { filePath?: string; range?: TextRange } {
    const file = localeFiles.find((item) => (locale === undefined || item.locale === locale) && item.keys.includes(key));
    return {
      filePath: file?.filePath,
      range: file?.keyRanges?.[key]
    };
  }

  private calculateHealthScore(totalKeys: number, missing: number, placeholders: number, risky: number): number {
    if (totalKeys === 0) return 0;
    const penalty = Math.min(missing * 3 + placeholders * 5 + risky, Math.max(totalKeys - 1, 0) * 2);
    const raw = 100 - (penalty / totalKeys) * 40;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  private async collectAutoTranslateResiduals(rootPath: string, localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>) {
    const reportPath = normalizeWithinRoot(rootPath, 'i18ntk-reports', 'auto-translate', 'latest.json');
    let parsed: any;
    try {
      const content = await fs.promises.readFile(reportPath, 'utf8');
      if (content.length > 50 * 1024 * 1024) return [];
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
    if (parsed?.kind !== 'i18ntk.autoTranslateResiduals' || !Array.isArray(parsed.items)) return [];
    const locale = String(parsed.targetLang || '').trim();
    if (!locale) return [];
    return parsed.items
      .map((item: any) => {
        const key = String(item?.keyPath || '').trim();
        if (!key) return undefined;
        const fileName = String(item?.fileName || '');
        const localeFile = localeFiles.find((file) =>
          file.locale === locale &&
          file.keys.includes(key) &&
          (!fileName || path.basename(file.filePath) === fileName)
        ) ?? localeFiles.find((file) => file.locale === locale && file.keys.includes(key));
        return {
          key,
          locale,
          value: String(item?.value || ''),
          reason: String(item?.reason || 'untranslated'),
          fileName,
          filePath: localeFile?.filePath,
          range: localeFile?.keyRanges?.[key]
        };
      })
      .filter(Boolean);
  }
}

function knownKeys(keyValues: Record<string, Record<string, string>>): Set<string> {
  const keys = new Set<string>();
  Object.values(keyValues).forEach((values) => Object.keys(values).forEach((key) => keys.add(key)));
  return keys;
}

function aliasesForKey(key: string): Set<string> {
  const aliases = new Set([key]);
  if (key.includes('_')) aliases.add(key.replace(/_/g, '.'));
  if (key.includes('.')) aliases.add(key.replace(/\./g, '_'));
  return aliases;
}

function aliasesForKeyNoConflict(sourceKey: string, allLocaleKeys: Set<string>): Set<string> {
  const alternatives = new Set([sourceKey]);
  const dotVariant = sourceKey.replace(/_/g, '.');
  const snakeVariant = sourceKey.replace(/\./g, '_');
  if (dotVariant !== sourceKey && !allLocaleKeys.has(dotVariant)) {
    alternatives.add(dotVariant);
  }
  if (snakeVariant !== sourceKey && !allLocaleKeys.has(snakeVariant)) {
    alternatives.add(snakeVariant);
  }
  return alternatives;
}

function usageExistsInLocale(usage: { key: string; dynamic?: boolean }, localeValues: Record<string, string>, allLocaleKeys?: Set<string>): boolean {
  const localeKeys = allLocaleKeys ?? new Set(Object.keys(localeValues));
  if (usage.dynamic) {
    return [...aliasesForKeyNoConflict(usage.key, localeKeys)].some((prefix) => Object.keys(localeValues).some((key) => key.startsWith(prefix)));
  }
  return [...aliasesForKeyNoConflict(usage.key, localeKeys)].some((key) => localeValues[key] !== undefined);
}

function usageMatchesKey(usage: { key: string; dynamic?: boolean }, key: string, allLocaleKeys?: Set<string>): boolean {
  const localeKeys = allLocaleKeys ?? new Set([key]);
  const keyAliases = aliasesForKeyNoConflict(key, localeKeys);
  const usageAliases = aliasesForKeyNoConflict(usage.key, localeKeys);
  if (usage.dynamic) {
    return [...usageAliases].some((prefix) => [...keyAliases].some((keyAlias) => keyAlias.startsWith(prefix)));
  }
  return [...usageAliases].some((usageAlias) => keyAliases.has(usageAlias));
}

function findKnownKeyLiteralUsages(text: string, filePath: string, keys: Set<string>): TranslationKeyUsage[] {
  if (keys.size === 0 || text.length > MAX_KNOWN_KEY_LITERAL_SCAN_BYTES) return [];
  if (!text.includes('"') && !text.includes("'") && !text.includes('`')) return [];

  const usages: TranslationKeyUsage[] = [];
  const pattern = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const literal = match[2];
    if (!keys.has(literal)) continue;
    const start = match.index + 1;
    const end = start + literal.length;
    usages.push({ key: literal, dynamic: false, filePath, range: rangeFromOffsets(text, start, end) });
  }
  return usages;
}

function rangeFromOffsets(text: string, start: number, end: number): TextRange {
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

function matchesStyle(key: string, style: ResolvedI18ntkConfig['keyStyle']): boolean {
  const hybridDotSnake = /^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.[a-z0-9]+(?:_[a-z0-9]+)*)*$/;
  if (style === 'dot' || style === 'snake') return hybridDotSnake.test(key);
  if (style === 'camel') return /^[a-z][a-zA-Z0-9]*$/.test(key);
  if (style === 'kebab') return /^[a-z0-9-]+$/.test(key);
  return !key.includes('.');
}
