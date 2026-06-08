import fs from 'node:fs/promises';
import path from 'node:path';
import * as vscode from 'vscode';

export interface SharedI18ntkConfig {
  version?: string;
  sourceDir?: string;
  i18nDir?: string;
  outputDir?: string;
  sourceLanguage?: string;
  defaultLanguages?: string[];
  excludeDirs?: string[];
  extensions?: {
    workbench?: Record<string, unknown>;
    lens?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorkbenchSharedSettings {
  localeDirectory?: string;
  sourceLocale?: string;
  extensionLanguage?: string;
  keyStyle?: string;
  autoScanOnSave?: boolean;
  autoScanOnFileChange?: boolean;
  scanOnStartup?: boolean;
  runCliValidationOnScan?: boolean;
  showInlineDiagnostics?: boolean;
  showHoverTranslations?: boolean;
  highlightLocaleKeys?: boolean;
  diagnosticSeverities?: Record<string, string>;
  ignoredDiagnostics?: string[];
  reportFormat?: string;
  maxScanFiles?: number;
  exclude?: string[];
  customWrappers?: string[];
  autoTranslateProvider?: string;
  autoTranslateTargets?: string[];
  autoTranslateMode?: string;
  showStatusBar?: boolean;
  enableKeyCompletion?: boolean;
  enableFileBadges?: boolean;
  enableSemanticTokens?: boolean;
  enableDocumentLinks?: boolean;
}

const CONFIG_FILE = '.i18ntk-config';

type ConfigInspection<T> = {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
};

export async function loadSharedConfig(rootPath: string): Promise<SharedI18ntkConfig | undefined> {
  try {
    const raw = await fs.readFile(path.join(rootPath, CONFIG_FILE), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as SharedI18ntkConfig : undefined;
  } catch {
    return undefined;
  }
}

export function getSharedWorkbenchSettings(config: SharedI18ntkConfig | undefined): WorkbenchSharedSettings {
  const section = config?.extensions?.workbench;
  const workbench = section && typeof section === 'object' && !Array.isArray(section)
    ? section as WorkbenchSharedSettings
    : {};
  return {
    ...workbench,
    localeDirectory: workbench.localeDirectory || stringValue(config?.i18nDir) || stringValue(config?.sourceDir),
    sourceLocale: workbench.sourceLocale || stringValue(config?.sourceLanguage),
    exclude: workbench.exclude || stringArray(config?.excludeDirs)
  };
}

export async function saveSharedWorkbenchSettings(rootPath: string, data: WorkbenchSharedSettings): Promise<void> {
  const current = await loadSharedConfig(rootPath) ?? {};
  const extensions = current.extensions && typeof current.extensions === 'object' && !Array.isArray(current.extensions)
    ? current.extensions
    : {};
  const workbench = extensions.workbench && typeof extensions.workbench === 'object' && !Array.isArray(extensions.workbench)
    ? extensions.workbench as Record<string, unknown>
    : {};
  const next: SharedI18ntkConfig = {
    ...current,
    version: stringValue(current.version) || '4.4.5',
    sourceLanguage: data.sourceLocale || stringValue(current.sourceLanguage) || 'en',
    i18nDir: data.localeDirectory || stringValue(current.i18nDir) || './locales',
    sourceDir: stringValue(current.sourceDir) || './src',
    outputDir: stringValue(current.outputDir) || './i18ntk-reports',
    extensions: {
      ...extensions,
      workbench: {
        ...workbench,
        ...data
      }
    }
  };
  await fs.writeFile(path.join(rootPath, CONFIG_FILE), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export function getConfigValue<T>(namespace: string, key: string, sharedValue: T | undefined, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration(namespace) as vscode.WorkspaceConfiguration;
  const inspected = config.inspect(key) as ConfigInspection<T> | undefined;
  const explicit = inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;
  if (explicit !== undefined) return explicit;
  return sharedValue !== undefined ? sharedValue : defaultValue;
}

export function enumConfigValue<T extends string>(
  namespace: string,
  key: string,
  sharedValue: string | undefined,
  defaultValue: T,
  allowed: readonly T[]
): T {
  const value = getConfigValue<string>(namespace, key, sharedValue, defaultValue);
  return allowed.includes(value as T) ? value as T : defaultValue;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}
