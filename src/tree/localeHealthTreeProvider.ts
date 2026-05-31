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
      element.children && element.children.length > 0
        ? element.expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
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
          id: 'setup',
          label: 'Setup',
          icon: 'tools',
          expanded: true,
          contextValue: 'i18ntk.setup',
          children: [
            action('scan-empty', 'Scan Workspace', 'search', 'i18ntk.scanWorkspace'),
            action('choose-locale-directory-empty', 'Choose Locale Directory', 'folder-opened', 'i18ntk.chooseLocaleDirectory', [{ rescan: true }]),
            action('detect-locale-directory-empty', 'Detect Locale Directory', 'search', 'i18ntk.detectLocaleDirectory', [{ rescan: true }]),
            action('open-settings-empty', 'Open Settings', 'settings-gear', 'i18ntk.openSettings')
          ]
        }
      ];
    }
    return buildTree(this.result);
  }
}

function buildTree(result: I18nScanResult): LocaleHealthTreeNode[] {
  return [
    {
      id: 'actions',
      label: 'Actions',
      icon: 'run-all',
      expanded: true,
      contextValue: 'i18ntk.actions',
      children: [
        action('scan', 'Scan Workspace', 'search', 'i18ntk.scanWorkspace'),
        action('validate', 'Validate Locales', 'pass', 'i18ntk.validateLocales'),
        action('analyze', 'Analyze Usage', 'graph', 'i18ntk.analyzeUsage'),
        action('translate', 'Auto Translate Missing', 'globe', 'i18ntk.autoTranslateMissing'),
        action('add-key', 'Add Missing Key', 'add', 'i18ntk.addMissingKey')
      ]
    },
    {
      id: 'project-health',
      label: 'Project Health',
      icon: 'pulse',
      expanded: true,
      children: [
        stat('source-locale', 'Source Locale', result.sourceLocale),
        stat('locale-directory', 'Locale Directory', result.localeDirectoryRelativePath ?? result.localeDirectory),
        stat('locale-detection', 'Detection', detectionDescription(result)),
        stat('locale-count', 'Locales', String(result.locales.length)),
        stat('total-keys', 'Total Keys', String(result.totalKeys)),
        stat('health-score', 'Health Score', `${result.healthScore}%`)
      ]
    },
    {
      id: 'setup',
      label: 'Setup',
      icon: result.localeDirectoryFound === false || result.localeFiles.length === 0 ? 'warning' : 'tools',
      expanded: result.localeDirectoryFound === false || result.localeFiles.length === 0,
      contextValue: 'i18ntk.setup',
      children: [
        stat('setup-locale-root', 'Locale Root', result.localeDirectoryRelativePath ?? result.localeDirectory),
        stat('setup-locale-files', 'Locale Files', String(result.localeFileCount ?? result.localeFiles.length)),
        action('choose-locale-directory', 'Choose Locale Directory', 'folder-opened', 'i18ntk.chooseLocaleDirectory', [{ rescan: true }]),
        action('detect-locale-directory', 'Detect Locale Directory', 'search', 'i18ntk.detectLocaleDirectory', [{ rescan: true }]),
        action('open-settings-setup', 'Open Workbench Settings', 'settings-gear', 'i18ntk.openSettings')
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
      contextValue: 'i18ntk.reports',
      children: [
        action('open-report', 'Open Summary Report', 'file', 'i18ntk.openReport'),
        action('show-summary', 'Show Summary', 'list-tree', 'i18ntk.showSummary')
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-gear',
      contextValue: 'i18ntk.settings',
      children: [
        action('open-settings', 'Open Workbench Settings', 'settings-gear', 'i18ntk.openSettings'),
        action('open-native-settings', 'Open Native Settings', 'gear', 'i18ntk.openNativeSettings'),
        action('choose-locale-directory-settings', 'Choose Locale Directory', 'folder-opened', 'i18ntk.chooseLocaleDirectory', [{ rescan: true }]),
        action('detect-locale-directory-settings', 'Detect Locale Directory', 'search', 'i18ntk.detectLocaleDirectory', [{ rescan: true }])
      ]
    }
  ];
}

function stat(id: string, label: string, description: string): LocaleHealthTreeNode {
  return { id, label, description, icon: 'info', contextValue: 'i18ntk.stat' };
}

function action(id: string, label: string, icon: string, command: string, args: unknown[] = []): LocaleHealthTreeNode {
  return {
    id,
    label,
    icon,
    contextValue: 'i18ntk.action',
    command: { command, title: label, arguments: args }
  };
}

function detectionDescription(result: I18nScanResult): string {
  if (result.localeDirectorySource === 'configured') return result.localeDirectoryFound === false ? 'Configured, no files found' : 'Configured';
  if (result.localeDirectorySource === 'auto-detected') return 'Auto-detected';
  return 'Not found';
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
