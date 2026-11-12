// server/routes/admin-users.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../db');
const { hashPassword } = require('../auth');
const { requireAuth, requireRole } = require('../middleware/auth');

const SUPPORTED_ROLES = [
  'admin', 
  'admin_content', 
  'pdtr_content', // 👈 Исправлено
  'appointments',
  // 👈 Новые роли в нижнем регистре:
  'supplement_pdtr_advance',
  'supplement_pdtr_intermedia',
  'supplement_pdtr_integrative',
  'supplement_pdtr_sourcecode'
];


  // Все роуты — только для admin
  router.use(requireAuth, requireRole('admin'));
  
    /**
   * GET /api/admin/users — список всех пользователей
   */
  router.get('/', async (req, res) => {
    try {
      const client = await connectDB();
      const result = await client.query(`
        SELECT 
          u.id, u.phone, u.name, u.email, u.is_active, 
          u.created_at, u.last_login_at,
          COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles,
          -- 👈 Подсчет клиентов и приёмов
          (SELECT COUNT(*) FROM appt_clients c WHERE c.master_id = u.id) AS clients_count,
          (SELECT COUNT(*) FROM appointments a WHERE a.master_id = u.id) AS appointments_count
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      
      res.json({ success: true, users: result.rows });
    } catch (err) {
      console.error('[GET /api/admin/users] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * GET /api/admin/users/pending — ожидающие подтверждения
   */
  router.get('/pending', async (req, res) => {
    try {
      const client = await connectDB();
      const result = await client.query(`
        SELECT id, phone, name, email, created_at
        FROM users
        WHERE is_active = false
        ORDER BY created_at ASC
      `);
      
      res.json({ success: true, users: result.rows });
    } catch (err) {
      console.error('[GET /api/admin/users/pending] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * POST /api/admin/users/:id/approve — подтвердить + назначить роли
   */
  router.post('/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { roles = [] } = req.body;
    
    // Проверка ролей
    const invalidRoles = roles.filter(r => !SUPPORTED_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ success: false, error: 'Невалидные роли: ' + invalidRoles.join(', ') });
    }
    
    try {
      const client = await connectDB();
      
      await client.query('BEGIN');
      
      // Активируем
      const result = await client.query(
        'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }
      
      // Удаляем старые роли (если есть) и назначаем новые
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      for (const role of roles) {
        await client.query(
          'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
          [id, role]
        );
      }
      
      // 👈 АВТОМАТИЧЕСКАЯ ВЫДАЧА VISITOR
      if (roles.includes('appointments')) {
        const specCheck = await client.query(
          `SELECT * FROM appt_master_specializations WHERE master_id = $1 AND specialization_code = 'visitor'`,
          [id]
        );
        if (specCheck.rowCount === 0) {
          await client.query(
            `INSERT INTO appt_master_specializations (master_id, specialization_code) VALUES ($1, 'visitor')`,
            [id]
          );
        }
      }

      await client.query('COMMIT');
      
      res.json({ success: true, message: 'Пользователь подтверждён' });
    } catch (err) {
      console.error('[POST /api/admin/users/:id/approve] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * POST /api/admin/users/:id/reject — отклонить (удалить)
   */
  router.post('/:id/reject', async (req, res) => {
    try {
      const client = await connectDB();
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }
      
      res.json({ success: true, message: 'Пользователь отклонён и удалён' });
    } catch (err) {
      console.error('[POST /api/admin/users/:id/reject] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * PUT /api/admin/users/:id/roles — изменить роли
   */
  router.put('/:id/roles', async (req, res) => {
    const { id } = req.params;
    const { roles = [] } = req.body;
    
    const invalidRoles = roles.filter(r => !SUPPORTED_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ success: false, error: 'Невалидные роли: ' + invalidRoles.join(', ') });
    }
    
    try {
      const client = await connectDB();
      
      await client.query('BEGIN');
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      for (const role of roles) {
        await client.query(
          'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
          [id, role]
        );
      }
      
      // 👈 АВТОМАТИЧЕСКАЯ ВЫДАЧА VISITOR
      if (roles.includes('appointments')) {
        const specCheck = await client.query(
          `SELECT * FROM appt_master_specializations WHERE master_id = $1 AND specialization_code = 'visitor'`,
          [id]
        );
        if (specCheck.rowCount === 0) {
          await client.query(
            `INSERT INTO appt_master_specializations (master_id, specialization_code) VALUES ($1, 'visitor')`,
            [id]
          );
        }
      }

      await client.query('COMMIT');
      
      res.json({ success: true, message: 'Роли обновлены' });
    } catch (err) {
      console.error('[PUT /api/admin/users/:id/roles] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * POST /api/admin/users/:id/reset-password — сбросить пароль
   */
  router.post('/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Пароль должен быть минимум 8 символов' });
    }
    
    try {
      const client = await connectDB();
      const hash = await hashPassword(newPassword);
      
      const result = await client.query(
        'UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2 RETURNING id',
        [hash, id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }
      
      // Удаляем все сессии (разлогиниваем)
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
      
      res.json({ success: true, message: 'Пароль сброшен' });
    } catch (err) {
      console.error('[POST /api/admin/users/:id/reset-password] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  /**
   * DELETE /api/admin/users/:id — удалить пользователя
   */
  router.delete('/:id', async (req, res) => {
    try {
      const client = await connectDB();
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }
      
      res.json({ success: true, message: 'Пользователь удалён' });
    } catch (err) {
      console.error('[DELETE /api/admin/users/:id] Error:', err.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
    /**
   * GET /api/admin/users/:id/activity — детальный отчет об активности
   */
  router.get('/:id/activity', async (req, res) => {
    const { id } = req.params;
    const client = await connectDB();

    try {
      // 1. Основная инфа о юзере и последний логин
      const userRes = await client.query('SELECT name, phone, last_login_at, created_at FROM users WHERE id = $1', [id]);
      if (userRes.rowCount === 0) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      
      // 2. Специализации
      const specsRes = await client.query(
        `SELECT s.name FROM appt_master_specializations ms
         JOIN appt_specializations s ON s.code = ms.specialization_code
         WHERE ms.master_id = $1`, [id]
      );

      // 3. Услуги (сгруппированные по специализациям)
      const servRes = await client.query(
        `SELECT specialization_code, COUNT(*) as count 
         FROM appt_services WHERE master_id = $1 
         GROUP BY specialization_code`, [id]
      );

      // 4. Клиенты: общее кол-во, первый/последний, и источники
      const clientsRes = await client.query(
        `SELECT 
           COUNT(*) as total,
           MIN(created_at) as first_client,
           MAX(created_at) as last_client
         FROM appt_clients WHERE master_id = $1`, [id]
      );
      
      const sourcesRes = await client.query(
        `SELECT COALESCE(src.name, 'Не указан') as source_name, COUNT(c.id) as count
         FROM appt_clients c
         LEFT JOIN appt_sources src ON src.id = c.source_id
         WHERE c.master_id = $1
         GROUP BY src.name`, [id]
      );

      // 5. Приёмы по статусам
      const apptsRes = await client.query(
        `SELECT status, COUNT(*) as count 
         FROM appointments WHERE master_id = $1 
         GROUP BY status`, [id]
      );

      // 6. Логи авторизации (последние 10)
      const authLogsRes = await client.query(
        `SELECT action, status, created_at, ip_address, details 
         FROM auth_logs WHERE phone = $1 
         ORDER BY created_at DESC LIMIT 10`, [userRes.rows[0].phone]
      );

      // 7. Сессии (последние 5)
      const sessionsRes = await client.query(
        `SELECT user_agent, ip_address, created_at, expires_at 
         FROM user_sessions WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT 5`, [id]
      );

      // 8. demo_requests (если есть такая таблица)
      // 👈 Если таблицы demo_requests нет, этот блок можно удалить
      let demoRequests = [];
      try {
        const demoRes = await client.query(
          `SELECT * FROM demo_requests WHERE user_id = $1 OR phone = $2 ORDER BY created_at DESC LIMIT 5`, 
          [id, userRes.rows[0].phone]
        );
        demoRequests = demoRes.rows;
      } catch (e) {
        console.log('Таблица demo_requests не найдена или другая структура');
      }

      // 9. user_settings
      let settings = null;
      try {
        const settingsRes = await client.query(
          `SELECT * FROM user_settings WHERE user_id = $1`, [id]
        );
        if (settingsRes.rowCount > 0) settings = settingsRes.rows[0];
      } catch (e) {
        console.log('Таблица user_settings не найдена');
      }

      res.json({
        success: true,
        data: {
          user: userRes.rows[0],
          specs: specsRes.rows.map(r => r.name),
          services: servRes.rows,
          clients: {
            ...clientsRes.rows[0],
            sources: sourcesRes.rows
          },
          appointments: apptsRes.rows,
          authLogs: authLogsRes.rows,
          sessions: sessionsRes.rows,
          demoRequests,
          settings
        }
      });
    } catch (error) {
      console.error('[ERROR] GET /api/admin/users/:id/activity:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });


module.exports = router;