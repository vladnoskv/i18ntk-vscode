import * as vscode from 'vscode';
import { I18nReport } from '../types';
import { renderReportHtml } from './reportHtmlRenderer';

export class ReportWebviewPanel {
  private panel: vscode.WebviewPanel | undefined;
  private currentReport: I18nReport | undefined;

  constructor(private readonly context: vscode.ExtensionContext, private readonly onRefresh: () => Promise<void>) {}

  open(report: I18nReport): void {
    this.currentReport = report;
    if (!this.panel) {
      const panel = vscode.window.createWebviewPanel(
        'i18ntkReport',
        'i18ntk Workbench Report',
        { viewColumn: vscode.ViewColumn.One, preserveFocus: true },
        { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] }
      );
      this.panel = panel;
      panel.onDidDispose(() => {
        this.panel = undefined;
      }, null, this.context.subscriptions);
      panel.webview.onDidReceiveMessage(async (message: any) => {
        switch (message.command) {
          case 'refresh':
            await this.onRefresh();
            break;
          case 'exportMarkdown':
            if (this.currentReport) {
              await vscode.env.clipboard.writeText(this.currentReport.markdown);
              vscode.window.showInformationMessage('Report markdown copied to clipboard.');
            }
            break;
          case 'copyIssue':
            if (message.issueText) {
              await vscode.env.clipboard.writeText(message.issueText);
              vscode.window.showInformationMessage('Issue copied to clipboard.');
            }
            break;
          case 'saveReport':
            if (this.currentReport) {
              await this.saveReportToFile(this.currentReport);
            }
            break;
          case 'validateLocales':
            await vscode.commands.executeCommand('i18ntk.validateLocales');
            break;
          case 'analyzeUsage':
            await vscode.commands.executeCommand('i18ntk.analyzeUsage');
            break;
          case 'autoTranslate':
            await vscode.commands.executeCommand('i18ntk.autoTranslateMissing');
            break;
          case 'addMissingKey':
            await vscode.commands.executeCommand('i18ntk.addMissingKey', message.key);
            break;
          case 'openSettings':
            await vscode.commands.executeCommand('i18ntk.openSettings');
            break;
          case 'openFile':
            if (message.filePath) {
              const uri = vscode.Uri.file(message.filePath);
              await vscode.window.showTextDocument(uri, { preview: false });
            }
            break;
        }
      }, null, this.context.subscriptions);
    }
    const nonce = createNonce();
    this.panel!.webview.html = renderReportHtml(report, nonce);
    this.panel!.reveal();
  }

  private async saveReportToFile(report: I18nReport): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showWarningMessage('No workspace open to save the report.');
      return;
    }
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${folder.uri.fsPath}/i18ntk-report.md`),
      filters: { 'Markdown': ['md'], 'All Files': ['*'] }
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(report.markdown, 'utf8'));
      vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
    }
  }
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}
