// server/db.js
const { Client } = require('pg');

let db = null;

async function connectDB() {
  if (db && db._connected && !db._ending) {
    return db;
  }

  try {
    if (db && !db._ended) {
      try {
        await db.end();
      } catch (e) {}
    }

    db = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'p-dtr-db',
      user: process.env.DB_USER || 'pdtr_admin',
      password: process.env.REGRU_DB_PASSWORD
    });

    await db.connect();
    console.log('Connected to PostgreSQL at Reg.ru');
    
    db.on('error', (err) => {
      console.error('Database connection error:', err.message);
      db = null;
    });
    
    return db;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    db = null;
    throw error;
  }
}

module.exports = { connectDB };