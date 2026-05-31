import fs from 'node:fs';
import path from 'node:path';
import { getConfiguredLocaleDirectory, getExtensionConfig } from './extensionConfig';
import { ResolvedI18ntkConfig } from '../types';

const LOCALE_CANDIDATES = ['locales', 'locale', 'i18n', 'translations', 'public/locales', 'src/locales'];

export async function resolveI18ntkConfig(rootPath: string): Promise<ResolvedI18ntkConfig> {
  const configured = getConfiguredLocaleDirectory();
  const localeDirectory = configured
    ? path.resolve(rootPath, configured)
    : await detectLocaleDirectory(rootPath);
  return getExtensionConfig(rootPath, localeDirectory);
}

async function detectLocaleDirectory(rootPath: string): Promise<string> {
  for (const candidate of LOCALE_CANDIDATES) {
    const fullPath = path.join(rootPath, candidate);
    try {
      const stat = await fs.promises.stat(fullPath);
      if (stat.isDirectory()) return fullPath;
    } catch {
      // Try next candidate.
    }
  }
  return path.join(rootPath, 'locales');
}
