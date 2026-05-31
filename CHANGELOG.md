# Changelog

## 0.1.0 — 2026-05-31

- Initial release.
- Locale Health sidebar (Project Health, Missing Keys, Placeholder Mismatches, Unused Keys, Expansion Risks, Reports).
- `i18ntk: Scan Workspace` with progress notification and cancellation support.
- Missing key, placeholder mismatch, invalid key name, and unused key diagnostics.
- Translation hover provider for `t()`, `i18n.t()`, `translate()`, `$t()`, and JSX attributes.
- Quick fix: "Add missing translation key" with flat/nested JSON insertion and formatting preservation.
- Summary report webview with metric cards, tables, copy Markdown, and save to disk.
- File watchers for locale JSON and i18ntk config changes.
- Auto-scan on save with 750ms debounce.
- Cancellable workspace scans.
- i18ntk CLI integration via sibling `i18ntk-validate.js`.
- Health score calculation with missing keys, placeholder mismatches, and risky content penalties.
- Risky content detection: untranslated values, URLs/emails, HTML markup, escape sequences, long values.
- Text expansion risk detection (>30% longer than source).
- JSON locale file discovery: directory-per-locale and flat-file layouts.
- Configuration: `localeDirectory`, `sourceLocale`, `keyStyle`, `autoScanOnSave`, `showInlineDiagnostics`, `showHoverTranslations`, `reportFormat`, `maxScanFiles`, `exclude`.
