import * as vscode from 'vscode';

export class I18nDocumentLinkProvider implements vscode.DocumentLinkProvider {
  private result: (() => {
    keyValues: Record<string, Record<string, string>>;
    localeFiles: Array<{ filePath: string; keys: string[] }>;
    sourceUsages: Array<{ key: string; filePath: string; range: { startLine: number } }>;
  } | undefined) | undefined;

  setResultProvider(
    provider: () => {
      keyValues: Record<string, Record<string, string>>;
      localeFiles: Array<{ filePath: string; keys: string[] }>;
      sourceUsages: Array<{ key: string; filePath: string; range: { startLine: number } }>;
    } | undefined
  ): void {
    this.result = provider;
  }

  provideDocumentLinks(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    if (!vscode.workspace.getConfiguration('i18ntk').get('enableDocumentLinks', true)) return [];

    const data = this.result?.();
    if (!data) return [];

    const links: vscode.DocumentLink[] = [];
    const text = document.getText();
    const isLocaleFile = document.uri.fsPath.includes('/locales/') || document.uri.fsPath.includes('\\locales\\');

    if (isLocaleFile) {
      const keyPattern = /"((?:[a-zA-Z0-9_]+\.)*[a-zA-Z0-9_]+)"\s*:/g;
      let match: RegExpExecArray | null;
      while ((match = keyPattern.exec(text)) !== null) {
        const key = match[1];
        const sourceFiles = data.sourceUsages
          .filter((u) => u.key === key)
          .map((u) => u.filePath);

        for (const sourceFile of sourceFiles) {
          const keyStart = match.index + 1;
          const keyEnd = keyStart + key.length;
          const range = new vscode.Range(
            document.positionAt(keyStart),
            document.positionAt(keyEnd)
          );

          const targetUri = vscode.Uri.file(sourceFile);
          const link = new vscode.DocumentLink(range, targetUri);
          link.tooltip = `Open usage in ${sourceFile}`;
          links.push(link);
        }
      }
      return links;
    }

    const wrapperPattern = /[tT]\(\s*(['"`])([^'"`]*?)\1\s*\)|i18n\.t\(\s*(['"`])([^'"`]*?)\3\s*\)|\$t\(\s*(['"`])([^'"`]*?)\4\s*\)|_\(\s*(['"`])([^'"`]*?)\6\s*\)|__\(\s*(['"`])([^'"`]*?)\8\s*\)|translate\(\s*(['"`])([^'"`]*?)\10\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = wrapperPattern.exec(text)) !== null) {
      const key = match[2] || match[4] || match[5] || match[7] || match[9] || match[11];
      const quote = match[1] || match[3] || match[4] || match[6] || match[8] || match[10];
      if (!key || !quote) continue;

      const localeFile = data.localeFiles.find((f) => f.keys.includes(key));
      if (!localeFile) continue;

      const fullMatch = match[0];
      const keyStartInMatch = fullMatch.indexOf(quote) + 1;
      const keyStart = match.index + keyStartInMatch;
      const keyEnd = keyStart + key.length;

      const range = new vscode.Range(
        document.positionAt(keyStart),
        document.positionAt(keyEnd)
      );

      const targetUri = vscode.Uri.file(localeFile.filePath);
      const link = new vscode.DocumentLink(range, targetUri);
      link.tooltip = `Open translation in ${localeFile.filePath}`;
      links.push(link);
    }

    return links;
  }
}
