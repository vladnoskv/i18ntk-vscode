import * as vscode from 'vscode';
import { ResolvedI18ntkConfig } from '../types';
import { enumConfigValue, getConfigValue, getSharedWorkbenchSettings, loadSharedConfig } from './sharedConfig';

export async function getExtensionConfig(rootPath: string, localeDirectory: string): Promise<ResolvedI18ntkConfig> {
  const shared = getSharedWorkbenchSettings(await loadSharedConfig(rootPath));
  return {
    rootPath,
    localeDirectory,
    sourceLocale: getConfigValue('i18ntk', 'sourceLocale', shared.sourceLocale, 'en'),
    keyStyle: enumConfigValue('i18ntk', 'keyStyle', shared.keyStyle, 'dot', ['dot', 'snake', 'camel', 'kebab', 'flat']),
    autoScanOnSave: getConfigValue('i18ntk', 'autoScanOnSave', shared.autoScanOnSave, false),
    autoScanOnFileChange: getConfigValue('i18ntk', 'autoScanOnFileChange', shared.autoScanOnFileChange, false),
    scanOnStartup: getConfigValue('i18ntk', 'scanOnStartup', shared.scanOnStartup, false),
    runCliValidationOnScan: getConfigValue('i18ntk', 'runCliValidationOnScan', shared.runCliValidationOnScan, false),
    showInlineDiagnostics: getConfigValue('i18ntk', 'showInlineDiagnostics', shared.showInlineDiagnostics, true),
    showHoverTranslations: getConfigValue('i18ntk', 'showHoverTranslations', shared.showHoverTranslations, true),
    reportFormat: enumConfigValue('i18ntk', 'reportFormat', shared.reportFormat, 'webview', ['webview', 'markdown']),
    maxScanFiles: getConfigValue('i18ntk', 'maxScanFiles', shared.maxScanFiles, 2000),
    exclude: getConfigValue('i18ntk', 'exclude', shared.exclude, ['node_modules', '.next', 'dist', 'build', 'coverage']),
    customWrappers: getConfigValue('i18ntk', 'customWrappers', shared.customWrappers, []),
    autoTranslateProvider: enumConfigValue('i18ntk', 'autoTranslateProvider', shared.autoTranslateProvider, 'google', ['google', 'deepl', 'libretranslate']),
    autoTranslateTargets: getConfigValue('i18ntk', 'autoTranslateTargets', shared.autoTranslateTargets, []),
    autoTranslateMode: enumConfigValue('i18ntk', 'autoTranslateMode', shared.autoTranslateMode, 'onlyMissing', ['onlyMissing', 'translateAll', 'dryRun'])
  };
}

export async function getConfiguredLocaleDirectory(rootPath: string): Promise<string> {
  const shared = getSharedWorkbenchSettings(await loadSharedConfig(rootPath));
  return getConfigValue('i18ntk', 'localeDirectory', shared.localeDirectory, '');
}
