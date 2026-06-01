import { DiagnosticLike, I18nScanResult, TextRange } from '../types';

const DEFAULT_RANGE: TextRange = { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 1 };

export function mapScanResultToDiagnostics(result: I18nScanResult): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];
  const missingBySource = new Map<string, typeof result.missingKeys>();
  for (const issue of result.missingKeys) {
    const filePath = issue.sourceFilePath ?? issue.localeFilePath;
    if (!filePath) continue;
    const mapKey = `${filePath}:${issue.key}:${issue.sourceRange?.startLine ?? 0}:${issue.sourceRange?.startCharacter ?? 0}`;
    missingBySource.set(mapKey, [...(missingBySource.get(mapKey) ?? []), issue]);
  }

  for (const issues of missingBySource.values()) {
    const first = issues[0];
    const filePath = first.sourceFilePath ?? first.localeFilePath;
    if (!filePath) continue;
    diagnostics.push({
      filePath,
      range: first.sourceRange ?? DEFAULT_RANGE,
      severity: 'warning',
      message: `Missing translation for key "${first.key}" in: ${issues.map((item) => item.locale).join(', ')}`,
      code: 'i18ntk.missingKey',
      data: { key: first.key, locales: issues.map((item) => item.locale) }
    });
  }

  for (const issue of result.placeholderMismatches) {
    if (!issue.filePath) continue;
    diagnostics.push({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: issue.missing.length > 0 ? 'error' : 'warning',
      message: `Placeholder mismatch for "${issue.key}": target is missing ${issue.missing.join(', ') || 'no placeholders'}`,
      code: 'i18ntk.placeholderMismatch',
      data: { key: issue.key, locale: issue.locale }
    });
  }

  for (const issue of result.invalidKeyNames) {
    if (!issue.filePath) continue;
    diagnostics.push({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'warning',
      message: `Translation key "${issue.key}" does not match configured key style "${issue.expectedStyle}".`,
      code: 'i18ntk.invalidKeyName',
      data: { key: issue.key }
    });
  }

  for (const issue of result.unusedKeys) {
    if (!issue.filePath) continue;
    diagnostics.push({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'info',
      message: `Translation key "${issue.key}" appears unused.`,
      code: 'i18ntk.unusedKey',
      data: { key: issue.key }
    });
  }

  for (const issue of result.riskyContent) {
    if (!issue.filePath) continue;
    diagnostics.push({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: issue.severity,
      message: issue.message,
      code: 'i18ntk.riskyContent',
      data: { key: issue.key, locale: issue.locale }
    });
  }

  for (const issue of result.expansionRisks) {
    if (!issue.filePath) continue;
    diagnostics.push({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'info',
      message: `Translation value for "${issue.key}" expands by ${issue.expansionPercent}%.`,
      code: 'i18ntk.expansionRisk',
      data: { key: issue.key, locale: issue.locale }
    });
  }

  return diagnostics;
}
