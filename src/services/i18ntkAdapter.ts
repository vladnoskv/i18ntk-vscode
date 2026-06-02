import { execFile } from 'node:child_process';
import path from 'node:path';
import { I18nReport, I18nScanResult, I18nValidationResult, ResolvedI18ntkConfig } from '../types';
import { WorkspaceScanner } from './workspaceScanner';
import { ReportService } from './reportService';
import { Logger } from './logger';
import { CancellationToken } from 'vscode';

export interface I18ntkAdapter {
  scanWorkspace(rootPath: string, config: ResolvedI18ntkConfig, token?: CancellationToken): Promise<I18nScanResult>;
  validateLocales(rootPath: string, config: ResolvedI18ntkConfig): Promise<I18nValidationResult>;
  generateReport(result: I18nScanResult): Promise<I18nReport>;
}

export class LocalI18ntkAdapter implements I18ntkAdapter {
  private readonly reports = new ReportService();

  constructor(
    private readonly scanner: WorkspaceScanner,
    private readonly logger: Logger,
    private readonly runCliValidation: (rootPath: string, config: ResolvedI18ntkConfig) => void = (rootPath, config) => this.tryRunI18ntkValidate(rootPath, config)
  ) {}

  async scanWorkspace(rootPath: string, config: ResolvedI18ntkConfig, token?: CancellationToken): Promise<I18nScanResult> {
    if (config.runCliValidationOnScan) {
      this.runCliValidation(rootPath, config);
    }
    return this.scanner.scan(rootPath, config, token);
  }

  async validateLocales(rootPath: string, config: ResolvedI18ntkConfig): Promise<I18nValidationResult> {
    const result = await this.scanWorkspace(rootPath, config);
    return {
      success: result.missingKeys.length === 0 && result.placeholderMismatches.length === 0,
      issues: [...result.missingKeys, ...result.placeholderMismatches, ...result.invalidKeyNames, ...result.riskyContent]
    };
  }

  async generateReport(result: I18nScanResult): Promise<I18nReport> {
    return this.reports.generate(result);
  }

  private tryRunI18ntkValidate(rootPath: string, config: ResolvedI18ntkConfig): void {
    const candidatePaths = [
      path.resolve(rootPath, '../i18ntk/main/i18ntk-validate.js'),
      path.resolve(rootPath, 'node_modules/i18ntk/main/i18ntk-validate.js')
    ];
    const scriptPath = candidatePaths.find((p) => {
      try {
        require('fs').accessSync(p);
        return true;
      } catch { return false; }
    });
    if (!scriptPath) return;
    execFile(
      process.execPath,
      [scriptPath, '--json', '--no-prompt', '--silent', `--source-dir=${config.localeDirectory}`],
      { cwd: rootPath, timeout: 15000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (error, _stdout) => {
        if (error && !(error as any)?.killed) {
          this.logger.warn('i18ntk CLI validation was unavailable or failed; using local adapter analysis.');
        }
      }
    );
  }
}
