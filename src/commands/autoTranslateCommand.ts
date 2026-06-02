import * as vscode from 'vscode';
import { resolveI18ntkConfig } from '../config/i18ntkConfigResolver';
import { I18ntkCliService } from '../services/i18ntkCliService';
import { Logger } from '../services/logger';
import { ScanState } from './scanWorkspaceCommand';

export function registerAutoTranslateCommand(context: vscode.ExtensionContext, state: ScanState, logger: Logger): void {
  const cli = new I18ntkCliService(logger);
  context.subscriptions.push(vscode.commands.registerCommand('i18ntk.autoTranslateMissing', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
      return;
    }

    const config = await resolveI18ntkConfig(folder.uri.fsPath);
    const configuredTargets = config.autoTranslateTargets.length > 0
      ? config.autoTranslateTargets
      : state.result?.locales.filter((locale: string) => locale !== config.sourceLocale) ?? [];
    const targetInput = await vscode.window.showInputBox({
      title: 'Auto Translate target locales',
      prompt: 'Comma-separated target locale codes. Existing translated values are kept unless you choose translate-all mode in settings.',
      value: configuredTargets.join(', ')
    });
    if (!targetInput) return;
    const targetLocales = targetInput.split(',').map((locale: string) => locale.trim()).filter(Boolean);

    const mode = config.autoTranslateMode;
    const dryRun = mode === 'dryRun';
    const confirmed = await vscode.window.showWarningMessage(
      dryRun
        ? `Preview Auto Translate for ${targetLocales.join(', ')} using ${config.autoTranslateProvider}?`
        : `Run Auto Translate for ${targetLocales.join(', ')} using ${config.autoTranslateProvider}? This can update locale files.`,
      { modal: !dryRun },
      dryRun ? 'Preview' : 'Run Auto Translate'
    );
    if (!confirmed) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: dryRun ? 'Previewing i18ntk Auto Translate' : 'Running i18ntk Auto Translate',
      cancellable: false
    }, async (progress: vscode.Progress<{ message?: string }>) => {
      try {
        progress.report({ message: targetLocales.join(', ') });
        const results = await cli.autoTranslate(config, targetLocales, { dryRun });
        for (const result of results) {
          logger.info(`Auto Translate ${result.targetLocale} output:\n${result.stdout || result.stderr}`);
        }
        vscode.window.showInformationMessage(
          dryRun
            ? `i18ntk Auto Translate preview completed for ${results.length} locale(s).`
            : `i18ntk Auto Translate completed for ${results.length} locale(s).`
        );
        if (!dryRun) {
          state.report = undefined;
          await vscode.commands.executeCommand('i18ntk.scanWorkspace');
        }
      } catch (error) {
        logger.error('Auto Translate failed', error);
        if (!dryRun) {
          state.report = undefined;
          await vscode.commands.executeCommand('i18ntk.scanWorkspace');
        }
        vscode.window.showErrorMessage(`i18ntk Auto Translate needs review: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }));
}
