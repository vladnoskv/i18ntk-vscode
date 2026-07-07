# i18ntk Workbench

![i18ntk Workbench icon](media/icon.png)

[![VS Code Marketplace](https://img.shields.io/badge/VS_Code-Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)

i18ntk Workbench is the full VS Code companion to the `i18ntk` CLI. Scan locale health, validate translations, review usage, manage keys, open reports, and run Auto Translate — all inside the editor. It owns the i18ntk Activity Bar sidebar.

## Latest in 1.4.0

- **Multi-language document selectors**: Python, Go, Rust, Ruby, Java, PHP, Handlebars added to code actions, semantic tokens, completions, and document links
- **Expanded file scanning**: `.py`, `.pyx`, `.pyi`, `.go`, `.rb`, `.java`, `.php`, `.hbs` scanned for translation keys
- **Multi-framework wrapper patterns**: Semantic tokens, document links, and autocompletion now match `$t()`, `_()`, `__()`, `translate()` in addition to `t()` and `i18n.t()`
- **Expanded locale auto-discovery**: `config/locales` (Rails), `assets/i18n` (Angular) added
- **Expanded document selector glob**: `**/*.{...,py,go,rb,java,php,rs,hbs}`

## Features

### Sidebar
- **Locale Health tree** — folders grouped by language with key counts, missing, unused, and issue badges
- **Missing Keys** — source keys absent from target locales
- **Placeholder Mismatches** — `{{name}}` tokens that don't match across languages
- **Unused Keys** — locale keys not referenced in source, with confidence scores
- **Expansion Risks** — values >30% longer than source (off by default)
- **Reports** — CLI report assets in the tree

### Editor
- **Translation Hovers** — hover `t('key')` to see all locale values for that key
- **Key Autocompletion** — IntelliSense for translation keys inside wrapper functions
- **Semantic Tokens** — translation keys visually distinct; missing keys get strikethrough
- **Document Links** — Ctrl+Click navigates between source keys and locale definitions
- **Code Actions** — quick fixes to add missing keys, open in locale files
- **Diagnostics** — 9 rule types: missing keys, placeholder mismatches, invalid names, unused keys, risky content, expansion risk, auto-translate residuals, client boundary issues, copy formatters

### File Explorer
- **File Badges** — locale JSON coverage indicators: green ✓ (100%), yellow count (≥80%), orange (partial), red ✗ (empty)

### Translation Grid Editor
- Spreadsheet view with side-by-side columns per language
- Inline cell editing saves on blur
- Regex search and "Save All" batch-save
- Open from Locale Health tree or "Open With… → i18ntk Translation Grid"

### Webviews
- **Report** — dashboard with tabs, filters, issue actions, multi-select ignore, copy markdown, save to disk
- **Settings** — left-navigation layout with scan scheduling, diagnostic rules, wrappers, exclusions, and Auto Translate

### Status Bar
- Always-visible locale stats with color-coded health score: green ≥95%, yellow ≥75%, red <75%
- Hover shows scan status, issue counts, and quick actions

## Commands

| Command | Description |
|---|---|
| `i18ntk.scanWorkspace` | Run full workspace scan |
| `i18ntk.openReport` | Open scan report webview |
| `i18ntk.openSettings` | Open settings webview |
| `i18ntk.addMissingKey` | Add a missing translation key |
| `i18ntk.autoTranslate` | Run Auto Translate via CLI |
| `i18ntk.openTranslationGrid` | Open locale file in grid editor |
| `i18ntk.refreshDiagnostics` | Re-apply diagnostics from cached scan |
| `i18ntk.rebuildAllDecorations` | Rebuild all visual providers |
| `i18ntk.clearDiagnostics` | Clear diagnostics and decorations |

## Settings

| Setting | Default | Description |
|---|---|---|
| `i18ntk.localeDirectory` | `./locales` | Locale files root |
| `i18ntk.sourceLocale` | `en` | Source language for comparisons |
| `i18ntk.exclude` | `[node_modules, dist, …]` | Directories to exclude |
| `i18ntk.maxScanFiles` | `2000` | Max source files per scan |
| `i18ntk.scanOnStartup` | `false` | Auto-scan on workspace open |
| `i18ntk.autoScanOnSave` | `false` | Auto-scan on file save |
| `i18ntk.showInlineDiagnostics` | `true` | Show in-editor diagnostics |
| `i18ntk.showHoverTranslations` | `true` | Show translation hovers |
| `i18ntk.showStatusBar` | `true` | Show persistent status bar |
| `i18ntk.enableKeyCompletion` | `true` | IntelliSense key completions |
| `i18ntk.enableFileBadges` | `true` | Explorer file coverage badges |
| `i18ntk.enableSemanticTokens` | `true` | Semantic token highlighting |
| `i18ntk.enableDocumentLinks` | `true` | Ctrl+Click navigation links |
| `i18ntk.highlightLocaleKeys` | `true` | Color-code locale JSON keys |
| `i18ntk.extensionLanguage` | `follow` | Extension UI language |

## Interop with Lens

When i18ntk Lens is installed, Workbench automatically defers inline hovers and diagnostics to Lens while keeping its own sidebar, reports, settings, key management, and Auto Translate. Lens presence is checked dynamically — installing or removing Lens mid-session takes effect without reload.

## Previous Releases

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## Install

```bash
# VS Code Marketplace
# Search: i18ntk Workbench by Vlad Noskov

# Or via CLI
code --install-extension VladNoskov.i18ntk-workbench
```

## License

MIT. See [LICENSE](./LICENSE).
