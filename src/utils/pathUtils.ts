import path from 'node:path';

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function isExcludedPath(filePath: string, exclude: string[]): boolean {
  const normalized = normalizePath(filePath);
  return exclude.some((entry) => {
    const clean = entry.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return normalized.split('/').includes(clean) || normalized.includes(`/${clean}/`);
  });
}
