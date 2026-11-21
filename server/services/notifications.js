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

// Функция отправки пуша с жестким таймаутом.  // --- FCM (web-push) ---
// Возвращает true, если хотя бы одна подписка приняла пуш.
const sendPushToUser = async (userId, payload, masterName = null) => {
  console.log(`🔵 [PUSH] Начинаем отправку пуша для пользователя ${userId} (${masterName || '—'})`);
  const client = await connectDB();
  let anySuccess = false;

  try {
    const result = await client.query('SELECT subscription FROM push_subscriptions WHERE user_id = \$1', [userId]);
    console.log(`🔵 [PUSH] Найдено подписок: ${result.rowCount}`);

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
        console.log(`✅ [PUSH] Пуш успешно отправлен для ${userId} (${masterName || '—'})`);
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
// Настройка напоминаний: за сколько минут до начала подготовки оповещать.
// Пока — константа «за час». Позже переедет в user_settings каждого мастера.
const LEAD_MINUTES = [60];

// Человекочитаемая метка лида
const leadLabel = (m) =>
  m === 60 ? 'Через час' : (m % 10 === 1 && m !== 11 ? `Через ${m} минуту` : `Через ${m} минут`);

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
      // Для каждого «лида» (за 60, 15, 5 мин) считаем свой момент напоминания:
      // appointment_date - buffer_before - lead_minutes.
      // Сравниваем минуты через date_trunc, чтобы миллисекунды NOW() не съедали окно.
      // Окно догона: моменты, наступившие за последние 5 минут, тоже отправляем
      // (если сервер лежал или перезапускался). Дедупликация «5 минут» ниже
      // не даст задвоить те, что уже ушли в свой момент.
      const query = `
        SELECT
          a.id, a.appointment_date, a.buffer_before_minutes,
          a.duration_minutes, a.record_notes, a.master_id,
          u.max_user_id, u.telegram_chat_id, u.name AS master_name,
          n.lead_minutes,
          c.name AS client_name,
          s.name AS service_name,
          l.name AS location_name
        FROM appointments a
        JOIN users u ON u.id = a.master_id
        JOIN unnest($1::int[]) AS n(lead_minutes) ON true
        LEFT JOIN appt_clients   c ON c.id = a.client_id
        LEFT JOIN appt_services  s ON s.id = a.service_id
        LEFT JOIN appt_locations l ON l.id = a.location_id
        WHERE a.status = 'scheduled'
          AND date_trunc('minute',
                a.appointment_date
                - COALESCE(a.buffer_before_minutes, 0) * interval '1 minute'
                - n.lead_minutes * interval '1 minute')
              BETWEEN date_trunc('minute', NOW()) - interval '5 minutes'
                  AND date_trunc('minute', NOW())
      `;

      const result = await client.query(query, [LEAD_MINUTES]);
      console.log(`[NOTIFY] ${new Date().toLocaleTimeString('ru-RU')}: к отправке найдено приёмов: ${result.rowCount}`);

      for (const appt of result.rows) {
        // Правило повтора: шлём, только если по этому приёму и этому лиду
        // за последние 5 минут ещё не отправляли. Перенос приёма на новое время
        // даст новый момент напоминания — и если с прошлой отправки прошло
        // больше 5 минут, уведомление уйдёт заново.
        const recent = await client.query(
          `SELECT 1 FROM appt_notifications
            WHERE appointment_id = $1
              AND kind = 'appointment'
              AND lead_minutes = $2
              AND created_at > NOW() - interval '5 minutes'
            LIMIT 1`,
          [appt.id, appt.lead_minutes]
        );
        if (recent.rowCount > 0) {
          console.log(`[NOTIFY] Приём ${appt.id} (lead ${appt.lead_minutes} мин): отправка была в последние 5 минут — пропуск`);
          continue;
        }

        const apptDate = new Date(appt.appointment_date);
        const prepDate = new Date(apptDate.getTime() - (appt.buffer_before_minutes || 0) * 60000);
        const when = leadLabel(appt.lead_minutes);

        // --- MAX ---
        if (appt.max_user_id) {
          // 1. Первая строка — превью в списке чатов: имя клиента или примечание
          let previewLine = '';
          if (appt.client_name) {
            previewLine = `**${appt.client_name}**`;
          } else if (appt.record_notes) {
            const notePreview = appt.record_notes.length > 50
              ? appt.record_notes.substring(0, 47) + '…'
              : appt.record_notes;
            previewLine = `**${notePreview}**`;
          } else {
            previewLine = `Приём в ${timeStr(apptDate)}`;
          }

          // 2. Полное сообщение в стиле карточки приёма
          const lines = [
            previewLine,
            `⏰ ${when} — подготовка к приёму (в ${timeStr(prepDate)}).`,
            ``,
            `${timeStr(apptDate)} — ${appt.service_name || 'Приём'} — ${appt.duration_minutes} мин`
          ];
          if (appt.location_name) lines.push(`📍 ${appt.location_name}`);
          if (appt.client_name && appt.record_notes) {
            lines.push(`📝 _${appt.record_notes}_`);
          }
          lines.push('', `https://react.c-e.ru/larchik/appointments/${appt.id}`);

          await sendMaxMessage(String(appt.max_user_id), lines.join('\n'), {
            kind: 'appointment',
            internalUserId: appt.master_id,
            appointmentId: appt.id,
            leadMinutes: appt.lead_minutes,
            masterName: appt.master_name
          });
        }

        // --- FCM (web-push) ---
        const pushTitle = `${when} — подготовка к приёму`;
        const pushBody = appt.client_name
          ? `${appt.client_name}${appt.service_name ? ' — ' + appt.service_name : ''}, в ${timeStr(apptDate)}`
          : (appt.record_notes || `Приём в ${timeStr(apptDate)}`);

        const pushOk = await sendPushToUser(appt.master_id, {
          title: pushTitle,
          body: pushBody,
          url: `/larchik/appointments/${appt.id}`
        } , appt.master_name);

        await logNotification(client, {
          internalUserId: appt.master_id,
          channel: 'fcm',
          kind: 'appointment',
          appointmentId: appt.id,
          leadMinutes: appt.lead_minutes,
          text: `${pushTitle}: ${pushBody}`,
          status: pushOk ? 'sent' : 'failed',
          error: pushOk ? null : 'нет активных подписок или все не доставлены'
        });

        /* --- Telegram (пока не активируем) ---
        if (appt.telegram_chat_id) {
          const tgText = `<b>${when} — подготовка к приёму</b>\n\n${appt.client_name || appt.record_notes || ''}, в ${timeStr(apptDate)}\n\n<a href="https://react.c-e.ru/larchik/appointments/${appt.id}">Открыть в Ларчике</a>`;
          await sendTelegramNotification(appt.telegram_chat_id, tgText);
        }
        */

        // --- inApp (будущее) ---
      }
    } catch (error) {
      console.error('[CRON ERROR]', error.message);
    }
  });
};



module.exports = { startNotificationCron, sendPushToUser };
