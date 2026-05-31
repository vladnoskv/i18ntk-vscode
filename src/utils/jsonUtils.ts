export interface JsonFormatting {
  data: Record<string, unknown>;
  indent: number;
  eol: '\n' | '\r\n';
}

export function readJsonWithFormatting(content: string): JsonFormatting {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const indentMatch = content.match(/\n( +)"/);
  const indent = indentMatch ? indentMatch[1].length : 2;
  const data = JSON.parse(content) as Record<string, unknown>;
  return { data, indent, eol };
}

export function stringifyJson(data: unknown, indent = 2, eol: '\n' | '\r\n' = '\n'): string {
  return JSON.stringify(data, null, indent).replace(/\n/g, eol) + eol;
}

export function flattenJson(value: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(result, flattenJson(child, fullKey));
    } else if (typeof child === 'string') {
      result[fullKey] = child;
    }
  }

  return result;
}

export function getValueByKey(data: Record<string, unknown>, key: string): string | undefined {
  if (typeof data[key] === 'string') return data[key] as string;
  const parts = key.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function insertKeyValue<T extends Record<string, unknown>>(data: T, key: string, value: string, nested: boolean): T {
  if (!nested) {
    return { ...data, [key]: value };
  }

  const clone = cloneJsonObject(data);
  const parts = key.split('.').filter(Boolean);
  let current: Record<string, unknown> = clone;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
  return clone as T;
}

export function cloneJsonObject<T extends Record<string, unknown>>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export function shouldUseNestedInsertion(data: Record<string, unknown>, key: string): boolean {
  if (Object.prototype.hasOwnProperty.call(data, key)) return false;
  const first = key.split('.')[0];
  return Boolean(first && data[first] && typeof data[first] === 'object' && !Array.isArray(data[first]));
}
