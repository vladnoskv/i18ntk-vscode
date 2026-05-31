import * as vscode from 'vscode';
import { KeyUsageService } from '../services/keyUsageService';

export async function openKeyInLocaleFilesCommand(keyUsage: KeyUsageService, key?: string): Promise<void> {
  const actualKey = key ?? await vscode.window.showInputBox({ title: 'Translation key to open' });
  if (!actualKey) return;
  const files = keyUsage.findLocaleFilesForKey(actualKey);
  if (files.length === 0) {
    vscode.window.showWarningMessage(`i18ntk: key "${actualKey}" was not found in locale files.`);
    return;
  }
  for (const file of files.slice(0, 8)) {
    await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: false });
  }
}
