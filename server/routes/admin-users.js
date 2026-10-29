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
          COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
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
  
  
module.exports = router;