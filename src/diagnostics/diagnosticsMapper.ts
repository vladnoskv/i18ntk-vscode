import { DiagnosticLike, DiagnosticRuleSeverity, DiagnosticSettings, I18nScanResult, TextRange } from '../types';

const DEFAULT_RANGE: TextRange = { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 1 };

export const DEFAULT_DIAGNOSTIC_SEVERITIES: Record<string, DiagnosticRuleSeverity> = {
  'i18ntk.missingKey': 'warning',
  'i18ntk.placeholderMismatch': 'error',
  'i18ntk.invalidKeyName': 'warning',
  'i18ntk.unusedKey': 'warning',
  'i18ntk.riskyContent': 'warning',
  'i18ntk.expansionRisk': 'off'
};

export function mapScanResultToDiagnostics(result: I18nScanResult, settings: Partial<DiagnosticSettings> = {}): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];
  const addDiagnostic = (diagnostic: DiagnosticLike): void => {
    const severity = resolveSeverity(diagnostic, settings);
    if (!severity) return;
    diagnostics.push({ ...diagnostic, severity });
  };
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
    addDiagnostic({
      filePath,
      range: first.sourceRange ?? DEFAULT_RANGE,
      severity: 'warning',
      message: `Missing translation for key "${first.key}" in: ${issues.map((item) => item.locale).join(', ')}`,
      code: 'i18ntk.missingKey',
      data: { key: first.key, locales: issues.map((item) => item.locale), ignoreId: ignoreId('i18ntk.missingKey', first.key) }
    });
  }

  for (const issue of result.placeholderMismatches) {
    if (!issue.filePath) continue;
    addDiagnostic({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: issue.missing.length > 0 ? 'error' : 'warning',
      message: `Placeholder mismatch for "${issue.key}": target is missing ${issue.missing.join(', ') || 'no placeholders'}`,
      code: 'i18ntk.placeholderMismatch',
      data: { key: issue.key, locale: issue.locale, ignoreId: ignoreId('i18ntk.placeholderMismatch', issue.key, issue.locale) }
    });
  }

  for (const issue of result.invalidKeyNames) {
    if (!issue.filePath) continue;
    addDiagnostic({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'warning',
      message: `Translation key "${issue.key}" does not match configured key style "${issue.expectedStyle}".`,
      code: 'i18ntk.invalidKeyName',
      data: { key: issue.key, ignoreId: ignoreId('i18ntk.invalidKeyName', issue.key) }
    });
  }

  for (const issue of result.unusedKeys) {
    if (!issue.filePath) continue;
    addDiagnostic({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'warning',
      message: `Translation key "${issue.key}" appears unused.`,
      code: 'i18ntk.unusedKey',
      data: { key: issue.key, ignoreId: ignoreId('i18ntk.unusedKey', issue.key) }
    });
  }

  for (const issue of result.riskyContent) {
    if (!issue.filePath) continue;
    addDiagnostic({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: issue.severity,
      message: issue.message,
      code: 'i18ntk.riskyContent',
      data: { key: issue.key, locale: issue.locale, ignoreId: ignoreId('i18ntk.riskyContent', issue.key, issue.locale) }
    });
  }

  for (const issue of result.expansionRisks) {
    if (!issue.filePath) continue;
    addDiagnostic({
      filePath: issue.filePath,
      range: issue.range ?? DEFAULT_RANGE,
      severity: 'info',
      message: `Translation value for "${issue.key}" expands by ${issue.expansionPercent}%.`,
      code: 'i18ntk.expansionRisk',
      data: { key: issue.key, locale: issue.locale, ignoreId: ignoreId('i18ntk.expansionRisk', issue.key, issue.locale) }
    });
  }

  return diagnostics;
}

export function ignoreId(code: string, key: string, locale?: string): string {
  return [code, key, locale].filter(Boolean).join(':');
}

function resolveSeverity(diagnostic: DiagnosticLike, settings: Partial<DiagnosticSettings>): 'info' | 'warning' | 'error' | undefined {
  const ignore = typeof diagnostic.data?.ignoreId === 'string' ? diagnostic.data.ignoreId : undefined;
  const ignored = new Set(settings.ignoredDiagnostics ?? []);
  if (ignore && ignored.has(ignore)) return undefined;
  if (ignored.has(`${diagnostic.code}:${diagnostic.data?.key ?? ''}`)) return undefined;

  const configured = settings.severities?.[diagnostic.code] ?? DEFAULT_DIAGNOSTIC_SEVERITIES[diagnostic.code];
  if (configured === 'off' || configured === 'ignore') return undefined;
  if (configured === 'error' || configured === 'warning') return configured;
  return diagnostic.severity;
}
