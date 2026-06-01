import * as vscode from 'vscode';
import { I18nScanResult, TextRange } from '../types';

const DEPTH_COLORS = [
  'charts.blue',
  'charts.green',
  'charts.yellow',
  'charts.purple',
  'charts.orange'
];

export class LocaleKeyDecorationProvider implements vscode.Disposable {
  private result?: I18nScanResult;
  private readonly decorations = DEPTH_COLORS.map((color) => vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor(color),
    fontWeight: '600'
  }));
  private readonly subscriptions: vscode.Disposable[] = [];

  constructor() {
    this.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this.updateVisibleEditors()),
      vscode.window.onDidChangeActiveTextEditor(() => this.updateVisibleEditors()),
      vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration('i18ntk.highlightLocaleKeys')) {
          this.updateVisibleEditors();
        }
      })
    );
  }

  update(result: I18nScanResult | undefined): void {
    this.result = result;
    this.updateVisibleEditors();
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
    this.decorations.forEach((decoration) => decoration.dispose());
  }

  private updateVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  private updateEditor(editor: vscode.TextEditor): void {
    const enabled = vscode.workspace.getConfiguration('i18ntk').get('highlightLocaleKeys', true);
    if (!enabled || editor.document.languageId !== 'json' || !this.result) {
      this.clearEditor(editor);
      return;
    }

    const localeFile = this.result.localeFiles.find((file) => samePath(file.filePath, editor.document.uri.fsPath));
    if (!localeFile?.keyRanges) {
      this.clearEditor(editor);
      return;
    }

    const rangesByDepth = this.decorations.map(() => [] as vscode.Range[]);
    for (const [key, range] of Object.entries(localeFile.keyRanges)) {
      const depth = Math.min(key.split('.').length - 1, rangesByDepth.length - 1);
      rangesByDepth[depth].push(toVsCodeRange(range));
    }

    rangesByDepth.forEach((ranges, index) => {
      editor.setDecorations(this.decorations[index], ranges);
    });
  }

  private clearEditor(editor: vscode.TextEditor): void {
    this.decorations.forEach((decoration) => editor.setDecorations(decoration, []));
  }
}

function toVsCodeRange(range: TextRange): vscode.Range {
  return new vscode.Range(range.startLine, range.startCharacter, range.endLine, range.endCharacter);
}

function samePath(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
