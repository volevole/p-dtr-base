// server/services/maxBot.js
const { connectDB } = require('../db');

const MAX_API_URL = 'https://platform-api2.max.ru';
const TOKEN = process.env.MAX_BOT_TOKEN;

// Функция для отправки сообщения в MAX
const sendMaxMessage = async (userId, text) => {
  if (!userId || !TOKEN) return;
  const now = new Date().toLocaleTimeString('ru-RU');
  console.log(`[${now}] Message to MAX, userId: ${userId} text: ${text}`);
  
  try {
    const res = await fetch(`${MAX_API_URL}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': TOKEN,           // токен без Bearer — как в офиц. примерах
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        format: 'markdown'
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
  const now = new Date().toLocaleTimeString('ru-RU');

  console.log(`[${now}] Message from MAX, update_type: ${update_type} body.text: ${message.body.text}`);
  // Нам нужно только событие нового сообщения
  if (update_type === 'message_created' && message) {
    const text = message.body.text;
    const chatId = message.chat_id;
    const senderId = message.sender.user_id;

    console.log(`[${now}] in Message from MAX, is it /start: ${text.startsWith('/start')} `);
    // Проверяем, что пришла команда /start
    if (text && text.startsWith('/start')) {
      // Извлекаем ID пользователя Ларчика после /start
      const larсhikUserId = text.split(' ')[1]?.trim();

      console.log(`[${now}] in Message from MAX, arсhikUserId: ${larсhikUserId} `);

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