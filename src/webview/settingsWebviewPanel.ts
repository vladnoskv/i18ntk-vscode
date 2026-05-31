import * as vscode from 'vscode';
import { detectLocaleDirectory, resolveConfiguredLocaleDirectory } from '../config/localeDiscovery';

export class WorkbenchSettingsPanel {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'i18ntkWorkbenchSettings',
      'i18ntk Workbench Settings',
      { viewColumn: vscode.ViewColumn.One, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] }
    );
    this.panel = panel;
    panel.onDidDispose(() => { this.panel = undefined; }, null, context.subscriptions);
    panel.webview.onDidReceiveMessage((message: any) => this.handleMessage(message), null, context.subscriptions);
    panel.webview.html = this.getLoadingHtml();
    void this.render();
  }

  private static async render(): Promise<void> {
    if (this.panel) this.panel.webview.html = await this.getHtml();
  }

  private static getLoadingHtml(): string {
    return `<!DOCTYPE html><html lang="en"><body>Loading i18ntk Workbench settings...</body></html>`;
  }

  private static async getHtml(): Promise<string> {
    const config = vscode.workspace.getConfiguration('i18ntk');
    const folder = vscode.workspace.workspaceFolders?.[0];
    const configuredLocaleDirectory = config.get('localeDirectory', '');
    const discovery = folder
      ? configuredLocaleDirectory
        ? await resolveConfiguredLocaleDirectory(folder.uri.fsPath, configuredLocaleDirectory)
        : await detectLocaleDirectory(folder.uri.fsPath)
      : undefined;
    const nonce = createNonce();
    const model = {
      localeDirectory: configuredLocaleDirectory,
      sourceLocale: config.get('sourceLocale', 'en'),
      keyStyle: config.get('keyStyle', 'dot'),
      autoScanOnSave: config.get('autoScanOnSave', false),
      showInlineDiagnostics: config.get('showInlineDiagnostics', true),
      showHoverTranslations: config.get('showHoverTranslations', true),
      reportFormat: config.get('reportFormat', 'webview'),
      maxScanFiles: config.get('maxScanFiles', 5000),
      exclude: config.get('exclude', ['node_modules', '.next', 'dist', 'build', 'coverage']) as string[],
      customWrappers: config.get('customWrappers', []) as string[],
      autoTranslateProvider: config.get('autoTranslateProvider', 'google'),
      autoTranslateTargets: config.get('autoTranslateTargets', []) as string[],
      autoTranslateMode: config.get('autoTranslateMode', 'onlyMissing')
    };
    const setupSummary = discovery
      ? {
          resolved: discovery.relativeLocaleDirectory,
          status: discovery.found
            ? discovery.source === 'configured' ? 'Configured' : 'Auto-detected'
            : 'No locale files found',
          detail: `${discovery.localeFileCount} JSON locale file${discovery.localeFileCount === 1 ? '' : 's'}${discovery.locales.length ? ` across ${discovery.locales.join(', ')}` : ''}`
        }
      : {
          resolved: 'No workspace open',
          status: 'Unavailable',
          detail: 'Open a workspace to configure locale discovery.'
        };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeAttr(nonce)}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>i18ntk Workbench Settings</title>
  <style>
    body { box-sizing: border-box; margin: 0; padding: 20px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    *, *::before, *::after { box-sizing: inherit; }
    header { border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 16px; padding-bottom: 12px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    h2 { font-size: 15px; margin: 24px 0 10px; }
    p, .hint { color: var(--vscode-descriptionForeground); line-height: 1.45; }
    p { margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
    .field { margin-bottom: 14px; }
    label { display: block; font-weight: 600; margin-bottom: 5px; }
    input, select { width: 100%; padding: 7px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
    input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); }
    input[type="checkbox"] { width: auto; margin-right: 6px; }
    .hint { font-size: 12px; margin-top: 4px; }
    .list-editor { display: grid; gap: 6px; max-width: 620px; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 11px; border-radius: 3px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .setup { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px; margin-bottom: 18px; background: var(--vscode-sideBar-background); }
    .setup strong { display: block; margin-bottom: 4px; }
    .setup code { font-family: var(--vscode-editor-font-family); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .status { margin-top: 14px; padding: 8px; border-radius: 3px; display: none; }
    .status.ok { display: block; background: var(--vscode-testing-iconPassed); color: #fff; }
  </style>
</head>
<body>
  <header>
    <h1>i18ntk Workbench Settings</h1>
    <p>Configure scanning, diagnostics, report behavior, custom wrappers, and Auto Translate for this workspace.</p>
  </header>
  <section class="setup">
    <strong>${escapeHtml(setupSummary.status)}</strong>
    <p>Resolved locale directory: <code>${escapeHtml(setupSummary.resolved)}</code></p>
    <p>${escapeHtml(setupSummary.detail)}</p>
    <div class="actions">
      <button id="detectLocale" class="secondary">Detect Locale Directory</button>
      <button id="chooseLocale" class="secondary">Choose Locale Directory</button>
    </div>
  </section>
  <h2>Workspace</h2>
  <section class="grid">
    ${textField('localeDirectory', 'Locale Directory', model.localeDirectory, 'Leave empty to auto-detect common locale folders.')}
    ${textField('sourceLocale', 'Source Locale', model.sourceLocale, 'Source/default locale code, such as en.')}
    ${selectField('keyStyle', 'Key Style', model.keyStyle, ['dot', 'snake', 'camel', 'kebab', 'flat'], 'Used for invalid key name diagnostics.')}
    ${selectField('reportFormat', 'Report Format', model.reportFormat, ['webview', 'markdown'], 'Default report presentation for Workbench reports.')}
    ${numberField('maxScanFiles', 'Max Scan Files', model.maxScanFiles, 'Caps source scanning work for large repositories.')}
  </section>
  <h2>Editor Feedback</h2>
  <label><input type="checkbox" id="autoScanOnSave" ${model.autoScanOnSave ? 'checked' : ''}>Auto-scan on save</label>
  <label><input type="checkbox" id="showInlineDiagnostics" ${model.showInlineDiagnostics ? 'checked' : ''}>Show inline diagnostics</label>
  <label><input type="checkbox" id="showHoverTranslations" ${model.showHoverTranslations ? 'checked' : ''}>Show hover translations</label>
  <h2>Auto Translate</h2>
  <section class="grid">
    ${selectField('autoTranslateProvider', 'Provider', model.autoTranslateProvider, ['google', 'deepl', 'libretranslate'], 'DeepL and LibreTranslate may require environment configuration in the CLI.')}
    ${selectField('autoTranslateMode', 'Mode', model.autoTranslateMode, ['onlyMissing', 'translateAll', 'dryRun'], 'Only missing keeps existing translations. Dry run previews without writing files.')}
    ${textField('autoTranslateTargets', 'Target Locales', model.autoTranslateTargets.join(', '), 'Comma-separated target locales, such as fr, de, es.')}
  </section>
  <h2>Excluded Folders</h2>
  <div class="list-editor" id="excludeList">${model.exclude.map((v) => row(v)).join('')}</div>
  <div class="actions"><button id="addExclude" class="secondary">Add Folder</button></div>
  <h2>Custom Wrapper Functions</h2>
  <div class="list-editor" id="wrapperList">${model.customWrappers.map((v) => row(v)).join('')}</div>
  <div class="hint">Add wrapper names such as tx, __, or _t when your app uses custom translation functions.</div>
  <div class="actions"><button id="addWrapper" class="secondary">Add Wrapper</button></div>
  <div class="actions">
    <button id="save">Save Settings</button>
    <button id="saveScan" class="secondary">Save and Scan</button>
    <button id="openNative" class="secondary">Open Native Settings</button>
    <button id="reset" class="secondary">Reset to Defaults</button>
  </div>
  <div id="status" class="status"></div>
  <script nonce="${escapeAttr(nonce)}">
    const vsc = acquireVsCodeApi();
    function addRow(containerId) {
      const row = document.createElement('div');
      row.className = 'row';
      const input = document.createElement('input');
      input.type = 'text';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'secondary';
      remove.dataset.removeRow = 'true';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => row.remove());
      row.append(input, remove);
      document.getElementById(containerId).appendChild(row);
    }
    function values(containerId) {
      return [...document.getElementById(containerId).querySelectorAll('input')].map(e => e.value.trim()).filter(Boolean);
    }
    function collect() {
      return {
        localeDirectory: document.getElementById('localeDirectory').value.trim(),
        sourceLocale: document.getElementById('sourceLocale').value.trim() || 'en',
        keyStyle: document.getElementById('keyStyle').value,
        reportFormat: document.getElementById('reportFormat').value,
        maxScanFiles: parseInt(document.getElementById('maxScanFiles').value, 10) || 5000,
        autoScanOnSave: document.getElementById('autoScanOnSave').checked,
        showInlineDiagnostics: document.getElementById('showInlineDiagnostics').checked,
        showHoverTranslations: document.getElementById('showHoverTranslations').checked,
        autoTranslateProvider: document.getElementById('autoTranslateProvider').value,
        autoTranslateMode: document.getElementById('autoTranslateMode').value,
        autoTranslateTargets: document.getElementById('autoTranslateTargets').value.split(',').map(v => v.trim()).filter(Boolean),
        exclude: values('excludeList'),
        customWrappers: values('wrapperList')
      };
    }
    document.getElementById('addExclude').addEventListener('click', () => addRow('excludeList'));
    document.getElementById('addWrapper').addEventListener('click', () => addRow('wrapperList'));
    document.getElementById('detectLocale').addEventListener('click', () => vsc.postMessage({ command: 'detectLocaleDirectory' }));
    document.getElementById('chooseLocale').addEventListener('click', () => vsc.postMessage({ command: 'chooseLocaleDirectory' }));
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-remove-row]');
      if (button) button.parentElement.remove();
    });
    document.getElementById('save').addEventListener('click', () => vsc.postMessage({ command: 'save', data: collect() }));
    document.getElementById('saveScan').addEventListener('click', () => vsc.postMessage({ command: 'saveAndScan', data: collect() }));
    document.getElementById('openNative').addEventListener('click', () => vsc.postMessage({ command: 'openNative' }));
    document.getElementById('reset').addEventListener('click', () => vsc.postMessage({ command: 'reset' }));
    window.addEventListener('message', (e) => {
      if (e.data.command !== 'saved') return;
      const status = document.getElementById('status');
      status.className = 'status ok';
      status.textContent = 'Settings saved.';
      setTimeout(() => { status.className = 'status'; }, 3000);
    });
  </script>
</body>
</html>`;
  }

  private static async handleMessage(message: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('i18ntk');
    if (message.command === 'openNative') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'i18ntk');
      return;
    }
    if (message.command === 'reset') {
      for (const key of SETTINGS_KEYS) {
        await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
      }
      await this.render();
      return;
    }
    if (message.command === 'detectLocaleDirectory') {
      await vscode.commands.executeCommand('i18ntk.detectLocaleDirectory');
      await this.render();
      return;
    }
    if (message.command === 'chooseLocaleDirectory') {
      await vscode.commands.executeCommand('i18ntk.chooseLocaleDirectory');
      await this.render();
      return;
    }
    if (message.command === 'save' || message.command === 'saveAndScan') {
      const data = message.data;
      for (const key of SETTINGS_KEYS) {
        await config.update(key, data[key], vscode.ConfigurationTarget.Workspace);
      }
      this.panel?.webview.postMessage({ command: 'saved' });
      if (message.command === 'saveAndScan') {
        await vscode.commands.executeCommand('i18ntk.scanWorkspace');
      }
    }
  }
}

const SETTINGS_KEYS = [
  'localeDirectory',
  'sourceLocale',
  'keyStyle',
  'reportFormat',
  'maxScanFiles',
  'autoScanOnSave',
  'showInlineDiagnostics',
  'showHoverTranslations',
  'autoTranslateProvider',
  'autoTranslateMode',
  'autoTranslateTargets',
  'exclude',
  'customWrappers'
];

function textField(id: string, label: string, value: string, hint: string): string {
  return `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" value="${escapeAttr(value)}"><div class="hint">${hint}</div></div>`;
}

function numberField(id: string, label: string, value: number, hint: string): string {
  return `<div class="field"><label for="${id}">${label}</label><input type="number" id="${id}" value="${value}" min="100" step="100"><div class="hint">${hint}</div></div>`;
}

function selectField(id: string, label: string, value: string, options: string[], hint: string): string {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map((option) => `<option value="${escapeAttr(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select><div class="hint">${hint}</div></div>`;
}

function row(value: string): string {
  return `<div class="row"><input type="text" value="${escapeAttr(value)}"><button type="button" class="secondary" data-remove-row="true">Remove</button></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i += 1) nonce += chars[Math.floor(Math.random() * chars.length)];
  return nonce;
}
