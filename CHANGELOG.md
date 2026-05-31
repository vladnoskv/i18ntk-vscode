# Changelog

All notable changes to the i18ntk Workbench VS Code extension.

## [0.1.0] - 2026-05-31

### Added
- Initial release of i18ntk Workbench.
- Locale Health tree view in the Activity Bar with Project Health, Missing Keys, Placeholder Mismatches, Unused Keys, Expansion Risks, and Reports sections.
- `i18ntk: Scan Workspace` command with progress notification and cancellation support.
- Missing key diagnostics with `i18ntk.missingKey` code (severity: warning).
- Placeholder mismatch diagnostics with `i18ntk.placeholderMismatch` code (severity: error for missing, warning for extra).
- Invalid key name diagnostics with `i18ntk.invalidKeyName` code (severity: warning).
- Unused key diagnostics with `i18ntk.unusedKey` code (severity: info).
- Translation hover provider for `t()`, `i18n.t()`, `translate()`, `$t()` calls with locale value table, missing indicator, and "Add missing key" action link.
- "Add missing translation key" quick fix code action offered on missing-key diagnostics.
- `i18ntk: Add Missing Key` command with input prompts and insertion into all locale JSON files (flat or nested, format-preserving).
- `i18ntk: Open Key in Locale Files` command to open all locale files containing a specific key.
- `i18ntk: Open Summary Report` command with CSP-protected webview.
- `i18ntk: Refresh Locale Health` and `i18ntk: Open Settings` commands.
- Summary report webview with metric cards, sortable tables, open-file buttons, copy-markdown, and save-to-disk export.
- Health score calculation based on missing keys (3x), placeholder mismatches (5x), and risky content (1x).
- Risky content detection: untranslated values, URLs/emails, HTML markup, escape sequences, long values.
- Text expansion risk detection (>30% longer than source).
- File watchers for locale JSON changes (2s debounce) and i18ntk config changes (immediate rescan).
- Configurable auto-scan on save (750ms debounce).
- Auto-detection of locale directories: `locales`, `locale`, `i18n`, `translations`, `public/locales`, `src/locales`.
- Supported locale layouts: directory-per-locale (`en/common.json`) and flat files (`en.json`).
- i18ntk CLI integration via optional `i18ntk-validate.js` in sibling/module path.
- Configuration settings: `localeDirectory`, `sourceLocale`, `keyStyle`, `autoScanOnSave`, `showInlineDiagnostics`, `showHoverTranslations`, `reportFormat`, `maxScanFiles`, `exclude`.
- Privacy: local-first, no telemetry, no remote data sending, CSP-protected webview.
- TypeScript strict mode, modular architecture, testable service layer.

## [Unreleased]

### Planned
- Deeper integration with stable public `i18ntk` APIs.
- More framework-specific extraction actions (Vue SFC, Svelte, Angular templates).
- Rich JSON key navigation to exact line positions in locale files.
- Expansion-risk visual overlays for UI template files.
- Optional provider-backed translation hints behind explicit configuration.
- i18n namespace detection and management.
- Sorting options for locale file keys.
- Batch key insertion from editor selections.
