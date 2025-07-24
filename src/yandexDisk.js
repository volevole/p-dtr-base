/**
 * Отправляет файл на ваш бэкенд для загрузки на Яндекс.Диск
 * @param {File} file - Файл из <input type="file">
 * @param {string} muscleId - ID для именования файла
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadToYandexDisk(file, muscleId) {
  try {
    // 1. Подготовка данных
    const formData = new FormData();
    formData.append('file', file);
    formData.append('muscleId', muscleId); // Передаём ID для генерации имени файла

    // 2. Отправка на ваш бэкенд
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
      // headers НЕ нужны - FormData автоматически устанавливает 'Content-Type'
    });

    // 3. Обработка ответа
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка сервера');
    }

    return await response.json(); // { success: true, url: '...' }

  } catch (error) {
    console.error('Upload failed:', error);
    return { 
      success: false, 
      error: error.message || 'Неизвестная ошибка загрузки' 
    };
  }
}
