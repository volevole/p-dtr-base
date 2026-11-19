// server/services/maxBot.js
const { connectDB } = require('../db');

const MAX_API_URL = 'https://platform-api2.max.ru';
const TOKEN = process.env.MAX_BOT_TOKEN;

// Функция для отправки сообщения в MAX
const sendMaxMessage = async (userId, text) => {
  if (!userId || !TOKEN) return;

  try {
    const res = await fetch(`${MAX_API_URL}/messages?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: text,
        format: 'markdown' // или 'html'
      })
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('❌ Ошибка отправки в MAX:', err);
    } else {
      console.log(`✅ Сообщение в MAX отправлено для ${userId}`);
    }
  } catch (error) {
    console.error('❌ Ошибка сети при отправке в MAX:', error);
  }
};

// Обработчик Webhook (принимает сообщения от MAX)
const handleMaxWebhook = async (req, res) => {
  // MAX присылает объект с типом события и данными
  const { update_type, message } = req.body;

  // Нам нужно только событие нового сообщения
  if (update_type === 'message_created' && message) {
    const text = message.body.text;
    const chatId = message.chat_id;
    const senderId = message.sender.user_id;

    // Проверяем, что пришла команда /start
    if (text && text.startsWith('/start')) {
      // Извлекаем ID пользователя Ларчика после /start
      const larсhikUserId = text.split(' ')[1]?.trim();

      if (!larсhikUserId) {
        await sendMaxMessage(senderId, 'Привет! Чтобы привязать уведомления, перейдите по специальной ссылке из вашего профиля в Ларчике.');
      } else {
        try {
          const client = await connectDB();
          
          // Проверяем, есть ли такой пользователь в БД Ларчика
          const user = await client.query('SELECT id, name FROM users WHERE id = $1', [larсhikUserId]);
          
          if (user.rowCount === 0) {
            await sendMaxMessage(senderId, 'Пользователь не найден. Возможно, ссылка устарела.');
          } else {
            // Сохраняем MAX user_id в базу
            await client.query('UPDATE users SET max_user_id = $1 WHERE id = $2', [senderId, larсhikUserId]);
            await sendMaxMessage(senderId, `✅ Отлично, ${user.rows[0].name}! Теперь вы будете получать уведомления о приёмах прямо здесь.`);
          }
        } catch (error) {
          console.error('Ошибка привязки MAX:', error);
          await sendMaxMessage(senderId, 'Произошла ошибка при сохранении. Попробуйте позже.');
        }
      }
    }
  }

  // Отвечаем MAX, что мы получили событие (нужно для того, чтобы MAX не слал его повторно)
  res.status(200).send('OK');
};

module.exports = { sendMaxMessage, handleMaxWebhook };