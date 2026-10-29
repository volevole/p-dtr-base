// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../db');
const rateLimit = require('express-rate-limit');
const { 
  hashPassword, verifyPassword, 
  generateAccessToken, generateRefreshToken, 
  verifyToken, hashRefreshToken, verifyRefreshToken 
} = require('../auth');
const { requireAuth } = require('../middleware/auth');

// Rate limit для входа: 5 попыток за 15 минут
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Слишком много попыток входа. Попробуйте через 15 минут.' }
});

// Rate limit для регистрации: 3 заявки за 1 час
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

/**
 * POST /api/auth/register — регистрация
 */

  router.post('/register', registerLimiter, async (req, res) => {
    const { phone, password, name, email } = req.body;
    
    // Валидация
    if (!phone || !password || !name) {
      return res.status(400).json({ success: false, error: 'Телефон, пароль и имя обязательны' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Пароль должен быть минимум 8 символов' });
    }
    
    // Нормализация телефона
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');
    
    try {
      const client = await connectDB();
      
      // Проверка, что телефон не занят
      const existing = await client.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
      if (existing.rowCount > 0) {
        return res.status(400).json({ success: false, error: 'Этот телефон уже зарегистрирован' });
      }
      
      // Хешируем пароль
      const passwordHash = await hashPassword(password);
      
      // Создаём пользователя (is_active = false — ожидает подтверждения)
      const result = await client.query(
        `INSERT INTO users (phone, password_hash, name, email, is_active) 
         VALUES ($1, $2, $3, $4, false) 
         RETURNING id, phone, name, email, created_at`,
        [normalizedPhone, passwordHash, name, email || null]
      );
      
      res.json({
        success: true,
        message: 'Регистрация отправлена. Дождитесь подтверждения администратора.',
        user: result.rows[0]
      });
    } catch (err) {
      console.error('[POST /api/auth/register] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
    /**
   * POST /api/auth/login — вход
   */
    router.post('/login', loginLimiter, async (req, res) => {
        const { phone, password, rememberMe } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || null;
        const deviceId = req.body.deviceId || null; // 👈 Ждем отпечаток устройства с фронта

        if (!phone || !password) {
        return res.status(400).json({ success: false, error: 'Телефон и пароль обязательны' });
        }
        
        const normalizedPhone = phone.replace(/[\s\-()]/g, '');
        
        try {
        const client = await connectDB();
        
        // 👈 ПРОВЕРКА НА БРУТФОРС
        let captchaRequired = false;

        if (deviceId) {
            const recentFails = await client.query(
            `SELECT COUNT(*) FROM auth_logs 
            WHERE device_id = $1 
                AND action = 'login_fail' 
                AND created_at > NOW() - INTERVAL '30 minutes'`,
            [deviceId]
            );

            const failCount = parseInt(recentFails.rows[0].count);

            if (failCount >= 10) {
            // Логируем блокировку
            await client.query(
                `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status, details) 
                VALUES ($1, $2, $3, $4, 'login_blocked', 'blocked', 'too_many_attempts')`,
                [phone, deviceId, ipAddress, userAgent]
            );
            
            return res.status(429).json({ 
                success: false, 
                error: 'Слишком много неудачных попыток входа. Ваше устройство заблокировано на 30 минут.' 
            });
            }

            if (failCount >= 3) {
            captchaRequired = true;
            }
        }


        // Ищем пользователя
        const result = await client.query(
            'SELECT id, phone, name, email, password_hash, is_active, must_change_password, banned_until, ban_reason_public FROM users WHERE phone = $1',
            [normalizedPhone]
        );

        // 👈 ЛОГИРОВАНИЕ: Пользователь не найден
        if (result.rowCount === 0) {
            await client.query(
            `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status, details) 
            VALUES ($1, $2, $3, $4, 'login_fail', 'fail', 'phone_not_found')`,
            [normalizedPhone, deviceId, ipAddress, userAgent]
            );
            return res.status(401).json({ success: false, error: 'Неверный телефон или пароль' });
        }
        
        const user = result.rows[0];
        
        // 👈 ПРОВЕРКА БАНА
        if (user.banned_until && new Date(user.banned_until) > new Date()) {
            await client.query(
            `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status) 
            VALUES ($1, $2, $3, $4, 'login_banned', 'blocked')`,
            [normalizedPhone, deviceId, ipAddress, userAgent]
            );
            return res.status(403).json({ 
            success: false, 
            error: user.ban_reason_public || 'Ваш аккаунт временно заблокирован' 
            });
        }

        if (!user.is_active) {
            await client.query(
            `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status) 
            VALUES ($1, $2, $3, $4, 'login_inactive', 'fail')`,
            [normalizedPhone, deviceId, ipAddress, userAgent]
            );
            return res.status(403).json({ success: false, error: 'Учётная запись ожидает подтверждения администратора' });
        }
        
        // Проверяем пароль
        const isValid = await verifyPassword(password, user.password_hash);
        
        // 👈 ЛОГИРОВАНИЕ: Неверный пароль
        if (!isValid) {
            await client.query(
            `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status, details) 
            VALUES ($1, $2, $3, $4, 'login_fail', 'fail', 'wrong_password')`,
            [normalizedPhone, deviceId, ipAddress, userAgent]
            );
            return res.status(401).json({ success: false, error: 'Неверный телефон или пароль' });
        }
        
        // 👈 ЛОГИРОВАНИЕ: Успешный вход
        await client.query(
            `INSERT INTO auth_logs (phone, device_id, ip_address, user_agent, action, status) 
            VALUES ($1, $2, $3, $4, 'login_success', 'success')`,
            [normalizedPhone, deviceId, ipAddress, userAgent]
        );

        // Загружаем роли
        const rolesResult = await client.query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
        const roles = rolesResult.rows.map(r => r.role);
        
        // Генерируем токены
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user, rememberMe);
        
        // Сохраняем refreshToken в БД (хеш)
        const refreshHash = await hashRefreshToken(refreshToken);
        const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
        
        await client.query(
            `INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at) 
            VALUES ($1, $2, $3, $4, $5)`,
            [user.id, refreshHash, userAgent, ipAddress, expiresAt]
        );
        
        // Обновляем last_login_at
        await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        
        // Устанавливаем cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            domain: process.env.COOKIE_DOMAIN || undefined
        };
        
        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000  // 24 часа
        });
        
        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
            path: '/api/auth/refresh'
        });
        
        res.json({
            success: true,
            user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            roles: roles,
            mustChangePassword: user.must_change_password
            },
            captchaRequired // 👈 Отдаем на фронт
        });
        } catch (err) {
        console.error('[POST /api/auth/login] Error:', err.message);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    });
  
  /**
   * POST /api/auth/logout — выход
   */
  router.post('/logout', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        // Удаляем сессию из БД
        const payload = verifyToken(refreshToken);
        if (payload) {
          const client = await connectDB();
          await client.query('DELETE FROM user_sessions WHERE user_id = $1', [payload.id]);
        }
      }
      
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      res.json({ success: true, message: 'Вы вышли из системы' });
    } catch (err) {
      console.error('[POST /api/auth/logout] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * POST /api/auth/refresh — обновление accessToken
   */
  router.post('/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Нет refresh token' });
      }
      
      const payload = verifyToken(refreshToken);
      if (!payload || payload.type !== 'refresh') {
        return res.status(401).json({ success: false, error: 'Невалидный refresh token' });
      }
      
      const client = await connectDB();
      
      // Проверяем, что сессия есть в БД
      const sessions = await client.query(
        'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at > NOW()',
        [payload.id]
      );
      
      let validSession = null;
      for (const session of sessions.rows) {
        if (await verifyRefreshToken(refreshToken, session.refresh_token_hash)) {
          validSession = session;
          break;
        }
      }
      
      if (!validSession) {
        return res.status(401).json({ success: false, error: 'Сессия не найдена или истекла' });
      }
      
      // Загружаем пользователя
      const userResult = await client.query(
        'SELECT id, phone, name, email, is_active FROM users WHERE id = $1',
        [payload.id]
      );
      
      if (userResult.rowCount === 0 || !userResult.rows[0].is_active) {
        return res.status(401).json({ success: false, error: 'Пользователь неактивен' });
      }
      
      // Новый accessToken
      const newAccessToken = generateAccessToken(userResult.rows[0]);
      
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/auth/refresh] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * GET /api/auth/me — текущий пользователь
   */
  router.get('/me', requireAuth, async (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        phone: req.user.phone,
        name: req.user.name,
        email: req.user.email,
        avatar_url: req.user.avatar_url, // 👈 Добавили эту строку
        roles: req.user.roles
      }
    });
  });
  

module.exports = router;