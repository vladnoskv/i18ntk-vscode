import fs from 'node:fs';
import path from 'node:path';
import { LocaleFileInfo, ResolvedI18ntkConfig } from '../types';
import { collectJsonKeyRanges, flattenJson, insertKeyValue, readJsonWithFormatting, shouldUseNestedInsertion, stringifyJson } from '../utils/jsonUtils';

export interface LoadedLocaleFile extends LocaleFileInfo {
  data: Record<string, unknown>;
  values: Record<string, string>;
}

export class LocaleFileService {
  async discover(config: ResolvedI18ntkConfig): Promise<LoadedLocaleFile[]> {
    const root = config.localeDirectory;
    const files: LoadedLocaleFile[] = [];
    let entries: any[];
    try {
      entries = await fs.promises.readdir(root, { withFileTypes: true });
    } catch {
      return files;
    }

    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        const locale = entry.name;
        const childFiles = await fs.promises.readdir(fullPath, { withFileTypes: true }).catch(() => []);
        for (const child of childFiles) {
          if (child.isFile() && child.name.endsWith('.json')) {
            const namespace = path.basename(child.name, '.json');
            const loaded = await this.load(locale, namespace, path.join(fullPath, child.name));
            if (loaded) files.push(loaded);
          }
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const locale = path.basename(entry.name, '.json');
        const loaded = await this.load(locale, 'common', fullPath);
        if (loaded) files.push(loaded);
      }
    }
    return files;
  }

  async addKey(config: ResolvedI18ntkConfig, locale: string, key: string, value: string): Promise<string> {
    const localePath = await this.resolveWritableLocaleFile(config, locale);
    let content = '{}\n';
    try {
      content = await fs.promises.readFile(localePath, 'utf8');
    } catch {
      await fs.promises.mkdir(path.dirname(localePath), { recursive: true });
    }
    const parsed = readJsonWithFormatting(content);
    const nested = shouldUseNestedInsertion(parsed.data, key) || config.keyStyle === 'dot';
    const next = insertKeyValue(parsed.data, key, value, nested);
    await fs.promises.writeFile(localePath, stringifyJson(next, parsed.indent, parsed.eol), 'utf8');
    return localePath;
  }

  private async resolveWritableLocaleFile(config: ResolvedI18ntkConfig, locale: string): Promise<string> {
    const localeDir = path.join(config.localeDirectory, locale);
    try {
      const stat = await fs.promises.stat(localeDir);
      if (stat.isDirectory()) return path.join(localeDir, 'common.json');
    } catch {
      // Fall through to direct file or create locale directory.
    }
    const directFile = path.join(config.localeDirectory, `${locale}.json`);
    try {
      await fs.promises.access(directFile);
      return directFile;
    } catch {
      return path.join(localeDir, 'common.json');
    }
  }

  private async load(locale: string, namespace: string, filePath: string): Promise<LoadedLocaleFile | undefined> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content) as Record<string, unknown>;
      const values = flattenJson(data);
      const keyRanges = collectJsonKeyRanges(content);
      return { locale, namespace, filePath, keys: Object.keys(values), keyRanges, data, values };
    } catch {
      return undefined;
    }
  }
}
