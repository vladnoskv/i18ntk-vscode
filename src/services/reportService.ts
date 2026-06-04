import { I18nReport, I18nScanResult, I18ntkIssue } from '../types';

export class ReportService {
  generate(result: I18nScanResult): I18nReport {
    const issues: I18ntkIssue[] = [];
    const add = (issue: Omit<I18ntkIssue, 'id'>) => issues.push({ id: `${issue.type}-${issues.length + 1}`, ...issue });

    for (const item of result.missingKeys) {
      add({
        type: 'missing_key',
        severity: 'warning',
        locale: item.locale,
        key: item.key,
        file: item.sourceFilePath,
        line: item.sourceRange ? item.sourceRange.startLine + 1 : undefined,
        column: item.sourceRange ? item.sourceRange.startCharacter + 1 : undefined,
        message: `${item.locale} is missing translation key "${item.key}".`,
        suggestion: 'Add this key to the locale file.'
      });
    }
    for (const item of result.unusedKeys) {
      add({
        type: 'unused_key',
        severity: 'info',
        locale: item.locale,
        key: item.key,
        file: item.filePath,
        line: item.range ? item.range.startLine + 1 : undefined,
        column: item.range ? item.range.startCharacter + 1 : undefined,
        confidence: item.confidence,
        message: `Translation key "${item.key}" was not found in scanned source files.`,
        suggestion: 'Review before deleting; dynamic key construction may hide usage.'
      });
    }
    for (const item of result.placeholderMismatches) {
      add({
        type: 'placeholder_mismatch',
        severity: 'error',
        locale: item.locale,
        key: item.key,
        file: item.filePath,
        line: item.range ? item.range.startLine + 1 : undefined,
        column: item.range ? item.range.startCharacter + 1 : undefined,
        message: `${item.locale}.${item.key} has placeholder mismatch.`,
        suggestion: `Missing: ${item.missing.join(', ') || 'none'}; extra: ${item.extra.join(', ') || 'none'}.`
      });
    }
    for (const item of result.riskyContent) {
      add({
        type: 'likely_untranslated',
        severity: item.severity,
        locale: item.locale,
        key: item.key,
        file: item.filePath,
        line: item.range ? item.range.startLine + 1 : undefined,
        column: item.range ? item.range.startCharacter + 1 : undefined,
        confidence: 0.75,
        message: item.message,
        suggestion: 'Review this value against the source locale.'
      });
    }
    for (const item of result.expansionRisks) {
      add({
        type: 'expansion_risk',
        severity: 'info',
        locale: item.locale,
        key: item.key,
        file: item.filePath,
        line: item.range ? item.range.startLine + 1 : undefined,
        column: item.range ? item.range.startCharacter + 1 : undefined,
        confidence: 0.75,
        message: `${item.locale}.${item.key} is ${item.expansionPercent}% longer than the source value.`,
        suggestion: 'Check layouts with constrained space.'
      });
    }

    const sourceValues = result.keyValues[result.sourceLocale] ?? {};
    const totalKeys = Object.keys(sourceValues).length || result.totalKeys;
    const locales = result.locales.map((locale) => {
      const values = result.keyValues[locale] ?? {};
      const missingKeys = Object.keys(sourceValues).filter((key) => values[key] === undefined || values[key] === null || values[key] === '').length;
      const translatedKeys = Math.max(0, totalKeys - missingKeys);
      const localeIssues = issues.filter((issue) => issue.locale === locale);
      return {
        locale,
        totalKeys,
        translatedKeys,
        missingKeys,
        completenessPct: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0,
        placeholderMismatchCount: localeIssues.filter((issue) => issue.type === 'placeholder_mismatch').length,
        likelyUntranslatedCount: localeIssues.filter((issue) => issue.type === 'likely_untranslated').length,
        expansionRiskCount: localeIssues.filter((issue) => issue.type === 'expansion_risk').length
      };
    });

    const averageCompletenessPct = locales.length
      ? Math.round(locales.reduce((sum, locale) => sum + locale.completenessPct, 0) / locales.length)
      : 0;

    return {
      schemaVersion: 1,
      generatedAt: result.scannedAt,
      projectRoot: result.rootPath,
      config: {
        sourceLocale: result.sourceLocale,
        localesDir: result.localeDirectory,
        namespaces: [...new Set(result.localeFiles.map((file) => file.namespace))]
      },
      summary: {
        totalKeys,
        localeCount: result.locales.length,
        averageCompletenessPct,
        issueCount: issues.length,
        missingKeyCount: issues.filter((issue) => issue.type === 'missing_key').length,
        unusedKeyCount: issues.filter((issue) => issue.type === 'unused_key').length,
        placeholderMismatchCount: issues.filter((issue) => issue.type === 'placeholder_mismatch').length,
        likelyUntranslatedCount: issues.filter((issue) => issue.type === 'likely_untranslated').length,
        expansionRiskCount: issues.filter((issue) => issue.type === 'expansion_risk').length,
        hardcodedTextCount: issues.filter((issue) => issue.type === 'hardcoded_text').length
      },
      locales,
      issues
    };
  }
}
