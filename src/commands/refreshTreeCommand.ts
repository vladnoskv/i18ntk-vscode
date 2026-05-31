import * as vscode from 'vscode';
import { LocaleHealthTreeProvider } from '../tree/localeHealthTreeProvider';

export function registerRefreshTreeCommand(context: any, treeProvider: LocaleHealthTreeProvider): void {
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.refreshLocaleHealth', () => treeProvider.refresh()));
}
