// scripts/deploy-build.js
const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '..');   // < из scripts/ на 1 уровень вверх = корень проекта

const buildDir = path.join(rootDir, 'build');
const larchikDir = path.join(rootDir, 'larchik');

if (!fs.existsSync(buildDir)) {
  console.error('? Папка build/ не найдена. Сначала запустите react-scripts build.');
  process.exit(1);
}

if (fs.existsSync(larchikDir)) {
  console.log('???  Удаляю старую папку larchik/');
  fs.rmSync(larchikDir, { recursive: true, force: true });
}

console.log('?? Перемещаю build/ > larchik/');
fs.renameSync(buildDir, larchikDir);

console.log('? Готово! Папка larchik/ обновлена.');