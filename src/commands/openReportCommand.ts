import * as vscode from 'vscode';
import path from 'node:path';
import { resolveI18ntkConfig } from '../config/i18ntkConfigResolver';
import { t } from '../i18ntk/localization';
import { I18ntkCliService, ReportExportFormat } from '../services/i18ntkCliService';
import { Logger } from '../services/logger';
import { ReportWebviewPanel } from '../webview/reportWebviewPanel';

export function registerOpenReportCommand(context: vscode.ExtensionContext, logger: Logger, panel: ReportWebviewPanel): void {
  const cli = new I18ntkCliService(logger);

  const openReport = async (): Promise<void> => {
    const folder = await selectWorkspaceFolder();
    if (!folder) {
      vscode.window.showWarningMessage(t('workbench.messages.reportNeedsScan'));
      return;
    }
    panel.showLoading();
    try {
      const config = await resolveI18ntkConfig(folder.uri.fsPath);
      const report = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running i18ntk report',
        cancellable: false
      }, () => cli.generateReport(config));
      panel.open(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`i18ntk report failed: ${message}`);
      panel.showError('i18ntk report failed', message);
      vscode.window.showErrorMessage(`i18ntk report failed: ${message}`);
    }
  };

  const exportReport = async (format: ReportExportFormat): Promise<void> => {
    const folder = await selectWorkspaceFolder();
    if (!folder) {
      vscode.window.showWarningMessage('Open a workspace before exporting an i18ntk report.');
      return;
    }
    try {
      const config = await resolveI18ntkConfig(folder.uri.fsPath);
      const outDir = path.join(folder.uri.fsPath, 'i18ntk-reports');
      const report = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Exporting i18ntk ${format.toUpperCase()} report`,
        cancellable: false
      }, () => cli.generateReport(config, { outDir, formats: [format] }));
      panel.open(report);
      const exported = report.exports?.[format];
      if (exported) {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(exported));
        await vscode.window.showTextDocument(document, { preview: false });
        vscode.window.showInformationMessage(`i18ntk ${format.toUpperCase()} report exported to ${exported}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`i18ntk report export failed: ${message}`);
      panel.showError('i18ntk report export failed', message);
      vscode.window.showErrorMessage(`i18ntk report export failed: ${message}`);
    }
  };

  context.subscriptions.push(vscode.commands.registerCommand('i18ntkWorkbench.openReport', openReport));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntkWorkbench.refreshReport', openReport));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntkWorkbench.exportReportJson', () => exportReport('json')));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntkWorkbench.exportReportMarkdown', () => exportReport('markdown')));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntkWorkbench.exportReportHtml', () => exportReport('html')));
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openReport', openReport));
}

async function selectWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  if (folders.length === 1) return folders[0];
  const items: Array<{ label: string; description: string; folder: vscode.WorkspaceFolder }> =
    folders.map((folder: vscode.WorkspaceFolder) => ({ label: folder.name, description: folder.uri.fsPath, folder }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select workspace folder for the i18ntk report' });
  return picked?.folder;
}
