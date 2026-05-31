# i18ntk Workbench

Interactive localization workbench for i18ntk projects: quality control, diagnostics, reports, settings, key management, and CLI-backed Auto Translate inside VS Code.

## Features

- **Locale Health sidebar**: project health score, missing keys by locale, placeholder mismatches, unused keys, expansion risks, and reports.
- **Diagnostics**: missing keys, placeholder mismatches, invalid key names, unused keys, risky content, and expansion warnings in your editor.
- **Hover translations**: see every locale value for `t("key")`, `i18n.t(...)`, `translate(...)`, and `$t(...)`.
- **Quick Fix: Add missing key**: insert a missing translation into locale JSON files while preserving formatting.
- **Actionable report webview**: validate, analyze usage, Auto Translate, open files, add keys, copy Markdown, save reports, and open settings from one view.
- **Workbench settings webview**: configure locale discovery, key style, diagnostics, wrappers, exclusions, and Auto Translate defaults.
- **Auto Translate from VS Code**: run the local `i18ntk-translate` CLI in non-interactive placeholder-safe mode for directory-per-locale projects.
- **Local-first behavior**: no telemetry and no remote calls except translation provider calls made by the i18ntk CLI when you explicitly run Auto Translate.

## Quick Start

1. Open a project with locale files, such as `locales/en/common.json` and `locales/fr/common.json`.
2. Run `i18ntk: Scan Workspace` from the Command Palette.
3. Open the i18ntk Workbench sidebar to inspect health and issue groups.
4. Open `i18ntk: Open Summary Report` to validate, inspect issues, open files, add missing keys, or run Auto Translate.
5. Open `i18ntk: Open Settings` to tune scanning, diagnostics, wrappers, exclusions, and Auto Translate defaults.

## Commands

| Command | Description |
|---|---|
| `i18ntk: Scan Workspace` | Detects config, scans locale/source files, updates diagnostics, tree views, and reports. |
| `i18ntk: Refresh Locale Health` | Refreshes the sidebar tree view. |
| `i18ntk: Open Summary Report` | Opens the actionable report webview. |
| `i18ntk: Add Missing Key` | Inserts a new key into locale files. |
| `i18ntk: Auto Translate Missing` | Runs the local `i18ntk-translate` CLI for selected target locales. |
| `i18ntk: Validate Locales` | Re-scans and prints validation issues in the Output panel. |
| `i18ntk: Analyze Usage` | Re-scans and prints usage, missing, unused, placeholder, expansion, and health totals. |
| `i18ntk: Open Key in Locale Files` | Opens locale files containing a specific key. |
| `i18ntk: Open Settings` | Opens the Workbench settings webview. |
| `i18ntk: Open Native Settings` | Opens VS Code's native settings UI filtered to i18ntk. |

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `i18ntk.localeDirectory` | string | `""` | Locale directory path relative to workspace root. Empty means auto-detect. |
| `i18ntk.sourceLocale` | string | `"en"` | Source/default locale code. |
| `i18ntk.keyStyle` | enum | `"dot"` | Expected key style: `dot`, `snake`, `camel`, `kebab`, or `flat`. |
| `i18ntk.autoScanOnSave` | boolean | `false` | Run a debounced scan after file saves. |
| `i18ntk.showInlineDiagnostics` | boolean | `true` | Show locale diagnostics in editors. |
| `i18ntk.showHoverTranslations` | boolean | `true` | Show locale values when hovering over translation keys. |
| `i18ntk.reportFormat` | enum | `"webview"` | Preferred report presentation: `webview` or `markdown`. |
| `i18ntk.maxScanFiles` | number | `5000` | Maximum source files to scan. |
| `i18ntk.exclude` | array | `["node_modules", ".next", "dist", "build", "coverage"]` | Folders excluded from scans. |
| `i18ntk.customWrappers` | array | `[]` | Additional translation wrapper names, such as `tx`, `__`, or `_t`. |
| `i18ntk.autoTranslateProvider` | enum | `"google"` | CLI provider for Auto Translate: `google`, `deepl`, or `libretranslate`. |
| `i18ntk.autoTranslateTargets` | array | `[]` | Default target locales. Empty means infer from the latest scan. |
| `i18ntk.autoTranslateMode` | enum | `"onlyMissing"` | `onlyMissing`, `translateAll`, or `dryRun`. |

## Auto Translate

The Workbench delegates Auto Translate to the local `i18ntk-translate` CLI. It runs with:

- `--no-confirm` so it can run from VS Code.
- `--preserve-placeholders` so placeholders are protected.
- `--only-missing` by default so existing translations are kept.
- `--report-stdout` so run output is visible in the i18ntk Workbench Output channel.

Auto Translate currently writes safely for directory-per-locale layouts:

```text
locales/en/common.json
locales/fr/common.json
```

For flat `locales/en.json` layouts, use scanning, validation, reports, and Add Missing Key from the Workbench, then run the CLI directly if you need custom translation output paths.

## Supported Layouts

Auto-detection checks `locales/`, `locale/`, `i18n/`, `translations/`, `public/locales/`, and `src/locales/`.

Directory-per-locale:

```text
locales/en/common.json
locales/fr/common.json
```

Flat files:

```text
locales/en.json
locales/fr.json
```

Nested JSON keys are flattened to dot notation. For example, `checkout.payment.title` maps to deeply nested JSON.

## Privacy

i18ntk Workbench reads workspace files locally. No telemetry is sent. Report and settings webviews use a strict Content Security Policy and escape dynamic content. Auto Translate only contacts a translation provider when you explicitly run the command.

## License

MIT. See [LICENSE](./LICENSE).
