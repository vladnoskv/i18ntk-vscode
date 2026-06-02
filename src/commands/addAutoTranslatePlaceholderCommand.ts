import * as vscode from 'vscode';
import fs from 'node:fs/promises';
import path from 'node:path';

export function registerAddAutoTranslatePlaceholderCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.addAutoTranslatePlaceholder', async (key?: string) => {
    const resolvedKey = key || await vscode.window.showInputBox({ prompt: 'Translation key to protect during Auto Translate' });
    if (!resolvedKey) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
      return;
    }

    const filePath = path.join(folder.uri.fsPath, 'i18ntk-auto-translate.json');
    const config = await readProtectionFile(filePath);
    const keys = new Set(Array.isArray(config.keys) ? config.keys.filter((item): item is string => typeof item === 'string') : []);
    keys.add(resolvedKey);
    config.version = typeof config.version === 'number' ? config.version : 1;
    config.terms = Array.isArray(config.terms) ? config.terms : [];
    config.keys = [...keys].sort();
    config.values = Array.isArray(config.values) ? config.values : [];
    config.patterns = Array.isArray(config.patterns) ? config.patterns : [];

    await fs.writeFile(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    vscode.window.showInformationMessage(`Added "${resolvedKey}" to i18ntk Auto Translate protection keys.`);
    await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  }));
}

async function readProtectionFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return { version: 1, terms: [], keys: [], values: [], patterns: [] };
  }
}
