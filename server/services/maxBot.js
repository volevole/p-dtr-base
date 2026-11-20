// server/services/maxBot.js
const { connectDB } = require('../db');

const MAX_API_URL = 'https://platform-api2.max.ru';
const TOKEN = process.env.MAX_BOT_TOKEN;

const now = () => new Date().toLocaleTimeString('ru-RU');

// Найти пользователя Ларчика по MAX user_id
const findUserByMaxId = async (client, maxUserId) => {
  const res = await client.query(
    'SELECT id, name FROM users WHERE max_user_id = $1',
    [String(maxUserId)]
  );
  return res.rows[0] || null;
};

// Запись уведомления в журнал (не роняет основной поток при ошибке)
const logNotification = async (client, { internalUserId, channel, kind, appointmentId = null, text, status, error = null }) => {
  try {
    await client.query(
      `INSERT INTO appt_notifications (user_id, channel, kind, appointment_id, text, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [internalUserId, channel, kind, appointmentId, text, status, error]
    );
  } catch (e) {
    console.error(`[${now()}] Не удалось записать уведомление в журнал:`, e.message);
  }
};

// Отправка сообщения в MAX + журналирование попытки
// opts: {
//   kind: 'appointment'|'system'|'bot',
//   internalUserId: uuid получателя (если известен заранее),
//   appointmentId: uuid приёма (если уведомление о приёме)
// }
const sendMaxMessage = async (maxUserId, text, { kind = 'general', internalUserId = null, appointmentId = null } = {}) => {
  if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_NOTIFICATIONS === 'true') {
    console.log(`🔕 [MAX DEV] Сообщение не отправлено, т.к. это локал или  DISABLE_NOTIFICATIONS (dev): ${text}`);
    return;
  }
  if (!maxUserId || !TOKEN) return;
  console.log(`[${now()}] Message to MAX, userId: ${maxUserId} text: ${text}`);

  let ok = false;
  let errText = null;
  try {
    const res = await fetch(`${MAX_API_URL}/messages?user_id=${maxUserId}`, {
      method: 'POST',
      headers: {
        'Authorization': TOKEN,           // токен без Bearer — как в офиц. примерах
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, format: 'markdown' })
    });

    if (!res.ok) {
      errText = await res.text();
      console.error(`[${now()}] ❌ Ошибка отправки в MAX:`, errText);
    } else {
      ok = true;
      console.log(`[${now()}] ✅ Сообщение в MAX отправлено для ${maxUserId}`);
    }
  } catch (error) {
    errText = error.message || String(error);
    console.error(`[${now()}] ❌ Ошибка сети при отправке в MAX:`, error);
  }

  try {
    const client = await connectDB();
    let uid = internalUserId;
    if (!uid) {
      const user = await findUserByMaxId(client, maxUserId);
      uid = user ? user.id : null;
    }
    if (uid) {
      await logNotification(client, {
        internalUserId: uid,
        channel: 'max',
        kind,
        appointmentId,
        text,
        status: ok ? 'sent' : 'failed',
        error: errText
      });
    }
  } catch (e) {
    console.error(`[${now()}] Ошибка журналирования:`, e.message);
  }
};

// Обработчик Webhook
const handleMaxWebhook = async (req, res) => {
  const { update_type, message } = req.body;

  if (update_type !== 'message_created' || !message) {
    return res.status(200).send('OK');
  }

  const text = message.body?.text || '';
  const senderId = message.sender?.user_id;
  console.log(`[${now()}] Message from MAX, update_type: ${update_type} body.text: ${text}`);

  const client = await connectDB();

  try {
    // --- /start [id] ---
    if (/^\/start/.test(text)) {
      const linkUserId = text.split(' ')[1]?.trim();

      if (linkUserId) {
        const found = await client.query(
          'SELECT id, name, max_user_id FROM users WHERE id = $1',
          [linkUserId]
        );

        if (found.rowCount === 0) {
          await sendMaxMessage(senderId,
            'Пользователь не найден. Возможно, ссылка устарела — откройте профиль в Ларчике и получите свежую.',
            { kind: 'bot' });
        } else {
          const u = found.rows[0];
          if (u.max_user_id && String(u.max_user_id) !== String(senderId)) {
            await sendMaxMessage(senderId,
              `Аккаунт «${u.name}» уже привязан к другому профилю MAX. Если это ошибка — отвяжите его в профиле Ларчика или обратитесь в поддержку.`,
              { kind: 'bot', internalUserId: u.id });
          } else if (String(u.max_user_id) === String(senderId)) {
            await sendMaxMessage(senderId,
              `Привет, ${u.name}! Вы уже привязаны к Ларчику — напоминания о приёмах будут приходить сюда.`,
              { kind: 'bot', internalUserId: u.id });
          } else {
            await client.query('UPDATE users SET max_user_id = $1 WHERE id = $2',
              [String(senderId), u.id]);
            await sendMaxMessage(senderId,
              `✅ Отлично, ${u.name}! Теперь вы будете получать напоминания о приёмах здесь — за час до начала. Список последних: /last15`,
              { kind: 'bot', internalUserId: u.id });
          }
        }
      } else {
        const me = await findUserByMaxId(client, senderId);
        if (me) {
          await sendMaxMessage(senderId,
            `Привет, ${me.name}! Вы уже привязаны к Ларчику — напоминания о приёмах будут приходить сюда. Команды: /help, /last15`,
            { kind: 'bot', internalUserId: me.id });
        } else {
          await sendMaxMessage(senderId,
            'Привет! Чтобы получать напоминания о приёмах, перейдите по специальной ссылке из вашего профиля в Ларчике.',
            { kind: 'bot' });
        }
      }

    // --- /last15 (алиасы: /show_last_15, /history) ---
    } else if (/^\/(last15|show_last_15|history)/.test(text)) {
      const me = await findUserByMaxId(client, senderId);
      if (!me) {
        await sendMaxMessage(senderId,
          'Сначала привяжите аккаунт: перейдите по ссылке из профиля в Ларчике.',
          { kind: 'bot' });
      } else {
        const rows = await client.query(
          `SELECT text, kind, status, created_at
             FROM appt_notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 15`,
          [me.id]
        );

        if (rows.rowCount === 0) {
          await sendMaxMessage(senderId, 'Уведомлений пока не было.', { kind: 'bot', internalUserId: me.id });
        } else {
          const list = rows.rows
            .map((r, i) => {
              const dt = new Date(r.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
              const mark = r.status === 'failed' ? '⚠️' : (r.status === 'skipped' ? '⏭' : '');
              const body = r.text.length > 200 ? r.text.slice(0, 200) + '…' : r.text;
              return `${i + 1}. ${dt} ${mark}\n${body}`;
            })
            .join('\n\n');
          await sendMaxMessage(senderId, `📜 Последние уведомления:\n\n${list}`, { kind: 'bot', internalUserId: me.id });
        }
      }

    // --- /help ---
    } else if (/^\/help/.test(text)) {
      await sendMaxMessage(senderId,
        'Я — бот Ларчика. Напоминаю о предстоящих приёмах клиентов за час до начала.\n\n' +
        '/last15 — последние 15 уведомлений\n' +
        '/help — эта справка\n\n' +
        'Если бот ещё не привязан — откройте профиль в Ларчике и перейдите по ссылке привязки.',
        { kind: 'bot' });

    // --- прочее ---
    } else {
      await sendMaxMessage(senderId,
        'Не понял команду. Доступно: /help, /last15',
        { kind: 'bot' });
    }
  } catch (error) {
    console.error(`[${now()}] Ошибка обработки webhook:`, error);
    try {
      await sendMaxMessage(senderId, 'Произошла ошибка. Попробуйте позже.', { kind: 'bot' });
    } catch (_) { /* не роняем обработчик */ }
  }

  res.status(200).send('OK');
};

module.exports = { sendMaxMessage, handleMaxWebhook, logNotification };
