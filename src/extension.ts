import * as vscode from 'vscode';
import { MissingKeyCodeActionProvider } from './codeActions/missingKeyCodeActionProvider';
import { registerAddMissingKeyCommand } from './commands/addMissingKeyCommand';
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
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openKeyInLocaleFiles', (key?: string) => openKeyInLocaleFilesCommand(keyUsage, key)));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'i18ntk');
  }));

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
