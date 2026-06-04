import * as vscode from 'vscode';

export class TranslationKeyCompletionProvider implements vscode.CompletionItemProvider {
  private result: (() => {
    allKeys: string[];
    keyValues: Record<string, Record<string, string>>;
    sources: Array<{ key: string; filePath: string }>;
  } | undefined) | undefined;

  constructor() {
  }

  setResultProvider(
    provider: () => {
      allKeys: string[];
      keyValues: Record<string, Record<string, string>>;
      sources: Array<{ key: string; filePath: string }>;
    } | undefined
  ): void {
    this.result = provider;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    if (!vscode.workspace.getConfiguration('i18ntk').get('enableKeyCompletion', true)) return undefined;

    const data = this.result?.();
    if (!data || data.allKeys.length === 0) return undefined;

    const linePrefix = document.lineAt(position.line).text.substring(0, position.character);
    const charBeforeCursor = position.character > 0 ? document.lineAt(position.line).text[position.character - 1] : '';

    if (charBeforeCursor !== "'" && charBeforeCursor !== '"' && charBeforeCursor !== '`') {
      return undefined;
    }

    const isInTranslationCall = /[tT]\(\s*$|[tT]ranslate\(\s*$|i18n\.t\(\s*$|i18n\.translate\(\s*$|useTranslation\(\)\.t\(\s*$/.test(linePrefix);
    if (!isInTranslationCall) return undefined;

    const items: vscode.CompletionItem[] = [];
    for (const key of data.allKeys) {
      const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Value);
      item.detail = 'i18ntk Translation Key';
      item.sortText = `0_${key}`;

      const sourceLocale = Object.keys(data.keyValues)[0];
      const sourceValue = sourceLocale ? data.keyValues[sourceLocale]?.[key] : undefined;
      if (sourceValue) {
        item.documentation = new vscode.MarkdownString();
        item.documentation.appendMarkdown(`**${sourceLocale}:** ${sourceValue}\n\n---\n`);
        for (const [locale, values] of Object.entries(data.keyValues)) {
          if (locale === sourceLocale) continue;
          const val = values[key];
          item.documentation.appendMarkdown(`**${locale}:** ${val || '*(missing)*'}\n`);
        }
      }

      const usageFile = data.sources.find((s) => s.key === key);
      if (usageFile) {
        item.command = {
          command: 'vscode.open',
          title: 'Open Source File',
          arguments: [vscode.Uri.file(usageFile.filePath)]
        };
      }

      items.push(item);
    }

    return new vscode.CompletionList(items, false);
  }
}
