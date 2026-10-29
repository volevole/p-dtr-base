// server/routes/appointments/specializations.js
const express = require('express');
const router = express.Router();
const { connectDB } = require('../../db'); // Обратите внимание на два уровня вверх (../../)
const { requireAuth } = require('../../middleware/auth');

// GET /api/appt/specializations — глобальный справочник специализаций
router.get('/specializations', requireAuth, async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query('SELECT code, name FROM appt_specializations ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/appt/my-specializations — специализации текущего мастера
router.get('/my-specializations', requireAuth, async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(
      'SELECT specialization_code FROM appt_master_specializations WHERE master_id = $1',
      [req.user.id]
    );
    const codes = result.rows.map(r => r.specialization_code);
    res.json({ success: true, data: codes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/appt/my-specializations — сохранить специализации мастера
router.put('/my-specializations', requireAuth, async (req, res) => {
  const client = await connectDB();
  const { codes } = req.body; 

  if (!Array.isArray(codes)) {
    return res.status(400).json({ success: false, error: 'codes должен быть массивом' });
  }

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM appt_master_specializations WHERE master_id = $1', [req.user.id]);
    
    for (const code of codes) {
      await client.query(
        'INSERT INTO appt_master_specializations (master_id, specialization_code) VALUES ($1, $2)',
        [req.user.id, code]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Специализации сохранены' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;