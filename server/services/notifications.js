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
const sendPushToUser = async (userId, payload) => {
  const client = await connectDB();
  try {
    // Получаем все подписки этого пользователя
    const result = await client.query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
    
    for (const row of result.rows) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Подписка устарела, удаляем её
          await client.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription = $2', [userId, row.subscription]);
        } else {
          console.error('Ошибка отправки пуша:', error);
        }
      }
    }
  } finally {
    // client.release() если используешь пул
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
            (a.appointment_date - (a.buffer_before_minutes || 0) * interval '1 minute')
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