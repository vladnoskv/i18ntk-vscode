import * as vscode from 'vscode';
import path from 'node:path';
import { MissingKeyCodeActionProvider } from './codeActions/missingKeyCodeActionProvider';
import { registerAddAutoTranslatePlaceholderCommand } from './commands/addAutoTranslatePlaceholderCommand';
import { registerAddMissingKeyCommand } from './commands/addMissingKeyCommand';
import { registerAutoTranslateCommand } from './commands/autoTranslateCommand';
import { registerConfigureLocaleDirectoryCommands } from './commands/configureLocaleDirectoryCommand';
import { registerOpenReportCommand } from './commands/openReportCommand';
import { openKeyInLocaleFilesCommand } from './commands/openKeyInLocaleFilesCommand';
import { registerRefreshTreeCommand } from './commands/refreshTreeCommand';
import { registerScanWorkspaceCommand, ScanState } from './commands/scanWorkspaceCommand';
import { TranslationKeyCompletionProvider } from './completions/translationKeyCompletionProvider';
import { LocaleFileDecorationProvider } from './decorations/localeFileDecorationProvider';
import { LocaleKeyDecorationProvider } from './decorations/localeKeyDecorationProvider';
import { DiagnosticsProvider } from './diagnostics/diagnosticsProvider';
import { TranslationGridEditorProvider } from './editors/translationGridEditorProvider';
import { TranslationHoverProvider } from './hover/translationHoverProvider';
import { setExtensionLanguage, t } from './i18ntk/localization';
import { I18nDocumentLinkProvider } from './links/i18nDocumentLinkProvider';
import { I18nSemanticTokensProvider } from './semantic/i18nSemanticTokensProvider';
import { LocalI18ntkAdapter } from './services/i18ntkAdapter';
import { OutputChannelLogger } from './services/logger';
import { KeyUsageService } from './services/keyUsageService';
import { WorkspaceScanner } from './services/workspaceScanner';
import { I18nStatusBarItem } from './status/i18nStatusBarItem';
import { LocaleHealthTreeProvider } from './tree/localeHealthTreeProvider';
import { ReportWebviewPanel } from './webview/reportWebviewPanel';
import { WorkbenchSettingsPanel } from './webview/settingsWebviewPanel';
import { DiagnosticRuleSeverity } from './types';
import { getConfigValue, getSharedWorkbenchSettings, loadSharedConfig } from './config/sharedConfig';

export function activate(context: vscode.ExtensionContext): void {
  void applyInitialSharedSettings();
  const outputChannel = vscode.window.createOutputChannel('i18ntk Workbench');
  const logger = new OutputChannelLogger(outputChannel);
  const scanner = new WorkspaceScanner(logger);
  const adapter = new LocalI18ntkAdapter(scanner, logger);
  const state: ScanState = {};
  const diagnostics = new DiagnosticsProvider();
  const localeKeyDecorations = new LocaleKeyDecorationProvider();
  const treeProvider = new LocaleHealthTreeProvider();
  const keyUsage = new KeyUsageService();
  const reportPanel = new ReportWebviewPanel(context);
  const lensExtension =
    vscode.extensions.getExtension('VladNoskov.i18ntk-lens') ??
    vscode.extensions.getExtension('vladnoskv.i18ntk-lens');
  const hasLensExtension = Boolean(lensExtension);

  const isLensActive = (): boolean => Boolean(
    vscode.extensions.getExtension('VladNoskov.i18ntk-lens') ??
    vscode.extensions.getExtension('vladnoskv.i18ntk-lens')
  );

  const statusBar = new I18nStatusBarItem();
  statusBar.update(undefined);
  const fileDecorations = new LocaleFileDecorationProvider();
  const completionProvider = new TranslationKeyCompletionProvider();
  const semanticTokensProvider = new I18nSemanticTokensProvider();
  const documentLinkProvider = new I18nDocumentLinkProvider();

  completionProvider.setResultProvider(() => {
    const result = state.result;
    if (!result) return undefined;
    return {
      allKeys: Object.keys(result.keyValues[result.sourceLocale] ?? {}).sort(),
      keyValues: result.keyValues,
      sources: result.sourceUsages.map((u) => ({ key: u.key, filePath: u.filePath }))
    };
  });

  semanticTokensProvider.setResultProvider(() => {
    const result = state.result;
    if (!result) return undefined;
    const allKeys = new Set<string>();
    for (const locale of result.locales) {
      const values = result.keyValues[locale];
      if (values) Object.keys(values).forEach((k) => allKeys.add(k));
    }
    const missingKeys = new Set(result.missingKeys.map((m) => m.key));
    return { allKeys, missingKeys };
  });

  documentLinkProvider.setResultProvider(() => {
    const result = state.result;
    if (!result) return undefined;
    return {
      keyValues: result.keyValues,
      localeFiles: result.localeFiles.map((f) => ({ filePath: f.filePath, keys: f.keys })),
      sourceUsages: result.sourceUsages.map((u) => ({ key: u.key, filePath: u.filePath, range: u.range }))
    };
  });

  context.subscriptions.push(outputChannel, diagnostics, localeKeyDecorations, statusBar);
  vscode.window.registerTreeDataProvider('i18ntk.localeHealth', treeProvider);
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(fileDecorations));
  context.subscriptions.push(TranslationGridEditorProvider.register(context, () => state.result));

  const handleScanResult = (result: any) => {
    keyUsage.update(result);
    treeProvider.setResult(result);
    localeKeyDecorations.update(result);
    statusBar.update(result);
    const sourceKeys = Object.keys(result.keyValues[result.sourceLocale] ?? {});
    const totalSourceKeyCount = sourceKeys.length;
    fileDecorations.update(
      result.localeFiles.map((f: any) => {
        const localeKeys = result.keyValues[f.locale] ?? {};
        const coveredKeys = sourceKeys.filter((k: string) => localeKeys[k] !== undefined && localeKeys[k] !== null).length;
        return {
          path: f.filePath,
          coveredKeys,
          totalKeys: totalSourceKeyCount,
          missingKeys: totalSourceKeyCount - coveredKeys
        };
      })
    );
    if (isLensActive() || !vscode.workspace.getConfiguration('i18ntk').get('showInlineDiagnostics', true)) {
      diagnostics.update(undefined);
    } else {
      diagnostics.update(result);
    }
  };

  registerScanWorkspaceCommand(context, adapter, logger, state, (result: any) => {
    handleScanResult(result);
  });
  // Clear diagnostics before scan starts to prevent stale linting
  state.onClearDiagnostics = () => diagnostics.update(undefined);
  registerRefreshTreeCommand(context, treeProvider);
  registerOpenReportCommand(context, logger, reportPanel);
  registerAddAutoTranslatePlaceholderCommand(context);
  registerAddMissingKeyCommand(context, state);
  registerAutoTranslateCommand(context, state, logger);
  registerConfigureLocaleDirectoryCommands(context, logger);
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openKeyInLocaleFiles', (key?: string) => openKeyInLocaleFilesCommand(keyUsage, key)));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openSettings', () => {
    WorkbenchSettingsPanel.open(context);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openNativeSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'i18ntk');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.ignoreDiagnostic', async (ignoreId?: string) => {
    if (!ignoreId) return;
    const config = vscode.workspace.getConfiguration('i18ntk');
    const ignored = new Set(config.get('ignoredDiagnostics', []) as string[]);
    ignored.add(ignoreId);
    await config.update('ignoredDiagnostics', [...ignored].sort(), vscode.ConfigurationTarget.Workspace);
    diagnostics.refresh();
  }));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.setDiagnosticSeverity', async (code?: string, severity?: DiagnosticRuleSeverity) => {
    if (!code || !severity) return;
    const config = vscode.workspace.getConfiguration('i18ntk');
    const severities = { ...(config.get('diagnosticSeverities', {}) as Record<string, DiagnosticRuleSeverity>) };
    severities[code] = severity;
    await config.update('diagnosticSeverities', severities, vscode.ConfigurationTarget.Workspace);
    diagnostics.refresh();
  }));

  // Clear all i18ntk diagnostics
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.clearDiagnostics', () => {
    diagnostics.update(undefined);
    fileDecorations.clear();
    statusBar.update(undefined);
    vscode.window.showInformationMessage(t('workbench.messages.diagnosticsCleared'));
  }));

  // Refresh diagnostics from current scan data without re-scanning
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.refreshDiagnostics', () => {
    if (!state.result) {
      vscode.window.showWarningMessage(t('workbench.messages.reportNeedsScan'));
      return;
    }
    if (isLensActive() || !vscode.workspace.getConfiguration('i18ntk').get('showInlineDiagnostics', true)) {
      diagnostics.update(undefined);
    } else {
      diagnostics.update(state.result);
    }
    vscode.window.showInformationMessage(t('workbench.messages.diagnosticsRefreshed'));
  }));

  // Rebuild all visual providers from current scan data (for external cleaner interop)
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.rebuildAllDecorations', () => {
    if (!state.result) {
      vscode.window.showWarningMessage(t('workbench.messages.reportNeedsScan'));
      return;
    }
    handleScanResult(state.result);
    diagnostics.refresh();
    vscode.window.showInformationMessage(t('workbench.messages.decorationsRebuilt'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.validateLocales', async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
    if (!state.result) return;
    const issues: Array<{ key: string; locale?: string; message?: string }> = [...state.result.missingKeys.map((m: any) => ({ ...m, message: 'missing' })), ...state.result.placeholderMismatches.map((p: any) => ({ ...p, message: `missing ${p.missing?.join(',')}` })), ...state.result.riskyContent];
    if (issues.length === 0) {
      vscode.window.showInformationMessage(t('workbench.messages.localesClean'));
    } else {
      outputChannel.appendLine(`\n=== i18ntk Validation Results ===`);
      for (const issue of issues) {
        outputChannel.appendLine(`[${issue.locale ?? '-'}] ${issue.key}: ${issue.message ?? 'issue'}`);
      }
      outputChannel.appendLine(`Total issues: ${issues.length}`);
      outputChannel.show();
      vscode.window.showWarningMessage(t('workbench.messages.validationIssues', { count: issues.length }));
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.analyzeUsage', async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
    if (!state.result) return;
    outputChannel.appendLine(`\n=== i18ntk Usage Analysis ===`);
    outputChannel.appendLine(`Source locales: ${state.result.locales.join(', ')}`);
    outputChannel.appendLine(`Total keys in source: ${state.result.totalKeys}`);
    outputChannel.appendLine(`Keys used in source code: ${state.result.sourceUsages.length} unique (${new Set(state.result.sourceUsages.map((u: any) => u.key)).size} distinct)`);
    outputChannel.appendLine(`Missing translations: ${state.result.missingKeys.length}`);
    outputChannel.appendLine(`Unused keys: ${state.result.unusedKeys.length}`);
    outputChannel.appendLine(`Placeholder mismatches: ${state.result.placeholderMismatches.length}`);
    outputChannel.appendLine(`Expansion risks: ${state.result.expansionRisks.length}`);
    outputChannel.appendLine(`Health score: ${state.result.healthScore}%`);
    outputChannel.show();
    vscode.window.showInformationMessage(t('workbench.messages.usageSummary', {
      missing: state.result.missingKeys.length,
      unused: state.result.unusedKeys.length,
      health: state.result.healthScore
    }));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.showSummary', async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
    vscode.commands.executeCommand('i18ntk.openReport');
  }));

  try {
    if (lensExtension) {
      lensExtension.activate().then(() => {
        logger.info('i18ntk Lens detected - Lens owns inline hovers and diagnostics; Workbench keeps sidebar and reports.');
      }).catch(() => {
        logger.info('i18ntk Lens activation failed.');
      });
      context.subscriptions.push(vscode.commands.registerCommand('i18ntk.lensScan', () => {
        vscode.commands.executeCommand('i18ntkLens.scan');
      }));
      context.subscriptions.push(vscode.commands.registerCommand('i18ntk.lensOpenKey', () => {
        vscode.commands.executeCommand('i18ntkLens.openKeyInLocaleFiles');
      }));
      context.subscriptions.push(vscode.commands.registerCommand('i18ntk.lensOpenSettings', () => {
        vscode.commands.executeCommand('i18ntkLens.openSettings');
      }));
    }
  } catch {
    logger.info('i18ntk Lens not detected.');
  }

  const documentSelector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'vue' },
    { scheme: 'file', language: 'svelte' },
    { scheme: 'file', language: 'json' },
    { scheme: 'file', pattern: '**/*.{ts,tsx,js,jsx,vue,svelte}' }
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(documentSelector, new MissingKeyCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    })
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      documentSelector,
      completionProvider,
      "'", '"', '`'
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      documentSelector,
      semanticTokensProvider,
      semanticTokensProvider.getLegend()
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      documentSelector,
      documentLinkProvider
    )
  );
  if (!hasLensExtension) {
    context.subscriptions.push(vscode.languages.registerHoverProvider(documentSelector, new TranslationHoverProvider(() => state.result)));
  }

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openTranslationGrid', async (fileUri?: vscode.Uri) => {
    let uri: vscode.Uri;
    if (fileUri) {
      uri = fileUri;
    } else {
      const result = state.result;
      if (!result || result.localeFiles.length === 0) {
        vscode.window.showWarningMessage(t('workbench.messages.noLocaleFiles'));
        return;
      }
      const items = result.localeFiles.map((f) => ({
        label: `${f.locale} — ${f.namespace || path.basename(f.filePath, '.json')}`,
        description: f.filePath,
        uri: vscode.Uri.file(f.filePath)
      }));
      const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a locale file to open in Translation Grid' });
      if (!picked) return;
      uri = picked.uri;
    }
    await vscode.commands.executeCommand('vscode.openWith', uri, TranslationGridEditorProvider.viewType);
  }));

  void runStartupScanIfEnabled();

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async () => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const shared = getSharedWorkbenchSettings(root ? await loadSharedConfig(root) : undefined);
    if (!getConfigValue('i18ntk', 'autoScanOnSave', shared.autoScanOnSave, false)) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, 750);
  }));

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration('i18ntk.extensionLanguage')) {
      setExtensionLanguage(vscode.workspace.getConfiguration('i18ntk').get('extensionLanguage', 'auto'), vscode.env.language);
      vscode.window.showInformationMessage(t('workbench.messages.extensionLanguageUpdated', {}, 'i18ntk Workbench language updated.'));
    }
    if (event.affectsConfiguration('i18ntk.diagnosticSeverities') || event.affectsConfiguration('i18ntk.ignoredDiagnostics')) {
      if (!isLensActive()) diagnostics.refresh();
    }
    if (event.affectsConfiguration('i18ntk.showInlineDiagnostics')) {
      if (!isLensActive()) {
        if (!vscode.workspace.getConfiguration('i18ntk').get('showInlineDiagnostics', true)) {
          diagnostics.update(undefined);
        } else if (state.result) {
          diagnostics.update(state.result);
        }
      }
    }
    if (event.affectsConfiguration('i18ntk.showStatusBar')) {
      statusBar.update(state.result);
    }
    if (event.affectsConfiguration('i18ntk.enableFileBadges')) {
      fileDecorations.clear();
      const currentResult = state.result;
      if (currentResult) {
        const sourceKeys = Object.keys(currentResult.keyValues[currentResult.sourceLocale] ?? {});
        const totalSourceKeyCount = sourceKeys.length;
        fileDecorations.update(
          currentResult.localeFiles.map((f: any) => {
            const localeKeys = currentResult.keyValues[f.locale] ?? {};
            const coveredKeys = sourceKeys.filter((k: string) => localeKeys[k] !== undefined && localeKeys[k] !== null).length;
            return {
              path: f.filePath,
              coveredKeys,
              totalKeys: totalSourceKeyCount,
              missingKeys: totalSourceKeyCount - coveredKeys
            };
          })
        );
      }
    }
  }));

  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/locales/**/*.json');
  let watcherTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleFileChangeScan = (delay: number, markReportStale: boolean): void => {
    if (!vscode.workspace.getConfiguration('i18ntk').get('autoScanOnFileChange', false)) return;
    if (watcherTimer) clearTimeout(watcherTimer);
    watcherTimer = setTimeout(() => {
      if (markReportStale) {
        logger.info('Locale file changed; marking report stale.');
        state.report = undefined;
      }
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, delay);
  };
  fileWatcher.onDidChange(() => {
    scheduleFileChangeScan(2000, true);
  });
  fileWatcher.onDidCreate(() => {
    scheduleFileChangeScan(1000, false);
  });
  fileWatcher.onDidDelete(() => {
    scheduleFileChangeScan(1000, false);
  });
  context.subscriptions.push(fileWatcher);

  const configWatcher = vscode.workspace.createFileSystemWatcher('**/i18ntk.config.{json,js}');
  configWatcher.onDidChange(() => {
    if (!vscode.workspace.getConfiguration('i18ntk').get('autoScanOnFileChange', false)) return;
    logger.info('i18ntk config changed; re-resolving and re-scanning.');
    vscode.commands.executeCommand('i18ntk.scanWorkspace');
  });
  configWatcher.onDidCreate(() => {
    if (!vscode.workspace.getConfiguration('i18ntk').get('autoScanOnFileChange', false)) return;
    vscode.commands.executeCommand('i18ntk.scanWorkspace');
  });
  context.subscriptions.push(configWatcher);
}

async function applyInitialSharedSettings(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const shared = getSharedWorkbenchSettings(root ? await loadSharedConfig(root) : undefined);
  setExtensionLanguage(getConfigValue('i18ntk', 'extensionLanguage', shared.extensionLanguage, 'auto'), vscode.env.language);
}

async function runStartupScanIfEnabled(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const shared = getSharedWorkbenchSettings(root ? await loadSharedConfig(root) : undefined);
  if (getConfigValue('i18ntk', 'scanOnStartup', shared.scanOnStartup, false)) {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  }
}

export function deactivate(): void {}

