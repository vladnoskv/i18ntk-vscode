import fs from 'node:fs';
import path from 'node:path';
import { isExcludedPath } from './pathUtils';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findFiles(rootPath: string, extensions: Set<string>, exclude: string[], maxFiles: number): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    if (files.length >= maxFiles || isExcludedPath(directory, exclude)) return;
    let entries: any[];
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (isExcludedPath(fullPath, exclude)) continue;
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        files.push(fullPath);
        if (files.length >= maxFiles) return;
      }
    }
  }

  await visit(rootPath);
  return files;
}
