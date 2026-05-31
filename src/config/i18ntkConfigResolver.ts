import path from 'node:path';
import { getConfiguredLocaleDirectory, getExtensionConfig } from './extensionConfig';
import { ResolvedI18ntkConfig } from '../types';
import { detectLocaleDirectory, resolveConfiguredLocaleDirectory } from './localeDiscovery';

export async function resolveI18ntkConfig(rootPath: string): Promise<ResolvedI18ntkConfig> {
  const configured = getConfiguredLocaleDirectory();
  const discovery = configured
    ? await resolveConfiguredLocaleDirectory(rootPath, configured)
    : await detectLocaleDirectory(rootPath);
  return {
    ...getExtensionConfig(rootPath, path.resolve(discovery.localeDirectory)),
    localeDirectorySource: discovery.source,
    localeDirectoryFound: discovery.found,
    localeDirectoryRelativePath: discovery.relativeLocaleDirectory,
    localeFileCount: discovery.localeFileCount
  };
}
