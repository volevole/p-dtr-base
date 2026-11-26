// src/utils/appLogic.js

// 👈 Константы для напоминаний (лидов)
export const LEAD_MINUTES_OPTIONS = [1440, 360, 60, 30, 15, 5];

export const LEAD_LABELS = {
  1440: 'за 24 часа',
  360: 'за 6 часов',
  60: 'за 1 час',
  30: 'за 30 мин',
  15: 'за 15 мин',
  5: 'за 5 мин'
};

export const getLeadLabel = (minutes) => {
  return LEAD_LABELS[minutes] || `за ${minutes} мин`;
};

// 👈 Сюда в будущем можно добавлять другие константы и справочники:
// export const APPOINTMENT_STATUSES = [...];
// export const ROLES = [...];
// и т.д.

// 👈 Константы для названий разделов (обычный режим)
export const MENU_LABELS = {
  appName: 'Ларчик P-DTR',
  appointmentsSection: 'Ведение приёмов',
  clients: 'Клиенты',
  schedule: 'Расписание (Записи)',
  allAppointments: 'Все приёмы',
};

// 👈 Константы для названий разделов (режим событий / visitor)
export const MENU_LABELS_VISITOR = {
  appName: 'Ларчик',
  appointmentsSection: 'Планирование событий',
  clients: 'Персоналии',
  schedule: 'Расписание',
  allAppointments: 'События',
};