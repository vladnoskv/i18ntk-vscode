# i18ntk Workbench

![i18ntk Workbench icon](media/icon.png)

[![VS Code Marketplace](https://img.shields.io/badge/VS_Code-i18ntk_Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)
[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/i18ntk_dependencies-0-success)](https://www.npmjs.com/package/i18ntk)

i18ntk Workbench gives i18n projects a focused VS Code control center: scan locale health, validate translations, review usage, manage keys, open reports, and run CLI-backed Auto Translate without leaving the editor.

It is the full VS Code companion to the zero-dependency `i18ntk` npm package. Workbench owns the i18ntk Activity Bar sidebar; when i18ntk Lens is installed too, Lens stays inline-only with hovers, CodeLens, diagnostics, commands, and settings.

## Latest in 1.1.1

- Source scans no longer treat arbitrary function calls or methods like `get("next")`, `headers.get("etag")`, or `clearWaitlist("admin.panel")` as translation keys.
- Workbench source scanning now matches the Lens key-recognition fixes for dynamic template prefixes, statically resolved template values, scoped namespace helpers such as `useTranslations("scope")`, imported locale objects, and explicit/custom wrappers.
- Exact source string and template literals that match known locale keys now count as usages, reducing false unused-key reports for event/status keys such as `duel.created`.
- Locale JSON diagnostics now point at the exact nested key line for unused keys, placeholder mismatches, invalid key names, risky content, and expansion warnings.
- i18ntk Problems quick fixes can open the affected key in locale files; missing-key diagnostics still include the add-key action.
- Diagnostic rules can be set to `error`, `warning`, `off`, or `ignore`; right-click Problems entries can ignore a specific key/locale or turn off a whole rule.
- Expansion-risk diagnostics are off by default to avoid flooding Problems in large locale sets.
- Scanned locale JSON files can color-code key names by nesting depth with `i18ntk.highlightLocaleKeys`.
- Invalid-key diagnostics allow hybrid dot-path plus snake_case segment keys while still rejecting malformed separators and uppercase segments.
- Unused-key reports are advisory; verify usages before deleting locale keys.
- Auto Translate residual reports are picked up from `i18ntk-reports/auto-translate/latest.json`, shown in Problems and the report webview, and include a quick action to add intentionally unchanged keys to Auto Translate protection.

## Latest in 1.0.2

- Report webviews now include issue filtering and per-issue copy buttons.
- Source scans recognize imported locale JSON objects such as `import common from "../locales/en/common.json"; common.save`.
- Missing-key checks focus on keys used by source files, reducing duplicate noise from unused source-locale keys.

## i18ntk CLI Companion

The main `i18ntk` npm package provides the command-line workflow behind the extension:

- setup, scan, analyze, validate, usage, sizing, completion, summary, backup, fixer, and Auto Translate commands
- zero runtime dependencies
- Node.js `>=16.0.0`
- local-first operation, with provider network calls only when you run Auto Translate
- public npm stats and package health through the badges above

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

## What You Get

- **Locale Health sidebar**: scan, refresh, report, setup, settings, and action groups in one Activity Bar view.
- **Workspace setup**: auto-detects common and nested locale roots, then prompts when setup is incomplete.
- **Diagnostics**: missing keys, placeholder mismatches, invalid key names, unused keys, risky content, expansion warnings, and Auto Translate residuals.
- **Diagnostic controls**: configure each i18ntk Problem as error, warning, off, or ignore; right-click a Problem to ignore one diagnostic or turn off its rule.
- **Locale JSON key highlighting**: optional color-coding for scanned locale keys by nesting depth.
- **Hover translations**: shows locale values for `t("key")`, `i18n.t(...)`, `translate(...)`, `$t(...)`, and configured custom wrappers.
- **Quick fixes**: add missing keys, open any i18ntk diagnostic key in locale files, or add Auto Translate residual keys to protection from the editor or Problems panel.
- **Summary report**: validate, analyze usage, Auto Translate, filter issues, copy individual issues, open files, add keys, review Auto Translate residuals, copy Markdown, save reports, and open settings.
- **CLI-backed Auto Translate**: runs local `i18ntk-translate` with non-interactive, placeholder-safe defaults.
- **Local-first behavior**: no telemetry; provider network calls happen only when you explicitly run Auto Translate.

## Command Reference

| Command | What it does | Writes or changes |
| --- | --- | --- |
| `i18ntk: Scan Workspace` | Detects config, scans locale/source files, updates diagnostics, tree views, and report state. | No file changes. |
| `i18ntk: Refresh Locale Health` | Refreshes the sidebar tree view. | No file changes. |
| `i18ntk: Open Summary Report` | Opens the report webview with validation, usage, issue, and workflow actions. | Only writes when you choose an action such as save report, add key, or Auto Translate. |
| `i18ntk: Add Missing Key` | Adds a translation key to locale JSON files. | Locale JSON files. |
| `i18ntk: Add Key to Auto Translate Protection` | Adds a translation key to `i18ntk-auto-translate.json` so Auto Translate keeps it unchanged. | Auto Translate protection file. |
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
| `i18ntk.highlightLocaleKeys` | boolean | `true` | Color-code keys in scanned locale JSON files by nesting depth. |
| `i18ntk.diagnosticSeverities` | object | see below | Per-rule Problems behavior: `error`, `warning`, `off`, or `ignore`. |
| `i18ntk.ignoredDiagnostics` | array | `[]` | Specific ignored diagnostics created by right-click quick fixes. |
| `i18ntk.reportFormat` | enum | `"webview"` | Preferred report presentation: `webview` or `markdown`. |
| `i18ntk.maxScanFiles` | number | `5000` | Maximum source files to scan. |
| `i18ntk.exclude` | array | `["node_modules", ".next", "dist", "build", "coverage"]` | Folders excluded from scans. |
| `i18ntk.customWrappers` | array | `[]` | Additional translation wrapper names, such as `tx`, `__`, or `_t`. |
| `i18ntk.autoTranslateProvider` | enum | `"google"` | CLI provider for Auto Translate: `google`, `deepl`, or `libretranslate`. |
| `i18ntk.autoTranslateTargets` | array | `[]` | Default target locales. Empty means infer from the latest scan. |
| `i18ntk.autoTranslateMode` | enum | `"onlyMissing"` | `onlyMissing`, `translateAll`, or `dryRun`. |

Default diagnostic rule settings:

```json
{
  "i18ntk.diagnosticSeverities": {
    "i18ntk.missingKey": "warning",
    "i18ntk.placeholderMismatch": "error",
    "i18ntk.invalidKeyName": "warning",
    "i18ntk.unusedKey": "warning",
    "i18ntk.riskyContent": "warning",
    "i18ntk.expansionRisk": "off",
    "i18ntk.autoTranslateResidual": "warning"
  }
}
```

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

If Auto Translate cannot fully clear a value after its final targeted retry, the CLI writes `i18ntk-reports/auto-translate/latest.json`. Workbench reads that file on scan, shows each residual key in Problems and the summary report, and provides a quick fix/button to add the key to `i18ntk-auto-translate.json` protection when the value should intentionally stay unchanged.

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

Nested JSON keys are flattened to dot notation. Snake_case segments inside those dot paths are valid when `i18ntk.keyStyle` is `dot` or `snake`.
For example, this layout produces keys such as `history.filters.symbol_placeholder`, `history.filters.asset_classes.event`, and `history.table.close_utc`:

```json
{
  "history": {
    "filters": {
      "symbol_placeholder": "Symbol (BTC, AAPL, EURUSD)",
      "asset_classes": {
        "event": "Event",
        "crypto": "Crypto"
      }
    },
    "table": {
      "close_utc": "Close (UTC)"
    }
  }
}
```

## Workbench and Lens

- Install **i18ntk Workbench** when you want the sidebar, reports, key management, setup flow, and Auto Translate entry points.
- Install **i18ntk Lens** when you want a lightweight inline extension for hovers, CodeLens, missing-key warnings, unused-key diagnostics, and settings.
- Install both when you want the full sidebar plus inline editor feedback. Workbench owns the Activity Bar icon; Lens stays inline-only so the sidebar remains clean.
- When Lens is installed, Workbench lets Lens own inline hovers and diagnostics to avoid duplicate editor feedback. Workbench still runs its own scan for the sidebar, reports, settings, key management, and Auto Translate because Lens does not expose a public scan-result API.

## Related Tools

| Tool | Purpose |
|---|---|
| **i18ntk** | Zero-dependency i18n toolkit for scanning, validation, translation, reports, and runtime loading. |
| **i18ntk Workbench** | Full VS Code localization health dashboard powered by i18ntk. |
| **i18ntk Lens** | Lightweight inline translation hovers, diagnostics, and key navigation. |
| **PublishGuard** | Pre-publish safety scanner for npm packages and VS Code extensions. |
| **ContextKit** | AI coding context manager for AGENTS.md, Claude, Cursor, Copilot, Roo, and Codex files. |

## Privacy

i18ntk Workbench reads workspace files locally. No telemetry is sent. Report and settings webviews use a strict Content Security Policy and escape dynamic content. Auto Translate only contacts a translation provider when you explicitly run the command through the local CLI.

## License

MIT. See [LICENSE](./LICENSE).
