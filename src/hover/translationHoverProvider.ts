import * as vscode from 'vscode';
import { I18nScanResult } from '../types';
import { detectTranslationKeysAt } from './keyDetector';
import { KeyUsageService } from '../services/keyUsageService';

export class TranslationHoverProvider {
  constructor(private readonly getResult: () => I18nScanResult | undefined) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const config = vscode.workspace.getConfiguration('i18ntk');
    if (!config.get('showHoverTranslations', true)) return undefined;

    const result = this.getResult();
    if (!result) return undefined;
    const content = document.getText();
    const offset = document.offsetAt(position);
    const match = detectTranslationKeysAt(content, offset);
    if (!match) return undefined;

    const keyUsage = new KeyUsageService(result);
    const values = keyUsage.getTranslations(match.key);
    const missing = keyUsage.getMissingLocales(match.key);
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = true;
    markdown.supportHtml = false;
    markdown.appendMarkdown(`**i18ntk: ${escapeMarkdown(match.key)}**\n\n`);
    if (Object.keys(values).length === 0) {
      markdown.appendMarkdown('Key not found in source locale.\n\nActions:\n- Add missing key\n- Run i18ntk scan');
    } else {
      markdown.appendMarkdown('| Locale | Value |\n|---|---|\n');
      for (const [locale, value] of Object.entries(values)) {
        markdown.appendMarkdown(`| ${escapeMarkdown(locale)} | ${escapeMarkdown(value || '')} |\n`);
      }
      if (missing.length > 0) {
        markdown.appendMarkdown(`\nMissing: ${escapeMarkdown(missing.join(', '))}\n\n[Add missing key](command:i18ntk.addMissingKey?%22${encodeURIComponent(match.key)}%22)`);
      }
    }
    return new vscode.Hover(markdown);
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\|`*_{}\[\]()#+\-.!]/g, '\\$&');
}
