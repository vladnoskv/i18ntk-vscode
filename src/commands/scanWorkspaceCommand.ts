import * as vscode from 'vscode';
import { resolveI18ntkConfig } from '../config/i18ntkConfigResolver';
import { I18ntkAdapter } from '../services/i18ntkAdapter';
import { Logger } from '../services/logger';
import { I18nReport, I18nScanResult } from '../types';

export interface ScanState {
  result?: I18nScanResult;
  report?: I18nReport;
}

export async function scanWorkspaceCommand(
  adapter: I18ntkAdapter,
  logger: Logger,
  state: ScanState,
  onUpdate: (result: I18nScanResult, report: I18nReport) => void
): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
    return;
  }

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Scanning workspace with i18ntk Workbench',
    cancellable: true
  }, async (progress: vscode.Progress<{ message?: string }>, token: vscode.CancellationToken) => {
    try {
      const rootPath = folder.uri.fsPath;
      token.onCancellationRequested(() => {
        logger.warn('Workspace scan was cancelled.');
        throw new vscode.CancellationError();
      });
      progress.report({ message: 'Resolving configuration...' });
      const config = await resolveI18ntkConfig(rootPath);
      if (token.isCancellationRequested) return;
      progress.report({ message: 'Scanning locale files...' });
      const result = await adapter.scanWorkspace(rootPath, config, token);
      if (token.isCancellationRequested) return;
      if (!config.localeDirectoryFound || result.localeFiles.length === 0) {
        const action = await vscode.window.showWarningMessage(
          'i18ntk did not find JSON locale files for this workspace. Choose the locale directory to finish setup.',
          'Choose Locale Folder',
          'Open Settings',
          'Keep Empty Result'
        );
        if (action === 'Choose Locale Folder') {
          await vscode.commands.executeCommand('i18ntk.chooseLocaleDirectory', { rescan: true, silent: true });
          return;
        }
        if (action === 'Open Settings') {
          await vscode.commands.executeCommand('i18ntk.openSettings');
          return;
        }
      }
      progress.report({ message: 'Generating report...' });
      const report = await adapter.generateReport(result);
      state.result = result;
      state.report = report;
      onUpdate(result, report);
      vscode.window.setStatusBarMessage(
        `i18ntk: ${result.locales.length} locales, ${result.missingKeys.length} missing, ${result.placeholderMismatches.length} placeholders`,
        8000
      );
      vscode.window.showInformationMessage(
        `i18ntk scan complete: ${result.locales.length} locales, ${result.missingKeys.length} missing keys, ${result.placeholderMismatches.length} placeholder issues, ${result.unusedKeys.length} unused keys.`
      );
    } catch (error) {
      if (error instanceof vscode.CancellationError) return;
      logger.error('Scan failed', error);
      vscode.window.showErrorMessage(`i18ntk scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

export function registerScanWorkspaceCommand(
  context: vscode.ExtensionContext,
  adapter: I18ntkAdapter,
  logger: Logger,
  state: ScanState,
  onUpdate: (result: I18nScanResult, report: I18nReport) => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('i18ntk.scanWorkspace', () =>
      scanWorkspaceCommand(adapter, logger, state, onUpdate)
    )
  );
}
