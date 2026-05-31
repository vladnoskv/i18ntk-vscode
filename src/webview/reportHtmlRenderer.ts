import { I18nReport } from '../types';

export function renderReportHtml(report: I18nReport, nonce: string): string {
  const result = report.result;
  const issueCount = result.missingKeys.length + result.placeholderMismatches.length + result.invalidKeyNames.length + result.riskyContent.length + result.expansionRisks.length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeAttr(nonce)}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { box-sizing: border-box; margin: 0; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    *, *::before, *::after { box-sizing: inherit; }
    header { border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 18px; padding-bottom: 14px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    p { color: var(--vscode-descriptionForeground); line-height: 1.45; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .metric { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; min-width: 0; }
    .metric span { display: block; color: var(--vscode-descriptionForeground); margin-bottom: 5px; }
    .metric strong { display: block; font-size: 22px; }
    .metric.error strong { color: var(--vscode-errorForeground); }
    .metric.warn strong { color: var(--vscode-editorWarning-foreground); }
    .summary { margin: 16px 0; padding: 12px; border-left: 3px solid var(--vscode-focusBorder); background: var(--vscode-sideBar-background); }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; min-width: 620px; margin-bottom: 12px; }
    th, td { border-bottom: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; vertical-align: top; }
    th { font-weight: 600; background: var(--vscode-sideBar-background); }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 10px; border-radius: 3px; cursor: pointer; white-space: nowrap; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
    .badge-error { background: var(--vscode-errorForeground); color: #fff; }
    .badge-warn { background: var(--vscode-editorWarning-foreground); color: #fff; }
    .badge-ok { background: var(--vscode-testing-iconPassed); color: #fff; }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
    .actions-cell { white-space: nowrap; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(result.rootPath)} - ${escapeHtml(new Date(result.scannedAt).toLocaleString())}</p>
    <div class="toolbar">
      <button data-command="refresh">Refresh Scan</button>
      <button data-command="validateLocales" class="secondary">Validate Locales</button>
      <button data-command="analyzeUsage" class="secondary">Analyze Usage</button>
      <button data-command="autoTranslate" class="secondary">Auto Translate Missing</button>
      <button data-command="addMissingKey" class="secondary">Add Key</button>
      <button data-command="openSettings" class="secondary">Settings</button>
      <button data-command="exportMarkdown" class="secondary">Copy Markdown</button>
      <button data-command="saveReport" class="secondary">Save Report</button>
    </div>
  </header>
  <section class="grid">
    ${metric('Source Locale', result.sourceLocale, 'ok')}
    ${metric('Locales', String(result.locales.length), 'ok')}
    ${metric('Total Keys', String(result.totalKeys), 'ok')}
    ${metric('Health Score', `${result.healthScore}%`, result.healthScore >= 80 ? 'ok' : result.healthScore >= 50 ? 'warn' : 'error')}
    ${metric('Open Issues', String(issueCount), issueCount === 0 ? 'ok' : issueCount < 10 ? 'warn' : 'error')}
  </section>
  <div class="summary">
    Use this report to move from diagnosis to action: validate before release, add missing keys, open affected files, and run Auto Translate for target locale files when the local i18ntk CLI is available.
  </div>
  ${table('Missing Keys', ['Locale', 'Key', 'Source File', 'Actions'], result.missingKeys.slice(0, 200).map((item) => [item.locale, item.key, item.sourceFilePath || '-', actions(item.sourceFilePath, item.key, true)]), result.missingKeys.length)}
  ${table('Placeholder Mismatches', ['Locale', 'Key', 'Missing', 'Extra', 'File', 'Actions'], result.placeholderMismatches.slice(0, 200).map((item) => [item.locale, item.key, item.missing.join(', '), item.extra.join(', '), item.filePath || '-', actions(item.filePath)]), result.placeholderMismatches.length)}
  ${table('Unused Keys', ['Key', 'Confidence', 'File', 'Actions'], result.unusedKeys.slice(0, 200).map((item) => [item.key, `${Math.round(item.confidence * 100)}%`, item.filePath || '-', actions(item.filePath)]), result.unusedKeys.length)}
  ${table('Invalid Key Names', ['Key', 'Expected Style', 'File', 'Actions'], result.invalidKeyNames.slice(0, 200).map((item) => [item.key, item.expectedStyle, item.filePath || '-', actions(item.filePath)]), result.invalidKeyNames.length)}
  ${table('Risky Content', ['Locale', 'Key', 'Issue', 'File', 'Actions'], result.riskyContent.slice(0, 200).map((item) => [item.locale, item.key, item.message, item.filePath || '-', actions(item.filePath)]), result.riskyContent.length)}
  ${table('Expansion Risks', ['Locale', 'Key', 'Expansion', 'File', 'Actions'], result.expansionRisks.slice(0, 200).map((item) => [item.locale, item.key, `+${item.expansionPercent}% (${item.sourceLength} -> ${item.targetLength})`, item.filePath || '-', actions(item.filePath)]), result.expansionRisks.length)}
  <h2>Suggested Next Actions</h2>
  <ul>
    <li>Add missing keys for target locales.</li>
    <li>Fix placeholder mismatches before release.</li>
    <li>Review unused keys before deletion.</li>
    <li>Address risky content warnings.</li>
    <li>Test expansion risks in constrained layouts.</li>
    <li>Review invalid key names against configured key style.</li>
  </ul>
  <script nonce="${escapeAttr(nonce)}">
    const vsc = acquireVsCodeApi();
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-command]');
      if (!button) return;
      const command = button.dataset.command;
      const message = { command };
      if (button.dataset.filePath) message.filePath = button.dataset.filePath;
      if (button.dataset.key) message.key = button.dataset.key;
      vsc.postMessage(message);
    });
  </script>
</body>
</html>`;
}

function metric(label: string, value: string, variant: 'ok' | 'warn' | 'error'): string {
  const cls = variant === 'error' ? ' metric error' : variant === 'warn' ? ' metric warn' : 'metric';
  return `<div class="${cls}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function table(title: string, headers: string[], rows: string[][], total: number): string {
  const shown = rows.length;
  const more = total > shown ? ` <span style="color:var(--vscode-descriptionForeground);">(showing ${shown} of ${total})</span>` : '';
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell, index) => `<td${headers[index] === 'Actions' ? ' class="actions-cell"' : ''}>${headers[index] === 'Actions' ? cell : escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="empty">None</td></tr>`;
  return `<h2>${escapeHtml(title)}${more}</h2><div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function actions(filePath?: string, key?: string, canAddKey = false): string {
  const buttons: string[] = [];
  if (filePath) {
    buttons.push(`<button class="secondary" data-command="openFile" data-file-path="${escapeAttr(filePath)}">Open File</button>`);
  }
  if (canAddKey && key) {
    buttons.push(`<button class="secondary" data-command="addMissingKey" data-key="${escapeAttr(key)}">Add Key</button>`);
  }
  return buttons.length ? buttons.join(' ') : '<span class="empty">No action</span>';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
