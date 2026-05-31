import * as vscode from 'vscode';
import { ReportWebviewPanel } from '../webview/reportWebviewPanel';
import { ScanState } from './scanWorkspaceCommand';

export function registerOpenReportCommand(context: any, state: ScanState, panel: ReportWebviewPanel): void {
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openReport', () => {
    if (!state.report) {
      vscode.window.showWarningMessage('Run i18ntk: Scan Workspace before opening the report.');
      return;
    }
    panel.open(state.report);
  }));
}
