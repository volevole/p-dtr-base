// ReceptorClassDetail.js
import { createEntityDetail } from './factories/EntityDetailFactory';

const ReceptorClassDetail = createEntityDetail({
  entityName: 'Класс рецепторов',
  entityType: 'receptor_class',
  tableName: 'receptor-classes',
  listPath: '/receptor_classes',  // ← явно указываем правильный путь
  fields: [
    { name: 'name', label: 'Название' },
    { name: 'antistimulus', label: 'Антистимул' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'display_order', label: 'Порядок отображения' }
  ],
  hasMedia: true
});

export default ReceptorClassDetail;