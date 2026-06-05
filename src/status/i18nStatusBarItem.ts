import * as vscode from 'vscode';

export class I18nStatusBarItem implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = 'i18ntk Status';
    this.item.tooltip = this.idleTooltip();
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
        this.item.tooltip = this.idleTooltip();
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

    const tooltip = new vscode.MarkdownString(undefined, true);
    tooltip.isTrusted = true;
    tooltip.supportThemeIcons = true;
    tooltip.appendMarkdown(`**$(globe) i18ntk Translation Coverage**\n\n`);
    tooltip.appendMarkdown(`| Metric | Value |\n|---|---:|\n`);
    tooltip.appendMarkdown(`| Locales | ${escapeMarkdown(result.locales.join(', ') || '-')} |\n`);
    tooltip.appendMarkdown(`| Total keys | ${result.totalKeys} |\n`);
    tooltip.appendMarkdown(`| Missing | ${missingCount} |\n`);
    tooltip.appendMarkdown(`| Placeholder mismatches | ${result.placeholderMismatches.length} |\n`);
    tooltip.appendMarkdown(`| Unused | ${result.unusedKeys?.length ?? 0} |\n`);
    tooltip.appendMarkdown(`| Health | ${health}% |\n\n`);
    tooltip.appendMarkdown(`[Open report](command:i18ntk.openReport) · [Scan workspace](command:i18ntk.scanWorkspace) · [Settings](command:i18ntk.openSettings)`);
    this.item.tooltip = tooltip;
  }

  dispose(): void {
    this.item.dispose();
  }

  private idleTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString(undefined, true);
    tooltip.isTrusted = true;
    tooltip.supportThemeIcons = true;
    tooltip.appendMarkdown(`**$(globe) i18ntk Workbench**\n\nNo scan data loaded.\n\n[Scan workspace](command:i18ntk.scanWorkspace) · [Settings](command:i18ntk.openSettings)`);
    return tooltip;
  }
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\|`*_{}\[\]()#+\-.!]/g, '\\$&');
}
