import { TextRange } from '../types';

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

export function collectJsonKeyRanges(content: string): Record<string, TextRange> {
  const ranges: Record<string, TextRange> = {};
  let index = 0;

  const skipWhitespace = () => {
    while (index < content.length && /\s/.test(content[index])) index++;
  };

  const parseString = (): { value: string; start: number; end: number } | undefined => {
    if (content[index] !== '"') return undefined;
    const keyStart = index + 1;
    index++;
    let value = '';
    while (index < content.length) {
      const char = content[index];
      if (char === '\\') {
        const next = content[index + 1];
        if (next) value += next;
        index += 2;
        continue;
      }
      if (char === '"') {
        const keyEnd = index;
        index++;
        return { value, start: keyStart, end: keyEnd };
      }
      value += char;
      index++;
    }
    return undefined;
  };

  const skipLiteral = () => {
    while (index < content.length && /[^\s,\]}]/.test(content[index])) index++;
  };

  const parseArray = () => {
    index++;
    while (index < content.length) {
      skipWhitespace();
      if (content[index] === ']') {
        index++;
        return;
      }
      parseValue([]);
      skipWhitespace();
      if (content[index] === ',') index++;
    }
  };

  const parseObject = (path: string[]) => {
    index++;
    while (index < content.length) {
      skipWhitespace();
      if (content[index] === '}') {
        index++;
        return;
      }

      const key = parseString();
      if (!key) {
        skipLiteral();
        continue;
      }

      skipWhitespace();
      if (content[index] !== ':') continue;
      index++;

      const fullKey = [...path, key.value].join('.');
      ranges[fullKey] = rangeFromOffsets(content, key.start, key.end);
      skipWhitespace();
      parseValue([...path, key.value]);
      skipWhitespace();
      if (content[index] === ',') index++;
    }
  };

  function parseValue(path: string[]) {
    skipWhitespace();
    if (content[index] === '{') {
      parseObject(path);
      return;
    }
    if (content[index] === '[') {
      parseArray();
      return;
    }
    if (content[index] === '"') {
      parseString();
      return;
    }
    skipLiteral();
  }

  skipWhitespace();
  if (content[index] === '{') parseObject([]);
  return ranges;
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

function rangeFromOffsets(text: string, start: number, end: number): TextRange {
  const startPos = positionAt(text, start);
  const endPos = positionAt(text, end);
  return {
    startLine: startPos.line,
    startCharacter: startPos.character,
    endLine: endPos.line,
    endCharacter: endPos.character
  };
}

function positionAt(text: string, offset: number): { line: number; character: number } {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length
  };
}
