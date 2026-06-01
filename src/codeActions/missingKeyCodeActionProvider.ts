import * as vscode from 'vscode';

export class MissingKeyCodeActionProvider {
  provideCodeActions(_document: any, _range: any, context: any): any[] {
    const actions = [];
    for (const diagnostic of context.diagnostics || []) {
      if (diagnostic.source !== 'i18ntk') continue;
      const key = diagnostic.data?.key;
      if (!key) continue;

      if (diagnostic.code === 'i18ntk.missingKey') {
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

      const openAction = new vscode.CodeAction('Open translation key in locale files', vscode.CodeActionKind.QuickFix);
      openAction.diagnostics = [diagnostic];
      openAction.command = {
        command: 'i18ntk.openKeyInLocaleFiles',
        title: 'Open translation key in locale files',
        arguments: [key]
      };
      actions.push(openAction);

      const ignoreId = diagnostic.data?.ignoreId;
      if (typeof ignoreId === 'string') {
        const ignoreAction = new vscode.CodeAction('Ignore this i18ntk diagnostic', vscode.CodeActionKind.QuickFix);
        ignoreAction.diagnostics = [diagnostic];
        ignoreAction.command = {
          command: 'i18ntk.ignoreDiagnostic',
          title: 'Ignore this i18ntk diagnostic',
          arguments: [ignoreId]
        };
        actions.push(ignoreAction);
      }

      const code = typeof diagnostic.code === 'string' ? diagnostic.code : diagnostic.code?.value;
      if (typeof code === 'string') {
        const ignoreRuleAction = new vscode.CodeAction(`Turn off ${code}`, vscode.CodeActionKind.QuickFix);
        ignoreRuleAction.diagnostics = [diagnostic];
        ignoreRuleAction.command = {
          command: 'i18ntk.setDiagnosticSeverity',
          title: `Turn off ${code}`,
          arguments: [code, 'off']
        };
        actions.push(ignoreRuleAction);
      }
    }
    return actions;
  }
}
