// src/utils/ipInfo.js

// Получаем публичный IP клиента через бесплатный сервис
export const getClientIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (error) {
    console.error('Ошибка получения IP клиента:', error);
    return 'Не удалось определить';
  }
};

// Получаем информацию об IP (страна, прокси) через ip-api.com
export const getIpGeoInfo = async (ip) => {
  if (!ip || ip === 'Не удалось определить') return null;
  
  try {
    // Запрашиваем страну и флаг proxy (VPN/прокси)
    // Бесплатный лимит: 45 запросов в минуту
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,proxy,hosting`);
    const data = await res.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        isProxy: data.proxy || data.hosting, // proxy = VPN/прокси, hosting = дата-центр
      };
    }
    return null;
  } catch (error) {
    console.error('Ошибка геолокации IP:', error);
    return null;
  }
};