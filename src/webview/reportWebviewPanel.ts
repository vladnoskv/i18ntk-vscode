import * as vscode from 'vscode';
import path from 'node:path';
import { I18ntkIssue, I18ntkReport, WebviewToExtensionMessage } from '../types';
import { renderReportHtml } from './reportHtmlRenderer';

export class ReportWebviewPanel {
  private panel: vscode.WebviewPanel | undefined;
  private currentReport: I18ntkReport | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  open(report: I18ntkReport): void {
    this.currentReport = report;
    this.ensurePanel();
    this.panel!.webview.html = renderReportHtml(report, createNonce(), getIgnoredDiagnostics());
    this.panel!.reveal();
  }

  showLoading(): void {
    this.ensurePanel();
    this.panel!.webview.html = this.renderMessage('Loading i18ntk report...', undefined);
    this.panel!.reveal();
  }

  showError(message: string, details?: string): void {
    this.ensurePanel();
    this.panel!.webview.html = this.renderMessage(message, details);
    this.panel!.reveal();
  }

  private ensurePanel(): void {
    if (this.panel) return;
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
    panel.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => this.handleMessage(message), null, this.context.subscriptions);
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'refreshReport':
        await vscode.commands.executeCommand('i18ntkWorkbench.refreshReport');
        break;
      case 'exportReport':
        await vscode.commands.executeCommand(`i18ntkWorkbench.exportReport${capitalize(message.format)}`);
        break;
      case 'openIssue':
        await this.openIssue(message.issueId);
        break;
      case 'ignoreIssues':
        await this.ignoreIssues(message.issueIds);
        break;
      case 'openFile':
        await this.openFile(message.file, message.line, message.column);
        break;
    }
  }

  private async openIssue(issueId: string): Promise<void> {
    const issue = this.currentReport?.issues.find((item: I18ntkIssue) => item.id === issueId);
    if (!issue?.file) return;
    await this.openFile(issue.file, issue.line, issue.column);
  }

  private async ignoreIssues(issueIds: string[]): Promise<void> {
    if (!this.currentReport || issueIds.length === 0) return;
    const ignoreIds = issueIds
      .map((id) => this.currentReport?.issues.find((item) => item.id === id))
      .filter((issue): issue is I18ntkIssue => Boolean(issue))
      .map(reportIssueIgnoreId)
      .filter((id): id is string => Boolean(id));
    if (ignoreIds.length === 0) return;

    const config = vscode.workspace.getConfiguration('i18ntk');
    const ignored = new Set(config.get('ignoredDiagnostics', []) as string[]);
    ignoreIds.forEach((id) => ignored.add(id));
    await config.update('ignoredDiagnostics', [...ignored].sort(), vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Ignored ${ignoreIds.length} i18ntk report issue${ignoreIds.length === 1 ? '' : 's'}.`);
    this.panel!.webview.html = renderReportHtml(this.currentReport, createNonce(), [...ignored]);
    await vscode.commands.executeCommand('i18ntk.refreshDiagnostics');
  }

  private async openFile(file: string, line?: number, column?: number): Promise<void> {
    const root = this.currentReport?.projectRoot;
    if (!root) return;
    const absolutePath = path.isAbsolute(file) ? file : path.resolve(root, file);
    const relative = path.relative(root, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      vscode.window.showWarningMessage('i18ntk refused to open a report path outside the workspace.');
      return;
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(absolutePath));
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    if (line && line > 0) {
      const position = new vscode.Position(line - 1, Math.max(0, (column || 1) - 1));
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }

  private renderMessage(message: string, details?: string): string {
    const nonce = createNonce();
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-foreground);padding:24px}p{color:var(--vscode-descriptionForeground);white-space:pre-wrap}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:7px 10px;border-radius:3px;cursor:pointer}</style></head>
<body><h1>${escapeHtml(message)}</h1>${details ? `<p>${escapeHtml(details)}</p>` : ''}<button id="refresh">Refresh</button>
<script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById('refresh').addEventListener('click',()=>vscode.postMessage({type:'refreshReport'}));</script></body></html>`;
  }
}

function getIgnoredDiagnostics(): string[] {
  return vscode.workspace.getConfiguration('i18ntk').get('ignoredDiagnostics', []) as string[];
}

function reportIssueIgnoreId(issue: I18ntkIssue): string | undefined {
  const code = issueTypeToDiagnosticCode(issue.type);
  if (!code || !issue.key) return undefined;
  return [code, issue.key, issue.locale].filter(Boolean).join(':');
}

function issueTypeToDiagnosticCode(type: I18ntkIssue['type']): string | undefined {
  switch (type) {
    case 'missing_key': return 'i18ntk.missingKey';
    case 'unused_key': return 'i18ntk.unusedKey';
    case 'placeholder_mismatch': return 'i18ntk.placeholderMismatch';
    case 'likely_untranslated': return 'i18ntk.riskyContent';
    case 'expansion_risk': return 'i18ntk.expansionRisk';
    default: return undefined;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}
