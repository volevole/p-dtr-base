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
    // ipwho.is поддерживает HTTPS и не требует ключа
    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.json();
    
    if (data.success) {
      return {
        country: data.country,
        countryCode: data.country_code,
        isProxy: data.security?.proxy || data.security?.vpn || false,
      };
    }
    return null;
  } catch (error) {
    console.error('Ошибка геолокации IP:', error);
    return null;
  }
};