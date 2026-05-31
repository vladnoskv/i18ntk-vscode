# Changelog

## 1.0.0 - 2026-05-31

- First Marketplace-ready release.
- Polished launch documentation for Workbench workflows, privacy, supported layouts, and Auto Translate.
- Added clearer test scripts for compile, unit, aggregate, and release verification.
- Added explicit CLI installation guidance for `npm install i18ntk` when Auto Translate is used.
- Documented that Workbench owns the single i18ntk Activity Bar icon while Lens stays inline-only.
- Packaged extension for VS Code Marketplace distribution.

## 0.2.0 - 2026-05-31

- Bumped extension version to 0.2.0.
- Added an actionable report webview with validation, usage analysis, Auto Translate, add-key, open-file, settings, copy, and save actions.
- Added invalid key names to the report webview.
- Added `i18ntk: Auto Translate Missing`, backed by the local `i18ntk-translate` CLI in non-interactive placeholder-safe mode.
- Added a Workbench settings webview for scan, diagnostics, wrapper, exclusion, and Auto Translate settings.
- Added Auto Translate settings for provider, target locales, and mode.
- Reorganized the Locale Health view title menu into scan, quality, action, and management groups.
- Updated user-facing README documentation for commands, settings, Auto Translate, supported layouts, and privacy.

## 0.1.0 - 2026-05-31

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
