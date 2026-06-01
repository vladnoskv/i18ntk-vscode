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

export interface ExpansionRiskIssue {
  key: string;
  locale: string;
  sourceLength: number;
  targetLength: number;
  expansionPercent: number;
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
}

export interface I18nValidationResult {
  success: boolean;
  issues: Array<MissingKeyIssue | PlaceholderMismatchIssue | InvalidKeyNameIssue | RiskyContentIssue>;
}

export interface I18nReport {
  title: string;
  markdown: string;
  result: I18nScanResult;
}

export interface DiagnosticLike {
  filePath: string;
  range: TextRange;
  severity: 'info' | 'warning' | 'error';
  message: string;
  code: string;
  data?: Record<string, unknown>;
}
