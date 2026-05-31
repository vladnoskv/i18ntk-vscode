import { I18nScanResult } from '../types';

export class KeyUsageService {
  constructor(private result?: I18nScanResult) {}

  update(result: I18nScanResult): void {
    this.result = result;
  }

  getTranslations(key: string): Record<string, string | undefined> {
    const values: Record<string, string | undefined> = {};
    for (const locale of this.result?.locales ?? []) {
      values[locale] = this.result?.keyValues[locale]?.[key];
    }
    return values;
  }

  getMissingLocales(key: string): string[] {
    return (this.result?.locales ?? []).filter((locale) => this.result?.keyValues[locale]?.[key] === undefined);
  }

  findLocaleFilesForKey(key: string): string[] {
    return (this.result?.localeFiles ?? [])
      .filter((file) => file.keys.includes(key))
      .map((file) => file.filePath);
  }
}
