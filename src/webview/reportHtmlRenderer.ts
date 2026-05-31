import { I18nReport } from '../types';

export function renderReportHtml(report: I18nReport, nonce: string): string {
  const result = report.result;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeAttr(nonce)}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; }
    header { border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 20px; padding-bottom: 14px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin-top: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .metric { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; }
    .metric strong { display: block; font-size: 22px; }
    .metric.error strong { color: var(--vscode-errorForeground); }
    .metric.warn strong { color: var(--vscode-editorWarning-foreground); }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
    th, td { border-bottom: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; vertical-align: top; }
    th { font-weight: 600; background: var(--vscode-sideBar-background); }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 10px; border-radius: 3px; margin-right: 8px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
    .badge-error { background: var(--vscode-errorForeground); color: #fff; }
    .badge-warn { background: var(--vscode-editorWarning-foreground); color: #fff; }
    .badge-ok { background: var(--vscode-testing-iconPassed); color: #fff; }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(result.rootPath)} &mdash; ${escapeHtml(new Date(result.scannedAt).toLocaleString())}</p>
    <button id="refresh">&#x21bb; Refresh Scan</button>
    <button id="export">&#x2398; Copy Markdown</button>
    <button id="save">&#x1F4BE; Save Report</button>
  </header>
  <section class="grid">
    ${metric('Source Locale', result.sourceLocale, 'ok')}
    ${metric('Locales', String(result.locales.length), 'ok')}
    ${metric('Total Keys', String(result.totalKeys), 'ok')}
    ${metric('Health Score', `${result.healthScore}%`, result.healthScore >= 80 ? 'ok' : result.healthScore >= 50 ? 'warn' : 'error')}
  </section>
  ${table('Missing Keys', ['Locale', 'Key', 'Source File'], result.missingKeys.slice(0, 200).map((item) => [item.locale, item.key, item.sourceFilePath || '-']), result.missingKeys.length)}
  ${table('Placeholder Mismatches', ['Locale', 'Key', 'Missing', 'Extra', 'File'], result.placeholderMismatches.slice(0, 200).map((item) => [item.locale, item.key, item.missing.join(', '), item.extra.join(', '), item.filePath || '-']), result.placeholderMismatches.length)}
  ${table('Unused Keys', ['Key', 'Confidence', 'File'], result.unusedKeys.slice(0, 200).map((item) => [item.key, `${Math.round(item.confidence * 100)}%`, item.filePath || '-']), result.unusedKeys.length)}
  ${table('Risky Content', ['Locale', 'Key', 'Issue', 'File'], result.riskyContent.slice(0, 200).map((item) => [item.locale, item.key, item.message, item.filePath || '-']), result.riskyContent.length)}
  ${table('Expansion Risks', ['Locale', 'Key', 'Expansion', 'File'], result.expansionRisks.slice(0, 200).map((item) => [item.locale, item.key, `+${item.expansionPercent}% (${item.sourceLength} &rarr; ${item.targetLength})`, item.filePath || '-']), result.expansionRisks.length)}
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
    document.getElementById('refresh').addEventListener('click', () => vsc.postMessage({ command: 'refresh' }));
    document.getElementById('export').addEventListener('click', () => vsc.postMessage({ command: 'exportMarkdown' }));
    document.getElementById('save').addEventListener('click', () => vsc.postMessage({ command: 'saveReport' }));
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
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="empty">None</td></tr>`;
  return `<h2>${escapeHtml(title)}${more}</h2><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
