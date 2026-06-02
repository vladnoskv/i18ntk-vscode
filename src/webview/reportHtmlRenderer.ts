import { I18nReport } from '../types';

export function renderReportHtml(report: I18nReport, nonce: string): string {
  const result = report.result;
  const residuals = result.autoTranslateResiduals ?? [];
  const issueCount = result.missingKeys.length + result.placeholderMismatches.length + result.invalidKeyNames.length + result.riskyContent.length + result.expansionRisks.length + residuals.length;
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
    .issue-tools { display: grid; grid-template-columns: minmax(180px, 320px) auto; align-items: end; gap: 10px; margin: 18px 0 8px; }
    .issue-tools label { display: grid; gap: 5px; font-weight: 600; }
    .issue-tools input { width: 100%; padding: 7px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
    .status { color: var(--vscode-descriptionForeground); min-height: 18px; }
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
  <section class="issue-tools">
    <label for="issueFilter">Find issues<input id="issueFilter" type="search" placeholder="Filter by key, locale, file, or issue type"></label>
    <div id="status" class="status" aria-live="polite"></div>
  </section>
  ${table('Missing Keys', ['Locale', 'Key', 'Source File', 'Actions'], result.missingKeys.slice(0, 200).map((item) => [item.locale, item.key, item.sourceFilePath || '-', actions(item.sourceFilePath, item.key, true, `Missing key ${item.key} in ${item.locale}`)]), result.missingKeys.length)}
  ${table('Placeholder Mismatches', ['Locale', 'Key', 'Missing', 'Extra', 'File', 'Actions'], result.placeholderMismatches.slice(0, 200).map((item) => [item.locale, item.key, item.missing.join(', '), item.extra.join(', '), item.filePath || '-', actions(item.filePath, undefined, false, `Placeholder mismatch ${item.key} in ${item.locale}`)]), result.placeholderMismatches.length)}
  ${table('Unused Keys', ['Key', 'Confidence', 'File', 'Actions'], result.unusedKeys.slice(0, 200).map((item) => [item.key, `${Math.round(item.confidence * 100)}%`, item.filePath || '-', actions(item.filePath, undefined, false, `Unused key ${item.key}`)]), result.unusedKeys.length)}
  ${table('Invalid Key Names', ['Key', 'Expected Style', 'File', 'Actions'], result.invalidKeyNames.slice(0, 200).map((item) => [item.key, item.expectedStyle, item.filePath || '-', actions(item.filePath, undefined, false, `Invalid key name ${item.key}; expected ${item.expectedStyle}`)]), result.invalidKeyNames.length)}
  ${table('Risky Content', ['Locale', 'Key', 'Issue', 'File', 'Actions'], result.riskyContent.slice(0, 200).map((item) => [item.locale, item.key, item.message, item.filePath || '-', actions(item.filePath, undefined, false, `Risky content ${item.key} in ${item.locale}: ${item.message}`)]), result.riskyContent.length)}
  ${table('Expansion Risks', ['Locale', 'Key', 'Expansion', 'File', 'Actions'], result.expansionRisks.slice(0, 200).map((item) => [item.locale, item.key, `+${item.expansionPercent}% (${item.sourceLength} -> ${item.targetLength})`, item.filePath || '-', actions(item.filePath, undefined, false, `Expansion risk ${item.key} in ${item.locale}: +${item.expansionPercent}%`)]), result.expansionRisks.length)}
  ${table('Auto Translate Residuals', ['Locale', 'Key', 'Current Value', 'File', 'Actions'], residuals.slice(0, 200).map((item) => [item.locale, item.key, item.value, item.filePath || '-', actions(item.filePath, item.key, false, `Auto Translate residual ${item.key} in ${item.locale}`, true)]), residuals.length)}
  <h2>Suggested Next Actions</h2>
  <ul>
    <li>Add missing keys for target locales.</li>
    <li>Fix placeholder mismatches before release.</li>
    <li>Review unused keys before deletion.</li>
    <li>Address risky content warnings.</li>
    <li>Test expansion risks in constrained layouts.</li>
    <li>Review invalid key names against configured key style.</li>
    <li>Retry Auto Translate residuals with only-missing mode, or protect keys that should stay unchanged.</li>
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
      if (button.dataset.issueText) message.issueText = button.dataset.issueText;
      vsc.postMessage(message);
    });
    const filter = document.getElementById('issueFilter');
    const status = document.getElementById('status');
    filter.addEventListener('input', () => {
      const query = filter.value.trim().toLowerCase();
      let visible = 0;
      for (const row of document.querySelectorAll('tr[data-issue-row]')) {
        const show = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !show;
        if (show) visible += 1;
      }
      status.textContent = query ? visible + ' matching issue' + (visible === 1 ? '' : 's') : '';
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
    ? rows.map((row) => `<tr data-issue-row="true">${row.map((cell, index) => `<td${headers[index] === 'Actions' ? ' class="actions-cell"' : ''}>${headers[index] === 'Actions' ? cell : escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="empty">None</td></tr>`;
  return `<h2>${escapeHtml(title)}${more}</h2><div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function actions(filePath?: string, key?: string, canAddKey = false, issueText?: string, canProtectKey = false): string {
  const buttons: string[] = [];
  if (filePath) {
    buttons.push(`<button class="secondary" data-command="openFile" data-file-path="${escapeAttr(filePath)}">Open File</button>`);
  }
  if (issueText) {
    buttons.push(`<button class="secondary" data-command="copyIssue" data-issue-text="${escapeAttr(issueText)}">Copy Issue</button>`);
  }
  if (canAddKey && key) {
    buttons.push(`<button class="secondary" data-command="addMissingKey" data-key="${escapeAttr(key)}">Add Key</button>`);
  }
  if (canProtectKey && key) {
    buttons.push(`<button class="secondary" data-command="addAutoTranslatePlaceholder" data-key="${escapeAttr(key)}">Protect Key</button>`);
  }
  return buttons.length ? buttons.join(' ') : '<span class="empty">No action</span>';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
