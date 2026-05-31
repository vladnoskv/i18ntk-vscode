# i18ntk Workbench

Interactive localization workbench for [i18ntk](https://www.npmjs.com/package/i18ntk) — quality control, diagnostics, reports, and key management inside VS Code.

## Features

- **Locale Health sidebar** — project health score, missing keys by locale, placeholder mismatches, unused keys, expansion risks.
- **Diagnostics** — missing keys, placeholder mismatches, invalid key naming, and unused key warnings inline in your code.
- **Hover translations** — see every locale's value for `t("key")`, `i18n.t(...)`, `translate(...)`, and `$t(...)` with a locale table and missing indicators.
- **Quick Fix: Add missing key** — insert a missing translation into all locale JSON files (flat or nested), preserving formatting.
- **Summary report webview** — health score, metric cards, sortable tables, export to Markdown, and save to disk.
- **File watchers** — auto-refresh on locale or config changes with smart debouncing.
- **i18ntk CLI integration** — optional local `i18ntk validate` integration for deeper analysis.

## Quick Start

1. Open a project with locale files (e.g. `locales/en/common.json`, `locales/fr/common.json`).
2. Run **`i18ntk: Scan Workspace`** from the Command Palette (`Ctrl+Shift+P`).
3. Open the **i18ntk Workbench** sidebar to explore the Locale Health tree.
4. Hover over translation keys, review diagnostics, and use quick fixes.

## Commands

| Command | Description |
|---|---|
| `i18ntk: Scan Workspace` | Full workspace scan — detects root, resolves config, scans locale/source files, updates all views. |
| `i18ntk: Refresh Locale Health` | Refresh the sidebar tree view. |
| `i18ntk: Open Summary Report` | Open the interactive summary report webview. |
| `i18ntk: Add Missing Key` | Insert a new key into all locale files. |
| `i18ntk: Open Key in Locale Files` | Open all locale files containing a specific key. |
| `i18ntk: Open Settings` | Jump to i18ntk extension settings. |

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `i18ntk.localeDirectory` | string | `""` | Locale directory path relative to workspace root. Empty = auto-detect. |
| `i18ntk.sourceLocale` | string | `"en"` | Source/default locale code. |
| `i18ntk.keyStyle` | enum | `"dot"` | Expected key naming style: `dot`, `snake`, `camel`, `kebab`, or `flat`. |
| `i18ntk.autoScanOnSave` | boolean | `false` | Run a debounced scan after source or locale file saves. |
| `i18ntk.showInlineDiagnostics` | boolean | `true` | Show missing key and locale diagnostics in editors. |
| `i18ntk.showHoverTranslations` | boolean | `true` | Show locale values when hovering over translation keys. |
| `i18ntk.reportFormat` | enum | `"webview"` | Preferred report presentation: `webview` or `markdown`. |
| `i18ntk.maxScanFiles` | number | `5000` | Maximum source files to scan (min: 100). |
| `i18ntk.exclude` | array | `["node_modules", ".next", "dist", "build", "coverage"]` | Folders excluded from scans. |

## Supported Layouts

Auto-detection checks: `locales/`, `locale/`, `i18n/`, `translations/`, `public/locales/`, `src/locales/`.

Directory-per-locale (recommended):
```
locales/en/common.json
locales/fr/common.json
```

Flat files:
```
locales/en.json
locales/fr.json
```

Nested JSON keys are flattened to dot‑notation (e.g. `"checkout.payment.title"` maps to deeply nested JSON).

## Privacy

i18ntk Workbench is local-first. It reads workspace files locally. No data is sent anywhere. No telemetry. The report webview uses strict Content Security Policy and escapes dynamic content.

## License

MIT — see [LICENSE](./LICENSE).
