// ToolDetail.js
import { createEntityDetail } from './factories/EntityDetailFactory';

const ToolDetail = createEntityDetail({
  entityName: 'Инструмент',
  entityType: 'tool',
  tableName: 'tools',
  listPath: '/tools',  // 👈 путь для кнопки "Назад"
  fields: [
    { name: 'name', label: 'Наименование' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'display_order', label: 'Порядок отображения' }
  ],
  hasMedia: true
});

export default ToolDetail;