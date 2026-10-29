// server/middleware/auth.js
const { verifyToken } = require('../auth');
const { connectDB } = require('../db'); // ← теперь импорт работает напрямую

/**
 * Проверяет accessToken из cookie или Authorization header
 */
async function requireAuth(req, res, next) {
  try {
    // 1. Берём токен из cookie
    let token = req.cookies?.accessToken;
    
    // 2. Если нет — из Authorization: Bearer ...
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }
    
    // 3. Проверяем токен
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Невалидный или истёкший токен' });
    }
    
    // 4. Загружаем пользователя из БД (чтобы проверить is_active и роли)
    const client = await connectDB();
    const userResult = await client.query(
      'SELECT id, phone, name, email, is_active, avatar_url FROM users WHERE id = $1',
      [payload.id]
    );
    
    if (userResult.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Учётная запись не подтверждена' });
    }
    
    // 5. Загружаем роли
    const rolesResult = await client.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );
    user.roles = rolesResult.rows.map(r => r.role);
    
    // 6. Прикрепляем к запросу
    req.user = user;
    next();
  } catch (err) {
    console.error('[requireAuth] Error:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
}

/**
 * Проверяет, что у пользователя есть одна из указанных ролей
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }
    
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав. Требуется одна из ролей: ' + allowedRoles.join(', ')
      });
    }
    
    next();
  };
}

/**
 * Необязательная авторизация — если токен есть, парсим; если нет — пропускаем
 */
async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    
    if (!token) {
      return next();
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return next();
    }
    
    const client = await connectDB();
    const userResult = await client.query(
      'SELECT id, phone, name, email, is_active FROM users WHERE id = $1',
      [payload.id]
    );
    
    if (userResult.rowCount > 0 && userResult.rows[0].is_active) {
      const user = userResult.rows[0];
      const rolesResult = await client.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [user.id]
      );
      user.roles = rolesResult.rows.map(r => r.role);
      req.user = user;
    }
    
    next();
  } catch (err) {
    console.error('[optionalAuth] Error:', err.message);
    next();
  }
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};