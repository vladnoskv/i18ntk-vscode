declare const __dirname: string;
declare const process: {
  execPath: string;
  platform: string;
  cwd(): string;
  env: Record<string, string | undefined>;
};
declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): unknown;
declare function clearTimeout(timeoutId: unknown): void;

declare module 'node:assert/strict' {
  const assert: any;
  export = assert;
}

declare module 'node:test' {
  function test(name: string, fn: () => unknown | Promise<unknown>): void;
  export default test;
}

declare module 'node:path' {
  const path: any;
  export = path;
}

declare module 'node:fs' {
  const fs: any;
  export = fs;
}

declare module 'node:child_process' {
  export function execFile(file: string, args: string[], options: any, callback: (error: any, stdout: string, stderr: string) => void): any;
}

declare module 'fs' {
  const fs: any;
  export = fs;
}

declare module 'path' {
  const path: any;
  export = path;
}

declare module 'child_process' {
  export function execFile(file: string, args: string[], options: any, callback: (error: any, stdout: string, stderr: string) => void): any;
}

declare module 'vscode' {
  const vscode: any;
  export = vscode;
}
