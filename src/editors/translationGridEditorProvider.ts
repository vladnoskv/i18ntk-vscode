import * as vscode from 'vscode';
import { I18nScanResult, LocaleFileInfo } from '../types';

export class TranslationGridEditorProvider implements vscode.CustomTextEditorProvider {
  private result: (() => I18nScanResult | undefined) | undefined;

  static readonly viewType = 'i18ntk.translationGrid';

  static register(context: vscode.ExtensionContext, resultProvider: () => I18nScanResult | undefined): vscode.Disposable {
    const provider = new TranslationGridEditorProvider();
    provider.result = resultProvider;
    return vscode.window.registerCustomEditorProvider(
      TranslationGridEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: []
    };

    const documentPath = document.uri.fsPath;

    const getCurrentData = (): I18nScanResult | undefined => this.result?.();

    const updateGrid = (): void => {
      const data = getCurrentData();
      if (!data) return;

      const sourceLocale = data.sourceLocale;
      const locales = data.locales;
      const allKeys = new Set<string>();
      for (const locale of locales) {
        const values = data.keyValues[locale];
        if (values) {
          Object.keys(values).forEach((k) => allKeys.add(k));
        }
      }

      const relevantLocaleFile = data.localeFiles.find((f: LocaleFileInfo) => samePath(f.filePath, documentPath));
      const keysToShow = relevantLocaleFile ? relevantLocaleFile.keys : Array.from(allKeys);

      webviewPanel.webview.postMessage({
        type: 'updateGrid',
        sourceLocale,
        locales,
        keys: keysToShow,
        keyValues: data.keyValues,
        missingKeys: data.missingKeys.map((m) => ({ key: m.key, locale: m.locale })),
        localeFiles: data.localeFiles.map((f: LocaleFileInfo) => ({
          filePath: f.filePath,
          locale: f.locale,
          namespace: f.namespace
        })),
        currentFile: documentPath
      });
    };

    updateGrid();
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const changeListener = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateGrid();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeListener.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(async (message: { type: string; key?: string; locale?: string; value?: string; filePath?: string }) => {
      const data = getCurrentData();
      switch (message.type) {
        case 'saveCell': {
          const { key, locale, value } = message;
          if (key && locale && value !== undefined && data) {
            await this.saveTranslation(documentPath, key, locale, value, data.localeFiles, data.keyValues);
            await vscode.commands.executeCommand('i18ntk.refreshLocaleHealth');
          }
          break;
        }
        case 'openFile': {
          if (message.filePath) {
            const uri = vscode.Uri.file(message.filePath);
            await vscode.window.showTextDocument(uri);
          }
          break;
        }
        case 'requestRefresh':
          updateGrid();
          break;
      }
    });
  }

  private async saveTranslation(
    sourceFilePath: string,
    key: string,
    locale: string,
    value: string,
    localeFiles: LocaleFileInfo[],
    keyValues: Record<string, Record<string, string>>
  ): Promise<void> {
    const targetFile = localeFiles.find((f: LocaleFileInfo) => f.locale === locale && samePath(f.filePath, sourceFilePath));
    if (!targetFile) return;

    try {
      const nodeFs = require('fs') as typeof import('fs');
      const content = await nodeFs.promises.readFile(targetFile.filePath, 'utf8');
      const json: Record<string, unknown> = JSON.parse(content);

      const keyParts = key.split('.');
      let current = json;
      for (let i = 0; i < keyParts.length - 1; i++) {
        if (!(keyParts[i] in current) || typeof current[keyParts[i]] !== 'object') {
          current[keyParts[i]] = {};
        }
        current = current[keyParts[i]] as Record<string, unknown>;
      }
      const lastKey = keyParts[keyParts.length - 1];
      if (value === '') {
        delete current[lastKey];
      } else {
        current[lastKey] = value;
      }

      const newContent = JSON.stringify(json, null, 2) + '\n';
      await nodeFs.promises.writeFile(targetFile.filePath, newContent, 'utf8');
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to save translation: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Translation Grid</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 0; }
    .toolbar { display: flex; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--vscode-panel-border); align-items: center; flex-wrap: wrap; background: var(--vscode-sideBar-background); position: sticky; top: 0; z-index: 10; }
    .toolbar input { flex: 1; min-width: 180px; max-width: 320px; padding: 5px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
    .toolbar button { padding: 5px 12px; border: 0; border-radius: 3px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); white-space: nowrap; }
    .toolbar button:hover { background: var(--vscode-button-hoverBackground); }
    .toolbar button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .toolbar .stats { color: var(--vscode-descriptionForeground); font-size: 12px; margin-left: auto; }
    .grid-wrap { overflow: auto; height: calc(100vh - 52px); }
    table { border-collapse: collapse; width: max-content; min-width: 100%; }
    thead { position: sticky; top: 0; z-index: 5; }
    th { background: var(--vscode-sideBar-background); border-bottom: 2px solid var(--vscode-panel-border); padding: 8px 14px; text-align: left; font-weight: 600; white-space: nowrap; position: sticky; top: 0; }
    th:first-child { position: sticky; left: 0; z-index: 6; min-width: 200px; }
    td { border-bottom: 1px solid var(--vscode-panel-border); padding: 6px 14px; vertical-align: top; }
    td:first-child { font-family: var(--vscode-editor-font-family); font-size: 12px; color: var(--vscode-textLink-foreground); position: sticky; left: 0; background: var(--vscode-editor-background); z-index: 1; white-space: nowrap; min-width: 200px; cursor: pointer; }
    td:first-child:hover { background: var(--vscode-list-hoverBackground); }
    tr:nth-child(even) td { background: var(--vscode-editor-inactiveSelectionBackground); }
    tr:nth-child(even) td:first-child { background: var(--vscode-editor-inactiveSelectionBackground); }
    tr:nth-child(even) td:first-child:hover { background: var(--vscode-list-hoverBackground); }
    td.editable { cursor: text; min-width: 160px; position: relative; }
    td.editable:hover { background: var(--vscode-list-hoverBackground); }
    td.editable:focus { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; background: var(--vscode-input-background); }
    td.missing { background: var(--vscode-inputValidation-errorBackground); border-left: 3px solid var(--vscode-inputValidation-errorBorder); }
    td.missing::before { content: 'MISSING'; font-size: 10px; color: var(--vscode-inputValidation-errorForeground); display: block; margin-bottom: 2px; }
    td.auto-translated { border-left: 3px solid var(--vscode-inputValidation-warningBorder); }
    td.source { background: var(--vscode-editor-selectionHighlightBackground); font-weight: 600; }
    .empty-state { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--vscode-descriptionForeground); flex-direction: column; gap: 12px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <input type="text" id="searchBox" placeholder="Search keys or values (regex)" />
    <button id="btnRefresh" class="secondary" title="Refresh data">Refresh</button>
    <button id="btnTranslate" title="Auto-translate missing keys">Auto Translate</button>
    <button id="btnExport" class="secondary" title="Save current file">Save All</button>
    <span class="stats" id="stats"></span>
  </div>
  <div class="grid-wrap">
    <div id="emptyState" class="empty-state">
      <p>No scan data available. Run "i18ntk: Scan Workspace" first.</p>
      <button id="btnScan">Scan Workspace</button>
    </div>
    <table id="grid" style="display:none;">
      <thead id="headerRow"></thead>
      <tbody id="bodyRows"></tbody>
    </table>
  </div>
  <script nonce="${nonce}">
    var vscodeApi = acquireVsCodeApi();
    var currentData = null;
    var currentFile = null;
    var searchTerm = '';

    var searchBox = document.getElementById('searchBox');
    var btnRefresh = document.getElementById('btnRefresh');
    var btnScan = document.getElementById('btnScan');
    var btnExport = document.getElementById('btnExport');
    var stats = document.getElementById('stats');
    var emptyState = document.getElementById('emptyState');
    var grid = document.getElementById('grid');
    var headerRow = document.getElementById('headerRow');
    var bodyRows = document.getElementById('bodyRows');

    btnScan.addEventListener('click', function() { vscodeApi.postMessage({ type: 'requestRefresh' }); });
    btnRefresh.addEventListener('click', function() { vscodeApi.postMessage({ type: 'requestRefresh' }); });
    btnExport.addEventListener('click', function() {
      var cells = document.querySelectorAll('td[contenteditable="true"]');
      for (var i = 0; i < cells.length; i++) {
        cells[i].blur();
      }
      vscodeApi.postMessage({ type: 'requestRefresh' });
    });
    searchBox.addEventListener('input', function(e) { searchTerm = e.target.value; renderGrid(); });

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.type === 'updateGrid') {
        currentData = msg;
        currentFile = msg.currentFile;
        renderGrid();
      }
    });

    vscodeApi.postMessage({ type: 'requestRefresh' });

    function renderGrid() {
      if (!currentData) {
        emptyState.style.display = 'flex';
        grid.style.display = 'none';
        return;
      }

      emptyState.style.display = 'none';
      grid.style.display = 'table';

      var sourceLocale = currentData.sourceLocale;
      var locales = currentData.locales;
      var keys = currentData.keys;
      var keyValues = currentData.keyValues;
      var missingKeys = currentData.missingKeys;
      var missingMap = {};
      missingKeys.forEach(function(m) { missingMap[m.key + '::' + m.locale] = true; });

      var regex = null;
      try { if (searchTerm) regex = new RegExp(searchTerm, 'i'); } catch(e) {}

      var filteredKeys = keys.filter(function(k) {
        if (!regex) return true;
        if (regex.test(k)) return true;
        for (var i = 0; i < locales.length; i++) {
          var val = keyValues[locales[i]] ? keyValues[locales[i]][k] : undefined;
          if (val && regex.test(val)) return true;
        }
        return false;
      });

      var totalMissing = missingKeys.filter(function(m) { return filteredKeys.indexOf(m.key) >= 0; }).length;

      stats.textContent = filteredKeys.length + ' keys  ' + totalMissing + ' missing  ' + (keys.length - totalMissing) + ' ok';

      var headerHtml = '<tr><th>Key</th>';
      for (var li = 0; li < locales.length; li++) {
        var loc = locales[li];
        headerHtml += '<th' + (loc === sourceLocale ? ' style="color:var(--vscode-textLink-foreground)"' : '') + '>' + loc + (loc === sourceLocale ? ' (source)' : '') + '</th>';
      }
      headerHtml += '</tr>';
      headerRow.innerHTML = headerHtml;

      var bodyHtml = '';
      for (var ki = 0; ki < filteredKeys.length; ki++) {
        var key = filteredKeys[ki];
        bodyHtml += '<tr><td title="Click to open key location">' + esc(String(key)) + '</td>';
        for (var lj = 0; lj < locales.length; lj++) {
          var locale = locales[lj];
          var val = keyValues[locale] ? keyValues[locale][key] : undefined;
          var isMissing = val === undefined || val === null;
          var isSource = locale === sourceLocale;
          var cls = 'editable';
          if (isMissing) cls += ' missing';
          if (isSource) cls += ' source';
          var displayVal = isMissing ? '' : String(val);
          var cellId = 'cell_' + sanitizeId(key) + '_' + locale;
          bodyHtml += '<td class="' + cls + '" contenteditable="' + (isSource ? 'false' : 'true');
          bodyHtml += '" data-key="' + escAttr(key) + '" data-locale="' + escAttr(locale);
          bodyHtml += '" id="' + cellId + '">' + esc(String(displayVal)) + '</td>';
        }
        bodyHtml += '</tr>';
      }
      bodyRows.innerHTML = bodyHtml;

      var editableCells = document.querySelectorAll('td[contenteditable="true"]');
      for (var ci = 0; ci < editableCells.length; ci++) {
        (function(cell) {
          cell.addEventListener('blur', function() {
            var cellKey = cell.getAttribute('data-key');
            var cellLocale = cell.getAttribute('data-locale');
            var newValue = cell.textContent || '';
            if (cellKey && cellLocale) {
              vscodeApi.postMessage({ type: 'saveCell', key: cellKey, locale: cellLocale, value: newValue });
            }
          });
        })(editableCells[ci]);
      }

      var keyCells = document.querySelectorAll('td:first-child');
      for (var kci = 0; kci < keyCells.length; kci++) {
        (function(cell) {
          cell.addEventListener('click', function() {
            var cellKey = cell.textContent;
            if (cellKey && currentData.localeFiles) {
              var file = null;
              for (var fi = 0; fi < currentData.localeFiles.length; fi++) {
                if (currentData.localeFiles[fi].filePath === currentFile) {
                  file = currentData.localeFiles[fi];
                  break;
                }
              }
              if (file) {
                vscodeApi.postMessage({ type: 'openFile', filePath: file.filePath });
              }
            }
          });
        })(keyCells[kci]);
      }
    }

    function esc(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escAttr(str) {
      return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function sanitizeId(str) {
      return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  <\\/script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 64; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function samePath(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
