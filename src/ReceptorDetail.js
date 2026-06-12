// ReceptorDetail.js - через универсальную фабрику
import { createEntityDetail } from './factories/EntityDetailFactory';

const ReceptorDetail = createEntityDetail({
  entityName: 'Рецептор',
  entityType: 'receptor',
  tableName: 'receptors',
  fields: [
    { name: 'name', label: 'Название' },
    { name: 'class_id', label: 'Класс', render: (value, entity) => {
      // TODO: подгрузить имя класса
      return value || '—';
    }},
    { name: 'location', label: 'Место нахождения' },
    { name: 'own_stimulus', label: 'Собственный стимул' },
    { name: 'antistimulus', label: 'Антистимул' },
    { name: 'inhibition_pattern', label: 'Паттерн ингибиции', type: 'textarea' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'display_order', label: 'Порядок отображения' }
  ],
  hasMedia: true
});

export default ReceptorDetail;