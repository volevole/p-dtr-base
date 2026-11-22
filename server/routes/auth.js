// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../db');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { 
  hashPassword, verifyPassword, 
  generateAccessToken, generateRefreshToken, 
  verifyToken, hashRefreshToken, verifyRefreshToken 
} = require('../auth');
const { requireAuth } = require('../middleware/auth');
const { sendPushToUser } = require('../services/notifications');

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
        
        // 👈 ДОБАВЬ ЭТОТ ЛОГ
        // console.log('--- DEBUG LOGIN ---');
        // console.log('Device ID из req.body:', req.body.deviceId);
        // console.log('Device ID (переменная):', deviceId);
        // console.log('User ID:', user.id);

        // Обновляем last_login_at и device_id (если он передан)
        if (deviceId) {
            await client.query(
                'UPDATE users SET last_login_at = NOW(), device_id = $1 WHERE id = $2', 
                [deviceId, user.id]
            );
            // 👈 Делаем отдельный SELECT, чтобы проверить, что записалось
            const checkRes = await client.query('SELECT device_id FROM users WHERE id = $1', [user.id]);
            console.log('✅ Обновление прошло. В БД теперь device_id:', checkRes.rows[0].device_id);
        } else {
            await client.query(
                'UPDATE users SET last_login_at = NOW() WHERE id = $2', 
                [user.id]
            );
            console.log('⚠️ Device ID пустой, обновлен только last_login_at');
        }
        
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
        avatar_url: req.user.avatar_url,
        roles: req.user.roles,        
      }
    });
  });
  

  /**
   * PUT /api/auth/password — смена пароля текущего пользователя
   */
  router.put('/password', requireAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const client = await connectDB();

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Введите старый и новый пароль' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Новый пароль должен быть не менее 8 символов' });
    }

    try {
      // 1. Получаем текущий хеш пароля
      const userResult = await client.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      const currentHash = userResult.rows[0].password_hash;

      // 2. Проверяем старый пароль
      const isValid = await verifyPassword(oldPassword, currentHash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Неверный текущий пароль' });
      }

      // 3. Хешируем новый
      const newHash = await hashPassword(newPassword);

      // 4. Обновляем в БД (и снимаем флаг must_change_password)
      await client.query(
        'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
        [newHash, req.user.id]
      );

      res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
      console.error('[ERROR] PUT /api/auth/password:', error.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера при смене пароля' });
    }
  });

// POST /api/auth/push/subscribe — сохранить подписку на пуши
router.post('/push/subscribe', requireAuth, async (req, res) => { // 👈 Убрали /api, так как оно уже есть в префиксе
  const { subscription } = req.body;
  const userAgent = req.headers['user-agent'] || null;
  const client = await connectDB();

  if (!subscription) return res.status(400).json({ success: false, error: 'Нет данных подписки' });

  try {
    // Дедупликация по endpoint: у одного устройства endpoint один и тот же,
    // даже если ключи шифрования перегенерированы. Обновляем user_agent и JSON.
    await client.query(
      `INSERT INTO appt_push_subscriptions (user_id, subscription, user_agent)
       VALUES ($1, $2, $3)
       ON CONFLICT ((subscription->>'endpoint')) DO UPDATE
         SET user_agent   = EXCLUDED.user_agent,
             subscription = EXCLUDED.subscription`,
      [req.user.id, subscription, userAgent]
    );
    res.json({ success: true, message: 'Подписка сохранена' });
  } catch (error) {
    console.error('[ERROR] POST /api/push/subscribe:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/profile/max/generate-code — создать одноразовый код для привязки MAX-бота
router.post('/profile/max/generate-code', requireAuth, async (req, res) => {
  const client = await connectDB();

  try {
    // Отзываем все предыдущие неиспользованные коды этого пользователя
    await client.query(
      `UPDATE appt_max_link_codes SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [req.user.id]
    );

    // Генерируем новый 8-символьный код
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // например, 'A3F19B2C'

    // Сохраняем с TTL 10 минут
    await client.query(
      `INSERT INTO appt_max_link_codes (code, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [code, req.user.id]
    );

    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('[ERROR] POST /api/auth/profile/max/generate-code:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/auth/profile/max/unlink — отвязать MAX-бота от аккаунта
router.put('/profile/max/unlink', requireAuth, async (req, res) => {
  const client = await connectDB();

  try {
    const result = await client.query(
      `UPDATE users
       SET max_user_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    res.json({ success: true, message: 'MAX отвязан' });
  } catch (error) {
    console.error('[ERROR] PUT /api/auth/profile/max/unlink:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/auth/profile/push/:id — удалить подписку на пуши (конкретное устройство)
router.delete('/profile/push/:id', requireAuth, async (req, res) => {
  const client = await connectDB();

  try {
    // user_id в WHERE гарантирует, что пользователь удаляет только СВОЮ подписку
    const result = await client.query(
      `DELETE FROM appt_push_subscriptions
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Подписка не найдена' });
    }

    res.json({ success: true, message: 'Подписка удалена' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/auth/profile/push/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



  
  /**
   * post тестовый эндпоинт, который вручную отправит пуш на твой ID.
   */ 
router.post('/test-push', async (req, res) => {
  const { userId } = req.body;
  
  try {
    await sendPushToUser(userId, {
      title: 'Тестовое уведомление',
      body: 'Если ты это видишь, значит пуши работают!',
      url: '/larchik/appointments'
    });
    res.json({ success: true, message: 'Пуш отправлен' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/server-ip — получить IP сервера
router.get('/server-ip', async (req, res) => {
  try {
    const response = await fetch('https://ifconfig.me/all.json');
    const data = await response.json();
    res.json({ success: true, ip: data.ip_addr });
  } catch (error) {
    console.error('Ошибка получения IP сервера:', error.message);
    // Если fetch не работает, пробуем через встроенный модуль https
    try {
      const https = require('https');
      https.get('https://ipinfo.io/json', (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            res.json({ success: true, ip: parsed.ip });
          } catch (e) {
            res.json({ success: false, ip: 'Не удалось определить' });
          }
        });
      }).on('error', (err) => {
        res.json({ success: false, ip: 'Не удалось определить' });
      });
    } catch (e) {
      res.json({ success: false, ip: 'Не удалось определить' });
    }
  }
});

// 👈 Эндпоинт для приема сообщений от MAX
const { handleMaxWebhook } = require('../services/maxBot');
router.post('/max/webhook', handleMaxWebhook);

module.exports = router;