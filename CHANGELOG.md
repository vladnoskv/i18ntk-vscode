# Changelog

## 1.1.3 - 2026-06-02

- Fixed overlapping Workbench scans by reusing the in-flight scan instead of opening multiple concurrent progress notifications.
- Kept Workbench manual-by-default: startup scans, save scans, locale/config file-change scans, and extra CLI validation are all disabled unless explicitly enabled.
- Added `i18ntk.scanOnStartup`, `i18ntk.autoScanOnFileChange`, and `i18ntk.runCliValidationOnScan` settings.
- Expanded the Workbench settings webview with a Scan Scheduling section that explains the CPU and memory tradeoffs for automatic scans.
- Stopped locale and i18ntk config file watchers from triggering scans when automatic file-change scans are disabled.
- Reduced default scan breadth from 5000 to 2000 source files and skipped source files larger than 2 MB during usage scanning.
- Avoided launching the background `i18ntk-validate` child process during normal scans unless `i18ntk.runCliValidationOnScan` is enabled.

## 1.1.2 - 2026-06-02

- Added i18ntk-powered extension UI localization with English, Spanish, French, and German locale bundles under `src/i18ntk/locales`.
- Added the `i18ntk.extensionLanguage` setting so users can follow VS Code display language or choose an extension UI language explicitly.
- Localized Workbench commands, notifications, settings UI copy, and extension webview labels through the i18ntk runtime wrapper.
- Added locale copy scripts so packaged builds include i18ntk locale assets.
- Added tests that verify language switching, interpolation, fallback behavior, locale key coverage, and placeholder parity for every extension UI locale.
- Fixed a VS Code extension-host CPU hotspot from the unresponsive profile by skipping broad known-key literal fallback scanning in very large source files while preserving explicit translation-call detection.
- Bumped the packaged i18ntk dependency reference to `i18ntk-4.4.2.tgz`.

## 1.1.1 - 2026-06-02

- Removed generic function-call key extraction so ordinary app calls such as `get("next")`, `headers.get("etag")`, and `clearWaitlist("admin.panel")` are not reported as missing translation keys.
- Matched i18ntk Lens source detection for dynamic template prefixes, statically resolved template values, scoped namespace helpers, imported locale objects, and explicit/custom wrappers.
- Reduced unused-key false positives by treating exact source string and template literals that match known locale keys as usages.
- Added exact locale JSON key ranges for unused keys, placeholder mismatches, invalid key names, risky content, and expansion warnings.
- Added Problems/editor quick fixes to open any i18ntk diagnostic key in locale files, while keeping the missing-key add action.
- Added per-rule diagnostic controls for `error`, `warning`, `off`, and `ignore`, plus right-click ignores for specific diagnostics.
- Set expansion-risk Problems off by default to avoid flooding large locale projects with advisory entries.
- Added optional locale JSON key color-coding with `i18ntk.highlightLocaleKeys` and the Workbench settings panel toggle.
- Invalid-key diagnostics now allow hybrid dot-path plus snake_case segment keys, while malformed separators and uppercase segments remain invalid.
- Kept explicit translation wrappers, configured custom wrappers, JSX i18n attributes, and imported locale-object reads as supported usage signals.
- When i18ntk Lens is installed, Workbench now leaves inline hovers and diagnostics to Lens while keeping Workbench sidebar, reports, settings, key management, and Auto Translate scans.
- Documented that unused-key reports are advisory and should not be used for bulk deletion without verification.
- Auto Translate residual reports from `i18ntk-reports/auto-translate/latest.json` are now picked up during scans, shown in Problems and the report webview, and can be resolved with a quick action that adds the key to Auto Translate protection.

## 1.0.2 - 2026-05-31

- Added issue filtering and per-issue copy actions to the Workbench report webview.
- Added source detection for imported locale JSON object reads such as `common.save`.
- Reduced false positives by reporting target-missing keys from scanned source usage instead of every unused source-locale key.
- Bumped package metadata for the 1.0.2 VSIX update.

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
