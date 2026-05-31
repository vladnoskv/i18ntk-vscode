import * as vscode from 'vscode';
import { ResolvedI18ntkConfig } from '../types';

export function getExtensionConfig(rootPath: string, localeDirectory: string): ResolvedI18ntkConfig {
  const config = vscode.workspace.getConfiguration('i18ntk');
  return {
    rootPath,
    localeDirectory,
    sourceLocale: config.get('sourceLocale', 'en'),
    keyStyle: config.get('keyStyle', 'dot'),
    autoScanOnSave: config.get('autoScanOnSave', false),
    showInlineDiagnostics: config.get('showInlineDiagnostics', true),
    showHoverTranslations: config.get('showHoverTranslations', true),
    reportFormat: config.get('reportFormat', 'webview'),
    maxScanFiles: config.get('maxScanFiles', 5000),
    exclude: config.get('exclude', ['node_modules', '.next', 'dist', 'build', 'coverage'])
  };
}

export function getConfiguredLocaleDirectory(): string {
  return vscode.workspace.getConfiguration('i18ntk').get('localeDirectory', '');
}
