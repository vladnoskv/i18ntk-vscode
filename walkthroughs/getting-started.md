---
title: Getting Started with i18ntk
description: >
  Set up i18ntk for your project, scan translation keys,
  understand diagnostics, and configure auto-translate.
id: i18ntk.gettingStarted
---

# Welcome to i18ntk Workbench

This guided walkthrough will help you set up i18ntk for your project and understand how to work with translations effectively.

## 1. Detect or Choose Your Locale Directory

i18ntk needs to know where your locale JSON files are stored. Common locations are `locales/`, `locale/`, `i18n/`, `translations/`, `public/locales/`, and `src/locales/`.

- [Detect Locale Directory](command:i18ntk.detectLocaleDirectory) — Auto-detect from common folder names
- [Choose Locale Directory](command:i18ntk.chooseLocaleDirectory) — Manually select the folder via a file picker

## 2. Run Your First Scan

After the locale directory is set, run the workspace scanner to index all translation keys.

- [Scan Workspace](command:i18ntk.scanWorkspace) — Scans source files and locale files to find keys, translations, and issues

The scanner will:
- Discover all source files and extract translation key usages
- Parse locale JSON files for existing translations
- Generate diagnostics for missing keys, placeholder mismatches, unused keys, and more

## 3. Understand the Locale Health Tree

The **Locale Health** view in the Activity Bar (globe icon) shows:

- **Actions** — Quick access to scan, validate, analyze, and auto-translate
- **Project Health** — Summary statistics: locales, total keys, health score
- **Missing Keys** — Grouped by locale, showing keys that need translations
- **Placeholder Mismatches** — Keys where placeholders like `{{name}}` don't match across locales
- **Unused Keys** — Keys present in locale files but never referenced in source code
- **Reports** — Open the full summary report as a rich webview

## 4. Configure Auto Translate

i18ntk supports automatic translation via Google Translate, DeepL, and LibreTranslate.

1. [Open Workbench Settings](command:i18ntk.openSettings) — Open the settings panel
2. Choose your **Auto Translate Provider** (Google by default, no API key required)
3. Select **Target Locales** or leave empty to auto-detect from locale files
4. Choose **Translation Mode**: fill only missing keys, retranslate all, or dry-run preview

- [Auto Translate Missing](command:i18ntk.autoTranslateMissing) — Run auto-translate for all missing translations

## 5. Daily Workflow

- **Open the Activity Bar** — Click the globe icon in the Activity Bar to see the Locale Health tree
- **Scan on save** — Enable `i18ntk.autoScanOnSave` in settings to scan automatically on file save
- **Quick Fixes** — Click the lightbulb on diagnostic squigglies to add missing keys, ignore rules, or open translations
- **Open Summary Report** — Click the "Open Summary Report" button in the tree toolbar for a detailed webview
- **Translation Grid Editor** — Open any locale JSON file with the "i18ntk Translation Grid" editor for a spreadsheet view

## What's Next?

- Configure your custom translation wrappers (e.g. `$t`, `__`) in `i18ntk.customWrappers`
- Exclude folders from scanning in `i18ntk.exclude`
- Adjust diagnostic severity per rule in `i18ntk.diagnosticSeverities`
- Use the **i18ntk Lens** companion extension for inline hover translations and CodeLens in your editor

[Open Native Settings](command:i18ntk.openNativeSettings)
