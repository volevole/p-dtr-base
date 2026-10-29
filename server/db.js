// server/db.js
const { Pool } = require('pg');

// Создаем пул соединений
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'p-dtr-db',
  user: process.env.DB_USER || 'pdtr_admin',
  password: process.env.REGRU_DB_PASSWORD
});

// Логируем подключение при первом успешном коннекте
pool.on('connect', () => {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME || 'p-dtr-db';
  const now = new Date().toLocaleTimeString('ru-RU');
  console.log(`[${now}] Connected to PostgreSQL at ${dbHost}:${dbPort}/${dbName}`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Наша старая функция теперь просто возвращает пул
async function connectDB() {
  return pool;
}

module.exports = { connectDB };