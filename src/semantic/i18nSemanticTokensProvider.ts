import * as vscode from 'vscode';

const TOKEN_TYPES = ['function', 'string', 'comment'] as const;
const TOKEN_MODIFIERS = ['declaration', 'deprecated', 'readonly'] as const;

export class I18nSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  private legend: vscode.SemanticTokensLegend;
  private result: (() => { allKeys: Set<string>; missingKeys: Set<string> } | undefined) | undefined;

  constructor() {
    this.legend = new vscode.SemanticTokensLegend(
      [...TOKEN_TYPES],
      [...TOKEN_MODIFIERS]
    );
  }

  getLegend(): vscode.SemanticTokensLegend {
    return this.legend;
  }

  setResultProvider(
    provider: () => { allKeys: Set<string>; missingKeys: Set<string> } | undefined
  ): void {
    this.result = provider;
  }

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    if (!vscode.workspace.getConfiguration('i18ntk').get('enableSemanticTokens', true)) return undefined;

    const data = this.result?.();
    if (!data || data.allKeys.size === 0) return undefined;

    const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);
    const text = document.getText();

    const wrapperPattern = /[tT]\(\s*(['"`])([^'"`]*?)\1\s*\)|i18n\.t\(\s*(['"`])([^'"`]*?)\3\s*\)|\$t\(\s*(['"`])([^'"`]*?)\4\s*\)|_\(\s*(['"`])([^'"`]*?)\6\s*\)|__\(\s*(['"`])([^'"`]*?)\8\s*\)|translate\(\s*(['"`])([^'"`]*?)\10\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = wrapperPattern.exec(text)) !== null) {
      const key = match[2] || match[4] || match[5] || match[7] || match[9] || match[11];
      const quote = match[1] || match[3] || match[4] || match[6] || match[8] || match[10];
      if (!key || !quote) continue;

      const fullMatch = match[0];
      const keyStartInMatch = fullMatch.indexOf(quote) + 1;
      const keyStart = match.index + keyStartInMatch;
      const keyEnd = keyStart + key.length;

      const startPos = document.positionAt(keyStart);
      const endPos = document.positionAt(keyEnd);

      if (!data.allKeys.has(key)) continue;

      const isMissing = data.missingKeys.has(key);
      const tokenTypeIndex = TOKEN_TYPES.indexOf('string');

      for (let line = startPos.line; line <= endPos.line; line++) {
        const lineStartChar = line === startPos.line ? startPos.character : 0;
        const lineEndChar = line === endPos.line ? endPos.character : document.lineAt(line).text.length;
        const length = lineEndChar - lineStartChar;

        if (length <= 0) continue;

        const modifiers: number[] = [];
        if (isMissing) {
          modifiers.push(TOKEN_MODIFIERS.indexOf('deprecated'));
        }

        tokensBuilder.push(
          new vscode.Range(line, lineStartChar, line, lineEndChar),
          tokenTypeIndex,
          modifiers.length > 0 ? (1 << modifiers[0]) : 0
        );
      }
    }

    const jsonKeyPattern = /"((?:[a-zA-Z0-9_]+\.)*[a-zA-Z0-9_]+)"\s*:/g;
    const localeFile = data as { allKeys: Set<string>; missingKeys: Set<string>; isLocaleFile?: boolean };
    if (document.languageId === 'json') {
      while ((match = jsonKeyPattern.exec(text)) !== null) {
        const key = match[1];
        if (!key || !data.allKeys.has(key)) continue;

        const keyStart = match.index + 1;
        const keyEnd = keyStart + key.length;

        const startPos = document.positionAt(keyStart);
        const endPos = document.positionAt(keyEnd);

        const isMissing = data.missingKeys.has(key);
        const tokenTypeIndex = TOKEN_TYPES.indexOf('function');
        const modifiers: number[] = [];
        if (isMissing) {
          modifiers.push(TOKEN_MODIFIERS.indexOf('deprecated'));
        }

        for (let line = startPos.line; line <= endPos.line; line++) {
          const lineStartChar = line === startPos.line ? startPos.character : 0;
          const lineEndChar = line === endPos.line ? endPos.character : document.lineAt(line).text.length;
          const length = lineEndChar - lineStartChar;
          if (length <= 0) continue;

          tokensBuilder.push(
            new vscode.Range(line, lineStartChar, line, lineEndChar),
            tokenTypeIndex,
            modifiers.length > 0 ? (1 << modifiers[0]) : 0
          );
        }
      }
    }

    return tokensBuilder.build();
  }
}
