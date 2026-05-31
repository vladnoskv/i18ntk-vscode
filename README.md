# i18ntk Workbench

![i18ntk Workbench icon](media/icon.png)

A local-first VS Code workbench for i18ntk projects: setup, scanning, validation, usage checks, diagnostics, reports, key management, and CLI-backed Auto Translate from inside the editor.

i18ntk Workbench is the full VS Code companion to the `i18ntk` CLI. It keeps the i18ntk Activity Bar sidebar clean and central: when i18ntk Lens is installed too, Workbench remains the single sidebar icon while Lens continues to provide inline hovers, CodeLens, diagnostics, commands, and settings.

## Install

Install i18ntk Workbench from the VS Code Marketplace.

For the matching command-line workflow and Auto Translate support, install the CLI in your project:

```bash
npm install i18ntk
```

Requirements:

- VS Code `^1.90.0`
- Node.js `>=18.0.0`
- JSON locale files in a supported layout
- `i18ntk` CLI installed locally when you run Auto Translate

## Quick Start

1. Open a project with locale files, for example `locales/en/common.json` and `locales/fr/common.json`.
2. Run `i18ntk: Scan Workspace` from the Command Palette.
3. If no locale root is found, choose one with `i18ntk: Choose Locale Directory`.
4. Open the i18ntk Workbench sidebar to review health, missing keys, placeholder issues, unused keys, setup state, and reports.
5. Open `i18ntk: Open Summary Report` for validation, usage analysis, issue navigation, Markdown export, missing-key fixes, and Auto Translate.
6. Open `i18ntk: Open Settings` to tune locale discovery, source locale, key style, diagnostics, wrappers, exclusions, and Auto Translate defaults.

## Features

- **Locale Health sidebar**: scan, refresh, report, setup, settings, and action groups in one Activity Bar view.
- **Workspace setup**: auto-detects common and nested locale roots, then prompts when setup is incomplete.
- **Diagnostics**: missing keys, placeholder mismatches, invalid key names, unused keys, risky content, and expansion warnings.
- **Hover translations**: shows locale values for `t("key")`, `i18n.t(...)`, `translate(...)`, `$t(...)`, and configured custom wrappers.
- **Quick Fix: Add missing key**: inserts missing keys into JSON locale files while preserving formatting.
- **Summary report**: validate, analyze usage, Auto Translate, open files, add keys, copy Markdown, save reports, and open settings.
- **CLI-backed Auto Translate**: runs local `i18ntk-translate` with non-interactive, placeholder-safe defaults.
- **Local-first behavior**: no telemetry; provider network calls happen only when you explicitly run Auto Translate.

## Command Reference

| Command | What it does | Writes or changes |
| --- | --- | --- |
| `i18ntk: Scan Workspace` | Detects config, scans locale/source files, updates diagnostics, tree views, and report state. | No file changes. |
| `i18ntk: Refresh Locale Health` | Refreshes the sidebar tree view. | No file changes. |
| `i18ntk: Open Summary Report` | Opens the report webview with validation, usage, issue, and workflow actions. | Only writes when you choose an action such as save report, add key, or Auto Translate. |
| `i18ntk: Add Missing Key` | Adds a translation key to locale JSON files. | Locale JSON files. |
| `i18ntk: Auto Translate Missing` | Runs local `i18ntk-translate` for selected target locales. | Target locale JSON files and CLI report output. |
| `i18ntk: Validate Locales` | Re-scans and prints validation issues in the Output panel. | No file changes. |
| `i18ntk: Analyze Usage` | Re-scans and prints usage, missing, unused, placeholder, expansion, and health totals. | No file changes. |
| `i18ntk: Open Key in Locale Files` | Opens locale files containing a specific key. | No file changes. |
| `i18ntk: Open Settings` | Opens the Workbench settings webview. | Workspace settings when saved. |
| `i18ntk: Open Native Settings` | Opens VS Code settings filtered to i18ntk. | Settings if you edit them. |
| `i18ntk: Choose Locale Directory` | Opens a folder picker and saves the selected locale root for this workspace. | Workspace setting. |
| `i18ntk: Detect Locale Directory` | Searches common and nested project paths for JSON locale files and saves the detected root. | Workspace setting. |

## Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
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

Workbench delegates Auto Translate to the local `i18ntk-translate` CLI. Install it in the workspace where you use the extension:

```bash
npm install i18ntk
```

Workbench runs Auto Translate with:

- `--no-confirm` so it can run from VS Code.
- `--preserve-placeholders` so placeholders are protected.
- `--only-missing` by default so existing translated values are kept.
- `--report-stdout` so run output is visible in the i18ntk Workbench Output channel.

Auto Translate is currently wired for directory-per-locale layouts:

```text
locales/en/common.json
locales/fr/common.json
```

For flat `locales/en.json` layouts, use scanning, validation, reports, and Add Missing Key from Workbench, then run the CLI directly when you need custom translation output paths.

## Supported Layouts

Auto-detection checks:

- `locales/`
- `locale/`
- `i18n/`
- `translations/`
- `public/locales/`
- `src/locales/`

If none of those contain JSON locale files, Workbench searches nested project folders for likely locale roots. If no usable root is found, the first scan opens a setup prompt instead of silently reporting an empty project.

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

## Workbench and Lens

- Install **i18ntk Workbench** when you want the sidebar, reports, key management, setup flow, and Auto Translate entry points.
- Install **i18ntk Lens** when you want a lightweight inline extension for hovers, CodeLens, missing-key warnings, unused-key diagnostics, and settings.
- Install both when you want the full sidebar plus inline editor feedback. Workbench owns the Activity Bar icon; Lens stays inline-only so the sidebar remains clean.

## Privacy

i18ntk Workbench reads workspace files locally. No telemetry is sent. Report and settings webviews use a strict Content Security Policy and escape dynamic content. Auto Translate only contacts a translation provider when you explicitly run the command through the local CLI.

## License

MIT. See [LICENSE](./LICENSE).
