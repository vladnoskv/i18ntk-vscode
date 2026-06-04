import * as vscode from 'vscode';

interface LocaleCoverage {
  path: string;
  coveredKeys: number;
  totalKeys: number;
  missingKeys: number;
}

export class LocaleFileDecorationProvider implements vscode.FileDecorationProvider {
  private readonly _onDidChangeFileDecorations = new vscode.EventEmitter();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> = this._onDidChangeFileDecorations.event;
  private coverage = new Map<string, LocaleCoverage>();

  update(coverageData: LocaleCoverage[]): void {
    this.coverage.clear();
    for (const item of coverageData) {
      this.coverage.set(normalizePath(item.path), item);
    }
    this._onDidChangeFileDecorations.fire(Array.from(this.coverage.keys()).map((p) => vscode.Uri.file(p)));
  }

  clear(): void {
    const uris = Array.from(this.coverage.keys()).map((p) => vscode.Uri.file(p));
    this.coverage.clear();
    if (uris.length > 0) {
      this._onDidChangeFileDecorations.fire(uris);
    }
  }

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    if (!vscode.workspace.getConfiguration('i18ntk').get('enableFileBadges', true)) return undefined;

    const normalized = normalizePath(uri.fsPath);
    const cov = this.coverage.get(normalized);
    if (!cov) return undefined;

    if (cov.missingKeys === 0) {
      return {
        badge: '✓',
        tooltip: `100% translated (${cov.coveredKeys}/${cov.totalKeys} keys)`,
        color: new vscode.ThemeColor('charts.green')
      };
    }

    const coveragePercent = cov.totalKeys > 0 ? Math.round((cov.coveredKeys / cov.totalKeys) * 100) : 0;

    if (coveragePercent >= 80) {
      return {
        badge: `${cov.missingKeys}`,
        tooltip: `${coveragePercent}% translated • ${cov.missingKeys} keys missing`,
        color: new vscode.ThemeColor('charts.yellow')
      };
    }

    if (coveragePercent > 0) {
      return {
        badge: `${cov.missingKeys}`,
        tooltip: `${coveragePercent}% translated • ${cov.missingKeys} keys missing`,
        color: new vscode.ThemeColor('charts.orange')
      };
    }

    return {
      badge: '✗',
      tooltip: `No translations • ${cov.missingKeys} keys missing`,
      color: new vscode.ThemeColor('charts.red')
    };
  }
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}
