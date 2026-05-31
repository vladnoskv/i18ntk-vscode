import * as vscode from 'vscode';
import { MissingKeyCodeActionProvider } from './codeActions/missingKeyCodeActionProvider';
import { registerAddMissingKeyCommand } from './commands/addMissingKeyCommand';
import { registerAutoTranslateCommand } from './commands/autoTranslateCommand';
import { registerOpenReportCommand } from './commands/openReportCommand';
import { openKeyInLocaleFilesCommand } from './commands/openKeyInLocaleFilesCommand';
import { registerRefreshTreeCommand } from './commands/refreshTreeCommand';
import { registerScanWorkspaceCommand, ScanState } from './commands/scanWorkspaceCommand';
import { DiagnosticsProvider } from './diagnostics/diagnosticsProvider';
import { TranslationHoverProvider } from './hover/translationHoverProvider';
import { LocalI18ntkAdapter } from './services/i18ntkAdapter';
import { OutputChannelLogger } from './services/logger';
import { KeyUsageService } from './services/keyUsageService';
import { WorkspaceScanner } from './services/workspaceScanner';
import { LocaleHealthTreeProvider } from './tree/localeHealthTreeProvider';
import { ReportWebviewPanel } from './webview/reportWebviewPanel';
import { WorkbenchSettingsPanel } from './webview/settingsWebviewPanel';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('i18ntk Workbench');
  const logger = new OutputChannelLogger(outputChannel);
  const scanner = new WorkspaceScanner(logger);
  const adapter = new LocalI18ntkAdapter(scanner, logger);
  const state: ScanState = {};
  const diagnostics = new DiagnosticsProvider();
  const treeProvider = new LocaleHealthTreeProvider();
  const keyUsage = new KeyUsageService();
  const reportPanel = new ReportWebviewPanel(context, async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  });

  context.subscriptions.push(outputChannel, diagnostics);
  vscode.window.registerTreeDataProvider('i18ntk.localeHealth', treeProvider);

  const handleScanResult = (result: any) => {
    keyUsage.update(result);
    treeProvider.setResult(result);
    if (vscode.workspace.getConfiguration('i18ntk').get('showInlineDiagnostics', true)) {
      diagnostics.update(result);
    }
  };

  registerScanWorkspaceCommand(context, adapter, logger, state, (result: any) => {
    handleScanResult(result);
  });
  registerRefreshTreeCommand(context, treeProvider);
  registerOpenReportCommand(context, state, reportPanel);
  registerAddMissingKeyCommand(context, state);
  registerAutoTranslateCommand(context, state, logger);
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openKeyInLocaleFiles', (key?: string) => openKeyInLocaleFilesCommand(keyUsage, key)));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openSettings', () => {
    WorkbenchSettingsPanel.open(context);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openNativeSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'i18ntk');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.validateLocales', async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
    if (!state.result) return;
    const issues: Array<{ key: string; locale?: string; message?: string }> = [...state.result.missingKeys.map((m: any) => ({ ...m, message: 'missing' })), ...state.result.placeholderMismatches.map((p: any) => ({ ...p, message: `missing ${p.missing?.join(',')}` })), ...state.result.riskyContent];
    if (issues.length === 0) {
      vscode.window.showInformationMessage('i18ntk: locales are clean — no missing keys, placeholder mismatches, or risky content.');
    } else {
      outputChannel.appendLine(`\n=== i18ntk Validation Results ===`);
      for (const issue of issues) {
        outputChannel.appendLine(`[${issue.locale ?? '-'}] ${issue.key}: ${issue.message ?? 'issue'}`);
      }
      outputChannel.appendLine(`Total issues: ${issues.length}`);
      outputChannel.show();
      vscode.window.showWarningMessage(`i18ntk: ${issues.length} issues found. See Output channel for details.`);
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
    vscode.window.showInformationMessage(`i18ntk usage: ${state.result.missingKeys.length} missing, ${state.result.unusedKeys.length} unused. Health: ${state.result.healthScore}%`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.showSummary', async () => {
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
    vscode.commands.executeCommand('i18ntk.openReport');
  }));

  try {
    const lensExtension = vscode.extensions.getExtension('vladnoskv.i18ntk-lens');
    if (lensExtension) {
      lensExtension.activate().then(() => {
        logger.info('i18ntk Lens detected — integrated into Workbench.');
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
    vscode.languages.registerHoverProvider(documentSelector, new TranslationHoverProvider(() => state.result)),
    vscode.languages.registerCodeActionsProvider(documentSelector, new MissingKeyCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    })
  );

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
    if (!vscode.workspace.getConfiguration('i18ntk').get('autoScanOnSave', false)) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, 750);
  }));

  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/locales/**/*.json');
  let watcherTimer: ReturnType<typeof setTimeout> | undefined;
  fileWatcher.onDidChange(() => {
    if (watcherTimer) clearTimeout(watcherTimer);
    watcherTimer = setTimeout(() => {
      logger.info('Locale file changed; marking report stale.');
      state.report = undefined;
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, 2000);
  });
  fileWatcher.onDidCreate(() => {
    if (watcherTimer) clearTimeout(watcherTimer);
    watcherTimer = setTimeout(() => {
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, 1000);
  });
  fileWatcher.onDidDelete(() => {
    if (watcherTimer) clearTimeout(watcherTimer);
    watcherTimer = setTimeout(() => {
      vscode.commands.executeCommand('i18ntk.scanWorkspace');
    }, 1000);
  });
  context.subscriptions.push(fileWatcher);

  const configWatcher = vscode.workspace.createFileSystemWatcher('**/i18ntk.config.{json,js}');
  configWatcher.onDidChange(() => {
    logger.info('i18ntk config changed; re-resolving and re-scanning.');
    vscode.commands.executeCommand('i18ntk.scanWorkspace');
  });
  configWatcher.onDidCreate(() => {
    vscode.commands.executeCommand('i18ntk.scanWorkspace');
  });
  context.subscriptions.push(configWatcher);
}

export function deactivate(): void {}
