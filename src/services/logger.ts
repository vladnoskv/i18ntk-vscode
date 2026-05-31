export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string, error?: unknown): void {
    console.error(message, error ?? '');
  }
}

export class OutputChannelLogger implements Logger {
  constructor(private readonly channel: { appendLine(message: string): void }) {}

  info(message: string): void {
    this.channel.appendLine(`[info] ${message}`);
  }

  warn(message: string): void {
    this.channel.appendLine(`[warn] ${message}`);
  }

  error(message: string, error?: unknown): void {
    const suffix = error instanceof Error ? ` ${error.message}` : error ? ` ${String(error)}` : '';
    this.channel.appendLine(`[error] ${message}${suffix}`);
  }
}
