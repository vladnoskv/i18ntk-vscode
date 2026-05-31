import * as vscode from 'vscode';
import { I18nScanResult } from '../types';
import { LocaleHealthTreeNode } from './localeHealthTreeItems';

export class LocaleHealthTreeProvider {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private result: I18nScanResult | undefined;

  setResult(result: I18nScanResult | undefined): void {
    this.result = result;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: LocaleHealthTreeNode): any {
    const item = new vscode.TreeItem(
      element.label,
      element.children && element.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    item.id = element.id;
    item.description = element.description;
    item.tooltip = element.tooltip || element.description;
    item.contextValue = element.contextValue;
    item.command = element.command;
    if (element.icon) item.iconPath = new vscode.ThemeIcon(element.icon);
    return item;
  }

  getChildren(element?: LocaleHealthTreeNode): LocaleHealthTreeNode[] {
    if (element) return element.children || [];
    if (!this.result) {
      return [
        {
          id: 'empty',
          label: 'Run workspace scan',
          icon: 'search',
          command: { command: 'i18ntk.scanWorkspace', title: 'Scan Workspace' }
        }
      ];
    }
    return buildTree(this.result);
  }
}

function buildTree(result: I18nScanResult): LocaleHealthTreeNode[] {
  return [
    {
      id: 'project-health',
      label: 'Project Health',
      icon: 'pulse',
      children: [
        stat('source-locale', 'Source Locale', result.sourceLocale),
        stat('locale-count', 'Locales', String(result.locales.length)),
        stat('total-keys', 'Total Keys', String(result.totalKeys)),
        stat('health-score', 'Health Score', `${result.healthScore}%`)
      ]
    },
    groupByLocale('missing', 'Missing Keys', 'warning', result.missingKeys.map((item) => ({
      locale: item.locale,
      label: item.key,
      command: item.sourceFilePath ? openFileCommand(item.sourceFilePath) : undefined
    }))),
    groupByLocale('placeholders', 'Placeholder Mismatches', 'error', result.placeholderMismatches.map((item) => ({
      locale: item.locale,
      label: item.key,
      description: item.missing.length ? `Missing ${item.missing.join(', ')}` : 'Extra placeholder',
      command: item.filePath ? openFileCommand(item.filePath) : undefined
    }))),
    {
      id: 'unused',
      label: 'Unused Keys',
      icon: 'trash',
      children: result.unusedKeys.slice(0, 100).map((item) => ({
        id: `unused:${item.key}`,
        label: item.key,
        description: `${Math.round(item.confidence * 100)}% confidence`,
        command: item.filePath ? openFileCommand(item.filePath) : undefined
      }))
    },
    groupByLocale('expansion', 'Expansion Risks', 'graph-line', result.expansionRisks.map((item) => ({
      locale: item.locale,
      label: item.key,
      description: `+${item.expansionPercent}% longer`,
      command: item.filePath ? openFileCommand(item.filePath) : undefined
    }))),
    {
      id: 'reports',
      label: 'Reports',
      icon: 'preview',
      children: [
        {
          id: 'open-report',
          label: 'Open Summary Report',
          icon: 'file',
          command: { command: 'i18ntk.openReport', title: 'Open Summary Report' }
        }
      ]
    }
  ];
}

function stat(id: string, label: string, description: string): LocaleHealthTreeNode {
  return { id, label, description, icon: 'info' };
}

function groupByLocale(id: string, label: string, icon: string, items: Array<{ locale: string; label: string; description?: string; command?: any }>): LocaleHealthTreeNode {
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    grouped.set(item.locale, [...(grouped.get(item.locale) || []), item]);
  }
  return {
    id,
    label,
    icon,
    children: [...grouped.entries()].map(([locale, entries]) => ({
      id: `${id}:${locale}`,
      label: locale,
      children: entries.map((entry) => ({
        id: `${id}:${locale}:${entry.label}`,
        label: entry.label,
        description: entry.description,
        icon: 'circle-small-filled',
        command: entry.command
      }))
    }))
  };
}

function openFileCommand(filePath: string) {
  return { command: 'vscode.open', title: 'Open File', arguments: [vscode.Uri.file(filePath)] };
}
