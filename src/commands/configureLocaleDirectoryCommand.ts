import path from 'node:path';
import * as vscode from 'vscode';
import { detectLocaleDirectory, normalizeRelativePath } from '../config/localeDiscovery';
import { Logger } from '../services/logger';

interface ConfigureLocaleDirectoryOptions {
  rescan?: boolean;
  silent?: boolean;
}

export function registerConfigureLocaleDirectoryCommands(context: vscode.ExtensionContext, logger: Logger): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('i18ntk.chooseLocaleDirectory', async (options?: ConfigureLocaleDirectoryOptions) => {
      await chooseLocaleDirectory(options);
    }),
    vscode.commands.registerCommand('i18ntk.detectLocaleDirectory', async (options?: ConfigureLocaleDirectoryOptions) => {
      await detectAndSaveLocaleDirectory(logger, options);
    })
  );
}

export async function chooseLocaleDirectory(options: ConfigureLocaleDirectoryOptions = {}): Promise<boolean> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
    return false;
  }

  const selected = await vscode.window.showOpenDialog({
    title: 'Select locale directory',
    defaultUri: vscode.Uri.file(folder.uri.fsPath),
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Use Locale Directory'
  });
  const localeDirectory = selected?.[0]?.fsPath;
  if (!localeDirectory) return false;

  await saveLocaleDirectory(folder.uri.fsPath, localeDirectory);
  if (!options.silent) {
    vscode.window.showInformationMessage(`i18ntk locale directory set to ${relativeWorkspacePath(folder.uri.fsPath, localeDirectory)}.`);
  }
  if (options.rescan) await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  return true;
}

export async function detectAndSaveLocaleDirectory(logger: Logger, options: ConfigureLocaleDirectoryOptions = {}): Promise<boolean> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showWarningMessage('i18ntk Workbench requires an open workspace.');
    return false;
  }

  const detected = await detectLocaleDirectory(folder.uri.fsPath);
  if (!detected.found) {
    if (!options.silent) {
      const action = await vscode.window.showWarningMessage(
        'i18ntk could not auto-detect a locale directory with JSON locale files.',
        'Choose Locale Folder',
        'Open Settings'
      );
      if (action === 'Choose Locale Folder') return chooseLocaleDirectory({ rescan: options.rescan });
      if (action === 'Open Settings') await vscode.commands.executeCommand('i18ntk.openSettings');
    }
    return false;
  }

  await saveLocaleDirectory(folder.uri.fsPath, detected.localeDirectory);
  logger.info(`Auto-detected locale directory: ${detected.relativeLocaleDirectory}`);
  if (!options.silent) {
    vscode.window.showInformationMessage(`i18ntk locale directory detected: ${detected.relativeLocaleDirectory}.`);
  }
  if (options.rescan) await vscode.commands.executeCommand('i18ntk.scanWorkspace');
  return true;
}

async function saveLocaleDirectory(rootPath: string, localeDirectory: string): Promise<void> {
  await vscode.workspace
    .getConfiguration('i18ntk')
    .update('localeDirectory', relativeWorkspacePath(rootPath, localeDirectory), vscode.ConfigurationTarget.Workspace);
}

function relativeWorkspacePath(rootPath: string, targetPath: string): string {
  return normalizeRelativePath(path.relative(rootPath, targetPath) || '.');
}
