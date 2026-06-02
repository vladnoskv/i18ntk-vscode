const fs = require('node:fs');
const path = require('node:path');

const sourceDir = path.resolve(__dirname, '../src/i18ntk/locales');
const targetDir = path.resolve(__dirname, '../out/src/i18ntk/locales');

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.json')) {
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
  }
}
