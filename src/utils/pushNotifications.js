import API_URL from '../config/api';

// Функция для конвертации base64 в Uint8Array (нужно для VAPID)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeUserToPush = async () => {
  // 1. Проверяем поддержку
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push-уведомления не поддерживаются этим браузером');
    return false;
  }

  try {
    // 2. Регистрируем Service Worker (если еще не зарегистрирован)
    const registration = await navigator.serviceWorker.register('/larchik/service-worker.js');
    await navigator.serviceWorker.ready;

    // 3. Запрашиваем разрешение у пользователя
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Пользователь отклонил запрос на уведомления');
      return false;
    }

    // 4. Подписываемся на пуши
    const publicVapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) throw new Error('Не задан REACT_APP_VAPID_PUBLIC_KEY');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 5. Отправляем подписку на сервер
    await fetch(`${API_URL}/api/auth/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscription })
    });

    console.log('✅ Успешно подписались на пуши!');
    return true;
  } catch (error) {
    console.error('Ошибка подписки на пуши:', error);
    return false;
  }
};