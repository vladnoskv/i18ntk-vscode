# i18ntk Workbench

**Local-first i18n quality control, diagnostics, reports, and key management powered by [i18ntk](https://www.npmjs.com/package/i18ntk).**

i18ntk Workbench turns the `i18ntk` npm package workflow into an IDE localization control center right inside VS Code. It scans locale files and source usage, then surfaces missing keys, placeholder mismatches, unused keys, risky untranslated content, expansion risks, hovers, quick fixes, and summary reports directly in the editor.

---

## Features

- **Locale Health Tree** in the Activity Bar — project health score, missing keys by locale, placeholder mismatches, unused keys, expansion risks, and one-click report access.
- **`i18ntk: Scan Workspace`** command with progress notification and cancellation support.
- **Missing key diagnostics** for source usages such as `t("checkout.payment.title")`.
- **Placeholder mismatch diagnostics** across source and target locale values (e.g., `{count}`, `{{name}}`, `%s`).
- **Invalid key style** and unused key warnings.
- **Hover translations** for `t`, `i18n.t`, `translate`, and `$t` calls — shows a locale value table with missing indicators.
- **Quick fix: "Add missing translation key"** — inserts the key with a TODO value into all locale JSON files, supporting flat and nested JSON.
- **`i18ntk: Open Key in Locale Files`** — opens all locale files where a specific key exists.
- **CSP-protected summary report webview** with metric cards, sortable tables, open-file buttons, copy-markdown, and save-to-disk export.
- **Local adapter boundary** for optional `i18ntk` CLI integration.
- **File watchers** for locale JSON and config changes with smart debouncing.

---

## Installation

### Development

```bash
npm install
npm run compile
```

Then open the extension project in VS Code and press `F5` to launch an Extension Development Host.

### Packaging

```bash
npm run package
```

This produces `i18ntk-workbench-<version>.vsix` which can be installed via `Extensions: Install from VSIX...`.

---

## Quick Start

1. Open a project with locale files such as `locales/en/common.json` and `locales/fr/common.json`.
2. Run **`i18ntk: Scan Workspace`** from the Command Palette (`Ctrl+Shift+P`).
3. Open the **i18ntk Workbench** Activity Bar view to see the Locale Health tree.
4. Review diagnostics, hovers, quick fixes, and the summary report.

---

## Commands

| Command | Description |
|---|---|
| `i18ntk: Scan Workspace` | Detects project root, resolves config, scans locale and source files, updates tree/diagnostics/report. |
| `i18ntk: Refresh Locale Health` | Refreshes the Locale Health tree view. |
| `i18ntk: Open Summary Report` | Opens the interactive summary report webview. |
| `i18ntk: Add Missing Key` | Prompts for key and source text, inserts into all locale files. |
| `i18ntk: Open Key in Locale Files` | Opens all locale files containing a given translation key. |
| `i18ntk: Open Settings` | Opens the VS Code settings UI for `i18ntk` configuration. |

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `i18ntk.localeDirectory` | string | `""` | Locale directory path relative to workspace root. Empty = auto-detect. |
| `i18ntk.sourceLocale` | string | `"en"` | Source/default locale code. |
| `i18ntk.keyStyle` | enum | `"dot"` | Expected key naming style: `dot`, `snake`, `camel`, `kebab`, or `flat`. |
| `i18ntk.autoScanOnSave` | boolean | `false` | Run a debounced workspace scan after source or locale file saves. |
| `i18ntk.showInlineDiagnostics` | boolean | `true` | Show missing key and locale diagnostics in editors. |
| `i18ntk.showHoverTranslations` | boolean | `true` | Show locale values when hovering over detected translation keys. |
| `i18ntk.reportFormat` | enum | `"webview"` | Preferred report presentation: `webview` or `markdown`. |
| `i18ntk.maxScanFiles` | number | `5000` | Maximum source files to scan (min: 100). |
| `i18ntk.exclude` | array | `["node_modules", ".next", "dist", "build", "coverage"]` | Folder or file name fragments excluded from scans. |

---

## Supported Project Structures

The extension auto-detects the following locale directory candidates:

- `locales/`
- `locale/`
- `i18n/`
- `translations/`
- `public/locales/`
- `src/locales/`

### Supported Locale Layouts

**Directory-per-locale** (recommended):
```
locales/en/common.json
locales/fr/common.json
locales/de/common.json
```

**Flat files:**
```
locales/en.json
locales/fr.json
```

**Nested JSON keys** are supported via dot-notation flattening (e.g., `checkout.payment.title` maps to `{ checkout: { payment: { title: "..." } } }`).

### Supported Source Patterns

The key detector recognizes:
- `t("key")` / `t('key')` / `` t(`key`) ``
- `i18n.t("key")`
- `translate("key")`
- `$t("key")`
- JSX attributes: `i18nKey="key"`, `t-key="key"`, `data-i18n="key"`
- Template literals in all call patterns

---

## Privacy and Security

i18ntk Workbench is **local-first by design**:

- **No source code or translation files are sent to remote services.**
- **No AI or machine translation in MVP.**
- **No telemetry, tracking, or analytics.**
- The report webview uses a strict **Content Security Policy** (CSP) and **escapes all dynamic content**.
- It runs local analysis and uses a safe adapter boundary for optional `i18ntk` CLI integration.
- **No execution of workspace files** — only static JSON parsing and regex extraction.

---

## Limitations

- The MVP focuses on **JSON locale files**. Other formats (YAML, TOML, PO) are planned.
- Source parsing uses **fast regex pattern detection** for common i18n call shapes, not AST parsing.
- The local analyzer is **conservative around dynamic keys** (e.g., `t(variableKey)` will not be detected).
- Deeply nested locale JSON (5+ levels) may produce false positives for key style detection.
- Full VS Code integration tests require the `@vscode/test-electron` package (not bundled).

---

## Roadmap

- Deeper integration with stable public `i18ntk` APIs.
- More framework-specific extraction (Vue SFC `<i18n>` blocks, Svelte `{$_()}`, Angular pipes).
- Rich JSON key navigation to exact line positions in locale files.
- Expansion-risk overlays for UI template files.
- Optional provider-backed translation actions behind explicit user configuration.
- i18n namespace detection and management.
- Sorting and linting of locale JSON files.
- Batch key insertion from editor selections.

---

## Related

- **npm package:** [i18ntk on npm](https://www.npmjs.com/package/i18ntk)
- **GitHub repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

---

## License

MIT — see [LICENSE](./LICENSE) for details.
