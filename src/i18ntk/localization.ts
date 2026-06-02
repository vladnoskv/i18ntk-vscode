import path from 'node:path';

type TranslationParams = Record<string, string | number | boolean | null | undefined>;
type Runtime = {
  t(key: string, params?: TranslationParams): unknown;
};

const SUPPORTED_EXTENSION_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;

let runtime: Runtime | undefined;
let configuredLanguage = 'auto';
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
  return SUPPORTED_EXTENSION_LANGUAGES.includes(normalized as any) ? normalized : 'en';
}

export function setExtensionLanguage(language: string | undefined): void {
  configuredLanguage = language || 'auto';
  runtime = undefined;
  activeLanguage = resolveExtensionLanguage(configuredLanguage);
}

export function getExtensionLanguage(): string {
  getRuntime();
  return activeLanguage;
}

export function getAvailableExtensionLanguages(): string[] {
  return [...SUPPORTED_EXTENSION_LANGUAGES];
}

export function t(key: string, params: TranslationParams = {}, fallback?: string): string {
  const translated = getRuntime()?.t(key, params);
  if (typeof translated === 'string' && translated !== key) return translated;
  return formatTemplate(fallback ?? key, params);
}

export function formatTemplate(template: string, params: TranslationParams = {}): string {
  return template.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, doubleToken, singleToken) => {
    const token = doubleToken ?? singleToken;
    return Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match;
  });
}
