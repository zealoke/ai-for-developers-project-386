#!/usr/bin/env node
// Собирает TypeSpec-контракт (../specs) перед генерацией TypeScript-типов,
// так как specs/tsp-output/ не хранится в репозитории (см. specs/.gitignore).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specsDir = path.resolve(frontendDir, '..', 'specs');

console.log(`> tsp compile . (в ${specsDir})`);

const result = spawnSync('npm', ['run', 'build'], {
  cwd: specsDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('Не удалось собрать спеку в specs/. Проверьте `npm install` в specs/.');
  process.exit(result.status ?? 1);
}
