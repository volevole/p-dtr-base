// src/utils/formatPhone.js
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const formatPhone = (phoneStr) => {
  if (!phoneStr) return '—';
  
  try {
    const cleanPhone = String(phoneStr).trim();
    
    // Парсим номер (если нет плюса, считаем российским)
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, cleanPhone.startsWith('+') ? undefined : 'RU');
    
    // Если номер валидный (правильная длина для своей страны)
    if (phoneNumber && phoneNumber.isValid()) {
      // Форматируем в международном стиле (например, +7 915 135-35-80 или +49 171 1234567)
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    console.warn('Ошибка парсинга телефона:', phoneStr, error);
  }
  
  // Если номер невалидный (как этот тестовый +79151353580), 
  // возвращаем как есть, чтобы не позориться с кривыми скобками
  return phoneStr; 
};

export const cleanPhoneForDB = (phoneStr) => {
  if (!phoneStr) return '';
  const cleanPhone = String(phoneStr).trim();
  try {
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, cleanPhone.startsWith('+') ? undefined : 'RU');
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number; 
    }
  } catch (e) {}
  return cleanPhone.replace(/[^\d+]/g, '');
};

/**
 * Маска для ввода телефона (форматирует прямо во время набора)
 */
export const formatPhoneInput = (value) => {
  // Если поле пустое, ставим начальный префикс
  if (!value) return '+79';
  
  // Оставляем только цифры
  let digits = value.replace(/\D/g, '');
  
  // Если пользователь стер всё, оставляем +7 (чтобы он мог стереть и его)
  if (digits.length === 0) return value === '+' ? '+' : '+79';

  // Убираем ведущую 7 или 8, чтобы избежать дублирования
  if (digits.startsWith('7') || digits.startsWith('8')) {
    digits = digits.substring(1);
  }

  // Обрезаем до 10 цифр
  digits = digits.substring(0, 10);

  // Начинаем собирать красивую строку с пробелами
  let formatted = '+7 ';
  
  if (digits.length > 0) formatted += digits.substring(0, 3); // код оператора (903)
  if (digits.length > 3) formatted += ` ${digits.substring(3, 6)}`; // 146
  if (digits.length > 6) formatted += ` ${digits.substring(6, 8)}`; // 23
  if (digits.length > 8) formatted += ` ${digits.substring(8, 10)}`; // 18

  return formatted;
};