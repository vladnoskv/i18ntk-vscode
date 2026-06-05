export interface TextRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface ResolvedI18ntkConfig {
  rootPath: string;
  localeDirectory: string;
  localeDirectorySource?: 'configured' | 'auto-detected' | 'fallback';
  localeDirectoryFound?: boolean;
  localeDirectoryRelativePath?: string;
  localeFileCount?: number;
  sourceLocale: string;
  keyStyle: 'dot' | 'snake' | 'camel' | 'kebab' | 'flat';
  autoScanOnSave: boolean;
  autoScanOnFileChange?: boolean;
  scanOnStartup?: boolean;
  runCliValidationOnScan?: boolean;
  showInlineDiagnostics: boolean;
  showHoverTranslations: boolean;
  reportFormat: 'webview' | 'markdown';
  maxScanFiles: number;
  exclude: string[];
  customWrappers: string[];
  autoTranslateProvider: 'google' | 'deepl' | 'libretranslate';
  autoTranslateTargets: string[];
  autoTranslateMode: 'onlyMissing' | 'translateAll' | 'dryRun';
}

export interface LocaleFileInfo {
  locale: string;
  namespace: string;
  filePath: string;
  keys: string[];
  keyRanges?: Record<string, TextRange>;
}

export interface TranslationKeyUsage {
  key: string;
  dynamic?: boolean;
  filePath: string;
  range: TextRange;
}

export interface MissingKeyIssue {
  key: string;
  locale: string;
  sourceFilePath?: string;
  sourceRange?: TextRange;
  localeFilePath?: string;
}

export interface PlaceholderMismatchIssue {
  key: string;
  locale: string;
  sourceValue: string;
  targetValue: string;
  missing: string[];
  extra: string[];
  filePath?: string;
  range?: TextRange;
}

export interface UnusedKeyIssue {
  key: string;
  locale: string;
  filePath?: string;
  range?: TextRange;
  confidence: number;
}

export interface InvalidKeyNameIssue {
  key: string;
  expectedStyle: string;
  filePath?: string;
  range?: TextRange;
}

export interface RiskyContentIssue {
  key: string;
  locale: string;
  filePath?: string;
  range?: TextRange;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ClientBoundaryIssue {
  filePath: string;
  range?: TextRange;
  importPath: string;
  message: string;
}

export interface CopyFormatterIssue {
  filePath: string;
  range?: TextRange;
  name: string;
  line: number;
  message: string;
}

export interface ExpansionRiskIssue {
  key: string;
  locale: string;
  sourceLength: number;
  targetLength: number;
  expansionPercent: number;
  filePath?: string;
  range?: TextRange;
}

export interface AutoTranslateResidualIssue {
  key: string;
  locale: string;
  value: string;
  reason?: string;
  fileName?: string;
  filePath?: string;
  range?: TextRange;
}

export interface I18nScanResult {
  rootPath: string;
  sourceLocale: string;
  localeDirectory: string;
  localeDirectorySource?: 'configured' | 'auto-detected' | 'fallback';
  localeDirectoryFound?: boolean;
  localeDirectoryRelativePath?: string;
  localeFileCount?: number;
  scannedAt: string;
  locales: string[];
  totalKeys: number;
  healthScore: number;
  localeFiles: LocaleFileInfo[];
  keyValues: Record<string, Record<string, string>>;
  sourceUsages: TranslationKeyUsage[];
  missingKeys: MissingKeyIssue[];
  placeholderMismatches: PlaceholderMismatchIssue[];
  unusedKeys: UnusedKeyIssue[];
  invalidKeyNames: InvalidKeyNameIssue[];
  riskyContent: RiskyContentIssue[];
  expansionRisks: ExpansionRiskIssue[];
  autoTranslateResiduals?: AutoTranslateResidualIssue[];
  clientBoundaryIssues?: ClientBoundaryIssue[];
  copyFormatters?: CopyFormatterIssue[];
}

export interface I18nValidationResult {
  success: boolean;
  issues: Array<MissingKeyIssue | PlaceholderMismatchIssue | InvalidKeyNameIssue | RiskyContentIssue>;
}

export interface LocaleReport {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completenessPct: number;
  placeholderMismatchCount: number;
  likelyUntranslatedCount: number;
  expansionRiskCount: number;
}

export type I18ntkIssueType =
  | 'missing_key'
  | 'unused_key'
  | 'placeholder_mismatch'
  | 'likely_untranslated'
  | 'expansion_risk'
  | 'hardcoded_text';

export interface I18ntkIssue {
  id: string;
  type: I18ntkIssueType;
  severity: 'info' | 'warning' | 'error';
  locale?: string;
  key?: string;
  file?: string;
  line?: number;
  column?: number;
  confidence?: number;
  message: string;
  suggestion?: string;
}

export interface I18ntkReport {
  schemaVersion: 1;
  generatedAt: string;
  projectRoot: string;
  config: {
    sourceLocale: string;
    localesDir: string;
    namespaces?: string[];
  };
  summary: {
    totalKeys: number;
    localeCount: number;
    averageCompletenessPct: number;
    issueCount: number;
    missingKeyCount: number;
    unusedKeyCount: number;
    placeholderMismatchCount: number;
    likelyUntranslatedCount: number;
    expansionRiskCount: number;
    hardcodedTextCount: number;
  };
  locales: LocaleReport[];
  issues: I18ntkIssue[];
  exports?: {
    json?: string;
    markdown?: string;
    html?: string;
  };
}

export type I18nReport = I18ntkReport;

export type WebviewToExtensionMessage =
  | { type: 'refreshReport' }
  | { type: 'openIssue'; issueId: string }
  | { type: 'ignoreIssues'; issueIds: string[] }
  | { type: 'openFile'; file: string; line?: number; column?: number }
  | { type: 'exportReport'; format: 'json' | 'markdown' | 'html' };

export type ExtensionToWebviewMessage =
  | { type: 'reportLoaded'; report: I18ntkReport }
  | { type: 'reportLoading' }
  | { type: 'reportError'; message: string; details?: string };

export interface DiagnosticLike {
  filePath: string;
  range: TextRange;
  severity: 'info' | 'warning' | 'error';
  message: string;
  code: string;
  data?: Record<string, unknown>;
}

export type DiagnosticRuleSeverity = 'error' | 'warning' | 'off' | 'ignore';

export interface DiagnosticSettings {
  severities: Record<string, DiagnosticRuleSeverity | undefined>;
  ignoredDiagnostics: string[];
}
