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
    const sourceUsages = await this.scanSourceUsages(sourceFiles, token);
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
      scannedAt: new Date().toISOString(),
      locales,
      totalKeys: Object.keys(sourceValues).length || allLocaleKeys.size,
      healthScore,
      localeFiles: localeFiles.map(({ locale, namespace, filePath, keys }) => ({ locale, namespace, filePath, keys })),
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

  private async scanSourceUsages(files: string[], token?: { isCancellationRequested: boolean }): Promise<TranslationKeyUsage[]> {
    const usages: TranslationKeyUsage[] = [];
    for (const filePath of files) {
      if (token?.isCancellationRequested) break;
      let content = '';
      try {
        content = await fs.promises.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      for (const match of findTranslationKeys(content)) {
        usages.push({ key: match.key, filePath, range: match.range });
      }
    }
    return usages;
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
    const keysToCheck = new Set([...Object.keys(keyValues[config.sourceLocale] ?? {}), ...usageByKey.keys()]);
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

  private collectPlaceholderMismatches(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[] }>) {
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
            filePath: localeFiles.find((file) => file.locale === locale && file.keys.includes(key))?.filePath
          });
        }
      }
    }
    return issues;
  }

  private collectUnusedKeys(config: ResolvedI18ntkConfig, sourceValues: Record<string, string>, usedKeys: Set<string>, localeFiles: Array<{ locale: string; filePath: string; keys: string[] }>): UnusedKeyIssue[] {
    return Object.keys(sourceValues)
      .filter((key) => !usedKeys.has(key))
      .map((key) => ({
        key,
        locale: config.sourceLocale,
        confidence: 0.8,
        filePath: localeFiles.find((file) => file.locale === config.sourceLocale && file.keys.includes(key))?.filePath
      }));
  }

  private collectInvalidKeyNames(config: ResolvedI18ntkConfig, keys: Set<string>, localeFiles: Array<{ filePath: string; keys: string[] }>): InvalidKeyNameIssue[] {
    return [...keys]
      .filter((key) => !matchesStyle(key, config.keyStyle))
      .map((key) => ({
        key,
        expectedStyle: config.keyStyle,
        filePath: localeFiles.find((file) => file.keys.includes(key))?.filePath
      }));
  }

  private collectRiskyContent(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[] }>): RiskyContentIssue[] {
    const issues: RiskyContentIssue[] = [];
    const sourceValues = keyValues[config.sourceLocale] ?? {};
    for (const locale of locales) {
      for (const [key, value] of Object.entries(keyValues[locale] ?? {})) {
        if (!value) continue;
        const filePath = localeFiles.find((file) => file.locale === locale && file.keys.includes(key))?.filePath;

        if (locale !== config.sourceLocale && sourceValues[key] && sourceValues[key] === value) {
          issues.push({
            key,
            locale,
            message: 'Value matches source locale and may be untranslated.',
            severity: 'warning',
            filePath
          });
        }

        if (/https?:\/\/[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
          issues.push({
            key,
            locale,
            message: 'Value contains URL or email content that should be reviewed.',
            severity: 'info',
            filePath
          });
        }

        if (/<[a-z][\s\S]*?>/i.test(value)) {
          issues.push({
            key,
            locale,
            message: 'Value appears to contain HTML markup. Verify it is intentional.',
            severity: 'warning',
            filePath
          });
        }

        if (/\\n|\\t|\\\\n/.test(value) && !sourceValues[key]?.includes('\\n')) {
          issues.push({
            key,
            locale,
            message: 'Value contains escape sequences. Verify it matches source conventions.',
            severity: 'info',
            filePath
          });
        }

        if (value.length > 1000) {
          issues.push({
            key,
            locale,
            message: `Value is unusually long (${value.length} characters).`,
            severity: 'info',
            filePath
          });
        }
      }
    }
    return issues;
  }

  private collectExpansionRisks(config: ResolvedI18ntkConfig, locales: string[], keyValues: Record<string, Record<string, string>>, localeFiles: Array<{ locale: string; filePath: string; keys: string[] }>): ExpansionRiskIssue[] {
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
            filePath: localeFiles.find((file) => file.locale === locale && file.keys.includes(key))?.filePath
          });
        }
      }
    }
    return issues;
  }

  private calculateHealthScore(totalKeys: number, missing: number, placeholders: number, risky: number): number {
    if (totalKeys === 0) return 0;
    const penalty = missing * 3 + placeholders * 5 + risky;
    return Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(totalKeys, 1)) * 10)));
  }
}

function matchesStyle(key: string, style: ResolvedI18ntkConfig['keyStyle']): boolean {
  if (style === 'dot') return /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(key);
  if (style === 'snake') return /^[a-z0-9_]+$/.test(key);
  if (style === 'camel') return /^[a-z][a-zA-Z0-9]*$/.test(key);
  if (style === 'kebab') return /^[a-z0-9-]+$/.test(key);
  return !key.includes('.');
}
