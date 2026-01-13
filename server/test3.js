const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/debug-simple', async (req, res) => {
  console.log('✅ GET /api/debug-simple HIT!');
  res.json({ success: true, debug: 'simple' });
});

app.get('/api/proxy-image', async (req, res) => {
  console.log('GET /api/proxy-image');
  res.json({ proxy: 'test' });
});

app.get('/api/check-token', async (req, res) => {
  console.log('GET /api/check-token');
  res.json({ token: 'test' });
});

app.listen(3007, () => {
  console.log('Test server on 3007');
  console.log('Test: http://localhost:3007/api/debug-simple');
});