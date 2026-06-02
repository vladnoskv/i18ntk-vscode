import * as vscode from 'vscode';
import { t } from '../i18ntk/localization';
import { ReportWebviewPanel } from '../webview/reportWebviewPanel';
import { ScanState } from './scanWorkspaceCommand';

export function registerOpenReportCommand(context: any, state: ScanState, panel: ReportWebviewPanel): void {
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.openReport', async () => {
    if (!state.report) {
      vscode.window.showWarningMessage(t('workbench.messages.reportNeedsScan'));
      return;
    }
    if (vscode.workspace.getConfiguration('i18ntk').get('reportFormat', 'webview') === 'markdown') {
      const document = await vscode.workspace.openTextDocument({ content: state.report.markdown, language: 'markdown' });
      await vscode.window.showTextDocument(document, { preview: false });
      return;
    }
    panel.open(state.report);
  }));
}
