import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ResolvedI18ntkConfig } from '../types';
import { Logger } from './logger';

export interface DirectoryLocaleLayout {
  sourceDir: string;
  localeDirectory: string;
  sourceLocale: string;
  filesPattern: string;
}

export interface AutoTranslateRunOptions {
  provider: ResolvedI18ntkConfig['autoTranslateProvider'];
  mode: ResolvedI18ntkConfig['autoTranslateMode'];
  dryRun: boolean;
}

export interface AutoTranslateResult {
  targetLocale: string;
  stdout: string;
  stderr: string;
}

export function findI18ntkScript(rootPath: string, scriptName: string): string | undefined {
  const candidates = [
    path.resolve(rootPath, '../i18ntk/main', scriptName),
    path.resolve(rootPath, 'node_modules/i18ntk/main', scriptName),
    path.resolve(rootPath, 'node_modules/.bin', process.platform === 'win32' ? scriptName.replace(/\.js$/, '.cmd') : scriptName.replace(/\.js$/, ''))
  ];
  return candidates.find((candidate) => {
    try {
      fs.accessSync(candidate);
      return true;
    } catch {
      return false;
    }
  });
}

export namespace findI18ntkScript {
  export const installMessage = 'i18ntk auto-translate CLI was not found. Install it in this workspace with "npm install i18ntk", or keep the sibling i18ntk package next to this workspace.';
}

export function getDirectoryLocaleLayout(config: ResolvedI18ntkConfig): DirectoryLocaleLayout | undefined {
  const sourceDir = path.join(config.localeDirectory, config.sourceLocale);
  try {
    if (!fs.statSync(sourceDir).isDirectory()) return undefined;
  } catch {
    return undefined;
  }
  return {
    sourceDir,
    localeDirectory: config.localeDirectory,
    sourceLocale: config.sourceLocale,
    filesPattern: '*.json'
  };
}

export function buildAutoTranslateArgs(
  scriptPath: string,
  layout: DirectoryLocaleLayout,
  targetLocale: string,
  options: AutoTranslateRunOptions
): string[] {
  const args = [
    scriptPath,
    path.join(layout.sourceDir, 'common.json'),
    targetLocale,
    '--source-dir',
    layout.sourceDir,
    '--output-dir',
    path.join(layout.localeDirectory, targetLocale),
    '--files',
    layout.filesPattern,
    '--provider',
    options.provider,
    '--no-confirm',
    '--preserve-placeholders',
    '--report-stdout'
  ];
  if (options.mode === 'translateAll') {
    args.push('--translate-all');
  } else {
    args.push('--only-missing');
  }
  if (options.dryRun || options.mode === 'dryRun') {
    args.push('--dry-run');
  }
  return args;
}

export class I18ntkCliService {
  constructor(private readonly logger: Logger) {}

  async autoTranslate(config: ResolvedI18ntkConfig, targetLocales: string[], options?: Partial<AutoTranslateRunOptions>): Promise<AutoTranslateResult[]> {
    const scriptPath = findI18ntkScript(config.rootPath, 'i18ntk-translate.js');
    if (!scriptPath) {
      throw new Error(findI18ntkScript.installMessage);
    }
    const layout = getDirectoryLocaleLayout(config);
    if (!layout) {
      throw new Error('Auto Translate currently requires a directory-per-locale layout such as locales/en/common.json.');
    }
    const actualTargets = [...new Set(targetLocales.map((locale) => locale.trim()).filter(Boolean))]
      .filter((locale) => locale !== config.sourceLocale);
    if (actualTargets.length === 0) {
      throw new Error('No target locales selected for Auto Translate.');
    }

    const runOptions: AutoTranslateRunOptions = {
      provider: options?.provider ?? config.autoTranslateProvider,
      mode: options?.mode ?? config.autoTranslateMode,
      dryRun: options?.dryRun ?? false
    };
    const results: AutoTranslateResult[] = [];
    for (const targetLocale of actualTargets) {
      const args = buildAutoTranslateArgs(scriptPath, layout, targetLocale, runOptions);
      this.logger.info(`Running i18ntk auto translate for ${targetLocale} with ${runOptions.provider}.`);
      results.push(await runCli(process.execPath, args, config.rootPath));
    }
    return results;
  }
}

function runCli(file: string, args: string[], cwd: string): Promise<AutoTranslateResult> {
  const targetLocale = args[2] ?? '';
  return new Promise((resolve, reject) => {
    execFile(file, args, { cwd, timeout: 120000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve({ targetLocale, stdout, stderr });
    });
  });
}
