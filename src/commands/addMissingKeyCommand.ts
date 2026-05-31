import * as vscode from 'vscode';
import { resolveI18ntkConfig } from '../config/i18ntkConfigResolver';
import { LocaleFileService } from '../services/localeFileService';
import { ScanState } from './scanWorkspaceCommand';

export function registerAddMissingKeyCommand(context: any, state: ScanState): void {
  const service = new LocaleFileService();
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.addMissingKey', async (key?: string) => {
    const resolvedKey = key || await vscode.window.showInputBox({ prompt: 'Translation key to add' });
    if (!resolvedKey) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
      return;
    }
    const sourceText = await vscode.window.showInputBox({
      prompt: `Source text for ${resolvedKey}`,
      value: `TODO: ${resolvedKey}`
    });
    const config = await resolveI18ntkConfig(folder.uri.fsPath);
    const locales = state.result?.locales.length ? state.result.locales : [config.sourceLocale];
    const changed: string[] = [];
    for (const locale of locales) {
      const value = locale === config.sourceLocale ? (sourceText || `TODO: ${resolvedKey}`) : `TODO: ${resolvedKey}`;
      changed.push(await service.addKey(config, locale, resolvedKey, value));
    }
    vscode.window.showInformationMessage(`Added "${resolvedKey}" to ${changed.length} locale file(s).`);
    state.report = undefined;
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  }));
}
