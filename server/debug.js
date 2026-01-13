// debug.js
const fs = require('fs');
const path = require('path');

// Проверяем какой файл читается
console.log('Reading server.js...');
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
console.log('First 200 chars:', serverContent.substring(0, 200));

// Проверяем есть ли другие server.js файлы
const files = fs.readdirSync(__dirname);
console.log('Files in directory:', files.filter(f => f.includes('server')));

// Запускаем чистый Express тест
const express = require('express');
const testApp = express();

testApp.get('/debug-test', (req, res) => {
  res.json({ debug: 'works', time: new Date().toISOString() });
});

testApp.listen(3006, () => {
  console.log('Debug server on port 3006');
  console.log('Test: http://localhost:3006/debug-test');
});