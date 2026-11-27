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

// 👈 Константы для страницы "Все приёмы"
export const LIST_LABELS = {
  title: 'Все приёмы',
  searchPlaceholder: 'Поиск по клиенту или услуге...',
  noResults: 'Приёмов не найдено.',
};

export const LIST_LABELS_VISITOR = {
  title: 'Все события',
  searchPlaceholder: 'Поиск по персоне или услуге...',
  noResults: 'Событий не найдено.',
};

// 👈 Константы для страницы "Карточка приёма"
export const DETAIL_LABELS = {
  title: 'Карточка приёма',
  sectionInfo: 'Карта приёма',
  client: 'Клиент',
  NOclient: 'Без клиента',
  complaints: 'Жалобы, запросы клиента',
  complaintsPlaceholder: 'На что жалуется клиент? (боль, ограничение движения и т.д.)',
  notes: 'Общие заметки мастера',
  notesPlaceholder: 'Ход сеанса, результаты тестов, рекомендации...',
};

export const DETAIL_LABELS_VISITOR = {
  title: 'Карточка события',
  sectionInfo: 'О событии',
  client: 'Персона',
  NOclient: 'Без персоны',
  complaints: 'Ожидания и планы',
  complaintsPlaceholder: 'В программе заявлено:',
  notes: 'Фактические заметки о событии',
  notesPlaceholder: 'Что запомнилось... Заметки...',
};

// 👈 Константы для модальных окон приёма (Создание/Редактирование)
export const MODAL_LABELS = {
  createTitle: 'Новый приём',
  editTitle: 'приём',
  client: 'Клиент',
  addclient: 'клиента',
  ofclient: 'клиента',
  statusCompleted: 'услуга оказана, приём завершён',
  statusNoShow: 'Клиент не пришёл',  
  toClient: 'клиенту',
  generalNotes: 'Общие заметки мастера',  
  goToCard: 'приёма',
  myclients: 'Мои клиенты',
  delclient: 'клиента',
  Cards: 'приёмы',
  newclient: 'Новый клиент',
  noclient: 'клиентов',
  activelient: 'Активный клиент',
  first: 'первый приём',
  last: 'последний приём',
  noevent: 'У этого клиента ещё нет приёмов',
  setCard: 'приёмов',
  before: 'приёмом',
  toevents: 'приёмам',
  aboutevents: 'приёмах',
  ofevents: 'приёме',
};

export const MODAL_LABELS_VISITOR = {
  createTitle: 'Новое событие',
  editTitle: 'событие',
  client: 'Персона',
  addclient: '',
  ofclient: 'персоны',
  statusCompleted: 'событие завершено',
  statusNoShow: 'Событие не состоялось',  
  toClient: 'персоне',
  generalNotes: 'Фактические заметки о событии',  
  goToCard: 'события',
  myclients: 'Персоналии',
  delclient: 'персону',
  Cards: 'события',
  newclient: 'Новая персона',
  noclient: 'персоналий',
  activelient: 'Активная персона',
  first: 'первое событие',
  last: 'последнее событие',
  noevent: 'У этой персоны ещё нет событий',
  setCard: 'событий',
  before: 'событием',
  toevents: 'событиям',
  aboutevents: 'событиях',
  ofevents: 'событии',
};