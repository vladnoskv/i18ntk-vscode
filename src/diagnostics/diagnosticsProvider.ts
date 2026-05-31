import * as vscode from 'vscode';
import { I18nScanResult } from '../types';
import { mapScanResultToDiagnostics } from './diagnosticsMapper';

export class DiagnosticsProvider {
  private readonly collection = vscode.languages.createDiagnosticCollection('i18ntk');

  update(result: I18nScanResult | undefined): void {
    this.collection.clear();
    if (!result) return;
    const grouped = new Map<string, any[]>();
    for (const diagnostic of mapScanResultToDiagnostics(result)) {
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
