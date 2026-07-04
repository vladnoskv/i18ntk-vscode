import fs from 'node:fs';
import path from 'node:path';

const LOCALE_CANDIDATES = ['locales', 'locale', 'i18n', 'translations', 'public/locales', 'src/locales', 'app/i18n', 'src/lib/i18n', 'content/locales', 'messages', 'lang'];
const LOCALE_ROOT_NAMES = new Set(['locales', 'locale', 'i18n', 'translations', 'messages', 'lang']);
const DISCOVERY_EXCLUDES = new Set(['.git', '.hg', '.svn', 'node_modules', '.next', '.nuxt', '.output', '.astro', '.svelte-kit', '.cache', '__generated__', 'dist', 'build', 'coverage', 'out', 'target']);
const MAX_DISCOVERY_DEPTH = 5;
const MAX_DISCOVERY_DIRECTORIES = 1500;

export type LocaleDirectorySource = 'configured' | 'auto-detected' | 'fallback';

export interface LocaleDirectoryInspection {
  exists: boolean;
  localeFileCount: number;
  locales: string[];
}

export interface LocaleDirectoryDiscovery extends LocaleDirectoryInspection {
  localeDirectory: string;
  relativeLocaleDirectory: string;
  source: LocaleDirectorySource;
  found: boolean;
}

export async function inspectLocaleDirectory(localeDirectory: string): Promise<LocaleDirectoryInspection> {
  let entries: any[];
  try {
    entries = await fs.promises.readdir(localeDirectory, { withFileTypes: true });
  } catch {
    return { exists: false, localeFileCount: 0, locales: [] };
  }

  const locales = new Set<string>();
  let localeFileCount = 0;
  for (const entry of entries) {
    const fullPath = path.join(localeDirectory, entry.name);
    if (entry.isFile() && entry.name.endsWith('.json')) {
      localeFileCount += 1;
      locales.add(path.basename(entry.name, '.json'));
      continue;
    }
    if (!entry.isDirectory()) continue;
    const childFiles = await fs.promises.readdir(fullPath, { withFileTypes: true }).catch(() => []);
    for (const child of childFiles) {
      if (child.isFile() && child.name.endsWith('.json')) {
        localeFileCount += 1;
        locales.add(entry.name);
      }
    }
  }

  return { exists: true, localeFileCount, locales: [...locales].sort() };
}

export async function resolveConfiguredLocaleDirectory(rootPath: string, configuredLocaleDirectory: string): Promise<LocaleDirectoryDiscovery> {
  const localeDirectory = path.resolve(rootPath, configuredLocaleDirectory);
  const inspected = await inspectLocaleDirectory(localeDirectory);
  return toDiscovery(rootPath, localeDirectory, 'configured', inspected, inspected.exists && inspected.localeFileCount > 0);
}

export async function detectLocaleDirectory(rootPath: string): Promise<LocaleDirectoryDiscovery> {
  for (const candidate of LOCALE_CANDIDATES) {
    const localeDirectory = path.join(rootPath, candidate);
    const inspected = await inspectLocaleDirectory(localeDirectory);
    if (inspected.exists && inspected.localeFileCount > 0) {
      return toDiscovery(rootPath, localeDirectory, 'auto-detected', inspected, true);
    }
  }

  const nested = await findNestedLocaleDirectory(rootPath);
  if (nested) return nested;

  const fallback = path.join(rootPath, 'locales');
  return toDiscovery(rootPath, fallback, 'fallback', await inspectLocaleDirectory(fallback), false);
}

async function findNestedLocaleDirectory(rootPath: string): Promise<LocaleDirectoryDiscovery | undefined> {
  const queue: Array<{ directory: string; depth: number }> = [{ directory: rootPath, depth: 0 }];
  let visited = 0;

  while (queue.length > 0 && visited < MAX_DISCOVERY_DIRECTORIES) {
    const current = queue.shift();
    if (!current || current.depth > MAX_DISCOVERY_DEPTH) continue;
    visited += 1;

    let entries: any[];
    try {
      entries = await fs.promises.readdir(current.directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || DISCOVERY_EXCLUDES.has(entry.name)) continue;
      const childDirectory = path.join(current.directory, entry.name);
      const relativeSegments = path.relative(rootPath, childDirectory).split(path.sep);
      const isCandidateName = LOCALE_ROOT_NAMES.has(entry.name) || relativeSegments.slice(-2).join('/') === 'public/locales';
      if (isCandidateName) {
        const inspected = await inspectLocaleDirectory(childDirectory);
        if (inspected.exists && inspected.localeFileCount > 0) {
          return toDiscovery(rootPath, childDirectory, 'auto-detected', inspected, true);
        }
      }
      queue.push({ directory: childDirectory, depth: current.depth + 1 });
    }
  }

  return undefined;
}

function toDiscovery(
  rootPath: string,
  localeDirectory: string,
  source: LocaleDirectorySource,
  inspected: LocaleDirectoryInspection,
  found: boolean
): LocaleDirectoryDiscovery {
  return {
    ...inspected,
    localeDirectory,
    relativeLocaleDirectory: normalizeRelativePath(path.relative(rootPath, localeDirectory) || '.'),
    source,
    found
  };
}

export function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}
