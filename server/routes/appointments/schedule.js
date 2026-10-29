// server/routes/appointments/schedule.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Доступ только для тех, кто ведет приёмы
router.use(requireAuth, requireRole('admin', 'appointments'));

// GET /api/appt/schedule?date=YYYY-MM-DD — получить список приёмов на день
router.get('/', async (req, res) => {
  const client = await connectDB();
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, error: 'Параметр date обязателен' });
  }

  try {
    const result = await client.query(
      `SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        s.name as service_name,
        l.name as location_name
       FROM appointments a
       LEFT JOIN appt_clients c ON c.id = a.client_id
       LEFT JOIN appt_services s ON s.id = a.service_id
       LEFT JOIN appt_locations l ON l.id = a.location_id
       WHERE a.master_id = $1 
         AND DATE(a.appointment_date) = $2
         AND a.status != 'canceled'
       ORDER BY a.appointment_date ASC`,
      [req.user.id, date]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/schedule:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/appt/schedule/list — получить список всех приёмов с фильтрами
// ВАЖНО: Этот маршрут должен быть ДО маршрута /:id, чтобы слово "list" не воспринималось как ID
router.get('/list', async (req, res) => {
  const client = await connectDB();
  try {
    const { startDate, endDate, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT a.*, 
             c.name as client_name, c.phone as client_phone,
             s.name as service_name,
             l.name as location_name
      FROM appointments a
      LEFT JOIN appt_clients c ON c.id = a.client_id
      LEFT JOIN appt_services s ON s.id = a.service_id
      LEFT JOIN appt_locations l ON l.id = a.location_id
      WHERE a.master_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND a.appointment_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND a.appointment_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Считаем общее количество для пагинации
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS filtered`;
    const countResult = await client.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Добавляем сортировку и пагинацию
    query += ` ORDER BY a.appointment_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: totalCount
    });
  } catch (err) {
    console.error('Error fetching appointments list:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/appt/schedule — создать новый приём (запись)
router.post('/', async (req, res) => {
  const client = await connectDB();
  const { 
    client_id, 
    service_id, 
    location_id, 
    appointment_date,
    duration_minutes,
    buffer_before_minutes,
    buffer_after_minutes,
    base_price,
    discount_amount,
    final_price,
    notes
  } = req.body;

  if (!appointment_date || !service_id) {
    return res.status(400).json({ success: false, error: 'Дата и услуга обязательны' });
  }

  try {
    await client.query('BEGIN');

    // 1. Рассчитываем время блокировки (с учетом буферов)
    const startTime = new Date(appointment_date);
    const blockStart = new Date(startTime.getTime() - (buffer_before_minutes || 0) * 60000);
    const endTime = new Date(startTime.getTime() + (duration_minutes || 60) * 60000);
    const blockEnd = new Date(endTime.getTime() + (buffer_after_minutes || 0) * 60000);

    // 2. ПРОВЕРКА НАКЛАДОК
    const conflictCheck = await client.query(
      `SELECT id, appointment_date, duration_minutes, buffer_before_minutes, buffer_after_minutes
       FROM appointments
       WHERE master_id = $1 
         AND DATE(appointment_date) = DATE($2)
         AND status != 'canceled'`,
      [req.user.id, appointment_date]
    );

    for (const existing of conflictCheck.rows) {
      const exStart = new Date(existing.appointment_date);
      const exBlockStart = new Date(exStart.getTime() - (existing.buffer_before_minutes || 0) * 60000);
      const exEnd = new Date(exStart.getTime() + (existing.duration_minutes || 60) * 60000);
      const exBlockEnd = new Date(exEnd.getTime() + (existing.buffer_after_minutes || 0) * 60000);

      if (blockStart < exBlockEnd && blockEnd > exBlockStart) {
        await client.query('ROLLBACK');
        
        const exEnd = new Date(new Date(existing.appointment_date).getTime() + (existing.duration_minutes || 60) * 60000);
        const exEndStr = exEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Считаем минимально возможное время старта для текущего сеанса
        // Конец предыдущего + буфер после предыдущего + буфер до текущего
        const minStartTime = new Date(exEnd.getTime() + ((existing.buffer_after_minutes || 0) + (buffer_before_minutes || 0)) * 60000);
        const minStartStr = minStartTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        return res.status(409).json({ 
          success: false, 
          error: `Накладка! Предыдущий сеанс заканчивается в ${exEndStr} + ${existing.buffer_after_minutes || 0} мин. на дорогу и ${buffer_before_minutes || 0} мин. на подготовку к этому сеансу. Вы можете начать этот приём не ранее чем в ${minStartStr}.` 
        });
      }
    }

    // 3. Создаем приём
    const result = await client.query(
      `INSERT INTO appointments 
       (master_id, client_id, service_id, location_id, appointment_date, 
        duration_minutes, buffer_before_minutes, buffer_after_minutes, 
        base_price, discount_amount, final_price, general_notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled') 
       RETURNING *`,
      [
        req.user.id, client_id, service_id, location_id, appointment_date,
        duration_minutes, 
        buffer_before_minutes || 0, 
        buffer_after_minutes || 0,
        base_price, discount_amount || 0, 
        final_price, notes || null
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] POST /api/appt/schedule:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/appt/schedule/:id — получить детали одного приёма
router.get('/:id', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(
      `SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        s.name as service_name,
        l.name as location_name
       FROM appointments a
       LEFT JOIN appt_clients c ON c.id = a.client_id
       LEFT JOIN appt_services s ON s.id = a.service_id
       LEFT JOIN appt_locations l ON l.id = a.location_id
       WHERE a.id = $1 AND a.master_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Приём не найден' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/appt/schedule/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/appt/schedule/:id — обновить приём (полностью)
router.put('/:id', async (req, res) => {
  const client = await connectDB();
  const { 
    client_id, service_id, location_id, appointment_date,
    duration_minutes, buffer_before_minutes, buffer_after_minutes,
    base_price, discount_amount, final_price, status, general_notes, notes // notes для совместимости
  } = req.body;

  try {
    await client.query('BEGIN');

    // Проверка накладок (исключая текущий приём)
    if (appointment_date) {
      const startTime = new Date(appointment_date);
      const blockStart = new Date(startTime.getTime() - (buffer_before_minutes || 0) * 60000);
      const endTime = new Date(startTime.getTime() + (duration_minutes || 60) * 60000);
      const blockEnd = new Date(endTime.getTime() + (buffer_after_minutes || 0) * 60000);

      const conflictCheck = await client.query(
        `SELECT id, appointment_date, duration_minutes, buffer_before_minutes, buffer_after_minutes
         FROM appointments
         WHERE master_id = $1 
           AND DATE(appointment_date) = DATE($2)
           AND status != 'canceled'
           AND id != $3`,
        [req.user.id, appointment_date, req.params.id]
      );

      for (const existing of conflictCheck.rows) {
        const exStart = new Date(existing.appointment_date);
        const exBlockStart = new Date(exStart.getTime() - (existing.buffer_before_minutes || 0) * 60000);
        const exEnd = new Date(exStart.getTime() + (existing.duration_minutes || 60) * 60000);
        const exBlockEnd = new Date(exEnd.getTime() + (existing.buffer_after_minutes || 0) * 60000);

        if (blockStart < exBlockEnd && blockEnd > exBlockStart) {
          await client.query('ROLLBACK');
          const exEndStr = exEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const minStartTime = new Date(exEnd.getTime() + ((existing.buffer_after_minutes || 0) + (buffer_before_minutes || 0)) * 60000);
          const minStartStr = minStartTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

          return res.status(409).json({ 
            success: false, 
            error: `Накладка! Предыдущий сеанс заканчивается в ${exEndStr} + буферы. Вы можете начать этот приём не ранее чем в ${minStartStr}.` 
          });
        }
      }
    }

    // Обновляем ВСЕ поля
    const result = await client.query(
      `UPDATE appointments 
       SET client_id = $1, service_id = $2, location_id = $3, appointment_date = $4,
           duration_minutes = $5, buffer_before_minutes = $6, buffer_after_minutes = $7,
           base_price = $8, discount_amount = $9, final_price = $10,
           status = $11, general_notes = $12, updated_at = NOW()
       WHERE id = $13 AND master_id = $14 RETURNING *`,
      [
        client_id || null, service_id, location_id || null, appointment_date,
        duration_minutes || 60, buffer_before_minutes || 0, buffer_after_minutes || 0,
        base_price || 0, discount_amount || 0, final_price || 0,
        status || 'scheduled', general_notes || '', req.params.id, req.user.id
      ]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Приём не найден' });
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/appt/schedule/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;