import * as vscode from 'vscode';

export class MissingKeyCodeActionProvider {
  provideCodeActions(_document: any, _range: any, context: any): any[] {
    const actions = [];
    for (const diagnostic of context.diagnostics || []) {
      if (diagnostic.source !== 'i18ntk' || diagnostic.code !== 'i18ntk.missingKey') continue;
      const key = diagnostic.data?.key;
      if (!key) continue;
      const action = new vscode.CodeAction('Add missing translation key', vscode.CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      action.command = {
        command: 'i18ntk.addMissingKey',
        title: 'Add missing translation key',
        arguments: [key]
      };
      actions.push(action);
    }
    return actions;
  }
}
