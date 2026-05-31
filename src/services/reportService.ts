import { I18nReport, I18nScanResult } from '../types';

export class ReportService {
  generate(result: I18nScanResult): I18nReport {
    return {
      title: 'i18ntk Workbench Summary',
      markdown: this.toMarkdown(result),
      result
    };
  }

  toMarkdown(result: I18nScanResult): string {
    const lines = [
      `# i18ntk Workbench Summary — ${result.sourceLocale} (source)`,
      '',
      `**Generated:** ${new Date(result.scannedAt).toLocaleString()}`,
      `**Root:** ${result.rootPath}`,
      `**Locale directory:** ${result.localeDirectory}`,
      '',
      '## Overview',
      '',
      `| Metric | Value |`,
      `|---|---|`,
      `| Source Locale | ${result.sourceLocale} |`,
      `| Locales | ${result.locales.join(', ')} (${result.locales.length}) |`,
      `| Total Keys | ${result.totalKeys} |`,
      `| Health Score | ${result.healthScore}% |`,
      `| Missing Keys | ${result.missingKeys.length} |`,
      `| Placeholder Mismatches | ${result.placeholderMismatches.length} |`,
      `| Unused Keys | ${result.unusedKeys.length} |`,
      `| Invalid Key Names | ${result.invalidKeyNames.length} |`,
      `| Risky Content | ${result.riskyContent.length} |`,
      `| Expansion Risks | ${result.expansionRisks.length} |`,
      '',
      '## Missing Keys',
      ...(result.missingKeys.length > 0
        ? result.missingKeys.map((item) => `- **${escapeMarkdownT(item.locale)}**: \`${escapeMarkdownT(item.key)}\``)
        : ['_None_']),
      '',
      '## Placeholder Mismatches',
      ...(result.placeholderMismatches.length > 0
        ? result.placeholderMismatches.map((item) => `- **${escapeMarkdownT(item.locale)}**: \`${escapeMarkdownT(item.key)}\` — missing \`${item.missing.join(', ') || 'none'}\`, extra \`${item.extra.join(', ') || 'none'}\``)
        : ['_None_']),
      '',
      '## Unused Keys',
      ...(result.unusedKeys.length > 0
        ? result.unusedKeys.map((item) => `- \`${escapeMarkdownT(item.key)}\` (${Math.round(item.confidence * 100)}% confidence)`)
        : ['_None_']),
      '',
      '## Invalid Key Names',
      ...(result.invalidKeyNames.length > 0
        ? result.invalidKeyNames.map((item) => `- \`${escapeMarkdownT(item.key)}\` — expected style: ${item.expectedStyle}`)
        : ['_None_']),
      '',
      '## Risky Content',
      ...(result.riskyContent.length > 0
        ? result.riskyContent.map((item) => `- **${escapeMarkdownT(item.locale)}**: \`${escapeMarkdownT(item.key)}\` — ${item.message}`)
        : ['_None_']),
      '',
      '## Expansion Risks (>30% longer)',
      ...(result.expansionRisks.length > 0
        ? result.expansionRisks.map((item) => `- **${escapeMarkdownT(item.locale)}**: \`${escapeMarkdownT(item.key)}\` — ${item.sourceLength} → ${item.targetLength} (+${item.expansionPercent}%)`)
        : ['_None_']),
      '',
      '## Suggested Next Actions',
      '',
      '- Add missing keys for target locales.',
      '- Fix placeholder mismatches before release.',
      '- Review unused keys before deleting them.',
      '- Address risky content (untranslated strings, embedded URLs).',
      '- Test expansion risks in constrained UI layouts.',
      '- Review invalid key names against configured key style.'
    ];
    return lines.join('\n');
  }
}

function escapeMarkdownT(value: string): string {
  return value.replace(/[\\|`*_{}\[\]()#+\-.!]/g, '\\$&');
}
