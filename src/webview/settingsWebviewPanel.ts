import * as vscode from 'vscode';
import { detectLocaleDirectory, resolveConfiguredLocaleDirectory } from '../config/localeDiscovery';
import { getConfigValue, getSharedWorkbenchSettings, loadSharedConfig, saveSharedWorkbenchSettings } from '../config/sharedConfig';
import { setExtensionLanguage, t } from '../i18ntk/localization';

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
    return `<!DOCTYPE html><html lang="en"><body>${escapeHtml(t('workbench.settings.loading', {}, 'Loading i18ntk Workbench settings...'))}</body></html>`;
  }

  private static async getHtml(): Promise<string> {
    const config = vscode.workspace.getConfiguration('i18ntk');
    const folder = vscode.workspace.workspaceFolders?.[0];
    const shared = getSharedWorkbenchSettings(folder ? await loadSharedConfig(folder.uri.fsPath) : undefined);
    const configuredLocaleDirectory = getConfigValue('i18ntk', 'localeDirectory', shared.localeDirectory, '');
    const discovery = folder
      ? configuredLocaleDirectory
        ? await resolveConfiguredLocaleDirectory(folder.uri.fsPath, configuredLocaleDirectory)
        : await detectLocaleDirectory(folder.uri.fsPath)
      : undefined;
    const nonce = createNonce();
    const model = {
      localeDirectory: configuredLocaleDirectory,
      sourceLocale: getConfigValue('i18ntk', 'sourceLocale', shared.sourceLocale, 'en'),
      extensionLanguage: getConfigValue('i18ntk', 'extensionLanguage', shared.extensionLanguage, 'auto'),
      keyStyle: getConfigValue('i18ntk', 'keyStyle', shared.keyStyle, 'dot'),
      autoScanOnSave: getConfigValue('i18ntk', 'autoScanOnSave', shared.autoScanOnSave, false),
      autoScanOnFileChange: getConfigValue('i18ntk', 'autoScanOnFileChange', shared.autoScanOnFileChange, false),
      scanOnStartup: getConfigValue('i18ntk', 'scanOnStartup', shared.scanOnStartup, false),
      runCliValidationOnScan: getConfigValue('i18ntk', 'runCliValidationOnScan', shared.runCliValidationOnScan, false),
      showInlineDiagnostics: getConfigValue('i18ntk', 'showInlineDiagnostics', shared.showInlineDiagnostics, true),
      showHoverTranslations: getConfigValue('i18ntk', 'showHoverTranslations', shared.showHoverTranslations, true),
      highlightLocaleKeys: getConfigValue('i18ntk', 'highlightLocaleKeys', shared.highlightLocaleKeys, true),
      diagnosticSeverities: {
        ...DEFAULT_DIAGNOSTIC_SEVERITIES,
        ...getConfigValue('i18ntk', 'diagnosticSeverities', shared.diagnosticSeverities, {} as Record<string, string>)
      },
      ignoredDiagnostics: getConfigValue('i18ntk', 'ignoredDiagnostics', shared.ignoredDiagnostics, []),
      reportFormat: getConfigValue('i18ntk', 'reportFormat', shared.reportFormat, 'webview'),
      maxScanFiles: getConfigValue('i18ntk', 'maxScanFiles', shared.maxScanFiles, 2000),
      exclude: getConfigValue('i18ntk', 'exclude', shared.exclude, ['node_modules', '.next', 'dist', 'build', 'coverage']) as string[],
      customWrappers: getConfigValue('i18ntk', 'customWrappers', shared.customWrappers, []) as string[],
      autoTranslateProvider: getConfigValue('i18ntk', 'autoTranslateProvider', shared.autoTranslateProvider, 'google'),
      autoTranslateTargets: getConfigValue('i18ntk', 'autoTranslateTargets', shared.autoTranslateTargets, []) as string[],
      autoTranslateMode: getConfigValue('i18ntk', 'autoTranslateMode', shared.autoTranslateMode, 'onlyMissing'),
      showStatusBar: getConfigValue('i18ntk', 'showStatusBar', shared.showStatusBar, true),
      enableKeyCompletion: getConfigValue('i18ntk', 'enableKeyCompletion', shared.enableKeyCompletion, true),
      enableFileBadges: getConfigValue('i18ntk', 'enableFileBadges', shared.enableFileBadges, true),
      enableSemanticTokens: getConfigValue('i18ntk', 'enableSemanticTokens', shared.enableSemanticTokens, true),
      enableDocumentLinks: getConfigValue('i18ntk', 'enableDocumentLinks', shared.enableDocumentLinks, true)
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
    body { box-sizing: border-box; margin: 0; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    *, *::before, *::after { box-sizing: inherit; }
    .layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100vh; }
    .side-nav { position: sticky; top: 0; height: 100vh; padding: 16px 12px; border-right: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); overflow-y: auto; }
    .side-nav strong { display: block; margin: 0 8px 12px; font-size: 13px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: .04em; }
    .side-nav button { width: 100%; margin-bottom: 4px; text-align: left; background: transparent; color: var(--vscode-foreground); border-radius: 5px; }
    .side-nav button.active, .side-nav button:hover { background: var(--vscode-list-hoverBackground); }
    .content { min-width: 0; padding: 22px 24px 96px; max-width: 1320px; }
    header { border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 16px; padding-bottom: 12px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    h2 { font-size: 16px; margin: 0 0 12px; }
    p, .hint { color: var(--vscode-descriptionForeground); line-height: 1.45; }
    p { margin: 0; }
    .page { display: none; }
    .page.active { display: block; }
    .page + .page { margin-top: 0; }
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
    .panel { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 14px; margin-bottom: 16px; background: var(--vscode-sideBar-background); }
    .setup { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; margin-bottom: 18px; background: var(--vscode-sideBar-background); }
    .setup strong { display: block; margin-bottom: 4px; }
    .setup code { font-family: var(--vscode-editor-font-family); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .sticky-actions { position: fixed; left: 220px; right: 0; bottom: 0; z-index: 20; padding: 10px 24px; border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
    .status { margin-top: 14px; padding: 8px; border-radius: 3px; display: none; }
    .status.ok { display: block; background: var(--vscode-testing-iconPassed); color: #fff; }
    @media (max-width: 760px) {
      .layout { grid-template-columns: 1fr; }
      .side-nav { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--vscode-panel-border); }
      .sticky-actions { left: 0; }
    }
  </style>
</head>
<body>
<div class="layout">
  <nav class="side-nav" aria-label="Settings sections">
    <strong>i18ntk</strong>
    <button class="active" data-page-button="workspace">Workspace</button>
    <button data-page-button="scanning">Scanning</button>
    <button data-page-button="feedback">Editor Feedback</button>
    <button data-page-button="diagnostics">Diagnostics</button>
    <button data-page-button="translate">Auto Translate</button>
    <button data-page-button="advanced">Advanced</button>
  </nav>
  <main class="content">
  <header>
    <h1>${escapeHtml(t('workbench.settings.title', {}, 'i18ntk Workbench Settings'))}</h1>
    <p>${escapeHtml(t('workbench.settings.description', {}, 'Configure scanning, diagnostics, report behavior, custom wrappers, and Auto Translate for this workspace.'))}</p>
  </header>
  <section class="page active" data-page="workspace">
  <section class="setup">
    <strong>${escapeHtml(setupSummary.status)}</strong>
    <p>Resolved locale directory: <code>${escapeHtml(setupSummary.resolved)}</code></p>
    <p>${escapeHtml(setupSummary.detail)}</p>
    <div class="actions">
      <button id="detectLocale" class="secondary">Detect Locale Directory</button>
      <button id="chooseLocale" class="secondary">Choose Locale Directory</button>
    </div>
  </section>
  <section class="panel">
  <h2>Workspace</h2>
  <div class="grid">
    ${textField('localeDirectory', 'Locale Directory', model.localeDirectory, 'Leave empty to auto-detect common locale folders.')}
    ${textField('sourceLocale', 'Source Locale', model.sourceLocale, 'Source/default locale code, such as en.')}
    ${selectField('extensionLanguage', 'Extension UI Language', model.extensionLanguage, ['auto', 'en', 'es', 'fr', 'de'], 'Use auto to follow VS Code when supported, or pick a fixed extension UI language.')}
    ${selectField('keyStyle', 'Key Style', model.keyStyle, ['dot', 'snake', 'camel', 'kebab', 'flat'], 'Used for invalid key name diagnostics.')}
    ${selectField('reportFormat', 'Report Format', model.reportFormat, ['webview', 'markdown'], 'Default report presentation for Workbench reports.')}
    ${numberField('maxScanFiles', 'Max Scan Files', model.maxScanFiles, 'Caps source scanning work for large repositories.')}
  </div>
  </section>
  </section>
  <section class="page" data-page="scanning">
  <section class="panel">
  <h2>Scan Scheduling</h2>
  <label><input type="checkbox" id="scanOnStartup" ${model.scanOnStartup ? 'checked' : ''}>Run a scan when Workbench starts</label>
  <label><input type="checkbox" id="autoScanOnSave" ${model.autoScanOnSave ? 'checked' : ''}>Auto-scan after editor saves</label>
  <label><input type="checkbox" id="autoScanOnFileChange" ${model.autoScanOnFileChange ? 'checked' : ''}>Auto-scan when locale or i18ntk config files change on disk</label>
  <label><input type="checkbox" id="runCliValidationOnScan" ${model.runCliValidationOnScan ? 'checked' : ''}>Also run CLI validation during scans</label>
  <div class="hint">Automatic scans are off by default to keep extension-host CPU and memory low. Use Save and Scan or the Scan Workspace command for manual scans.</div>
  </section>
  </section>
  <section class="page" data-page="feedback">
  <section class="panel">
  <h2>Editor Feedback</h2>
  <label><input type="checkbox" id="showInlineDiagnostics" ${model.showInlineDiagnostics ? 'checked' : ''}>Show inline diagnostics</label>
  <label><input type="checkbox" id="showHoverTranslations" ${model.showHoverTranslations ? 'checked' : ''}>Show hover translations</label>
  <label><input type="checkbox" id="highlightLocaleKeys" ${model.highlightLocaleKeys ? 'checked' : ''}>Color-code locale JSON keys</label>
  <h2>New Feature Toggles</h2>
  <label><input type="checkbox" id="showStatusBar" ${model.showStatusBar ? 'checked' : ''}>Show persistent status bar with translation stats</label>
  <label><input type="checkbox" id="enableKeyCompletion" ${model.enableKeyCompletion ? 'checked' : ''}>Enable translation key IntelliSense autocompletion</label>
  <label><input type="checkbox" id="enableFileBadges" ${model.enableFileBadges ? 'checked' : ''}>Show Explorer file badges on locale JSON files</label>
  <label><input type="checkbox" id="enableSemanticTokens" ${model.enableSemanticTokens ? 'checked' : ''}>Highlight translation keys with semantic tokens</label>
  <label><input type="checkbox" id="enableDocumentLinks" ${model.enableDocumentLinks ? 'checked' : ''}>Enable Ctrl+Click navigation links to locale files</label>
  </section>
  </section>
  <section class="page" data-page="diagnostics">
  <section class="panel">
  <h2>Problem Diagnostics</h2>
  <section class="grid">
    ${DIAGNOSTIC_RULES.map((rule) => selectField(`severity-${rule.code}`, rule.label, model.diagnosticSeverities[rule.code] ?? DEFAULT_DIAGNOSTIC_SEVERITIES[rule.code], ['error', 'warning', 'off', 'ignore'], rule.hint)).join('')}
  </section>
  <div class="hint">Use off or ignore to hide noisy rules from Problems. Expansion risks are off by default because large locale sets can produce thousands of advisory entries.</div>
  <h2>Ignored Diagnostics</h2>
  <div class="list-editor" id="ignoredDiagnosticsList">${model.ignoredDiagnostics.map((v) => row(v)).join('')}</div>
  <div class="hint">Right-click an i18ntk Problem and choose ignore to add entries here. Remove entries to show those diagnostics again.</div>
  <div class="actions"><button id="addIgnoredDiagnostic" class="secondary">Add Ignored Diagnostic</button></div>
  </section>
  </section>
  <section class="page" data-page="translate">
  <section class="panel">
  <h2>Auto Translate</h2>
  <section class="grid">
    ${selectField('autoTranslateProvider', 'Provider', model.autoTranslateProvider, ['google', 'deepl', 'libretranslate'], 'DeepL and LibreTranslate may require environment configuration in the CLI.')}
    ${selectField('autoTranslateMode', 'Mode', model.autoTranslateMode, ['onlyMissing', 'translateAll', 'dryRun'], 'Only missing keeps existing translations. Dry run previews without writing files.')}
    ${textField('autoTranslateTargets', 'Target Locales', model.autoTranslateTargets.join(', '), 'Comma-separated target locales, such as fr, de, es.')}
  </section>
  </section>
  <section class="page" data-page="advanced">
  <section class="panel">
  <h2>Excluded Folders</h2>
  <div class="list-editor" id="excludeList">${model.exclude.map((v) => row(v)).join('')}</div>
  <div class="actions"><button id="addExclude" class="secondary">Add Folder</button></div>
  <h2>Custom Wrapper Functions</h2>
  <div class="list-editor" id="wrapperList">${model.customWrappers.map((v) => row(v)).join('')}</div>
  <div class="hint">Add wrapper names such as tx, __, or _t when your app uses custom translation functions.</div>
  <div class="actions"><button id="addWrapper" class="secondary">Add Wrapper</button></div>
  </section>
  </section>
  <div class="actions sticky-actions">
    <button id="save">Save Settings</button>
    <button id="saveScan" class="secondary">Save and Scan</button>
    <button id="openNative" class="secondary">Open Native Settings</button>
    <button id="reset" class="secondary">Reset to Defaults</button>
  </div>
  <div id="status" class="status"></div>
  </main>
</div>
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
        extensionLanguage: document.getElementById('extensionLanguage').value,
        keyStyle: document.getElementById('keyStyle').value,
        reportFormat: document.getElementById('reportFormat').value,
        maxScanFiles: parseInt(document.getElementById('maxScanFiles').value, 10) || 2000,
        scanOnStartup: document.getElementById('scanOnStartup').checked,
        autoScanOnSave: document.getElementById('autoScanOnSave').checked,
        autoScanOnFileChange: document.getElementById('autoScanOnFileChange').checked,
        runCliValidationOnScan: document.getElementById('runCliValidationOnScan').checked,
        showInlineDiagnostics: document.getElementById('showInlineDiagnostics').checked,
        showHoverTranslations: document.getElementById('showHoverTranslations').checked,
        highlightLocaleKeys: document.getElementById('highlightLocaleKeys').checked,
        diagnosticSeverities: Object.fromEntries(${JSON.stringify(DIAGNOSTIC_RULES.map((rule) => rule.code))}.map(code => [code, document.getElementById('severity-' + code).value])),
        ignoredDiagnostics: values('ignoredDiagnosticsList'),
        autoTranslateProvider: document.getElementById('autoTranslateProvider').value,
        autoTranslateMode: document.getElementById('autoTranslateMode').value,
        autoTranslateTargets: document.getElementById('autoTranslateTargets').value.split(',').map(v => v.trim()).filter(Boolean),
        exclude: values('excludeList'),
        customWrappers: values('wrapperList'),
        showStatusBar: document.getElementById('showStatusBar').checked,
        enableKeyCompletion: document.getElementById('enableKeyCompletion').checked,
        enableFileBadges: document.getElementById('enableFileBadges').checked,
        enableSemanticTokens: document.getElementById('enableSemanticTokens').checked,
        enableDocumentLinks: document.getElementById('enableDocumentLinks').checked
      };
    }
    document.getElementById('addExclude').addEventListener('click', () => addRow('excludeList'));
    document.getElementById('addWrapper').addEventListener('click', () => addRow('wrapperList'));
    document.getElementById('addIgnoredDiagnostic').addEventListener('click', () => addRow('ignoredDiagnosticsList'));
    document.addEventListener('click', (event) => {
      const navButton = event.target.closest('[data-page-button]');
      if (!navButton) return;
      for (const button of document.querySelectorAll('[data-page-button]')) button.classList.toggle('active', button === navButton);
      for (const page of document.querySelectorAll('[data-page]')) page.classList.toggle('active', page.dataset.page === navButton.dataset.pageButton);
    });
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
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (rootPath) {
        await saveSharedWorkbenchSettings(rootPath, data);
      }
      for (const key of SETTINGS_KEYS) {
        await config.update(key, data[key], vscode.ConfigurationTarget.Workspace);
      }
      setExtensionLanguage(data.extensionLanguage, vscode.env.language);
      this.panel?.webview.postMessage({ command: 'saved' });
      await this.render();
      if (message.command === 'saveAndScan') {
        await vscode.commands.executeCommand('i18ntk.scanWorkspace');
      }
    }
  }
}

const SETTINGS_KEYS = [
  'localeDirectory',
  'sourceLocale',
  'extensionLanguage',
  'keyStyle',
  'reportFormat',
  'maxScanFiles',
  'scanOnStartup',
  'autoScanOnSave',
  'autoScanOnFileChange',
  'runCliValidationOnScan',
  'showInlineDiagnostics',
  'showHoverTranslations',
  'highlightLocaleKeys',
  'diagnosticSeverities',
  'ignoredDiagnostics',
  'autoTranslateProvider',
  'autoTranslateMode',
  'autoTranslateTargets',
  'exclude',
  'customWrappers',
  'showStatusBar',
  'enableKeyCompletion',
  'enableFileBadges',
  'enableSemanticTokens',
  'enableDocumentLinks'
];

const DEFAULT_DIAGNOSTIC_SEVERITIES: Record<string, string> = {
  'i18ntk.missingKey': 'warning',
  'i18ntk.placeholderMismatch': 'error',
  'i18ntk.invalidKeyName': 'warning',
  'i18ntk.unusedKey': 'warning',
  'i18ntk.riskyContent': 'warning',
  'i18ntk.expansionRisk': 'off',
  'i18ntk.autoTranslateResidual': 'warning'
  ,
  'i18ntk.clientBoundary': 'warning',
  'i18ntk.copyFormatter': 'warning'
};

const DIAGNOSTIC_RULES = [
  { code: 'i18ntk.missingKey', label: 'Missing Keys', hint: 'Used source keys that are missing in one or more locales.' },
  { code: 'i18ntk.placeholderMismatch', label: 'Placeholder Mismatches', hint: 'Target values missing placeholders from the source locale.' },
  { code: 'i18ntk.invalidKeyName', label: 'Invalid Key Names', hint: 'Keys that do not match the configured key style.' },
  { code: 'i18ntk.unusedKey', label: 'Unused Keys', hint: 'Source-locale keys that do not appear in scanned source usage.' },
  { code: 'i18ntk.riskyContent', label: 'Risky Content', hint: 'Advisory checks for untranslated values, URLs, HTML, escapes, or long values.' },
  { code: 'i18ntk.expansionRisk', label: 'Expansion Risks', hint: 'Advisory checks for translated values much longer than source values.' },
  { code: 'i18ntk.autoTranslateResidual', label: 'Auto Translate Residuals', hint: 'Keys left unresolved by Auto Translate after targeted retry.' },
  { code: 'i18ntk.clientBoundary', label: 'Client Boundary Imports', hint: 'Locale JSON imports in client-boundary files.' },
  { code: 'i18ntk.copyFormatter', label: 'Copy Formatter Wrappers', hint: 'Functions that format copy but do not call the translation runtime.' }
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
