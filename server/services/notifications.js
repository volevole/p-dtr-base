// server/services/notifications.js
const webpush = require('web-push');
const cron = require('node-cron');
const { connectDB } = require('../db');

// Настраиваем web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Функция отправки пуша
// Функция отправки пуша с жестким таймаутом
const sendPushToUser = async (userId, payload) => {
  console.log(`🔵 [PUSH] Начинаем отправку пуша для пользователя ${userId}`);
  const client = await connectDB();
  
  try {
    const result = await client.query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
    console.log(`🔵 [PUSH] Найдено подписок: ${result.rowCount}`);

    if (result.rowCount === 0) {
      console.log('⚠️ [PUSH] Нет подписок для этого пользователя');
      return;
    }
    
    for (const row of result.rows) {
      try {
        console.log('🔵 [PUSH] Попытка вызова webpush.sendNotification...');
        
        // 👈 Оборачиваем отправку в Promise.race с таймаутом 5 секунд
        await Promise.race([
          webpush.sendNotification(row.subscription, JSON.stringify(payload)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Таймаут 5 секунд: сервер не может достучаться до FCM/APNs')), 5000))
        ]);
        
        console.log('✅ [PUSH] Пуш успешно отправлен для', userId);
      } catch (error) {
        console.error('❌ [PUSH] Ошибка отправки пуша:', error.message);
        // Удаляем недействительные подписки
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
};

// 👈 ЗАПУСК CRON-ЗАДАЧИ (каждую минуту)
const startNotificationCron = () => {
  cron.schedule('* * * * *', async () => {
    const client = await connectDB();
    try {
      // Ищем приёмы, до начала подготовки которых осталось ровно 60 минут
      const query = `
        SELECT 
          a.id, a.appointment_date, a.buffer_before_minutes, a.master_id,
          c.name as client_name, 
          s.name as service_name
        FROM appointments a
        LEFT JOIN appt_clients c ON c.id = a.client_id
        LEFT JOIN appt_services s ON s.id = a.service_id
        WHERE a.status != 'canceled'
          AND (
            -- Вычисляем время начала подготовки: дата приёма минус буфер "до"
            (a.appointment_date - COALESCE(a.buffer_before_minutes, 0) * interval '1 minute')
            -- Проверяем, что это время ровно через 60 минут от текущего момента (с точностью до минуты)
            BETWEEN NOW() + interval '59 minutes' AND NOW() + interval '61 minutes'
          )
      `;
      
      const result = await client.query(query);

      for (const appt of result.rows) {
        // Формируем заголовок и тело
        const prepTime = new Date(new Date(appt.appointment_date).getTime() - (appt.buffer_before_minutes || 0) * 60000);
        const timeStr = prepTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        const title = `Скоро начало подготовки`;
        const body = `В ${timeStr} начало подготовки к событию: ${appt.client_name || 'Без клиента'} — ${appt.service_name}`;
        
        // Ссылка на карточку приёма
        const url = `/larchik/appointments/${appt.id}`;

        await sendPushToUser(appt.master_id, { title, body, url });
      }
    } catch (error) {
      console.error('[CRON ERROR]', error.message);
    }
  });
};

module.exports = { startNotificationCron, sendPushToUser };