import * as vscode from 'vscode';

export class I18nStatusBarItem implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = 'i18ntk Status';
    this.item.tooltip = 'i18ntk Translation Coverage';
    this.item.command = 'i18ntk.openReport';
    this.item.text = '$(globe) i18ntk: waiting...';
    this.item.show();
  }

  update(result: {
    locales: string[];
    missingKeys: Array<unknown>;
    placeholderMismatches: Array<unknown>;
    totalKeys: number;
    healthScore: number;
    unusedKeys?: Array<unknown>;
  } | undefined): void {
    const enabled = vscode.workspace.getConfiguration('i18ntk').get('showStatusBar', true);

    if (!result || !enabled) {
      if (!enabled) {
        this.item.hide();
      } else {
        this.item.text = '$(globe) i18ntk: idle';
        this.item.backgroundColor = undefined;
        this.item.show();
      }
      return;
    }

    this.item.show();

    const missingCount = result.missingKeys.length;
    const health = result.healthScore;

    const parts: string[] = [];
    parts.push(`$(globe) ${result.locales.length} locales`);

    if (missingCount > 0) {
      parts.push(`$(warning) ${missingCount} missing`);
    }
    if (result.placeholderMismatches.length > 0) {
      parts.push(`$(error) ${result.placeholderMismatches.length} placeholders`);
    }
    if (result.unusedKeys && result.unusedKeys.length > 0) {
      parts.push(`$(trash) ${result.unusedKeys.length} unused`);
    }
    parts.push(`${health}%`);

    this.item.text = `i18ntk: ${parts.join(' | ')}`;

    if (health >= 95) {
      this.item.backgroundColor = undefined;
      this.item.color = undefined;
    } else if (health >= 75) {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    this.item.tooltip = [
      `i18ntk Translation Coverage`,
      ``,
      `Locales: ${result.locales.join(', ')}`,
      `Total Keys: ${result.totalKeys}`,
      `Missing: ${missingCount}`,
      `Placeholder Mismatches: ${result.placeholderMismatches.length}`,
      result.unusedKeys ? `Unused: ${result.unusedKeys.length}` : '',
      `Health: ${health}%`,
      ``,
      `Click to open summary report`
    ].filter(Boolean).join('\n');
  }

  dispose(): void {
    this.item.dispose();
  }
}
