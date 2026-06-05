import { I18ntkIssue, I18ntkIssueType, I18ntkReport } from '../types';

const ISSUE_TABS: Array<{ id: string; label: string; type?: I18ntkIssueType }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'missing', label: 'Missing Keys', type: 'missing_key' },
  { id: 'unused', label: 'Unused Keys', type: 'unused_key' },
  { id: 'placeholders', label: 'Placeholder Mismatches', type: 'placeholder_mismatch' },
  { id: 'untranslated', label: 'Likely Untranslated', type: 'likely_untranslated' },
  { id: 'expansion', label: 'Expansion Risk', type: 'expansion_risk' },
  { id: 'hardcoded', label: 'Hardcoded Text', type: 'hardcoded_text' },
  { id: 'exports', label: 'Exports' }
];

export function renderReportHtml(report: I18ntkReport, nonce: string, ignoredDiagnostics: string[] = []): string {
  const reportJson = escapeScriptJson(report);
  const ignoredJson = escapeScriptJson(ignoredDiagnostics);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeAttr(nonce)}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>i18ntk Report</title>
  <style>
    body { box-sizing: border-box; margin: 0; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 0; }
    *, *::before, *::after { box-sizing: inherit; }
    .shell { max-width: 1480px; margin: 0 auto; padding: 22px 24px 32px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 14px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 22px 0 10px; font-size: 17px; }
    p { color: var(--vscode-descriptionForeground); line-height: 1.45; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
    button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: .55; cursor: default; }
    button.secondary, .tabs button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.secondary:hover, .tabs button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button.active { outline: 1px solid var(--vscode-focusBorder); background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .toolbar, .tabs, .export-actions, .bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 12px; }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; min-width: 0; }
    .card span { display: block; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    .card strong { display: block; font-size: 22px; }
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 16px 0 10px; }
    label { display: grid; gap: 5px; font-weight: 600; }
    input, select { width: 100%; min-width: 0; padding: 7px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; min-width: 860px; }
    th, td { border-bottom: 1px solid var(--vscode-panel-border); padding: 9px 8px; text-align: left; vertical-align: top; }
    th { background: var(--vscode-sideBar-background); font-weight: 600; }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover, tr.selected { background: var(--vscode-list-hoverBackground); }
    tr.ignored { opacity: .48; }
    .select-cell { width: 34px; }
    .badge { display: inline-block; border-radius: 10px; padding: 2px 7px; font-size: 12px; font-weight: 600; }
    .error { color: var(--vscode-errorForeground); }
    .warning { color: var(--vscode-editorWarning-foreground); }
    .info { color: var(--vscode-descriptionForeground); }
    .empty { border: 1px dashed var(--vscode-panel-border); border-radius: 6px; padding: 20px; color: var(--vscode-descriptionForeground); }
    .status { color: var(--vscode-descriptionForeground); min-height: 18px; }
    .issue-path { color: var(--vscode-descriptionForeground); white-space: nowrap; }
    .context-menu { position: fixed; z-index: 1000; min-width: 190px; padding: 5px; border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border)); border-radius: 6px; background: var(--vscode-menu-background, var(--vscode-editor-background)); box-shadow: 0 8px 18px rgba(0,0,0,.35); }
    .context-menu button { display: block; width: 100%; text-align: left; background: transparent; color: var(--vscode-menu-foreground, var(--vscode-foreground)); }
    .context-menu button:hover { background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground)); color: var(--vscode-menu-selectionForeground, var(--vscode-foreground)); }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
<div class="shell">
  <header>
    <div>
      <h1>i18ntk Workbench Report</h1>
      <p>${escapeHtml(maskProjectPath(report.projectRoot))} - ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p>
    </div>
    <div class="toolbar">
      <button data-action="refresh">Refresh</button>
      <button class="secondary" data-export="json">Export JSON</button>
      <button class="secondary" data-export="markdown">Export Markdown</button>
      <button class="secondary" data-export="html">Export HTML</button>
    </div>
  </header>

  <section class="cards">
    ${card('Total Keys', String(report.summary.totalKeys))}
    ${card('Locales', String(report.summary.localeCount))}
    ${card('Avg Complete', `${report.summary.averageCompletenessPct}%`)}
    ${card('Total Issues', String(report.summary.issueCount))}
  </section>

  <nav class="tabs" aria-label="Report sections">
    ${ISSUE_TABS.map((tab, index) => `<button class="${index === 0 ? 'active' : ''}" data-tab="${escapeAttr(tab.id)}">${escapeHtml(tab.label)}</button>`).join('')}
  </nav>

  <section id="tab-overview" data-panel="overview">
    <h2>Translation Completeness</h2>
    ${completenessTable(report)}
  </section>

  ${ISSUE_TABS.filter(tab => tab.type).map(tab => issuePanel(tab.id, tab.label, report.issues.filter(issue => issue.type === tab.type), ignoredDiagnostics)).join('')}

  <section id="tab-exports" data-panel="exports" hidden>
    <h2>Exports</h2>
    <p>Generate local reports from the main i18ntk package. Existing exported paths are shown when this dashboard was opened from an export run.</p>
    <div class="export-actions">
      <button data-export="json">Export JSON</button>
      <button data-export="markdown">Export Markdown</button>
      <button data-export="html">Export HTML</button>
    </div>
    ${exportsList(report)}
  </section>

  <template id="filters-template">
    <div class="filters">
      <label>Search<input id="filter-search" type="search" placeholder="Key, file, or message"></label>
      <label>Type<select id="filter-type"><option value="">All</option>${options(unique(report.issues.map(issue => issue.type)))}</select></label>
      <label>Severity<select id="filter-severity"><option value="">All</option>${options(unique(report.issues.map(issue => issue.severity)))}</select></label>
      <label>Locale<select id="filter-locale"><option value="">All</option>${options(unique(report.issues.map(issue => issue.locale).filter(Boolean) as string[]))}</select></label>
      <label>Min confidence<input id="filter-confidence" type="number" min="0" max="100" step="5" placeholder="0-100"></label>
    </div>
    <div id="filter-status" class="status" aria-live="polite"></div>
  </template>
  <div id="context-menu" class="context-menu" hidden>
    <button data-menu-action="open">Open issue</button>
    <button data-menu-action="ignore">Ignore issue</button>
    <button data-menu-action="ignore-selected">Ignore selected issues</button>
    <button data-menu-action="copy">Copy issue key</button>
  </div>

  <script nonce="${escapeAttr(nonce)}">
    const vscode = acquireVsCodeApi();
    const report = ${reportJson};
    const ignoredDiagnostics = new Set(${ignoredJson});
    const filtersTemplate = document.getElementById('filters-template');
    const contextMenu = document.getElementById('context-menu');
    let contextIssueId = undefined;
    for (const panel of document.querySelectorAll('[data-issue-panel]')) {
      panel.prepend(filtersTemplate.content.cloneNode(true));
      updateBulkState(panel);
    }

    document.addEventListener('click', (event) => {
      const target = event.target.closest('button, input[data-select-issue], tr[data-issue-id]');
      if (!event.target.closest('#context-menu')) hideContextMenu();
      if (!target) return;
      if (target.dataset.tab) {
        for (const button of document.querySelectorAll('[data-tab]')) button.classList.toggle('active', button === target);
        for (const panel of document.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== target.dataset.tab;
      } else if (target.dataset.action === 'refresh') {
        vscode.postMessage({ type: 'refreshReport' });
      } else if (target.dataset.export) {
        vscode.postMessage({ type: 'exportReport', format: target.dataset.export });
      } else if (target.dataset.bulkAction === 'ignore') {
        ignoreSelected(target.closest('[data-issue-panel]'));
      } else if (target.dataset.bulkAction === 'clear') {
        for (const input of target.closest('[data-issue-panel]').querySelectorAll('input[data-select-issue]')) input.checked = false;
        updateBulkState(target.closest('[data-issue-panel]'));
      } else if (target.dataset.selectIssue) {
        const row = target.closest('tr[data-issue-id]');
        row.classList.toggle('selected', target.checked);
        updateBulkState(target.closest('[data-issue-panel]'));
      } else if (target.dataset.menuAction) {
        runMenuAction(target.dataset.menuAction);
      } else if (target.dataset.issueId) {
        vscode.postMessage({ type: 'openIssue', issueId: target.dataset.issueId });
      }
    });

    document.addEventListener('contextmenu', (event) => {
      const row = event.target.closest('tr[data-issue-id]');
      if (!row) return;
      event.preventDefault();
      contextIssueId = row.dataset.issueId;
      contextMenu.style.left = event.clientX + 'px';
      contextMenu.style.top = event.clientY + 'px';
      contextMenu.hidden = false;
    });

    document.addEventListener('input', applyFilters);
    document.addEventListener('change', applyFilters);

    function applyFilters(event) {
      const panel = event.target.closest('[data-issue-panel]');
      if (!panel) return;
      const q = panel.querySelector('#filter-search').value.trim().toLowerCase();
      const type = panel.querySelector('#filter-type').value;
      const severity = panel.querySelector('#filter-severity').value;
      const locale = panel.querySelector('#filter-locale').value;
      const minConfidenceRaw = panel.querySelector('#filter-confidence').value;
      const minConfidence = minConfidenceRaw ? Number(minConfidenceRaw) / 100 : 0;
      let visible = 0;
      for (const row of panel.querySelectorAll('tr[data-issue-id]')) {
        const issue = report.issues.find(item => item.id === row.dataset.issueId);
        const confidence = typeof issue.confidence === 'number' ? issue.confidence : 1;
        const haystack = row.textContent.toLowerCase();
        const show = (!q || haystack.includes(q)) &&
          (!type || issue.type === type) &&
          (!severity || issue.severity === severity) &&
          (!locale || issue.locale === locale) &&
          confidence >= minConfidence;
        row.hidden = !show;
        if (show) visible += 1;
      }
      const status = panel.querySelector('#filter-status');
      if (status) status.textContent = q || type || severity || locale || minConfidenceRaw ? visible + ' matching issue' + (visible === 1 ? '' : 's') : '';
      updateBulkState(panel);
    }

    function selectedIssueIds(panel) {
      if (!panel) return [];
      return [...panel.querySelectorAll('input[data-select-issue]:checked')]
        .filter(input => !input.closest('tr').hidden)
        .map(input => input.dataset.selectIssue);
    }

    function ignoreSelected(panel) {
      const ids = selectedIssueIds(panel);
      if (ids.length) vscode.postMessage({ type: 'ignoreIssues', issueIds: ids });
    }

    function updateBulkState(panel) {
      if (!panel) return;
      const count = selectedIssueIds(panel).length;
      const label = panel.querySelector('[data-selected-count]');
      if (label) label.textContent = count ? count + ' selected' : 'No rows selected';
      for (const button of panel.querySelectorAll('[data-needs-selection]')) button.disabled = count === 0;
    }

    function hideContextMenu() {
      contextMenu.hidden = true;
    }

    function runMenuAction(action) {
      const row = contextIssueId ? document.querySelector('tr[data-issue-id="' + CSS.escape(contextIssueId) + '"]') : undefined;
      if (action === 'open' && contextIssueId) vscode.postMessage({ type: 'openIssue', issueId: contextIssueId });
      if (action === 'ignore' && contextIssueId) vscode.postMessage({ type: 'ignoreIssues', issueIds: [contextIssueId] });
      if (action === 'ignore-selected') ignoreSelected(row?.closest('[data-issue-panel]'));
      if (action === 'copy' && row) navigator.clipboard?.writeText(row.dataset.issueKey || '');
      hideContextMenu();
    }
  </script>
</div>
</body>
</html>`;
}

function card(label: string, value: string): string {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function completenessTable(report: I18ntkReport): string {
  if (report.locales.length === 0) return `<div class="empty">No locale data found.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Locale</th><th>Translated</th><th>Missing</th><th>Complete</th><th>Placeholders</th><th>Untranslated</th><th>Expansion</th></tr></thead><tbody>${report.locales.map(locale => `<tr><td>${escapeHtml(locale.locale)}</td><td>${locale.translatedKeys}/${locale.totalKeys}</td><td>${locale.missingKeys}</td><td>${locale.completenessPct}%</td><td>${locale.placeholderMismatchCount}</td><td>${locale.likelyUntranslatedCount}</td><td>${locale.expansionRiskCount}</td></tr>`).join('')}</tbody></table></div>`;
}

function issuePanel(id: string, label: string, issues: I18ntkIssue[], ignoredDiagnostics: string[]): string {
  return `<section id="tab-${escapeAttr(id)}" data-panel="${escapeAttr(id)}" data-issue-panel="${escapeAttr(id)}" hidden>
    <h2>${escapeHtml(label)}</h2>
    <div class="bulk-actions">
      <span class="status" data-selected-count>No rows selected</span>
      <button class="secondary" data-bulk-action="ignore" data-needs-selection disabled>Ignore selected</button>
      <button class="secondary" data-bulk-action="clear" data-needs-selection disabled>Clear selection</button>
    </div>
    ${issues.length === 0 ? `<div class="empty">No ${escapeHtml(label.toLowerCase())} found.</div>` : issueTable(issues, ignoredDiagnostics)}
  </section>`;
}

function issueTable(issues: I18ntkIssue[], ignoredDiagnostics: string[]): string {
  return `<div class="table-wrap"><table><thead><tr><th class="select-cell"></th><th>Severity</th><th>Locale</th><th>Key</th><th>Confidence</th><th>Message</th><th>File</th></tr></thead><tbody>${issues.map(issue => `<tr class="${issue.file ? 'clickable' : ''}${isIgnoredIssue(issue) ? ' ignored' : ''}" data-issue-id="${escapeAttr(issue.id)}" data-issue-key="${escapeAttr(issue.key || '')}"><td class="select-cell"><input type="checkbox" data-select-issue="${escapeAttr(issue.id)}" aria-label="Select ${escapeAttr(issue.key || issue.id)}"></td><td class="${escapeAttr(issue.severity)}">${escapeHtml(issue.severity)}</td><td>${escapeHtml(issue.locale || '')}</td><td>${escapeHtml(issue.key || '')}</td><td>${typeof issue.confidence === 'number' ? `${Math.round(issue.confidence * 100)}%` : ''}</td><td>${escapeHtml(issue.message)}${issue.suggestion ? `<br><span class="info">${escapeHtml(issue.suggestion)}</span>` : ''}</td><td><span class="issue-path">${escapeHtml(formatFile(issue))}</span></td></tr>`).join('')}</tbody></table></div>`;

  function isIgnoredIssue(issue: I18ntkIssue): boolean {
    const code = issueTypeToDiagnosticCode(issue.type);
    if (!code || !issue.key) return false;
    const id = [code, issue.key, issue.locale].filter(Boolean).join(':');
    return ignoredDiagnostics.includes(id) || ignoredDiagnostics.includes(`${code}:${issue.key}`);
  }
}

function exportsList(report: I18ntkReport): string {
  const entries = Object.entries(report.exports || {});
  if (entries.length === 0) return `<div class="empty">No exports have been generated for this report yet.</div>`;
  return `<ul>${entries.map(([format, file]) => `<li>${escapeHtml(format)}: ${escapeHtml(file || '')}</li>`).join('')}</ul>`;
}

function formatFile(issue: I18ntkIssue): string {
  if (!issue.file) return '';
  const line = issue.line ? `:${issue.line}` : '';
  const pathPart = issue.key ? issue.key : issue.type;
  return `📄 ${issue.file}${line} → ${pathPart}`;
}

function issueTypeToDiagnosticCode(type: I18ntkIssueType): string | undefined {
  switch (type) {
    case 'missing_key': return 'i18ntk.missingKey';
    case 'unused_key': return 'i18ntk.unusedKey';
    case 'placeholder_mismatch': return 'i18ntk.placeholderMismatch';
    case 'likely_untranslated': return 'i18ntk.riskyContent';
    case 'expansion_risk': return 'i18ntk.expansionRisk';
    default: return undefined;
  }
}

function options(values: string[]): string {
  return values.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join('');
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function maskProjectPath(projectRoot: string): string {
  const parts = projectRoot.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : projectRoot;
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => ({
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  }[char] ?? char));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
