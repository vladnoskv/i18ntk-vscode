import fs from 'node:fs';
import path from 'node:path';
import { findTranslationKeys } from '../hover/keyDetector';
import { comparePlaceholders } from '../utils/placeholderUtils';
import { findFiles } from '../utils/fsUtils';
import {
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

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html']);

export class WorkspaceScanner {
  private readonly localeFiles = new LocaleFileService();

  constructor(private readonly logger: Logger) {}

  async scan(rootPath: string, config: ResolvedI18ntkConfig, token?: { isCancellationRequested: boolean }): Promise<I18nScanResult> {
    const localeFiles = await this.localeFiles.discover(config);
    if (token?.isCancellationRequested) throw new (require('vscode') as any).CancellationError();
    const locales = [...new Set(localeFiles.map((file) => file.locale))].sort();
    const keyValues: Record<string, Record<string, string>> = {};

    for (const file of localeFiles) {
      keyValues[file.locale] = { ...(keyValues[file.locale] ?? {}), ...file.values };
    }

    const sourceValues = keyValues[config.sourceLocale] ?? {};
    const sourceFiles = await findFiles(rootPath, SOURCE_EXTENSIONS, config.exclude, config.maxScanFiles);
    if (token?.isCancellationRequested) throw new (require('vscode') as any).CancellationError();
    const sourceUsages = await this.scanSourceUsages(sourceFiles, config.customWrappers, keyValues, locales, token);
    if (token?.isCancellationRequested) throw new (require('vscode') as any).CancellationError();
    const usedKeys = new Set(sourceUsages.map((usage) => usage.key));
    const allLocaleKeys = new Set<string>();
    Object.values(keyValues).forEach((values) => Object.keys(values).forEach((key) => allLocaleKeys.add(key)));

    const missingKeys = this.collectMissingKeys(config, locales, keyValues, sourceUsages, sourceFiles);
    const placeholderMismatches = this.collectPlaceholderMismatches(config, locales, keyValues, localeFiles);
    const unusedKeys = this.collectUnusedKeys(config, sourceValues, usedKeys, localeFiles);
    const invalidKeyNames = this.collectInvalidKeyNames(config, allLocaleKeys, localeFiles);
    const riskyContent = this.collectRiskyContent(config, locales, keyValues, localeFiles);
    const expansionRisks = this.collectExpansionRisks(config, locales, keyValues, localeFiles);
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
      expansionRisks
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
      for (const match of findTranslationKeys(content, customWrappers)) {
        const keys = this.selectUsageKeys(match, keyValues, locales);
        for (const key of keys) {
          usages.push({ key, filePath, range: match.range });
        }
      }
      for (const usage of findKnownKeyLiteralUsages(content, filePath, allKnownKeys)) {
        usages.push(usage);
      }
    }
    return usages;
  }

  private selectUsageKeys(match: { key: string; resolvedKeys?: string[] }, keyValues: Record<string, Record<string, string>>, locales: string[]): string[] {
    const candidates = [match.key, ...(match.resolvedKeys ?? [])];
    const known = candidates.filter((key) => locales.some((locale) => keyValues[locale]?.[key] !== undefined));
    return [...new Set(known.length ? known : candidates)];
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
        if (!keyValues[locale] || keyValues[locale][key] === undefined) {
          const usage = usageByKey.get(key)?.[0];
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

  private collectUnusedKeys(config: ResolvedI18ntkConfig, sourceValues: Record<string, string>, usedKeys: Set<string>, localeFiles: Array<{ locale: string; filePath: string; keys: string[]; keyRanges?: Record<string, TextRange> }>): UnusedKeyIssue[] {
    return Object.keys(sourceValues)
      .filter((key) => !usedKeys.has(key))
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

        if (/\\n|\\t|\\\\n/.test(value) && !sourceValues[key]?.includes('\\n')) {
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
    const penalty = missing * 3 + placeholders * 5 + risky;
    return Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(totalKeys, 1)) * 10)));
  }
}

function knownKeys(keyValues: Record<string, Record<string, string>>): Set<string> {
  const keys = new Set<string>();
  Object.values(keyValues).forEach((values) => Object.keys(values).forEach((key) => keys.add(key)));
  return keys;
}

function findKnownKeyLiteralUsages(text: string, filePath: string, keys: Set<string>): TranslationKeyUsage[] {
  const usages: TranslationKeyUsage[] = [];
  const pattern = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const literal = match[2];
    if (!keys.has(literal)) continue;
    const start = match.index + 1;
    const end = start + literal.length;
    usages.push({ key: literal, filePath, range: rangeFromOffsets(text, start, end) });
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
