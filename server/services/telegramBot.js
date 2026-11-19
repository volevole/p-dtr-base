// server/services/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
//const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');
const { connectDB } = require('../db');

// Инициализируем бота
const token = process.env.TELEGRAM_BOT_TOKEN;
//const bot = new TelegramBot(token, { polling: true });
const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

// 👈 Обработка команды /start
// 👈 Ловим все сообщения, начинающиеся с /start
bot.onText(/^\/start(.*)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const textAfterCommand = match[1].trim(); // Берем всё, что после /start
  const userId = textAfterCommand; // Это и есть наш ID

  if (!userId) {
    return bot.sendMessage(chatId, 'Привет! Чтобы привязать уведомления, перейдите по специальной ссылке из вашего профиля в Ларчике.');
  }

  try {
    const client = await connectDB();
    
    // Проверяем, есть ли такой пользователь
    const user = await client.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (user.rowCount === 0) {
      return bot.sendMessage(chatId, 'Пользователь не найден. Возможно, ссылка устарела или ID введен неверно.');
    }

    // Сохраняем chat_id
    await client.query('UPDATE users SET telegram_chat_id = $1 WHERE id = $2', [chatId, userId]);
    
    bot.sendMessage(chatId, `✅ Отлично, ${user.rows[0].name}! Теперь вы будете получать уведомления о приёмах прямо здесь.`);
  } catch (error) {
    console.error('Ошибка привязки Telegram:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при сохранении. Попробуйте позже.');
  }
});

// Функция для отправки уведомления
const sendTelegramNotification = async (chatId, text, url) => {
  try {
    // Используем Markdown для ссылки в конце сообщения
    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
  } catch (error) {
    console.error('Ошибка отправки Telegram-уведомления:', error);
  }
};

module.exports = { sendTelegramNotification, bot };