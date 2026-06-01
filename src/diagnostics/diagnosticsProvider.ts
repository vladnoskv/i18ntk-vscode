import * as vscode from 'vscode';
import { DiagnosticRuleSeverity, I18nScanResult } from '../types';
import { mapScanResultToDiagnostics } from './diagnosticsMapper';

export class DiagnosticsProvider {
  private readonly collection = vscode.languages.createDiagnosticCollection('i18ntk');
  private result?: I18nScanResult;

  update(result: I18nScanResult | undefined): void {
    this.result = result;
    this.refresh();
  }

  refresh(): void {
    this.collection.clear();
    if (!this.result) return;
    const grouped = new Map<string, any[]>();
    for (const diagnostic of mapScanResultToDiagnostics(this.result, readDiagnosticSettings())) {
      const range = new vscode.Range(
        diagnostic.range.startLine,
        diagnostic.range.startCharacter,
        diagnostic.range.endLine,
        diagnostic.range.endCharacter
      );
      const severity = diagnostic.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : diagnostic.severity === 'warning'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;
      const vscodeDiagnostic = new vscode.Diagnostic(range, diagnostic.message, severity);
      vscodeDiagnostic.code = diagnostic.code;
      vscodeDiagnostic.source = 'i18ntk';
      vscodeDiagnostic.data = diagnostic.data;
      grouped.set(diagnostic.filePath, [...(grouped.get(diagnostic.filePath) || []), vscodeDiagnostic]);
    }
    for (const [filePath, diagnostics] of grouped) {
      this.collection.set(vscode.Uri.file(filePath), diagnostics);
    }
  }

  dispose(): void {
    this.collection.dispose();
  }
}

function readDiagnosticSettings(): { severities: Record<string, DiagnosticRuleSeverity | undefined>; ignoredDiagnostics: string[] } {
  const config = vscode.workspace.getConfiguration('i18ntk');
  return {
    severities: config.get('diagnosticSeverities', {}) as Record<string, DiagnosticRuleSeverity | undefined>,
    ignoredDiagnostics: config.get('ignoredDiagnostics', []) as string[]
  };
}
