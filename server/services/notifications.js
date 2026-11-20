// server/services/notifications.js
const webpush = require('web-push');
const cron = require('node-cron');
const { connectDB } = require('../db');
const { sendMaxMessage, logNotification } = require('./maxBot');
// const { sendTelegramNotification } = require('./telegramBot'); // пока не активируем

// Настраиваем web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const TZ = 'Europe/Moscow';
const timeStr = (d) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

// Функция отправки пуша с жестким таймаутом.
// Возвращает true, если хотя бы одна подписка приняла пуш.
const sendPushToUser = async (userId, payload) => {
  console.log(`🔵 [PUSH] Начинаем отправку пуша для пользователя \${userId}`);
  const client = await connectDB();
  let anySuccess = false;

  try {
    const result = await client.query('SELECT subscription FROM push_subscriptions WHERE user_id = \$1', [userId]);
    console.log(`🔵 [PUSH] Найдено подписок: \${result.rowCount}`);

    if (result.rowCount === 0) {
      console.log('⚠️ [PUSH] Нет подписок для этого пользователя');
      return false;
    }

    for (const row of result.rows) {
      try {
        await Promise.race([
          webpush.sendNotification(row.subscription, JSON.stringify(payload)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Таймаут 5 секунд: сервер не может достучаться до FCM/APNs')), 5000))
        ]);
        console.log('✅ [PUSH] Пуш успешно отправлен для', userId);
        anySuccess = true;
      } catch (error) {
        console.error('❌ [PUSH] Ошибка отправки пуша:', error.message);
        if (error.statusCode === 410 || error.statusCode === 404) {
          await client.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription = $2', [userId, row.subscription]);
          console.log('🗑️ [PUSH] Удалена устаревшая подписка');
        }
      }
    }
  } catch (err) {
    console.error('❌ [PUSH] Ошибка в sendPushToUser:', err);
  } finally {
    console.log('🔵 [PUSH] Завершение функции sendPushToUser');
  }
  return anySuccess;
};

// 👈 ЗАПУСК CRON-ЗАДАЧИ (каждую минуту)
const startNotificationCron = () => {
  // Уведомления — только на проде. Локально (NODE_ENV != production)
  // и при явном DISABLE_NOTIFICATIONS=true крон не стартует вовсе.
  if (process.env.NODE_ENV !== 'production' || process.env.DISABLE_NOTIFICATIONS === 'true') {
    console.log('🔕 [NOTIFY] Планировщик уведомлений отключён (не production или DISABLE_NOTIFICATIONS=true)');
    return;
  }
  
  cron.schedule('* * * * *', async () => {
    const client = await connectDB();
    try {
      // Ищем только запланированные приёмы (status = 'scheduled')
      // Окно [60; 61) — ровно одна минута, чтобы избежать дублей
      const query = `
        SELECT
          a.id, a.appointment_date, a.buffer_before_minutes, a.master_id,
          u.max_user_id, u.telegram_chat_id,
          c.name AS client_name,
          s.name AS service_name,
          l.name AS location_name
        FROM appointments a
        JOIN users u ON u.id = a.master_id
        LEFT JOIN appt_clients   c ON c.id = a.client_id
        LEFT JOIN appt_services  s ON s.id = a.service_id
        LEFT JOIN appt_locations l ON l.id = a.location_id
        WHERE a.status = 'scheduled'
          AND (a.appointment_date - COALESCE(a.buffer_before_minutes, 0) * interval '1 minute')
              >= NOW() + interval '60 minutes'
          AND (a.appointment_date - COALESCE(a.buffer_before_minutes, 0) * interval '1 minute')
              <  NOW() + interval '61 minutes'
      `;

      const result = await client.query(query);

      for (const appt of result.rows) {
        // Защита от повторной отправки (перезапуск сервера, рестарт pm2 и т.п.)
        const already = await client.query(
          `SELECT 1 FROM appt_notifications
            WHERE appointment_id = \$1 AND kind = 'appointment'
            LIMIT 1`,
          [appt.id]
        );
        if (already.rowCount > 0) continue;

        const apptDate = new Date(appt.appointment_date);
        const prepDate = new Date(apptDate.getTime() - (appt.buffer_before_minutes || 0) * 60000);

        const apptLine = `Приём в \${timeStr(apptDate)} (МСК)`;
        const who = appt.client_name ? `Клиент: \${appt.client_name}` : 'Без клиента';
        const what = appt.service_name ? `Услуга: \${appt.service_name}` : null;
        const where = appt.location_name ? `Место: \${appt.location_name}` : null;
        const url = `https://react.c-e.ru/larchik/appointments/\${appt.id}`;

        // --- MAX ---
        if (appt.max_user_id) {
          const maxText = [
            `⏰ Через час — подготовка к приёму.`,
            `${apptLine}, начало подготовки в ${timeStr(prepDate)}`,
            who,
            what,
            where,
            '',
            url
          ].filter((s) => s !== null).join('\n');

          // sendMaxMessage сам запишет результат в appt_notifications (channel: max)
          await sendMaxMessage(String(appt.max_user_id), maxText, {
            kind: 'appointment',
            internalUserId: appt.master_id,
            appointmentId: appt.id
          });
        }

        // --- FCM (web-push) ---
        const pushOk = await sendPushToUser(appt.master_id, {
          title: 'Скоро начало подготовки',
          body: `В ${timeStr(prepDate)} подготовка к приёму в ${timeStr(apptDate)}: ${appt.client_name || 'Без клиента'}${appt.service_name ? ' — ' + appt.service_name : ''}`,
          url: `/larchik/appointments/\${appt.id}`
        });

        await logNotification(client, {
          internalUserId: appt.master_id,
          channel: 'fcm',
          kind: 'appointment',
          appointmentId: appt.id,
          text: `${apptLine}: ${who}\${appt.service_name ? ', ' + appt.service_name : ''}`,
          status: pushOk ? 'sent' : 'failed',
          error: pushOk ? null : 'нет активных подписок или все не доставлены'
        });

        /* --- Telegram (пока не активируем) ---
        if (appt.telegram_chat_id) {
          const tgText = `<b>⏰ Через час — подготовка к приёму</b>\n\n${apptLine}, подготовка в ${timeStr(prepDate)}\n${who}${appt.service_name ? '\nУслуга: ' + appt.service_name : ''}\n\n<a href="\${url}">Открыть в Ларчике</a>`;
          await sendTelegramNotification(appt.telegram_chat_id, tgText);
        }
        */

        // --- inApp (будущее) ---
        // if (апп запущен) -> отправка через WebSocket/SSE
      }
    } catch (error) {
      console.error('[CRON ERROR]', error.message);
    }
  });
};

module.exports = { startNotificationCron, sendPushToUser };
