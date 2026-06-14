const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const includeDirs = ['src', 'scripts'];
const rootFiles = ['healthcheck.js'];

function collectJsFiles(dirPath, collected = []) {
  if (!fs.existsSync(dirPath)) {
    return collected;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'logs') {
        continue;
      }
      collectJsFiles(fullPath, collected);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      collected.push(fullPath);
    }
  }

  return collected;
}

function runSyntaxCheck(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    stdio: 'pipe',
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    return { ok: false, output };
  }

  return { ok: true, output: '' };
}

const files = [];
for (const dir of includeDirs) {
  collectJsFiles(path.join(rootDir, dir), files);
}

for (const fileName of rootFiles) {
  const fullPath = path.join(rootDir, fileName);
  if (fs.existsSync(fullPath)) {
    files.push(fullPath);
  }
}

files.sort();

if (files.length === 0) {
  console.log('Keine JS-Dateien fuer den Build-Check gefunden.');
  process.exit(0);
}

let hasErrors = false;

for (const filePath of files) {
  const check = runSyntaxCheck(filePath);
  if (!check.ok) {
    hasErrors = true;
    const relativePath = path.relative(rootDir, filePath);
    console.error(`\n[SYNTAX ERROR] ${relativePath}`);
    console.error(check.output);
  }
}

if (hasErrors) {
  console.error('\nBuild-Check fehlgeschlagen: Mindestens eine Datei hat Syntaxfehler.');
  process.exit(1);
}

console.log(`Build-Check erfolgreich: ${files.length} JS-Dateien geprueft.`);
