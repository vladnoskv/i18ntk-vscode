import * as vscode from 'vscode';
import { t } from '../i18ntk/localization';
import { KeyUsageService } from '../services/keyUsageService';

export async function openKeyInLocaleFilesCommand(keyUsage: KeyUsageService, key?: string): Promise<void> {
  const actualKey = key ?? await vscode.window.showInputBox({ title: t('workbench.titles.openTranslationKey') });
  if (!actualKey) return;
  const files = keyUsage.findLocaleFilesForKey(actualKey);
  if (files.length === 0) {
    vscode.window.showWarningMessage(t('workbench.messages.keyNotFound', { key: actualKey }));
    return;
  }
  for (const file of files.slice(0, 8)) {
    await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: false });
  }
}
