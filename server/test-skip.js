const express = require('express');
const app = express();

// Просто добавляем маршруты
app.get('/a', (req, res) => res.json({ name: 'a' }));
app.get('/b', (req, res) => res.json({ name: 'b' }));
app.get('/c', (req, res) => res.json({ name: 'c' }));
app.get('/d', (req, res) => res.json({ name: 'd' }));

console.log('Test server ready');

app.listen(3010, () => {
  console.log('Test on 3010');
  console.log('Check all:');
  console.log('  http://localhost:3010/a');
  console.log('  http://localhost:3010/b');
  console.log('  http://localhost:3010/c');
  console.log('  http://localhost:3010/d');
});