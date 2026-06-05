import path from 'node:path';
import fs from 'node:fs';

type TranslationParams = Record<string, string | number | boolean | null | undefined>;
type Runtime = {
  t(key: string, params?: TranslationParams): unknown;
};

let runtime: Runtime | undefined;
let fallbackTranslations: Record<string, unknown> | undefined;
let configuredLanguage = 'auto';
let preferredDisplayLanguage = '';
let activeLanguage = 'en';

function getRuntime(): Runtime | undefined {
  if (runtime !== undefined) return runtime;
  runtime = createRuntime();
  return runtime;
}

function createRuntime(): Runtime | undefined {
  const runtimeModule = loadI18ntkRuntime();
  if (!runtimeModule?.initRuntime) return undefined;

  activeLanguage = resolveExtensionLanguage(configuredLanguage);
  try {
    return runtimeModule.initRuntime({
      baseDir: path.join(__dirname, 'locales'),
      language: activeLanguage,
      fallbackLanguage: 'en',
      preload: true
    });
  } catch {
    return undefined;
  }
}

function loadI18ntkRuntime(): any {
  for (const candidate of ['i18ntk/runtime', path.resolve(__dirname, '../../../../i18ntk/runtime')]) {
    try {
      return require(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function getPreferredLanguage(): string {
  if (preferredDisplayLanguage) return preferredDisplayLanguage;
  const rawConfig = process.env.VSCODE_NLS_CONFIG;
  if (!rawConfig) return 'en';
  try {
    const parsed = JSON.parse(rawConfig);
    return typeof parsed.locale === 'string' && parsed.locale ? parsed.locale : 'en';
  } catch {
    return 'en';
  }
}

function resolveExtensionLanguage(language: string): string {
  const requested = language === 'auto' ? getPreferredLanguage() : language;
  const normalized = requested.toLowerCase().split(/[-_]/)[0];
  return getAvailableExtensionLanguages().includes(normalized) ? normalized : 'en';
}

export function setExtensionLanguage(language: string | undefined, displayLanguage?: string): void {
  configuredLanguage = language || 'auto';
  preferredDisplayLanguage = displayLanguage || preferredDisplayLanguage;
  runtime = undefined;
  fallbackTranslations = undefined;
  activeLanguage = resolveExtensionLanguage(configuredLanguage);
}

export function getExtensionLanguage(): string {
  getRuntime();
  return activeLanguage;
}

export function getAvailableExtensionLanguages(): string[] {
  try {
    return fs.readdirSync(path.join(__dirname, 'locales'))
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => path.basename(file, '.json'))
      .sort();
  } catch {
    return ['en', 'es', 'fr', 'de'];
  }
}

export function t(key: string, params: TranslationParams = {}, fallback?: string): string {
  const translated = getRuntime()?.t(key, params);
  if (typeof translated === 'string' && translated !== key) return translated;
  const fallbackTranslated = getFallbackTranslation(key);
  if (typeof fallbackTranslated === 'string') return formatTemplate(fallbackTranslated, params);
  return formatTemplate(fallback ?? key, params);
}

export function formatTemplate(template: string, params: TranslationParams = {}): string {
  return template.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, doubleToken, singleToken) => {
    const token = doubleToken ?? singleToken;
    return Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match;
  });
}

function getFallbackTranslation(key: string): string | undefined {
  const translations = getFallbackTranslations();
  const value = key.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), translations);
  return typeof value === 'string' && value !== key ? value : undefined;
}

function getFallbackTranslations(): Record<string, unknown> {
  if (fallbackTranslations) return fallbackTranslations;
  const localeDir = path.join(__dirname, 'locales');
  fallbackTranslations = {
    ...readLocaleFile(path.join(localeDir, 'en.json')),
    ...readLocaleFile(path.join(localeDir, `${activeLanguage}.json`))
  };
  return fallbackTranslations;
}

function readLocaleFile(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}
