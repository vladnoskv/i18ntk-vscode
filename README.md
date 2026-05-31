# i18ntk Workbench

![i18ntk Workbench icon](media/icon.png)

Interactive localization workbench for i18ntk projects: quality control, diagnostics, reports, settings, key management, and CLI-backed Auto Translate inside VS Code.

i18ntk Workbench is a VS Code extension powered by the local i18ntk toolkit and released under the MIT license.

## Features

- **Advanced Locale Health sidebar**: visible scan, refresh, report, and settings actions plus in-tree Actions, Setup, Reports, and Settings sections.
- **Guided locale setup**: auto-detects common and nested locale roots, prompts when none are found, and lets you choose the locale directory from VS Code.
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
3. If Workbench cannot find locale JSON files, choose the locale directory when prompted or open `i18ntk: Choose Locale Directory`.
4. Open the i18ntk Workbench sidebar to inspect health, issue groups, setup state, reports, and workflow actions.
5. Open `i18ntk: Open Summary Report` to validate, inspect issues, open files, add missing keys, or run Auto Translate.
6. Open `i18ntk: Open Settings` to tune scanning, diagnostics, wrappers, exclusions, locale discovery, and Auto Translate defaults.

## Workbench Sidebar

The extension uses the same red i18ntk icon everywhere it appears in VS Code and Marketplace surfaces:

```text
media/icon.png
```

The Locale Health view keeps primary controls visible in the view title:

- Scan Workspace
- Refresh Locale Health
- Open Summary Report
- Open Settings

The tree also exposes workflow sections so common actions are not hidden in the overflow menu:

- **Actions**: scan, validate, analyze usage, Auto Translate, add missing key.
- **Setup**: current locale root, detection status, detected file count, choose/detect locale directory.
- **Reports**: summary report and project summary.
- **Settings**: Workbench settings, native VS Code settings, locale setup actions.

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
| `i18ntk: Choose Locale Directory` | Opens a folder picker and saves the selected locale root for this workspace. |
| `i18ntk: Detect Locale Directory` | Searches common and nested project paths for JSON locale files and saves the detected root. |

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

If none of those contain JSON locale files, Workbench searches nested project folders for `locales`, `locale`, `i18n`, `translations`, and `public/locales` roots. If no usable root is found, the first scan opens a setup prompt instead of silently reporting an empty project.

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
