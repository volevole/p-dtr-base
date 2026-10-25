// server/auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET не задан в .env');
}

/**
 * Хеширует пароль
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Проверяет пароль против хеша
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Создаёт accessToken
 */
function generateAccessToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      phone: user.phone, 
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES }
  );
}

/**
 * Создаёт refreshToken
 */
function generateRefreshToken(user, rememberMe = false) {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Проверяет JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Хеширует refreshToken (для хранения в БД)
 */
async function hashRefreshToken(token) {
  return await bcrypt.hash(token, 10);
}

/**
 * Проверяет refreshToken против хеша
 */
async function verifyRefreshToken(token, hash) {
  return await bcrypt.compare(token, hash);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashRefreshToken,
  verifyRefreshToken
};