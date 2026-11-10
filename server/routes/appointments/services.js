// server/routes/appointments/services.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Доступ только для тех, кто ведет приёмы (админ и мастера)
router.use(requireAuth, requireRole('admin', 'appointments'));

// --- УСЛУГИ ---

// GET /api/appt/services — список услуг мастера
router.get('/services', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(
      // 👈 Выбираем услуги мастера ИЛИ глобальные (системные)
      'SELECT * FROM appt_services WHERE master_id = $1 OR master_id IS NULL ORDER BY name',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/services:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/appt/services — создать услугу
router.post('/services', async (req, res) => {
  const client = await connectDB();
  const { name, specialization_code, default_duration_minutes, default_price } = req.body;
  
  if (!name || !specialization_code) {
    return res.status(400).json({ success: false, error: 'Название и специализация обязательны' });
  }

  try {
    const result = await client.query(
      `INSERT INTO appt_services (master_id, name, specialization_code, default_duration_minutes, default_price) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, name, specialization_code, default_duration_minutes || 60, default_price || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] POST /api/appt/services:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/appt/services/:id — обновить услугу
router.put('/services/:id', async (req, res) => {
  const client = await connectDB();
  const { name, specialization_code, default_duration_minutes, default_price } = req.body;
  try {
    // 👈 Проверяем, кому принадлежит услуга
    const check = await client.query('SELECT master_id FROM appt_services WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Услуга не найдена' });
    
    // Если услуга глобальная (master_id IS NULL), редактировать может только админ
    if (check.rows[0].master_id === null && !req.user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Системные услуги может редактировать только администратор' });
    }

    // Если это личная услуга, проверяем, что она принадлежит текущему мастеру
    if (check.rows[0].master_id !== null && check.rows[0].master_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Вы не можете редактировать чужую услугу' });
    }

    const result = await client.query(
      `UPDATE appt_services 
       SET name = $1, specialization_code = $2, default_duration_minutes = $3, default_price = $4 
       WHERE id = $5 RETURNING *`,
      [name, specialization_code, default_duration_minutes, default_price, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] PUT /api/appt/services/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// DELETE /api/appt/services/:id — удалить услугу
router.delete('/services/:id', async (req, res) => {
  const client = await connectDB();
  try {
    // 👈 Проверяем, кому принадлежит услуга
    const check = await client.query('SELECT master_id FROM appt_services WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Услуга не найдена' });
    
    if (check.rows[0].master_id === null) {
      return res.status(403).json({ success: false, error: 'Системные услуги нельзя удалять' });
    }
    if (check.rows[0].master_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Вы не можете удалять чужую услугу' });
    }

    await client.query('DELETE FROM appt_services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] DELETE /api/appt/services/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- МЕСТА ПРИЁМА ---

// GET /api/appt/locations — список мест
router.get('/locations', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(
      // 👈 Выбираем места мастера ИЛИ глобальные
      'SELECT * FROM appt_locations WHERE master_id = $1 OR master_id IS NULL ORDER BY name',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/locations:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/appt/locations — создать место
router.post('/locations', async (req, res) => {
  const client = await connectDB();
  const { name, address, description, buffer_before_minutes, buffer_after_minutes } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, error: 'Название места обязательно' });
  }

  try {
    const result = await client.query(
      `INSERT INTO appt_locations (master_id, name, address, description, buffer_before_minutes, buffer_after_minutes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, address || '', description || '', buffer_before_minutes || 0, buffer_after_minutes || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] POST /api/appt/locations:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// PUT /api/appt/locations/:id — обновить место
router.put('/locations/:id', async (req, res) => {
  const client = await connectDB();
  const { name, address, description, buffer_before_minutes, buffer_after_minutes } = req.body;
  try {
    const check = await client.query('SELECT master_id FROM appt_locations WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Место не найдено' });
    
    if (check.rows[0].master_id === null && !req.user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Системные места может редактировать только администратор' });
    }
    if (check.rows[0].master_id !== null && check.rows[0].master_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Вы не можете редактировать чужое место' });
    }

    const result = await client.query(
      `UPDATE appt_locations 
       SET name = $1, address = $2, description = $3, buffer_before_minutes = $4, buffer_after_minutes = $5 
       WHERE id = $6 RETURNING *`,
      [name, address, description, buffer_before_minutes, buffer_after_minutes, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] PUT /api/appt/locations/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/appt/locations/:id — удалить место
router.delete('/locations/:id', async (req, res) => {
  const client = await connectDB();
  try {
    const check = await client.query('SELECT master_id FROM appt_locations WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Место не найдено' });
    
    if (check.rows[0].master_id === null) {
      return res.status(403).json({ success: false, error: 'Системные места нельзя удалять' });
    }
    if (check.rows[0].master_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Вы не можете удалять чужое место' });
    }

    await client.query('DELETE FROM appt_locations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] DELETE /api/appt/locations/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// КЛИЕНТЫ (переехали сюда из clients.js)
// ============================================================

// GET /api/appt/clients — список клиентов мастера
router.get('/clients', async (req, res) => {
  const client = await connectDB();
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM appt_clients WHERE master_id = $1';
    const params = [req.user.id];

    if (search) {
      query += ' AND (name ILIKE $2 OR phone ILIKE $2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';
    
    const result = await client.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/clients:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/appt/clients — создать клиента
router.post('/clients', async (req, res) => {
  const client = await connectDB();
  // 👈 Добавили source_id в деструктуризацию
  const { name, phone, email, birthday, gender, address, notes, extra_data, source_id, children_info } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Имя клиента обязательно' });
  }

  try {
    const result = await client.query(
        `INSERT INTO appt_clients 
        (master_id, name, phone, email, birthday, gender, address, notes, extra_data, source_id, children_info) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [req.user.id, name, phone || null, email || null, birthday || null, gender || null, address || null, notes || null, extra_data || {}, source_id || null, children_info || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] POST /api/appt/clients:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/appt/clients/:id — обновить клиента
router.put('/clients/:id', async (req, res) => {
  const client = await connectDB();
  // 👈 Добавили source_id в деструктуризацию
  const { name, phone, email, birthday, gender, address, notes, extra_data, source_id, children_info } = req.body;


  try {
    const result = await client.query(
        `UPDATE appt_clients 
        SET name = $1, phone = $2, email = $3, birthday = $4, gender = $5, address = $6, notes = $7, extra_data = $8, source_id = $9, children_info = $10 
        WHERE id = $11 AND master_id = $12 RETURNING *`,
        [name, phone || null, email || null, birthday || null, gender || null, address || null, notes || null, extra_data || {}, source_id || null, children_info || null, req.params.id, req.user.id]
    );
    
    // Если запись не найдена (например, чужой клиент)
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] PUT /api/appt/clients/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/appt/clients/:id — удалить клиента
router.delete('/clients/:id', async (req, res) => {
  const client = await connectDB();
  try {
    await client.query('DELETE FROM appt_clients WHERE id = $1 AND master_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] DELETE /api/appt/clients/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/appt/sources — получить список источников (общие + личные мастера)
router.get('/sources', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(
      `SELECT id, name FROM appt_sources 
       WHERE master_id IS NULL OR master_id = $1 
       ORDER BY name ASC`, 
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/sources:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;