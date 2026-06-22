// server.js
// 1. Импорты
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch').default;
const cors = require('cors');
const { exec } = require('child_process');

// 2. Инициализация
const app = express();

// ========== НОВЫЙ КОД ДЛЯ РАБОТЫ С POSTGRESQL НА REG.RU ==========
const { Client } = require('pg');
let db = null;
let queryQueue = [];
let isProcessing = false;

// Поддерживаемые типы сущностей (единый источник истины)
  const SUPPORTED_ENTITIES = [
    'muscle', 
    'organ', 
    'meridian', 
    'dysfunction', 
    'muscle_group', 
    'receptor', 
    'receptor_class', 
    'tool', 
    'entry', 
    'usefulness'
  ];


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
      host: '194.226.165.244',
      port: 5432,
      database: 'p-dtr-db',
      user: 'pdtr_admin',
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

// ========== КОНЕЦ НОВОГО КОДА ==========


// 3. Middleware
app.use(express.json());


// Настройка CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://p-dtr-base.onrender.com',
    'https://larchik-p-dtr.vercel.app',         // Ваш основной фронтенд
    'https://*.vercel.app',                     // Все Vercel домены
    /\.vercel\.app$/,                           // Регулярка для всех vercel.app поддоменов
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 часа кэширования preflight
};

app.use(cors(corsOptions));

// Обработка preflight запросов для всех API endpoints
//app.options('*', cors(corsOptions));  // ? Это обработает ВСЕ OPTIONS запросы

// app.use(express.urlencoded({ extended: true }));
 app.use([
  '/api/dysfunctions',
  '/api/meridians',
  '/api/muscles',
  '/api/organs',
  '/api/groups',
  '/api/entries',
  '/api/tools',
  '/api/receptors',
  '/api/functions',
  '/api/nerves',
  '/api/usefulness',
  '/api/vertebrae'
], express.urlencoded({ extended: true }));

// 4. Multer middleware
const upload = multer({ storage: multer.memoryStorage() });


// ========== МЫШЦЫ ==========

// Эндпоинт для получения списка мышц с обогащёнными данными
app.get('/api/muscles', async (req, res) => {
  try {
    const client = await connectDB();

    // 1. Получаем список мышц (сортировка по display_order)
    const musclesQuery = `
      SELECT * FROM muscles ORDER BY display_order NULLS LAST, name_ru
    `;
    const musclesResult = await client.query(musclesQuery);
    const muscles = musclesResult.rows;

    if (muscles.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const muscleIds = muscles.map(m => m.id);

    // 2. Загружаем все связанные данные одним запросом
    const [
      merLinks,
      orgLinks,
      dysfunctionsData,
      groupMemberships,
      groupDysfunctions
    ] = await Promise.all([
      client.query(`SELECT muscle_id, meridians.name FROM muscle_meridians JOIN meridians ON muscle_meridians.meridian_id = meridians.id`),
      client.query(`SELECT muscle_id, organs.name FROM muscle_organs JOIN organs ON muscle_organs.organ_id = organs.id`),
      client.query(`SELECT muscle_id, dysfunction_id FROM muscle_dysfunctions`),
      client.query(`SELECT muscle_id, muscle_groups.id FROM muscle_group_membership JOIN muscle_groups ON muscle_group_membership.group_id = muscle_groups.id`),
      client.query(`SELECT group_id, dysfunction_id FROM muscle_group_dysfunctions`)
    ]);

    // 3. Преобразуем результаты в удобные для JS карты (делаем на бэкенде)
    const muscleDysfunctionsMap = {};
    dysfunctionsData.rows.forEach(row => {
      muscleDysfunctionsMap[row.muscle_id] = (muscleDysfunctionsMap[row.muscle_id] || 0) + 1;
    });

    const groupDysfunctionsMap = {};
    groupDysfunctions.rows.forEach(row => {
      groupDysfunctionsMap[row.group_id] = (groupDysfunctionsMap[row.group_id] || 0) + 1;
    });

    const muscleGroupsMap = {};
    groupMemberships.rows.forEach(row => {
      if (!muscleGroupsMap[row.muscle_id]) {
        muscleGroupsMap[row.muscle_id] = [];
      }
      muscleGroupsMap[row.muscle_id].push(row.id);
    });

    // 4. Обогащаем мышцы (всё та же логика, но на сервере)
    const enriched = muscles.map(muscle => {
      const groupDysfunctionsCount = (muscleGroupsMap[muscle.id] || []).reduce((sum, groupId) => {
        return sum + (groupDysfunctionsMap[groupId] || 0);
      }, 0);

      return {
        ...muscle,
        meridians: merLinks.rows.filter(r => r.muscle_id === muscle.id).map(r => r.name),
        organs: orgLinks.rows.filter(r => r.muscle_id === muscle.id).map(r => r.name),
        dysfunctionsCount: (muscleDysfunctionsMap[muscle.id] || 0) + groupDysfunctionsCount,
        relatedCount: (
          (merLinks.rows.filter(r => r.muscle_id === muscle.id).length) +
          (orgLinks.rows.filter(r => r.muscle_id === muscle.id).length) +
          ((muscleDysfunctionsMap[muscle.id] || 0) + groupDysfunctionsCount)
        )
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Ошибка в /api/muscles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//  DELETE эндпоинт
app.delete('/api/muscle/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    // Начинаем транзакцию (чтобы откатить при ошибке)
    await client.query('BEGIN');

    // 1. Удаляем связи из всех зависимых таблиц
    const relationTables = [
      'muscle_group_membership',
      'muscle_dysfunctions',
      'muscle_meridians',
      'muscle_organs',
      'muscle_nerves',
      'muscle_vertebrae',
      'muscle_functions'
    ];

    for (const table of relationTables) {
      await client.query(`DELETE FROM ${table} WHERE muscle_id = $1`, [id]);
    }

    // 2. Удаляем саму мышцу
    const result = await client.query('DELETE FROM muscles WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      throw new Error('Muscle not found');
    }

    // Подтверждаем транзакцию
    await client.query('COMMIT');

    res.json({ success: true, message: 'Muscle deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting muscle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST эндпоинт для создания новой мышцы
app.post('/api/muscles', async (req, res) => {
  const client = await connectDB();
  const { name_ru, name_lat, origin, insertion, indicator, pain_zones_text, notes } = req.body;

  try {
    // Получаем максимальный display_order
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM muscles'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    // Вставляем новую мышцу
    const result = await client.query(
      `INSERT INTO muscles 
       (name_ru, name_lat, origin, insertion, indicator, pain_zones_text, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [name_ru || 'Новая мышца', name_lat || '', origin || '', insertion || '', 
       indicator || '', pain_zones_text || '', notes || '', nextOrder]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating muscle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT эндпоинт для обновления мышцы
app.put('/api/muscle/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name_ru, name_lat, origin, insertion, indicator, pain_zones_text, notes } = req.body;

  try {
    const result = await client.query(
      `UPDATE muscles 
       SET name_ru = $1, name_lat = $2, origin = $3, insertion = $4, 
           indicator = $5, pain_zones_text = $6, notes = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id`,
      [name_ru, name_lat, origin, insertion, indicator, pain_zones_text, notes, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Muscle not found' });
    }

    res.json({ success: true, message: 'Muscle updated successfully' });
  } catch (error) {
    console.error('Error updating muscle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/muscles/reorder — обновление порядка мышц
app.put('/api/muscles/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }

  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE muscles SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering muscles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/muscle/:id/copy — копирование мышцы
app.post('/api/muscle/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    await client.query('BEGIN');

    // 1. Получаем оригинальную мышцу
    const originalResult = await client.query('SELECT * FROM muscles WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Muscle not found' });
    }
    const original = originalResult.rows[0];

    // 2. Получаем следующий display_order
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM muscles'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    // 3. Вставляем копию
    const copyResult = await client.query(
      `INSERT INTO muscles 
       (name_ru, name_lat, origin, insertion, indicator, pain_zones_text, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [`${original.name_ru} (копия)`, original.name_lat, original.origin, original.insertion,
       original.indicator, original.pain_zones_text, original.notes, nextOrder]
    );
    const newId = copyResult.rows[0].id;

    // 4. Копируем связи
    const relationTables = [
      { table: 'muscle_group_membership', foreignKey: 'group_id', hasNote: false },
      { table: 'muscle_dysfunctions', foreignKey: 'dysfunction_id', hasNote: false },
      { table: 'muscle_meridians', foreignKey: 'meridian_id', hasNote: false },
      { table: 'muscle_organs', foreignKey: 'organ_id', hasNote: false },
      { table: 'muscle_nerves', foreignKey: 'nerve_id', hasNote: false },
      { table: 'muscle_vertebrae', foreignKey: 'vertebra_id', hasNote: false },
      { table: 'muscle_functions', foreignKey: 'function_id', hasNote: true }
    ];

    for (const { table, foreignKey, hasNote } of relationTables) {
      const query = hasNote 
        ? `SELECT ${foreignKey}, note FROM ${table} WHERE muscle_id = $1`
        : `SELECT ${foreignKey} FROM ${table} WHERE muscle_id = $1`;
      
      const linksResult = await client.query(query, [id]);
      
      for (const link of linksResult.rows) {
        if (hasNote) {
          await client.query(
            `INSERT INTO ${table} (muscle_id, ${foreignKey}, note) VALUES ($1, $2, $3)`,
            [newId, link[foreignKey], link.note]
          );
        } else {
          await client.query(
            `INSERT INTO ${table} (muscle_id, ${foreignKey}) VALUES ($1, $2)`,
            [newId, link[foreignKey]]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, id: newId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error copying muscle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/muscle/:id/dysfunctions-count - количество дисфункций
app.get('/api/muscle/:id/dysfunctions-count', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    // Прямые дисфункции мышцы
    const muscleResult = await client.query(
      'SELECT COUNT(*) FROM muscle_dysfunctions WHERE muscle_id = $1',
      [id]
    );
    const muscleCount = parseInt(muscleResult.rows[0].count);

    // Дисфункции групп, в которые входит мышца
    const groupsResult = await client.query(
      `SELECT DISTINCT group_id FROM muscle_group_membership WHERE muscle_id = $1`,
      [id]
    );
    const groupIds = groupsResult.rows.map(r => r.group_id);

    let groupCount = 0;
    if (groupIds.length > 0) {
      const groupDysResult = await client.query(
        `SELECT COUNT(*) FROM muscle_group_dysfunctions WHERE group_id = ANY($1)`,
        [groupIds]
      );
      groupCount = parseInt(groupDysResult.rows[0].count);
    }

    res.json({ success: true, count: muscleCount + groupCount });
  } catch (error) {
    console.error('[ERROR] GET /api/muscle/:id/dysfunctions-count:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/muscle/:id/dysfunctions — получить все дисфункции мышцы (прямые + через группы + через взаимоотношения)
app.get('/api/muscle/:id/dysfunctions', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  
  try {
    // 1. Прямые дисфункции мышцы
    const directResult = await client.query(`
      SELECT 
        d.*,
        'direct' as via,
        NULL as group_id,
        NULL as group_name,
        NULL as relationship_id,
        NULL as relationship_name
      FROM dysfunctions d
      JOIN muscle_dysfunctions md ON md.dysfunction_id = d.id
      WHERE md.muscle_id = $1
    `, [id]);
    
    // 2. Группы, в которые входит мышца
    const groupsResult = await client.query(`
      SELECT mg.id, mg.name
      FROM muscle_groups mg
      JOIN muscle_group_membership mgm ON mgm.group_id = mg.id
      WHERE mgm.muscle_id = $1
    `, [id]);
    
    const groupIds = groupsResult.rows.map(r => r.id);
    const groupNames = {};
    groupsResult.rows.forEach(r => { groupNames[r.id] = r.name; });
    
    // 3. Дисфункции групп
    let groupDysfunctions = [];
    if (groupIds.length > 0) {
      const groupResult = await client.query(`
        SELECT 
          d.*,
          'group' as via,
          mgd.group_id,
          NULL as group_name,
          NULL as relationship_id,
          NULL as relationship_name
        FROM dysfunctions d
        JOIN muscle_group_dysfunctions mgd ON mgd.dysfunction_id = d.id
        WHERE mgd.group_id = ANY($1)
      `, [groupIds]);
      groupDysfunctions = groupResult.rows;
    }
    
    // 4. Взаимоотношения, где мышца является синергистом (исправлено!)
    const relationshipsResult = await client.query(`
      SELECT 
        mrs.relationship_id,
        f.name as function_name,
        mr.note
      FROM muscle_relationship_synergists mrs
      JOIN muscle_relationships mr ON mr.id = mrs.relationship_id
      LEFT JOIN functions f ON f.id = mr.function_id
      WHERE mrs.synergist_id = $1
    `, [id]);
    
    // 5. Дисфункции через взаимоотношения
    let relationshipDysfunctions = [];
    if (relationshipsResult.rows.length > 0) {
      const relationshipIds = relationshipsResult.rows.map(r => r.relationship_id);
      
      const relationshipNames = {};
      relationshipsResult.rows.forEach(r => {
        const name = r.function_name && r.note 
          ? `${r.function_name} ${r.note}`.trim()
          : r.note || r.function_name || 'Взаимоотношение';
        relationshipNames[r.relationship_id] = name;
      });
      
      const relResult = await client.query(`
        SELECT 
          d.*,
          'relationship' as via,
          NULL as group_id,
          NULL as group_name,
          sd.relationship_id,
          NULL as relationship_name
        FROM dysfunctions d
        JOIN synergists_dysfunction sd ON sd.dysfunction_id = d.id
        WHERE sd.relationship_id = ANY($1)
      `, [relationshipIds]);
      
      relationshipDysfunctions = relResult.rows.map(d => ({
        ...d,
        relationship_name: relationshipNames[d.relationship_id] || null
      }));
    }
    
    // 6. Объединяем все результаты
    let allDysfunctions = [...directResult.rows, ...groupDysfunctions, ...relationshipDysfunctions];
    
    allDysfunctions = allDysfunctions.map(d => ({
      ...d,
      group_name: d.group_id ? groupNames[d.group_id] || null : null
    }));
    
    // 7. Убираем дубликаты
    const uniqueMap = new Map();
    for (const d of allDysfunctions) {
      if (!uniqueMap.has(d.id)) {
        uniqueMap.set(d.id, d);
      } else {
        const existing = uniqueMap.get(d.id);
        if (d.via === 'direct' && existing.via !== 'direct') {
          uniqueMap.set(d.id, d);
        } else if (d.via === 'group' && existing.via === 'relationship') {
          uniqueMap.set(d.id, d);
        }
      }
    }
    
    const uniqueDysfunctions = Array.from(uniqueMap.values());
    
    res.json({
      success: true,
      data: uniqueDysfunctions,
      count: uniqueDysfunctions.length,
      debug: {
        direct: directResult.rows.length,
        group: groupDysfunctions.length,
        relationship: relationshipDysfunctions.length,
        total: uniqueDysfunctions.length
      }
    });
    
  } catch (error) {
    console.error('[ERROR] GET /api/muscle/:id/dysfunctions:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/muscle/:id/relationships — получить все отношения для мышцы
app.get('/api/muscle/:id/relationships', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    // Получаем все отношения, где мышца участвует как синергист или антагонист
    const result = await client.query(`
      SELECT 
        r.id,
        r.function_id,
        f.name as function_name,
        r.note,
        (
          SELECT json_agg(json_build_object('muscle_id', m.id, 'name_ru', m.name_ru, 'name_lat', m.name_lat, 'display_order', m.display_order))
          FROM muscle_relationship_synergists s
          JOIN muscles m ON m.id = s.synergist_id
          WHERE s.relationship_id = r.id
        ) as synergists,
        (
          SELECT json_agg(json_build_object('muscle_id', m.id, 'name_ru', m.name_ru, 'name_lat', m.name_lat, 'display_order', m.display_order))
          FROM muscle_relationship_antagonists a
          JOIN muscles m ON m.id = a.antagonist_id
          WHERE a.relationship_id = r.id
        ) as antagonists
      FROM muscle_relationships r
      LEFT JOIN functions f ON f.id = r.function_id
      WHERE EXISTS (
        SELECT 1 FROM muscle_relationship_synergists s WHERE s.relationship_id = r.id AND s.synergist_id = $1
        UNION
        SELECT 1 FROM muscle_relationship_antagonists a WHERE a.relationship_id = r.id AND a.antagonist_id = $1
      )
    `, [id]);

    // Обрабатываем NULL как пустые массивы
    const relationships = result.rows.map(row => ({
      ...row,
      synergists: row.synergists || [],
      antagonists: row.antagonists || []
    }));

    res.json({ success: true, data: relationships });
  } catch (error) {
    console.error('[ERROR] GET /api/muscle/:id/relationships:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET эндпоинт для получения одной мышцы
app.get('/api/muscle/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    const result = await client.query('SELECT * FROM muscles WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Muscle not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching muscle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ВЗАИМООТНОШЕНИЯ МЫШЦ ==========

// POST /api/relationships — создать новое отношение
app.post('/api/relationships', async (req, res) => {
  const client = await connectDB();
  const { function_id, note, synergists, antagonists } = req.body;

  if (!function_id) {
    return res.status(400).json({ success: false, error: 'function_id is required' });
  }

  try {
    await client.query('BEGIN');

    // 1. Создаём отношение
    const relResult = await client.query(
      `INSERT INTO muscle_relationships (function_id, note) VALUES ($1, $2) RETURNING id`,
      [function_id, note || null]
    );
    const relationshipId = relResult.rows[0].id;

    // 2. Добавляем синергистов
    if (synergists && synergists.length > 0) {
      for (const synergistId of synergists) {
        await client.query(
          `INSERT INTO muscle_relationship_synergists (relationship_id, synergist_id) VALUES ($1, $2)`,
          [relationshipId, synergistId]
        );
      }
    }

    // 3. Добавляем антагонистов
    if (antagonists && antagonists.length > 0) {
      for (const antagonistId of antagonists) {
        await client.query(
          `INSERT INTO muscle_relationship_antagonists (relationship_id, antagonist_id) VALUES ($1, $2)`,
          [relationshipId, antagonistId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, id: relationshipId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] POST /api/relationships:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/relationships/:id — обновить отношение
app.put('/api/relationships/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { function_id, note, synergists, antagonists } = req.body;

  try {
    await client.query('BEGIN');

    // 1. Обновляем основную информацию
    await client.query(
      `UPDATE muscle_relationships SET function_id = $1, note = $2, updated_at = NOW() WHERE id = $3`,
      [function_id, note || null, id]
    );

    // 2. Обновляем синергистов
    await client.query(`DELETE FROM muscle_relationship_synergists WHERE relationship_id = $1`, [id]);
    if (synergists && synergists.length > 0) {
      for (const synergistId of synergists) {
        await client.query(
          `INSERT INTO muscle_relationship_synergists (relationship_id, synergist_id) VALUES ($1, $2)`,
          [id, synergistId]
        );
      }
    }

    // 3. Обновляем антагонистов
    await client.query(`DELETE FROM muscle_relationship_antagonists WHERE relationship_id = $1`, [id]);
    if (antagonists && antagonists.length > 0) {
      for (const antagonistId of antagonists) {
        await client.query(
          `INSERT INTO muscle_relationship_antagonists (relationship_id, antagonist_id) VALUES ($1, $2)`,
          [id, antagonistId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Relationship updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/relationships/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/relationships/:id — удалить отношение
app.delete('/api/relationships/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM muscle_relationship_synergists WHERE relationship_id = $1`, [id]);
    await client.query(`DELETE FROM muscle_relationship_antagonists WHERE relationship_id = $1`, [id]);
    await client.query(`DELETE FROM muscle_relationships WHERE id = $1`, [id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Relationship deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] DELETE /api/relationships/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/relationships — список всех взаимоотношений мышц
app.get('/api/relationships', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT r.*, f.name as function_name
      FROM muscle_relationships r
      LEFT JOIN functions f ON f.id = r.function_id
      ORDER BY r.note
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/relationships:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ГРУППЫ МЫШЦ ==========

// GET /api/groups — список групп с обогащёнными данными
app.get('/api/groups', async (req, res) => {
  const client = await connectDB();

  try {
    const result = await client.query(`
      SELECT g.*, 
             COUNT(DISTINCT gm.muscle_id) AS "muscleCount",
             COUNT(DISTINCT gd.dysfunction_id) AS "dysfunctionCount"
      FROM muscle_groups g
      LEFT JOIN muscle_group_membership gm ON gm.group_id = g.id
      LEFT JOIN muscle_group_dysfunctions gd ON gd.group_id = g.id
      GROUP BY g.id
      ORDER BY g.display_order NULLS LAST, g.name
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/groups:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/group/:id — обновление группы
app.put('/api/group/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, description, type } = req.body;

  try {
    const result = await client.query(
      `UPDATE muscle_groups 
       SET name = $1, description = $2, type = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id`,
      [name, description, type || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    res.json({ success: true, message: 'Group updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/group/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/groups — создание новой группы
app.post('/api/groups', async (req, res) => {
  const client = await connectDB();
  const { name, description, type } = req.body;

  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM muscle_groups'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    // Вставляем NULL для type, если значение не передано или пустая строка
    const typeValue = (type && type.trim() !== '') ? type : null;

    const result = await client.query(
      `INSERT INTO muscle_groups (name, description, type, display_order) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name || 'Новая группа', description || '', typeValue, nextOrder]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/groups:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/group/:id — удаление группы
app.delete('/api/group/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    await client.query('BEGIN');
    
    // Проверяем, есть ли связанные мышцы
    const musclesResult = await client.query(
      'SELECT COUNT(*) FROM muscle_group_membership WHERE group_id = $1',
      [id]
    );
    const muscleCount = parseInt(musclesResult.rows[0].count);

    if (muscleCount > 0) {
      // Удаляем связи с мышцами
      await client.query('DELETE FROM muscle_group_membership WHERE group_id = $1', [id]);
    }

    // Удаляем связи с дисфункциями
    await client.query('DELETE FROM muscle_group_dysfunctions WHERE group_id = $1', [id]);
    
    // Удаляем саму группу
    const result = await client.query('DELETE FROM muscle_groups WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Group deleted successfully', muscleCount });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] DELETE /api/group/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/group/:id/copy — копирование группы
app.post('/api/group/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    // Получаем оригинальную группу
    const originalResult = await client.query('SELECT * FROM muscle_groups WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    const original = originalResult.rows[0];

    // Получаем следующий display_order
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM muscle_groups'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    // Создаём копию
    const copyResult = await client.query(
      `INSERT INTO muscle_groups (name, description, type, display_order) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`${original.name} (копия)`, original.description, original.type, nextOrder]
    );

    res.json({ success: true, id: copyResult.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/group/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/groups/reorder — переупорядочивание групп
app.put('/api/groups/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }

  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE muscle_groups SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/groups/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/group/:id/members — получить ID мышц, входящих в группу
app.get('/api/group/:id/members', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    const result = await client.query(
      'SELECT muscle_id FROM muscle_group_membership WHERE group_id = $1 ORDER BY display_order',
      [id]
    );
    res.json({ success: true, data: result.rows.map(r => r.muscle_id) });
  } catch (error) {
    console.error('[ERROR] GET /api/group/:id/members:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/group/:id/members — обновить состав группы
app.put('/api/group/:id/members', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { muscleIds } = req.body;

  try {
    await client.query('BEGIN');
    
    // Удаляем старые связи
    await client.query('DELETE FROM muscle_group_membership WHERE group_id = $1', [id]);
    
    // Добавляем новые связи
    if (muscleIds && muscleIds.length > 0) {
      for (let i = 0; i < muscleIds.length; i++) {
        await client.query(
          'INSERT INTO muscle_group_membership (group_id, muscle_id, display_order) VALUES ($1, $2, $3)',
          [id, muscleIds[i], i]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Members updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/group/:id/members:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/group/:id — получение одной группы
app.get('/api/group/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    const result = await client.query('SELECT * FROM muscle_groups WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/group/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/muscle-groups/:id/muscles — получить полные данные мышц группы
app.get('/api/muscle-groups/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  
  try {
    const result = await client.query(`
      SELECT m.* 
      FROM muscles m
      JOIN muscle_group_membership mgm ON mgm.muscle_id = m.id
      WHERE mgm.group_id = $1
      ORDER BY mgm.display_order NULLS LAST, m.display_order NULLS LAST, m.name_ru
    `, [id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/muscle-groups/:id/muscles:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========== СПРАВОЧНИКИ ========== // Словари (справочные данные)
app.get('/api/dictionaries/groups', async (req, res) => {
  try {
  const client = await connectDB();
  const result = await client.query('SELECT id, name FROM muscle_groups ORDER BY name');
  res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/groups:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/dysfunctions', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, name FROM dysfunctions ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/dysfunctions:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/meridians', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, name, code FROM meridians ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/meridians:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/organs', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, name FROM organs ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/organs:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/nerves', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, name, type FROM nerves ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/nerves:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/functions', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, name FROM functions ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/functions:', error.message);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/dictionaries/vertebrae', async (req, res) => {
  try {
    const client = await connectDB();
    const result = await client.query('SELECT id, code FROM vertebrae ORDER BY code');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] /api/dictionaries/vertebrae:', error.message);
    res.json({ success: true, data: [] });
  }
});
// ========== СВЯЗИ ДЛЯ МЫШЦЫ ==========

app.get('/api/muscle/:id/relations', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;

  try {
    const groups = await client.query('SELECT group_id FROM muscle_group_membership WHERE muscle_id = $1', [id]);
    const dysfunctions = await client.query('SELECT dysfunction_id FROM muscle_dysfunctions WHERE muscle_id = $1', [id]);
    const meridians = await client.query('SELECT meridian_id FROM muscle_meridians WHERE muscle_id = $1', [id]);
    const organs = await client.query('SELECT organ_id FROM muscle_organs WHERE muscle_id = $1', [id]);
    const nerves = await client.query('SELECT nerve_id FROM muscle_nerves WHERE muscle_id = $1', [id]);
    const functions = await client.query('SELECT function_id, note FROM muscle_functions WHERE muscle_id = $1', [id]);
    const vertebrae = await client.query('SELECT vertebra_id FROM muscle_vertebrae WHERE muscle_id = $1', [id]);

    res.json({
      success: true,
      data: {
        groups: groups.rows.map(r => r.group_id),
        dysfunctions: dysfunctions.rows.map(r => r.dysfunction_id),
        meridians: meridians.rows.map(r => r.meridian_id),
        organs: organs.rows.map(r => r.organ_id),
        nerves: nerves.rows.map(r => r.nerve_id),
        functions: functions.rows.map(r => ({ id: r.function_id, note: r.note })),
        vertebrae: vertebrae.rows.map(r => r.vertebra_id)
      }
    });
  } catch (error) {
    console.error('Error fetching relations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/muscle/:id/relations', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { groups, dysfunctions, meridians, organs, nerves, functions, vertebrae } = req.body;

  try {
    await client.query('BEGIN');

    // Удаляем старые связи
    await client.query('DELETE FROM muscle_group_membership WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_dysfunctions WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_meridians WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_organs WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_nerves WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_functions WHERE muscle_id = $1', [id]);
    await client.query('DELETE FROM muscle_vertebrae WHERE muscle_id = $1', [id]);

    // Добавляем новые связи
    if (groups?.length) {
      for (const groupId of groups) {
        await client.query('INSERT INTO muscle_group_membership (muscle_id, group_id) VALUES ($1, $2)', [id, groupId]);
      }
    }
    if (dysfunctions?.length) {
      for (const dysfunctionId of dysfunctions) {
        await client.query('INSERT INTO muscle_dysfunctions (muscle_id, dysfunction_id) VALUES ($1, $2)', [id, dysfunctionId]);
      }
    }
    if (meridians?.length) {
      for (const meridianId of meridians) {
        await client.query('INSERT INTO muscle_meridians (muscle_id, meridian_id) VALUES ($1, $2)', [id, meridianId]);
      }
    }
    if (organs?.length) {
      for (const organId of organs) {
        await client.query('INSERT INTO muscle_organs (muscle_id, organ_id) VALUES ($1, $2)', [id, organId]);
      }
    }
    if (nerves?.length) {
      for (const nerveId of nerves) {
        await client.query('INSERT INTO muscle_nerves (muscle_id, nerve_id) VALUES ($1, $2)', [id, nerveId]);
      }
    }
    if (functions?.length) {
      for (const func of functions) {
        await client.query('INSERT INTO muscle_functions (muscle_id, function_id, note) VALUES ($1, $2, $3)', [id, func.id, func.note]);
      }
    }
    if (vertebrae?.length) {
      for (const vertebraId of vertebrae) {
        await client.query('INSERT INTO muscle_vertebrae (muscle_id, vertebra_id) VALUES ($1, $2)', [id, vertebraId]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Relations updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating relations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РЕЦЕПТОРЫ ==========

// GET /api/receptors — список рецепторов
app.get('/api/receptors', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT r.*, rc.name as class_name 
      FROM receptors r
      LEFT JOIN receptor_classes rc ON r.class_id = rc.id
      ORDER BY r.display_order NULLS LAST, r.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/receptors:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// POST /api/receptors — создание рецептора
app.post('/api/receptors', async (req, res) => {
  const client = await connectDB();
  const { name, class_id, location, own_stimulus, antistimulus, description } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM receptors'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO receptors (name, class_id, location, own_stimulus, antistimulus, description, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name || 'Новый рецептор', class_id || null, location || '', own_stimulus || '', antistimulus || '', description || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/receptors:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/receptor/:id — обновление рецептора
app.put('/api/receptors/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, class_id, location, own_stimulus, antistimulus, description, display_order } = req.body;
  try {
    await client.query(
      `UPDATE receptors 
       SET name = $1, class_id = $2, location = $3, own_stimulus = $4, 
           antistimulus = $5, description = $6, display_order = $7, updated_at = NOW()
       WHERE id = $8`,
      [name, class_id || null, location || '', own_stimulus || '', antistimulus || '', description || '', display_order || 0, id]
    );
    res.json({ success: true, message: 'Receptor updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/receptor/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/receptor/:id — удаление рецептора
app.delete('/api/receptors/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM receptors WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Receptor not found' });
    }
    res.json({ success: true, message: 'Receptor deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/receptor/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/receptor/:id/copy — копирование рецептора
app.post('/api/receptors/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM receptors WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Receptor not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM receptors'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO receptors (name, class_id, location, own_stimulus, antistimulus, description, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`${original.name} (копия)`, original.class_id, original.location, original.own_stimulus, original.antistimulus, original.description, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/receptor/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/receptors/reorder — переупорядочивание рецепторов
app.put('/api/receptors/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE receptors SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/receptors/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ПАРНЫЕ РЕЦЕПТОРЫ ==========

// GET /api/receptors/:id/pairs — список пар для рецептора
app.get('/api/receptors/:id/pairs', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT 
        rp.*,
        pr.name as paired_receptor_name,
        pc.name as paired_class_name
      FROM receptor_pairs rp
      LEFT JOIN receptors pr ON pr.id = rp.paired_receptor_id
      LEFT JOIN receptor_classes pc ON pc.id = rp.paired_class_id
      WHERE rp.receptor_id = $1
      ORDER BY rp.created_at
    `, [id]);
    
    const pairs = result.rows.map(row => ({
      id: row.id,
      receptor_id: row.receptor_id,
      pair_type: row.pair_type,
      paired_receptor_id: row.paired_receptor_id,
      paired_class_id: row.paired_class_id,
      notes: row.notes,
      created_at: row.created_at,
      paired_receptor: row.paired_receptor_id ? { id: row.paired_receptor_id, name: row.paired_receptor_name } : null,
      paired_class: row.paired_class_id ? { id: row.paired_class_id, name: row.paired_class_name } : null
    }));
    
    res.json({ success: true, data: pairs });
  } catch (error) {
    console.error('[ERROR] GET /api/receptors/:id/pairs:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/receptor-pairs — создание пары
app.post('/api/receptor-pairs', async (req, res) => {
  const client = await connectDB();
  const { receptor_id, pair_type, paired_receptor_id, paired_class_id, notes } = req.body;
  try {
    const result = await client.query(
      `INSERT INTO receptor_pairs (receptor_id, pair_type, paired_receptor_id, paired_class_id, notes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [receptor_id, pair_type, paired_receptor_id || null, paired_class_id || null, notes || null]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/receptor-pairs:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/receptor-pairs/:id — удаление пары
app.delete('/api/receptor-pairs/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    await client.query('DELETE FROM receptor_pairs WHERE id = $1', [id]);
    res.json({ success: true, message: 'Pair deleted' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/receptor-pairs/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/receptor/:id — один рецептор
app.get('/api/receptors/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM receptors WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Receptor not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/receptor/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== КЛАССЫ РЕЦЕПТОРОВ ==========

// PUT /api/receptor-classes/reorder — переупорядочивание классов
app.put('/api/receptor-classes/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE receptor_classes SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/receptor-classes/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/receptor-classes — список классов рецепторов
app.get('/api/receptor-classes', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT rc.*, COUNT(r.id) as receptor_count
      FROM receptor_classes rc
      LEFT JOIN receptors r ON r.class_id = rc.id
      GROUP BY rc.id
      ORDER BY rc.display_order NULLS LAST, rc.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/receptor-classes:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// POST /api/receptor-classes — создание класса рецепторов
app.post('/api/receptor-classes', async (req, res) => {
  const client = await connectDB();
  const { name, description, antistimulus } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM receptor_classes'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO receptor_classes (name, description, antistimulus, display_order) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name || 'Новый класс', description || '', antistimulus || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/receptor-classes:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/receptor-class/:id — обновление класса рецепторов
app.put('/api/receptor-classes/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, description, antistimulus, display_order } = req.body;
  try {
    await client.query(
      `UPDATE receptor_classes 
       SET name = $1, description = $2, antistimulus = $3, display_order = $4, updated_at = NOW()
       WHERE id = $5`,
      [name, description || '', antistimulus || '', display_order || 0, id]
    );
    res.json({ success: true, message: 'Class updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/receptor-class/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/receptor-class/:id — удаление класса рецепторов
app.delete('/api/receptor-classes/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM receptor_classes WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/receptor-class/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/receptor-class/:id/copy — копирование класса рецепторов
app.post('/api/receptor-classes/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM receptor_classes WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM receptor_classes'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO receptor_classes (name, description, antistimulus, display_order) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`${original.name} (копия)`, original.description, original.antistimulus, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/receptor-class/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/receptor-class/:id/receptors — список рецепторов в классе
app.get('/api/receptor-classes/:id/receptors', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(
      'SELECT * FROM receptors WHERE class_id = $1 ORDER BY display_order NULLS LAST, name',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/receptor-class/:id/receptors:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/receptor-class/:id — один класс рецепторов
app.get('/api/receptor-classes/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM receptor_classes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/receptor-class/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ОРГАНЫ ==========

// PUT /api/organs/reorder — переупорядочивание органов
app.put('/api/organs/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE organs SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/organs/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/organs — список органов
app.get('/api/organs', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT o.*, 
             COUNT(mo.muscle_id) as "muscle_organs_count"
      FROM organs o
      LEFT JOIN muscle_organs mo ON mo.organ_id = o.id
      GROUP BY o.id
      ORDER BY o.display_order NULLS LAST, o.name
    `);
    
    // Преобразуем данные для фабрики (ожидает массив muscle_organs)
    const data = result.rows.map(row => ({
      ...row,
      muscle_organs: row.muscle_organs_count > 0 ? [{ muscle_id: null }] : []
    }));
    
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ERROR] GET /api/organs:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/organs — создание органа
app.post('/api/organs', async (req, res) => {
  const client = await connectDB();
  const { name, name_lat, system, description, functions, symptoms, diagnostic, treatment, notes, display_order } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM organs'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO organs (name, name_lat, system, description, functions, symptoms, diagnostic, treatment, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [name || 'Новый орган', name_lat || '', system || '', description || '', 
       functions || '', symptoms || '', diagnostic || '', treatment || '', notes || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/organs:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organs/:id — обновление органа
app.put('/api/organs/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, name_lat, system, description, functions, symptoms, diagnostic, treatment, notes, display_order } = req.body;
  try {
    const result = await client.query(
      `UPDATE organs 
       SET name = $1, name_lat = $2, system = $3, description = $4, 
           functions = $5, symptoms = $6, diagnostic = $7, treatment = $8, 
           notes = $9, display_order = $10, updated_at = NOW()
       WHERE id = $11 RETURNING id`,
      [name, name_lat || '', system || '', description || '', 
       functions || '', symptoms || '', diagnostic || '', treatment || '', 
       notes || '', display_order || 0, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Organ not found' });
    }
    res.json({ success: true, message: 'Organ updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/organs/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/organs/:id — удаление органа
app.delete('/api/organs/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    // Сначала удаляем связи с мышцами
    await client.query('DELETE FROM muscle_organs WHERE organ_id = $1', [id]);
    
    const result = await client.query('DELETE FROM organs WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Organ not found' });
    }
    res.json({ success: true, message: 'Organ deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/organs/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/organs/:id/copy — копирование органа
app.post('/api/organs/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM organs WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Organ not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM organs'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO organs (name, name_lat, system, description, functions, symptoms, diagnostic, treatment, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [`${original.name} (копия)`, original.name_lat, original.system, original.description, 
       original.functions, original.symptoms, original.diagnostic, original.treatment, 
       original.notes, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/organs/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organs/reorder — переупорядочивание органов
app.put('/api/organs/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE organs SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/organs/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/organ/:id/muscles — список мышц, связанных с органом
app.get('/api/organ/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT m.* FROM muscles m
      JOIN muscle_organs mo ON mo.muscle_id = m.id
      WHERE mo.organ_id = $1
      ORDER BY m.display_order NULLS LAST, m.name_ru
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/organ/:id/muscles:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/organs/:id — один орган
app.get('/api/organs/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM organs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Organ not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/organs/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== МЕРИДИАНЫ ==========

// PUT /api/meridians/reorder — переупорядочивание меридианов (ДОЛЖЕН БЫТЬ ПЕРВЫМ)
app.put('/api/meridians/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE meridians SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/meridians/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/meridians — список меридианов
app.get('/api/meridians', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT m.*, 
             COUNT(muscle_meridians.muscle_id) as "muscle_meridians_count"
      FROM meridians m
      LEFT JOIN muscle_meridians ON muscle_meridians.meridian_id = m.id
      GROUP BY m.id
      ORDER BY m.display_order NULLS LAST, m.name
    `);
    
    // Преобразуем данные для фабрики (ожидает массив muscle_meridians)
    const data = result.rows.map(row => ({
      ...row,
      muscle_meridians: row.muscle_meridians_count > 0 ? [{ muscle_id: null }] : []
    }));
    
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ERROR] GET /api/meridians:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/meridians — создание меридиана
app.post('/api/meridians', async (req, res) => {
  const client = await connectDB();
  const { name, name_lat, code, type, description, course, functions, symptoms, notes, display_order } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM meridians'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO meridians (name, name_lat, code, type, description, course, functions, symptoms, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [name || 'Новый меридиан', name_lat || '', code || '', type || '', 
       description || '', course || '', functions || '', symptoms || '', notes || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/meridians:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/meridians/:id — обновление меридиана
app.put('/api/meridians/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, name_lat, code, type, description, course, functions, symptoms, notes, display_order } = req.body;
  try {
    const result = await client.query(
      `UPDATE meridians 
       SET name = $1, name_lat = $2, code = $3, type = $4, description = $5, 
           course = $6, functions = $7, symptoms = $8, notes = $9, 
           display_order = $10, updated_at = NOW()
       WHERE id = $11 RETURNING id`,
      [name, name_lat || '', code || '', type || '', description || '', 
       course || '', functions || '', symptoms || '', notes || '', 
       display_order || 0, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Meridian not found' });
    }
    res.json({ success: true, message: 'Meridian updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/meridians/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/meridians/:id — удаление меридиана
app.delete('/api/meridians/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    // Сначала удаляем связи с мышцами
    await client.query('DELETE FROM muscle_meridians WHERE meridian_id = $1', [id]);
    
    const result = await client.query('DELETE FROM meridians WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Meridian not found' });
    }
    res.json({ success: true, message: 'Meridian deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/meridians/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/meridians/:id/copy — копирование меридиана
app.post('/api/meridians/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM meridians WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Meridian not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM meridians'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    // Генерируем уникальный код для копии
    let copyCode = original.code ? `${original.code}_COPY` : 'COPY';
    
    const result = await client.query(
      `INSERT INTO meridians (name, name_lat, code, type, description, course, functions, symptoms, notes, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [`${original.name} (копия)`, original.name_lat, copyCode, original.type, 
       original.description, original.course, original.functions, original.symptoms, 
       original.notes, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/meridians/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/meridians/:id/muscles — список мышц, связанных с меридианом
app.get('/api/meridians/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT m.* FROM muscles m
      JOIN muscle_meridians mm ON mm.muscle_id = m.id
      WHERE mm.meridian_id = $1
      ORDER BY m.display_order NULLS LAST, m.name_ru
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/meridians/:id/muscles:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/meridians/:id — один меридиан
app.get('/api/meridians/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM meridians WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Meridian not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/meridians/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ДИСФУНКЦИИ ==========

// PUT /api/dysfunctions/reorder — переупорядочивание дисфункций (ДОЛЖЕН БЫТЬ ПЕРВЫМ)
app.put('/api/dysfunctions/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE dysfunctions SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/dysfunctions/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dysfunctions — список дисфункций
app.get('/api/dysfunctions', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT d.*, 
             COUNT(DISTINCT md.muscle_id) as "direct_muscle_count",
             COUNT(DISTINCT mgd.group_id) as "muscle_group_count",
             COUNT(DISTINCT sd.relationship_id) as "relationship_count"
      FROM dysfunctions d
      LEFT JOIN muscle_dysfunctions md ON md.dysfunction_id = d.id
      LEFT JOIN muscle_group_dysfunctions mgd ON mgd.dysfunction_id = d.id
      LEFT JOIN synergists_dysfunction sd ON sd.dysfunction_id = d.id
      GROUP BY d.id
      ORDER BY d.display_order NULLS LAST, d.name
    `);
    
    // Преобразуем данные для фабрики (ожидает массивы связей)
    const data = result.rows.map(row => ({
      ...row,
      muscle_dysfunctions: row.direct_muscle_count > 0 ? [{ muscle_id: null }] : [],
      muscle_group_dysfunctions: row.muscle_group_count > 0 ? [{ group_id: null }] : [],
      synergists_dysfunction: row.relationship_count > 0 ? [{ relationship_id: null }] : []
    }));
    
    console.log(`[API] GET /api/dysfunctions — returned ${data.length} dysfunctions`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ERROR] GET /api/dysfunctions:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dysfunctions — создание дисфункции
app.post('/api/dysfunctions', async (req, res) => {
  const client = await connectDB();
  const { 
    name, description, visual_diagnosis, provocations_text, 
    receptor_1, receptor_2, display_order 
  } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM dysfunctions'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO dysfunctions (name, description, visual_diagnosis, provocations_text, 
                                 receptor_1, receptor_2, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name || 'Новая дисфункция', description || '', visual_diagnosis || '', 
       provocations_text || '', receptor_1 || '', receptor_2 || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/dysfunctions:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/dysfunctions/:id — обновление дисфункции
app.put('/api/dysfunctions/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { 
    name, description, visual_diagnosis, provocations_text, 
    receptor_1, receptor_2, display_order 
  } = req.body;
  try {
    const result = await client.query(
      `UPDATE dysfunctions 
       SET name = $1, description = $2, visual_diagnosis = $3, provocations_text = $4,
           receptor_1 = $5, receptor_2 = $6, display_order = $7, updated_at = NOW()
       WHERE id = $8 RETURNING id`,
      [name || '', description || '', visual_diagnosis || '', 
       provocations_text || '', receptor_1 || '', receptor_2 || '', 
       display_order || 0, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Dysfunction not found' });
    }
    res.json({ success: true, message: 'Dysfunction updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/dysfunctions/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/dysfunctions/:id — удаление дисфункции
app.delete('/api/dysfunctions/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    // Сначала удаляем связи
    await client.query('DELETE FROM muscle_dysfunctions WHERE dysfunction_id = $1', [id]);
    await client.query('DELETE FROM muscle_group_dysfunctions WHERE dysfunction_id = $1', [id]);
    await client.query('DELETE FROM synergists_dysfunction WHERE dysfunction_id = $1', [id]);
    
    const result = await client.query('DELETE FROM dysfunctions WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Dysfunction not found' });
    }
    res.json({ success: true, message: 'Dysfunction deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/dysfunctions/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dysfunctions/:id/copy — копирование дисфункции
app.post('/api/dysfunctions/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM dysfunctions WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Dysfunction not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM dysfunctions'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO dysfunctions (name, description, visual_diagnosis, provocations_text, 
                                 receptor_1, receptor_2, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`${original.name} (копия)`, original.description, original.visual_diagnosis, 
       original.provocations_text, original.receptor_1, original.receptor_2, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/dysfunctions/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dysfunctions/:id/muscles — список мышц, связанных с дисфункцией
app.get('/api/dysfunctions/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT m.* FROM muscles m
      JOIN muscle_dysfunctions md ON md.muscle_id = m.id
      WHERE md.dysfunction_id = $1
      ORDER BY m.display_order NULLS LAST, m.name_ru
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/dysfunctions/:id/muscles:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dysfunctions/:id/muscle-groups — список групп мышц, связанных с дисфункцией
app.get('/api/dysfunctions/:id/muscle-groups', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT mg.* FROM muscle_groups mg
      JOIN muscle_group_dysfunctions mgd ON mgd.group_id = mg.id
      WHERE mgd.dysfunction_id = $1
      ORDER BY mg.name
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/dysfunctions/:id/muscle-groups:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dysfunctions/:id/relationships — список взаимоотношений (синергистов), связанных с дисфункцией
app.get('/api/dysfunctions/:id/relationships', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query(`
      SELECT 
        sr.id,
        sr.note,
        f.name as function_name
      FROM muscle_relationships sr
      JOIN synergists_dysfunction sd ON sd.relationship_id = sr.id
      LEFT JOIN functions f ON f.id = sr.function_id
      WHERE sd.dysfunction_id = $1
      ORDER BY sr.note
    `, [id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/dysfunctions/:id/relationships:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/dysfunctions/:id/muscles — удалить все связи с мышцами
app.delete('/api/dysfunctions/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    await client.query('DELETE FROM muscle_dysfunctions WHERE dysfunction_id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dysfunctions/:id/muscles — добавить связи с мышцами
app.post('/api/dysfunctions/:id/muscles', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { muscleIds } = req.body;
  try {
    for (const muscleId of muscleIds) {
      await client.query('INSERT INTO muscle_dysfunctions (dysfunction_id, muscle_id) VALUES ($1, $2)', [id, muscleId]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dysfunctions/:id — одна дисфункция
app.get('/api/dysfunctions/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM dysfunctions WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Dysfunction not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/dysfunctions/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ИНСТРУМЕНТЫ (TOOLS) ==========

// PUT /api/tools/reorder — переупорядочивание инструментов
app.put('/api/tools/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE tools SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/tools/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tools — список инструментов
app.get('/api/tools', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT * FROM tools ORDER BY display_order NULLS LAST, name
    `);
    
    console.log(`[API] GET /api/tools — returned ${result.rows.length} tools`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/tools:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tools/:id — один инструмент
app.get('/api/tools/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM tools WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Tool not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/tools/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tools — создание инструмента
app.post('/api/tools', async (req, res) => {
  const client = await connectDB();
  const { name, description, display_order } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM tools'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO tools (name, description, display_order) 
       VALUES ($1, $2, $3) RETURNING id`,
      [name || 'Новый инструмент', description || '', nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/tools:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tools/:id — обновление инструмента
app.put('/api/tools/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, description, display_order } = req.body;
  try {
    const result = await client.query(
      `UPDATE tools 
       SET name = $1, description = $2, display_order = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id`,
      [name || '', description || '', display_order || 0, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Tool not found' });
    }
    res.json({ success: true, message: 'Tool updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/tools/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tools/:id — удаление инструмента
app.delete('/api/tools/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM tools WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Tool not found' });
    }
    res.json({ success: true, message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/tools/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tools/:id/copy — копирование инструмента
app.post('/api/tools/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT * FROM tools WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Tool not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM tools'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO tools (name, description, display_order) 
       VALUES ($1, $2, $3) RETURNING id`,
      [`${original.name} (копия)`, original.description, nextOrder]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/tools/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========== ЗАХОДЫ (ENTRIES) ==========

// PUT /api/entries/reorder — переупорядочивание заходов
app.put('/api/entries/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE entries SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/entries/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/entries — список заходов
app.get('/api/entries', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT * FROM entries ORDER BY display_order NULLS LAST, name
    `);
    
    console.log(`[API] GET /api/entries — returned ${result.rows.length} entries`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/entries:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/entries/:id — один заход
app.get('/api/entries/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM entries WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/entries/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/entries — создание захода
app.post('/api/entries', async (req, res) => {
  const client = await connectDB();
  const { name, description, display_order, is_active } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM entries'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO entries (name, description, display_order, is_active, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [name || 'Новый заход', description || '', nextOrder, is_active !== undefined ? is_active : true]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/entries:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/entries/:id — обновление захода
app.put('/api/entries/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, description, display_order, is_active } = req.body;
  try {
    const result = await client.query(
      `UPDATE entries 
       SET name = $1, description = $2, display_order = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 RETURNING id`,
      [name || '', description || '', display_order || 0, is_active !== undefined ? is_active : true, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    res.json({ success: true, message: 'Entry updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/entries/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/entries/:id — удаление захода
app.delete('/api/entries/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM entries WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/entries/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/entries/:id/copy — копирование захода
app.post('/api/entries/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT name, description, is_active FROM entries WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM entries'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO entries (name, description, display_order, is_active, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [`${original.name} (копия)`, original.description, nextOrder, original.is_active]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/entries/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ПОЛЕЗНОСТИ (USEFULNESS) ==========

// PUT /api/usefulness/reorder — переупорядочивание полезностей
app.put('/api/usefulness/reorder', async (req, res) => {
  const client = await connectDB();
  const { orderedIds } = req.body;
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'orderedIds array is required' });
  }
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query('UPDATE usefulness SET display_order = $1 WHERE id = $2', [i, orderedIds[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] PUT /api/usefulness/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/usefulness — список полезностей
app.get('/api/usefulness', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT * FROM usefulness ORDER BY display_order NULLS LAST, name
    `);
    
    console.log(`[API] GET /api/usefulness — returned ${result.rows.length} usefulness items`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/usefulness:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/usefulness — создание полезности
app.post('/api/usefulness', async (req, res) => {
  const client = await connectDB();
  const { name, description, display_order, is_active } = req.body;
  try {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM usefulness'
    );
    const nextOrder = display_order !== undefined ? display_order : maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO usefulness (name, description, display_order, is_active, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [name || 'Новая полезность', description || '', nextOrder, is_active !== undefined ? is_active : true]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/usefulness:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/usefulness/:id — обновление полезности
app.put('/api/usefulness/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { name, description, display_order, is_active } = req.body;
  try {
    const result = await client.query(
      `UPDATE usefulness 
       SET name = $1, description = $2, display_order = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 RETURNING id`,
      [name || '', description || '', display_order || 0, is_active !== undefined ? is_active : true, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Usefulness not found' });
    }
    res.json({ success: true, message: 'Usefulness updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/usefulness/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/usefulness/:id — удаление полезности
app.delete('/api/usefulness/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('DELETE FROM usefulness WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Usefulness not found' });
    }
    res.json({ success: true, message: 'Usefulness deleted successfully' });
  } catch (error) {
    console.error('[ERROR] DELETE /api/usefulness/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/usefulness/:id/copy — копирование полезности
app.post('/api/usefulness/:id/copy', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const originalResult = await client.query('SELECT name, description, is_active FROM usefulness WHERE id = $1', [id]);
    if (originalResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Usefulness not found' });
    }
    const original = originalResult.rows[0];
    
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM usefulness'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO usefulness (name, description, display_order, is_active, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [`${original.name} (копия)`, original.description, nextOrder, original.is_active]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ERROR] POST /api/usefulness/:id/copy:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/usefulness/:id — одна полезность
app.get('/api/usefulness/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM usefulness WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Usefulness not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/usefulness/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/////    ниже старые эндпоинты, а выше новые через рег.ру



// server.js - добавьте этот endpoint

// Обновление метаданных медиафайла  // ???
app.put('/api/media/:mediaId/update-metadata', async (req, res) => {
  const client = await connectDB();
  const { mediaId } = req.params;
  const updateData = req.body;
  
  console.log(`[UPDATE METADATA] Обновление метаданных для медиафайла ${mediaId}:`, updateData);
  
  try {
    // Разрешённые поля для обновления
    const allowedFields = [
      'description', 
      'duration_seconds', 
      'width', 
      'height', 
      'thumbnail_url', 
      'thumbnail_updated_at',
      'file_url',
      'file_url_updated_at'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(updateData[field]);
      }
    }
    
    // АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ДАТ:
    // 1. Если обновляется file_url, но не передан file_url_updated_at
    if (updateData.file_url !== undefined && updateData.file_url_updated_at === undefined) {
      updates.push(`file_url_updated_at = NOW()`);
    }
    
    // 2. Если обновляется thumbnail_url, но не передан thumbnail_updated_at
    if (updateData.thumbnail_url !== undefined && updateData.thumbnail_updated_at === undefined) {
      updates.push(`thumbnail_updated_at = NOW()`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(mediaId);
    
    const query = `
      UPDATE media_files 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Метаданные успешно обновлены'
    });
    
  } catch (error) {
    console.error('[UPDATE METADATA] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    client.release();
  }
});
// ============================================
// СТАРЫЕ ЭНДПОИНТЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ!
// Они будут использоваться для мышц, пока не завершится миграция
// ============================================


// Получение актуальной прямой ссылки
// Обновленная и упрощенная функция getDirectLink (логи на английском, комментарии на русском) // ???
async function getDirectLink(url) {
  
  // Если это НЕ публичная страница (yadi.sk), а прямая ссылка (downloader...)
  if (!url.includes('yadi.sk') && !url.includes('disk.yandex.ru')) {    

    try {
      const urlObj = new URL(url);
      const filename = urlObj.searchParams.get('filename');

      if (filename) {
        
        const apiPath = `app:/muscle-app/${filename}`;
        const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(apiPath)}&fields=public_url`;

        const resourceRes = await fetch(apiUrl, {
          headers: {
            'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        if (resourceRes.ok) {
          const data = await resourceRes.json();
          if (data.public_url) {
            // Рекурсивно вызываем эту же функцию с найденным public_url
            return await getDirectLink(data.public_url);
          }
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error while trying to find public_url:', error.message);
    }
    
    console.log('[DEBUG] Could not find public_url. Returning original URL.');
    return url;
  }
  
  // Если это публичная страница (yadi.sk или disk.yandex.ru) — используем API
  try {
        
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(url)}`;
    const publicRes = await fetch(apiUrl, { 
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000 // Таймаут 10 секунд
    });
    

    if (!publicRes.ok) {
      let errorBody = 'Could not read error body';
      try {
        errorBody = await publicRes.text();
      } catch (e) { /* игнорируем, если не прочиталось */ }
      console.error(`[DEBUG] API Error! Status: ${publicRes.status}, Body:`, errorBody);
      throw new Error(`API returned status ${publicRes.status}`);
    }

    const data = await publicRes.json();
    //console.log('[DEBUG] Full API response:', JSON.stringify(data));

    if (data.href) {
      //console.log('[DEBUG] Success! Obtained fresh direct link.');
      return data.href;
    } else {
      console.error('[DEBUG] Error: "href" field is missing in API response.');
      throw new Error('Field "href" is missing in API response');
    }

  } catch (error) {
    console.error('[DEBUG] Critical error in getDirectLink:', error.message);
    // В случае ошибки возвращаем исходный URL как запасной вариант
    return url;
  }
}

//  добавляем эту функцию рядом с getDirectLink  обновление Превью  // ???
async function getFreshPreviewUrl(publicUrl) {
  try {
    //console.log(`[GET FRESH PREVIEW] Getting fresh preview for: ${publicUrl}`);
    
    // Запрашиваем превью через API Яндекс.Диска
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}&fields=preview`;
    
    const response = await fetch(apiUrl, {
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`[GET FRESH PREVIEW] API status: ${response.status}`);
    
    if (!response.ok) {
      //console.log(`[GET FRESH PREVIEW] Yandex API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Извлекаем превью из ответа
    if (data.preview) {
      let previewUrl = null;
      
      if (typeof data.preview === 'string') {
        previewUrl = data.preview;
        //console.log(`[GET FRESH PREVIEW] Got string preview`);
      } else if (data.preview.S) {
        // Маленькое превью (150px)
        previewUrl = data.preview.S;
        
      } else if (data.preview.M) {
        // Среднее превью (300px)
        previewUrl = data.preview.M;
        
      } else if (data.preview.L) {
        // Большое превью (500px)
        previewUrl = data.preview.L;
        
      }
      
      if (previewUrl) {        
        
        // Получаем ПРЯМУЮ ссылку на превью
        // Важно: previewUrl от Яндекса может быть уже прямой ссылкой или публичной страницей
        const directUrl = await getDirectLink(previewUrl);
                
        return directUrl;
      }
    }
        
    return null;
    
  } catch (error) {
    console.error('[GET FRESH PREVIEW] Error:', error);
    return null;
  }
}

// server.js — добавить этот эндпоинт (можно перед медиа-эндпоинтами)

// ============================================
// ЭНДПОИНТ ДЛЯ МАССОВОГО ОБНОВЛЕНИЯ ПРЕВЬЮ
// ============================================

app.post('/api/update-media-previews', async (req, res) => {
  try {
    const { mediaIds, entityType, entityId, force } = req.body;
    
    console.log('[UPDATE MEDIA PREVIEWS] Request:', { mediaIds, entityType, entityId });
    
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'mediaIds must be a non-empty array'
      });
    }
    
    const client = await connectDB();
    const results = [];
    let successfulUpdates = 0;
    
    for (const mediaId of mediaIds) {
      try {
        // 1. Получаем public_url из базы
        const fileResult = await client.query(
          'SELECT public_url, file_name, file_type FROM media_files WHERE id = $1',
          [mediaId]
        );
        
        if (fileResult.rowCount === 0) {
          results.push({ mediaId, success: false, error: 'File not found' });
          continue;
        }
        
        const file = fileResult.rows[0];
        const publicUrl = file.public_url;
        
        if (!publicUrl) {
          results.push({ mediaId, success: false, error: 'No public_url' });
          continue;
        }
        
        // 2. Получаем свежее превью от Яндекс.Диска
        const previewApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}&fields=preview`;
        const previewRes = await fetch(previewApiUrl, {
          headers: { 'Authorization': `OAuth ${process.env.YANDEX_TOKEN}` }
        });
        
        if (!previewRes.ok) {
          results.push({ mediaId, success: false, error: `Yandex API error: ${previewRes.status}` });
          continue;
        }
        
        const previewData = await previewRes.json();
        let thumbnailUrl = null;
        
        if (previewData.preview) {
          if (typeof previewData.preview === 'string') {
            thumbnailUrl = previewData.preview;
          } else if (previewData.preview.M) {
            thumbnailUrl = previewData.preview.M;
          } else if (previewData.preview.S) {
            thumbnailUrl = previewData.preview.S;
          } else if (previewData.preview.L) {
            thumbnailUrl = previewData.preview.L;
          }
        }
        
        if (!thumbnailUrl) {
          results.push({ mediaId, success: false, error: 'No preview available from Yandex' });
          continue;
        }
        
        // 3. Обновляем в базе данных
        await client.query(
          `UPDATE media_files 
           SET thumbnail_url = $1, thumbnail_updated_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [thumbnailUrl, mediaId]
        );
        
        results.push({ 
          mediaId, 
          success: true, 
          changes: ['thumbnail'],
          updateData: { thumbnail_url: thumbnailUrl }
        });
        successfulUpdates++;
        
        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (err) {
        console.error(`[UPDATE MEDIA PREVIEWS] Error for ${mediaId}:`, err.message);
        results.push({ mediaId, success: false, error: err.message });
      }
    }
    
    res.json({
      success: true,
      updated: successfulUpdates,
      total: mediaIds.length,
      results
    });
    
  } catch (error) {
    console.error('[UPDATE MEDIA PREVIEWS] Global error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      updated: 0,
      total: 0,
      results: []
    });
  }
});


// Прокси для изображений  // ???
app.get('/api/proxy-image', async (req, res) => {
  try {
    // Обработка HEAD-запроса для проверки соединения
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    const { url } = req.query;
    if (!url) {
      throw new Error('URL parameter is required');
    }
    

    // Получаем актуальную прямую ссылку
    const directUrl = await getDirectLink(url);
    //console.log('Using direct URL:', directUrl);

    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://disk.yandex.ru/',
        'Accept': 'image/*,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    //console.log('Image response status:', response.status);
    
    if (!response.ok) {
      // Пробуем оригинальную ссылку как fallback
      console.log('Trying original URL as fallback');
      const fallbackResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://disk.yandex.ru/'
        }
      });
      
      if (fallbackResponse.ok) {
        const contentType = fallbackResponse.headers.get('content-type');
        const buffer = await fallbackResponse.buffer();
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(buffer);
      }
      
      throw new Error(`Loading picture error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);

  } catch (error) {
    console.error('Proxy error details:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

// Добавьте в server.js
app.get('/api/check-token', async (req, res) => {
  try {
    const response = await fetch('https://cloud-api.yandex.net/v1/disk/', {
      headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` }
    });
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      tokenValid: response.ok,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ============================================
// ЭНДПОИНТ ДЛЯ ОБНОВЛЕНИЯ ССЫЛОК С УЧЕТОМ СУЩНОСТИ
// ============================================

// Обновляем существующий эндпоинт refresh-links для поддержки entityType и entityId
// как основной файл, так и превью
// POST /api/refresh-links — обновление ссылок Яндекс.Диска
app.post('/api/refresh-links', async (req, res) => {
  const client = await connectDB();
  
  try {
    const { urls, entityType, entityId, mediaItems } = req.body;
    
    console.log(`[REFRESH LINKS] Запрос на обновление ссылок`);
    console.log(`[REFRESH LINKS] Сущность: ${entityType}, ID: ${entityId}`);
    
    let itemsToProcess = [];
    
    if (mediaItems && Array.isArray(mediaItems)) {
      console.log(`[REFRESH LINKS] Используем новый формат с ${mediaItems.length} медиафайлов`);
      itemsToProcess = mediaItems;
    } else if (urls && Array.isArray(urls)) {
      console.log(`[REFRESH LINKS] Используем старый формат с ${urls.length} URL`);
      itemsToProcess = urls.map(url => ({ publicUrl: url }));
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Требуется либо urls array, либо mediaItems array' 
      });
    }
    
    const results = [];
    let updatedCount = 0;
    
    for (const item of itemsToProcess) {
      try {
        const publicUrl = item.publicUrl;
        const mediaId = item.id;
        const fileName = item.fileName || 'unknown';
        const fileType = item.fileType;
        
        console.log(`[REFRESH LINKS] Обработка: ${fileName} (${fileType})`);
        
        if (!publicUrl) {
          console.warn(`[REFRESH LINKS] Пропускаем - нет public_url`);
          results.push({ fileName, success: false, error: 'No public_url' });
          continue;
        }
        
        const updates = {};
        const changes = [];
        
        // 1. Обновляем основную ссылку
        try {
          const freshDirectUrl = await getDirectLink(publicUrl);
          if (freshDirectUrl && freshDirectUrl !== item.currentFileUrl) {
            updates.file_url = freshDirectUrl;
            changes.push('main_link');
            console.log(`[REFRESH LINKS] Обновлена основная ссылка для ${fileName}`);
          }
        } catch (mainLinkError) {
          console.warn(`[REFRESH LINKS] Ошибка основной ссылки: ${mainLinkError.message}`);
        }
        
        // 2. Обновляем превью
        try {
          const freshPreviewUrl = await getFreshPreviewUrl(publicUrl);
          if (freshPreviewUrl && freshPreviewUrl !== item.currentThumbnailUrl) {
            updates.thumbnail_url = freshPreviewUrl;
            updates.thumbnail_updated_at = new Date().toISOString();
            changes.push('preview_link');
            console.log(`[REFRESH LINKS] Обновлена ссылка на превью для ${fileName}`);
          }
        } catch (previewError) {
          console.warn(`[REFRESH LINKS] Ошибка превью: ${previewError.message}`);
        }
        
        // 3. Обновляем в базе данных (через pg, а не Supabase!)
        if (Object.keys(updates).length > 0 && mediaId) {
          const setClause = [];
          const values = [];
          let paramIndex = 1;
          
          if (updates.file_url) {
            setClause.push(`file_url = $${paramIndex++}`);
            values.push(updates.file_url);
          }
          if (updates.thumbnail_url) {
            setClause.push(`thumbnail_url = $${paramIndex++}`);
            values.push(updates.thumbnail_url);
          }
          if (updates.thumbnail_updated_at) {
            setClause.push(`thumbnail_updated_at = $${paramIndex++}`);
            values.push(updates.thumbnail_updated_at);
          }
          
          setClause.push(`updated_at = NOW()`);
          values.push(mediaId);
          
          const query = `
            UPDATE media_files 
            SET ${setClause.join(', ')}
            WHERE id = $${paramIndex}
          `;
          
          await client.query(query, values);
          updatedCount++;
          console.log(`[REFRESH LINKS] База данных обновлена для ${fileName}`);
        }
        
        results.push({ mediaId, fileName, fileType, success: true, changes, updated: Object.keys(updates).length > 0 });
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`[REFRESH LINKS] Ошибка:`, error.message);
        results.push({ fileName: item.fileName || 'unknown', success: false, error: error.message });
      }
    }
    
    console.log(`[REFRESH LINKS] Завершено. Обновлено: ${updatedCount}/${itemsToProcess.length} файлов`);
    res.json({ success: true, updated: updatedCount, total: itemsToProcess.length, results });
    
  } catch (error) {
    console.error('[REFRESH LINKS] Global error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.end();
  }
});

// GET /api/media/supported-entities — получить список поддерживаемых сущностей
app.get('/api/media/supported-entities', async (req, res) => {
  const labels = {
    muscle: 'Мышцы',
    organ: 'Органы',
    meridian: 'Меридианы',
    dysfunction: 'Дисфункции',
    muscle_group: 'Группы мышц',
    receptor: 'Рецепторы',
    receptor_class: 'Классы рецепторов',
    tool: 'Инструменты',
    entry: 'Заходы',
    usefulness: 'Полезности'
  };
  
  const entities = SUPPORTED_ENTITIES.map(type => ({
    type,
    label: labels[type] || type
  }));
  
  res.json({ success: true, data: entities });
});

// ========== МЕДИАФАЙЛЫ ==========

// GET /api/media/:entityType/:entityId — получить все медиа для сущности
app.get('/api/media/:entityType/:entityId', async (req, res) => {
  const start = Date.now();
  const { entityType, entityId } = req.params;  
  //console.log(`[TIMER] /api/media/:entityType/:entityId  START: ${entityType}/${entityId}`);

  const client = await connectDB();
  //console.log(`[TIMER] DB connected: ${Date.now() - start} ms`);
  
  
  try {
    const queryStart = Date.now();  // <--- ОБЪЯВИТЕ ПЕРЕМЕННУЮ
    const result = await client.query(
      `SELECT m.*, em.display_order
       FROM media_files m
       JOIN entity_media em ON em.media_file_id = m.id
       WHERE em.entity_type = $1 AND em.entity_id = $2
       ORDER BY em.display_order NULLS LAST, m.created_at`,
      [entityType, entityId]
    );
    
    //console.log(`[TIMER] Query executed: ${Date.now() - queryStart} ms, rows: ${result.rows.length}    `);
    //console.log(`[TIMER] TOTAL: ${Date.now() - start} ms`);

    // Убедимся, что возвращается m.id, а не em.id
    // В запросе SELECT m.* уже включает m.id
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/media/:entityType/:entityId:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST /api/media/upload — загрузка медиафайла  это новый вариант
  app.post('/api/media/upload', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log('[UNIVERSAL UPLOAD] Called with files:', req.files);
      
      // Основной файл
      const mainFile = req.files?.file?.[0];
      if (!mainFile) throw new Error('Main file not received');
      
      if (!req.body.entityId) throw new Error('entityId is required');
      if (!req.body.entityType) throw new Error('entityType is required');

      const { entityType, entityId, description = '' } = req.body;
      const file = mainFile;

      //console.log(`[UNIVERSAL UPLOAD] Upload for ${entityType} ${entityId}: ${file.originalname}`);

      // Поддерживаемые типы сущностей
      // const supportedEntities = ['muscle', 'organ', 'meridian', 'dysfunction', 'muscle_group', 'receptor', 'receptor_class', 
      //                             'tool', 'entry', 'usefulness'];
      if (!SUPPORTED_ENTITIES.includes(entityType)) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      // Определяем тип файла по расширению
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${entityType}_${entityId}_${Date.now()}.${fileExt}`;
        const remotePath = `app:/${entityType}-app/${fileName}`;

        // 1. Создаем папку для сущности (если не существует)
        const folderRes = await fetch(
          `https://cloud-api.yandex.net/v1/disk/resources?path=app:/${entityType}-app`,
          {
            method: 'PUT',
            headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
          }
        );
        
        // 409 - папка уже существует, это нормально
        if (!folderRes.ok && folderRes.status !== 409) {
          const error = await folderRes.json();
          throw new Error(`Folder creation error: ${error.message || error.description}`);
        }

      // 2. Получаем URL для загрузки основного файла
      const uploadUrlRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}`,
        {
          headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
        }
      );
      
      if (!uploadUrlRes.ok) {
        const error = await uploadUrlRes.json();
        throw new Error(`Error getting upload URL: ${error.message || error.description}`);
      }

      // 3. Загружаем основной файл
      const { href: uploadUrl } = await uploadUrlRes.json();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file.buffer,
        headers: { 'Content-Type': file.mimetype },
      });
      
      if (!uploadRes.ok) throw new Error('File upload error');

      // 4. Публикуем основной файл
      const publishRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(remotePath)}`,
        {
          method: 'PUT',
          headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
        }
      );

      if (!publishRes.ok) {
        const error = await publishRes.json();
        throw new Error(`Publishing error: ${error.message || error.description}`);
      }

      // 5. Получаем метаданные с public_url
      const metaRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(remotePath)}`,
        {
          headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
        }
      );

      if (!metaRes.ok) {
        const error = await metaRes.json();
        throw new Error(`Metadata retrieval error: ${error.message || error.description}`);
      }

      const metaData = await metaRes.json();
      const publicPageUrl = metaData.public_url;

      console.log(`[UNIVERSAL UPLOAD] Main file uploaded. Public URL: ${publicPageUrl}`);

      // Определяем тип файла
      const fileType = fileExt.match(/(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image' :
                      fileExt.match(/(mp4|webm|mov|avi|mkv)$/i) ? 'video' :
                      fileExt.match(/(mp3|wav|ogg|m4a|flac)$/i) ? 'audio' : 'document';

      // 6. Получаем превью и метаданные от Яндекс.Диска
      let thumbnailUrl = null;
      let durationSeconds = null;
      let width = null;
      let height = null;

      const yandexPreviewTypes = ['video', 'document', 'image'];

      if (yandexPreviewTypes.includes(fileType)) {
        try {
          console.log(`[UNIVERSAL UPLOAD] Requesting Yandex preview for ${fileType}`);
          
          const previewApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicPageUrl)}&fields=preview,video,image`;
          
          const previewRes = await fetch(previewApiUrl, {
            headers: { 
              'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
              'Accept': 'application/json'
            },
            timeout: 15000
          });
          
          console.log(`[UNIVERSAL UPLOAD] Yandex preview API status: ${previewRes.status}`);
          
          if (previewRes.ok) {
            const previewData = await previewRes.json();
            
            if (previewData.preview) {
              if (typeof previewData.preview === 'string') {
                thumbnailUrl = previewData.preview;
                console.log(`[UNIVERSAL UPLOAD] Got string preview`);
              } else if (typeof previewData.preview === 'object') {
                if (previewData.preview.S) {
                  thumbnailUrl = previewData.preview.S;
                  console.log(`[UNIVERSAL UPLOAD] Got S-size preview`);
                } else if (previewData.preview.M) {
                  thumbnailUrl = previewData.preview.M;
                  //console.log(`[UNIVERSAL UPLOAD] Got M-size preview`);
                } else {
                  const firstSize = Object.values(previewData.preview)[0];
                  if (firstSize) {
                    thumbnailUrl = firstSize;
                    //console.log(`[UNIVERSAL UPLOAD] Got first available preview size`);
                  }
                }
              }
            }
            
            if (fileType === 'video' && previewData.video?.duration) {
              durationSeconds = Math.round(previewData.video.duration);
              console.log(`[UNIVERSAL UPLOAD] Video duration: ${durationSeconds} seconds`);
            }
            
            if (fileType === 'image' && previewData.image?.width && previewData.image?.height) {
              width = previewData.image.width;
              height = previewData.image.height;
              console.log(`[UNIVERSAL UPLOAD] Image dimensions: ${width}x${height}`);
            }
          }
        } catch (previewError) {
          console.warn(`[UNIVERSAL UPLOAD] Yandex preview error:`, previewError.message);
        }
      }

      // 7. Обработка thumbnail от клиента
      const thumbnailFile = req.files?.thumbnail?.[0];
      
      if (thumbnailFile) {
        console.log(`[UNIVERSAL UPLOAD] Uploading client-provided thumbnail: ${thumbnailFile.originalname}`);
        
        const thumbFileName = `${fileName}.thumb.jpg`;
        const thumbRemotePath = `app:/${entityType}-app/${thumbFileName}`;
        
        const thumbUploadUrlRes = await fetch(
          `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(thumbRemotePath)}`,
          {
            headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
          }
        );
        
        if (thumbUploadUrlRes.ok) {
          const { href: thumbUploadUrl } = await thumbUploadUrlRes.json();
          
          await fetch(thumbUploadUrl, {
            method: 'PUT',
            body: thumbnailFile.buffer,
            headers: { 'Content-Type': thumbnailFile.mimetype },
          });
          
          await fetch(
            `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(thumbRemotePath)}`,
            {
              method: 'PUT',
              headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
            }
          );
          
          const thumbMetaRes = await fetch(
            `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(thumbRemotePath)}`,
            {
              headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
            }
          );
          
          if (thumbMetaRes.ok) {
            const thumbMetaData = await thumbMetaRes.json();
            thumbnailUrl = thumbMetaData.public_url;
            console.log(`[UNIVERSAL UPLOAD] Client thumbnail created: ${thumbnailUrl}`);
          }
        }
      } else if (fileType === 'image' && !thumbnailUrl) {
        console.log(`[UNIVERSAL UPLOAD] Using image itself as thumbnail`);
        thumbnailUrl = publicPageUrl;
      }

      // 9. Сохраняем в БД (НОВАЯ СИСТЕМА - через pg)
      const client = await connectDB();
      
      await client.query('BEGIN');
      
      // Сохраняем в media_files
      const newFileResult = await client.query(
        `INSERT INTO media_files 
        (file_url, file_name, file_type, mime_type, file_size, width, height, 
          duration_seconds, thumbnail_url, public_url, description, display_order, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true) 
        RETURNING id`,
        [
          publicPageUrl, fileName, fileType, file.mimetype, file.size,
          width || null, height || null, durationSeconds || null,
          thumbnailUrl, publicPageUrl, description || '', 0
        ]
      );
      
      const newFileId = newFileResult.rows[0].id;
      
      // Создаем связь между файлом и сущностью
      await client.query(
        `INSERT INTO entity_media 
        (media_file_id, entity_type, entity_id, relation_type, display_order) 
        VALUES ($1, $2, $3, $4, $5)`,
        [newFileId, entityType, entityId, 'primary', 0]
      );
      
      await client.query('COMMIT');
      
      const savedMedia = {
        id: newFileId,
        entity_id: entityId,
        entity_type: entityType,
        file_url: publicPageUrl,
        file_name: fileName,
        file_type: fileType,
        thumbnail_url: thumbnailUrl,
        public_url: publicPageUrl,
        description: description,
        display_order: 0,
        duration_seconds: durationSeconds,
        width: width,
        height: height,
        created_at: new Date().toISOString()
      };

      res.json({
        success: true,
        publicUrl: publicPageUrl,
        fileName: fileName,
        thumbnailUrl: thumbnailUrl,
        durationSeconds: durationSeconds,
        width: width,
        height: height,
        media: savedMedia,
        createdAt: savedMedia.created_at
      });

    } catch (error) {
      console.error('[UNIVERSAL UPLOAD] Error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });

// GET /api/media-connections/:id — получить связи медиафайла
    app.get('/api/media-connections/:id', async (req, res) => {
      const client = await connectDB();
      const { id } = req.params;
      
      try {
        // Динамически строим CASE для всех сущностей из SUPPORTED_ENTITIES
        const entityCases = SUPPORTED_ENTITIES.map(entity => {
          const tableName = entity === 'muscle' ? 'muscles' :
                            entity === 'muscle_group' ? 'muscle_groups' :
                            entity === 'receptor_class' ? 'receptor_classes' :
                            `${entity}s`;
          const nameField = entity === 'muscle' ? 'name_ru' : 'name';
          return `WHEN em.entity_type = '${entity}' THEN (SELECT ${nameField} FROM ${tableName} WHERE id = em.entity_id)`;
        }).join(' ');

        const result = await client.query(`
          SELECT 
            em.entity_type,
            em.entity_id,
            em.relation_type,
            CASE 
              ${entityCases}
              ELSE 'Unknown'
            END as entity_name
          FROM entity_media em
          WHERE em.media_file_id = $1
          ORDER BY em.entity_type, em.entity_id
        `, [id]);
        
        res.json({ success: true, data: result.rows });
      } catch (error) {
        console.error('[ERROR] GET /api/media-connections/:id:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });

// DELETE /api/media/:id — удаление медиафайла (или только связи)
  app.delete('/api/media/:id', async (req, res) => {
    const client = await connectDB();
    const { id } = req.params;
    
    // Если тело не передано — используем пустой объект
    const body = req.body || {};
    const { entityType, entityId } = body;
    
    try {
      // 1. Если переданы entityType и entityId — удаляем только связь
      if (entityType && entityId) {
        // Удаляем конкретную связь
        await client.query(
          'DELETE FROM entity_media WHERE media_file_id = $1 AND entity_type = $2 AND entity_id = $3',
          [id, entityType, entityId]
        );
      } else {
        // 2. Если не переданы — удаляем все связи (для AllMediaPage)
        await client.query('DELETE FROM entity_media WHERE media_file_id = $1', [id]);
      }
      
      // 3. Проверяем, остались ли ещё связи у этого файла
      const checkResult = await client.query(
        'SELECT COUNT(*) FROM entity_media WHERE media_file_id = $1',
        [id]
      );
      
      const remainingLinks = parseInt(checkResult.rows[0].count);
      
      // 4. Если связей больше нет — удаляем файл
      if (remainingLinks === 0) {
        await client.query('DELETE FROM media_files WHERE id = $1', [id]);
        
        return res.json({ 
          success: true, 
          message: 'Media file and all links deleted successfully',
          fileDeleted: true,
          linksRemaining: 0
        });
      } else {
        // Если связи остались — файл не удаляем
        return res.json({ 
          success: true, 
          message: `Link deleted successfully. File still has ${remainingLinks} other link(s)`,
          fileDeleted: false,
          linksRemaining: remainingLinks
        });
      }
      
    } catch (error) {
      console.error('[ERROR] DELETE /api/media/:id:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// POST /api/media/reorder — изменение порядка медиафайлов
app.post('/api/media/reorder', async (req, res) => {
  const client = await connectDB();
  const { entityType, entityId, orderedIds } = req.body;
  
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE entity_media SET display_order = $1 WHERE entity_type = $2 AND entity_id = $3 AND media_file_id = $4',
        [i, entityType, entityId, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR] POST /api/media/reorder:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/media/:id/update-metadata — обновление метаданных
app.put('/api/media/:id/update-metadata', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  const { description, duration_seconds, width, height } = req.body;
  
  try {
    await client.query(
      `UPDATE media_files 
       SET description = $1, duration_seconds = $2, width = $3, height = $4, updated_at = NOW()
       WHERE id = $5`,
      [description || '', duration_seconds || null, width || null, height || null, id]
    );
    
    res.json({ success: true, message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('[ERROR] PUT /api/media/:id/update-metadata:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// GET /api/media/files — поиск доступных медиафайлов
app.get('/api/media/files', async (req, res) => {
  const client = await connectDB();
  const { search = '', file_type = '', exclude_entity_type, exclude_entity_id, limit = 50 } = req.query;
  
  try {
    let query = `
      SELECT m.* FROM media_files m
      WHERE NOT EXISTS (
        SELECT 1 FROM entity_media em 
        WHERE em.media_file_id = m.id 
        AND em.entity_type = $1 AND em.entity_id = $2
      )
    `;
    const params = [exclude_entity_type, exclude_entity_id];
    let paramIndex = 3;
    
    if (search) {
      query += ` AND m.file_name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (file_type) {
      query += ` AND m.file_type = $${paramIndex}`;
      params.push(file_type);
      paramIndex++;
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await client.query(query, params);
    
    res.json({ success: true, count: result.rows.length, files: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/media/files:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/media/link — связывание существующего медиафайла с сущностью
  app.post('/api/media/link', async (req, res) => {
    const client = await connectDB();
    const { mediaFileId, entityType, entityId, relationType = 'primary' } = req.body;
    
    // Проверка обязательных полей
    if (!mediaFileId || !entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'mediaFileId, entityType, and entityId are required'
      });
    }
    
    // Проверка поддерживаемого типа сущности (используем глобальную константу)
    if (!SUPPORTED_ENTITIES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported entity type: ${entityType}`
      });
    }
    
    try {
      // Проверяем, существует ли медиафайл
      const mediaCheck = await client.query(
        'SELECT id FROM media_files WHERE id = $1',
        [mediaFileId]
      );
      
      if (mediaCheck.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Media file not found'
        });
      }
      
      // Проверяем, не связан ли уже этот файл с этой сущностью
      const existingLink = await client.query(
        'SELECT id FROM entity_media WHERE media_file_id = $1 AND entity_type = $2 AND entity_id = $3',
        [mediaFileId, entityType, entityId]
      );
      
      if (existingLink.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'This media file is already linked to this entity'
        });
      }
      
      // Получаем максимальный display_order
      const orderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM entity_media WHERE entity_type = $1 AND entity_id = $2',
        [entityType, entityId]
      );
      
      // Создаём связь
      await client.query(
        `INSERT INTO entity_media (entity_type, entity_id, media_file_id, relation_type, display_order)
        VALUES ($1, $2, $3, $4, $5)`,
        [entityType, entityId, mediaFileId, relationType, orderResult.rows[0].next_order]
      );
      
      // Получаем полную информацию о медиафайле для ответа
      const mediaResult = await client.query('SELECT * FROM media_files WHERE id = $1', [mediaFileId]);
      
      res.json({
        success: true,
        message: 'Media file linked successfully',
        media: mediaResult.rows[0]
      });
      
    } catch (error) {
      console.error('[ERROR] POST /api/media/link:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });



// Вспомогательная функция для определения типа файла
function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';
  return 'document';
}


// GET /api/media/all — получить все медиафайлы
app.get('/api/media/all', async (req, res) => {
  const client = await connectDB();
  try {
    const result = await client.query(`
      SELECT m.*, 
             COUNT(em.id) as connection_count
      FROM media_files m
      LEFT JOIN entity_media em ON em.media_file_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ERROR] GET /api/media/all:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// server.js — добавьте этот эндпоинт для получения превью в embed-режиме

  // GET /api/yandex/file-preview — получить публичную ссылку файла по пути
  app.get('/api/yandex/file-preview', async (req, res) => {
    const { path } = req.query;
    const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
    
    if (!path) {
      return res.status(400).json({ success: false, error: 'Path parameter is required' });
    }
    
    if (!YANDEX_TOKEN) {
      return res.status(500).json({ success: false, error: 'YANDEX_TOKEN not configured' });
    }

    try {
      // 1. Публикуем файл (если ещё не опубликован)
      const publishRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(path)}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `OAuth ${YANDEX_TOKEN}` }
        }
      );
      
      if (!publishRes.ok) {
        const error = await publishRes.json();
        throw new Error(`Publishing error: ${error.message || error.description}`);
      }

      // 2. Получаем метаданные с public_url
      const metaRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}`,
        {
          headers: { 'Authorization': `OAuth ${YANDEX_TOKEN}` }
        }
      );
      
      if (!metaRes.ok) {
        const error = await metaRes.json();
        throw new Error(`Metadata error: ${error.message || error.description}`);
      }
      
      const metaData = await metaRes.json();
      const publicUrl = metaData.public_url;
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }

      res.json({
        success: true,
        publicUrl: publicUrl,
        path: path
      });
    } catch (error) {
      console.error('[ERROR] /api/yandex/file-preview:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// GET /api/yandex-preview — получение превью через API Яндекс.Диска
app.get('/api/yandex-preview', async (req, res) => {
  const { url, size = 'M', mode = 'embed' } = req.query;
  
  //console.log('[DEBUG] /api/yandex-preview YANDEX_TOKEN exists:', !!process.env.YANDEX_TOKEN);
  if (!url) {
    return res.status(400).json({ error: '/api/yandex-preview URL parameter is required' });
  }
  
  try {
    // Получаем previewUrl от Яндекса
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&preview_size=${size}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    let previewUrl = null;
    if (data.preview) {
      if (typeof data.preview === 'string') {
        previewUrl = data.preview;
      } else if (data.preview[size]) {
        previewUrl = data.preview[size];
      } else if (data.preview.S) {
        previewUrl = data.preview.S;
      }
    }
    
    if (!previewUrl) {
      return res.status(404).json({ error: 'Preview not found' });
    }
    
    // Режим embed: редирект (для iframe)
    if (mode === 'embed') {
      return res.redirect(previewUrl);
    }
    
    // Режим legacy: проксируем изображение (для обратной совместимости)
    const imageResponse = await fetch(previewUrl, {
      headers: {
        'Referer': 'https://disk.yandex.ru/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('[ERROR] /api/yandex-preview:', error.message);
    res.status(500).json({ error: error.message });
  }
});    

 // Новый прокси через curl для режима 'curl'
  app.get('/api/curl-proxy-image', async (req, res) => {
    const { url, size = 'M' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: '/api/curl-proxy-image  URL parameter is required' });
    }
    
    try {
      // Получаем previewUrl от Яндекса
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&preview_size=${size}`;
      const yandexRes = await fetch(apiUrl);
      const yandexData = await yandexRes.json();
      
      let previewUrl = null;
      if (yandexData.preview) {
        if (typeof yandexData.preview === 'string') {
          previewUrl = yandexData.preview;
        } else if (yandexData.preview[size]) {
          previewUrl = yandexData.preview[size];
        } else if (yandexData.preview.S) {
          previewUrl = yandexData.preview.S;
        }
      }
      
      if (!previewUrl) {
        return res.status(404).json({ error: '/api/curl-proxy-image Preview not found' });
      }
      
      // Используем curl для скачивания
      //const { exec } = require('child_process');
      exec(`curl -s -H "Referer: https://disk.yandex.ru/" -H "User-Agent: Mozilla/5.0" "${previewUrl}"`, 
        { maxBuffer: 50 * 1024 * 1024, encoding: 'binary' },
        (error, stdout) => {
          if (error) {
            console.error('[ERROR] /api/curl-proxy-image curl failed:', error);
            return res.status(500).json({ error: error.message });
          }
          res.set('Content-Type', 'image/jpeg');
          res.send(Buffer.from(stdout, 'binary'));
        }
      );
      
    } catch (error) {
      console.error('[ERROR] /api/curl-proxy-image:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

// Прокси для полного файла через curl
  // Универсальный прокси для полного файла (работает на любой платформе)
  app.get('/api/curl-proxy-file', async (req, res) => {
    const { url, size = 'M' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
      // 1. Получаем прямую ссылку на файл через API Яндекса
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(url)}`;
      //console.log('[PROXY-FILE] Fetching download URL from Yandex');
      
      const yandexRes = await fetch(apiUrl);
      const yandexData = await yandexRes.json();
      
      if (!yandexData.href) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const fileUrl = yandexData.href;
      //console.log('[PROXY-FILE] Got file URL, downloading...');
      
      // 2. Скачиваем файл через fetch (работает везде)
      const fileResponse = await fetch(fileUrl, {
        headers: {
          'Referer': 'https://disk.yandex.ru/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }
      
      const buffer = await fileResponse.arrayBuffer();
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
      const contentLength = fileResponse.headers.get('content-length');
      
      console.log('[PROXY-FILE] Downloaded:', buffer.byteLength, 'bytes, type:', contentType);
      
      res.set('Content-Type', contentType);
      if (contentLength) {
        res.set('Content-Length', contentLength);
      }
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(buffer));
      
    } catch (error) {
      console.error('[ERROR] /api/curl-proxy-file:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

// Тестовый эндпоинт для отладки превью
app.get('/api/test-preview', async (req, res) => {
  const { url, size = 'M' } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    // Получаем previewUrl от Яндекса
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&preview_size=${size}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    let previewUrl = null;
    if (data.preview) {
      if (typeof data.preview === 'string') {
        previewUrl = data.preview;
      } else if (data.preview[size]) {
        previewUrl = data.preview[size];
      } else if (data.preview.S) {
        previewUrl = data.preview.S;
      }
    }
    
    if (!previewUrl) {
      return res.status(404).json({ error: 'Preview not found' });
    }
    
    // Возвращаем previewUrl для отладки
    res.json({ 
      success: true, 
      previewUrl,
      yandexResponse: data
    });
    
  } catch (error) {
    console.error('[TEST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/media-file/:id — получить полную информацию о медиафайле по ID
app.get('/api/media-file/:id', async (req, res) => {
  const client = await connectDB();
  const { id } = req.params;
  
  try {
    const result = await client.query(
      `SELECT 
        id, 
        file_name, 
        public_url, 
        file_url, 
        thumbnail_url, 
        file_type, 
        mime_type, 
        file_size,
        width,
        height,
        duration_seconds,
        description,
        display_order,
        created_at,
        updated_at,
        is_active,
        thumbnail_updated_at,
        file_url_updated_at
       FROM media_files 
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }
    
    res.json({ success: true, file: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] GET /api/media-file/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/yandex/files — получить список всех файлов на Яндекс.Диске
  app.get('/api/yandex/files', async (req, res) => {
    const YANDEX_TOKEN = process.env.YANDEX_TOKEN;
    
    if (!YANDEX_TOKEN) {
      console.error('[YANDEX FILES] ❌ YANDEX_TOKEN not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'YANDEX_TOKEN not configured' 
      });
    }

    try {
      // Папки на Яндекс.Диске формируем из SUPPORTED_ENTITIES, добавляя '-app'
      const folders = SUPPORTED_ENTITIES.map(entity => `${entity}-app`);
      
      console.log('[YANDEX FILES] Folders to check:', folders);
      
      const allFiles = [];
      let totalSize = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const folder of folders) {
        const path = `app:/${folder}`;
        
        try {
          const response = await fetch(
            `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&limit=1000&fields=_embedded.items.name,_embedded.items.path,_embedded.items.size,_embedded.items.created,_embedded.items.modified,_embedded.items.mime_type,_embedded.items.media_type`,
            {
              headers: {
                'Authorization': `OAuth ${YANDEX_TOKEN}`
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data._embedded && data._embedded.items) {
              const items = data._embedded.items.map(item => ({
                name: item.name,
                path: item.path,
                folder: folder.replace('-app', ''),
                size: item.size,
                created: item.created,
                modified: item.modified,
                media_type: item.media_type,
                mime_type: item.mime_type
              }));
              allFiles.push(...items);
              totalSize += items.reduce((sum, f) => sum + f.size, 0);
              successCount++;
            }
          } else {
            const errorText = await response.text();
            console.log(`[YANDEX FILES] ❌ Folder ${folder} error:`, response.status, errorText);
            errorCount++;
          }
        } catch (folderError) {
          console.log(`[YANDEX FILES] ❌ Error fetching folder ${folder}:`, folderError.message);
          errorCount++;
        }
      }

      console.log(`[YANDEX FILES] Summary: ${successCount} folders OK, ${errorCount} folders failed`);
      console.log(`[YANDEX FILES] Total files found: ${allFiles.length}`);
      console.log(`[YANDEX FILES] Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      res.json({
        success: true,
        count: allFiles.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        folders: folders,
        files: allFiles,
        debug: {
          successCount,
          errorCount,
          folders: folders
        }
      });
    } catch (error) {
      console.error('[YANDEX FILES] ❌ Fatal error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// GET /api/media/orphaned — найти файлы на ЯД, которых нет в БД
  app.get('/api/media/orphaned', async (req, res) => {
    const client = await connectDB();
    
    try {
      // 1. Получаем все имена файлов из БД (только из media_files)
      const dbFiles = await client.query(
        'SELECT file_name FROM media_files WHERE file_name IS NOT NULL'
      );
      const dbFileNames = new Set(dbFiles.rows.map(row => row.file_name));
      
      // 2. Получаем все файлы с Яндекс.Диска
      const yandexResponse = await fetch(
        `${req.protocol}://${req.get('host')}/api/yandex/files`
      );
      const yandexData = await yandexResponse.json();
      
      if (!yandexData.success) {
        throw new Error('Failed to fetch Yandex files: ' + (yandexData.error || 'Unknown error'));
      }
      
      // 3. Находим файлы на ЯД, которых нет в БД
      const orphanedFiles = yandexData.files.filter(file => !dbFileNames.has(file.name));
      
      // 4. Группируем по папкам
      const groupedByFolder = {};
      for (const file of orphanedFiles) {
        if (!groupedByFolder[file.folder]) {
          groupedByFolder[file.folder] = [];
        }
        groupedByFolder[file.folder].push(file);
      }
      
      res.json({
        success: true,
        totalYandexFiles: yandexData.count,
        totalYandexSizeMB: yandexData.totalSizeMB,
        totalDbFiles: dbFiles.rows.length,
        orphanedCount: orphanedFiles.length,
        orphanedSizeMB: (orphanedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2),
        orphanedFiles: orphanedFiles,
        groupedByFolder: groupedByFolder
      });
    } catch (error) {
      console.error('[ERROR] /api/media/orphaned:', error.message);
      res.status(500).json({ success: false, error: error.message });
    // }     finally {
    //   client.release();
    }
  });

  // DELETE /api/yandex/file — удалить файл с Яндекс.Диска по пути
  app.delete('/api/yandex/file', async (req, res) => {
    const { path } = req.query;
    const YANDEX_TOKEN = process.env.YANDEX_TOKEN;    
    
    
    if (!path) {
      return res.status(400).json({ success: false, error: 'Path parameter is required' });
    }
    
    if (!YANDEX_TOKEN) {
      return res.status(500).json({ success: false, error: 'YANDEX_TOKEN not configured' });
    }

    try {
      // Декодируем путь, если он закодирован
      const decodedPath = decodeURIComponent(path);
      
      // Проверяем, какой формат пути используем
      // Если путь начинается с 'disk:/' — оставляем как есть
      // Если начинается с '/disk:/' — убираем первый слеш
      let cleanPath = decodedPath;
      if (cleanPath.startsWith('/disk:/')) {
        cleanPath = cleanPath.substring(1);
      }
      console.log('[DELETE /api/yandex/file] Clean path:', cleanPath);
      
      const response = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(cleanPath)}&permanently=true`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `OAuth ${YANDEX_TOKEN}`
          }
        }
      );
      
      console.log('[DELETE /api/yandex/file] Yandex response status:', response.status);
      
      if (response.ok) {        
        res.json({ success: true, message: `File deleted successfully` });
      } else {
        const errorData = await response.json();
        console.log('[DELETE /api/yandex/file] ❌ Yandex error:', errorData);
        res.status(response.status).json({ 
          success: false, 
          error: errorData.message || 'Failed to delete file' 
        });
      }
    } catch (error) {
      console.error('[ERROR] /api/yandex/file:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// ДОБАВЬТЕ в самый конец файла, перед app.listen:

console.log('Test end points:');
console.log('Test GET  /api/check-token               :  http://localhost:3001/api/check-token');
console.log('Test GET  /api/media/supported-entities  :  http://localhost:3001/api/media/supported-entities');

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started at port ${PORT}`);
});