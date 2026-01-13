// ReceptorEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ReceptorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [receptor, setReceptor] = useState(null);
  const [receptorClasses, setReceptorClasses] = useState([]);
  const [receptorPairs, setReceptorPairs] = useState([]);
  const [allReceptors, setAllReceptors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    class_id: '',
    location: '',
    own_stimulus: '',
    antistimulus: '',
    inhibition_pattern: '',
    description: '',
    display_order: 0
  });

  const [pairForm, setPairForm] = useState({
    pair_type: 'receptor',
    paired_receptor_id: '',
    paired_class_id: '',
    notes: ''
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchReceptorData();
      fetchReceptorPairs();
    } else {
      setLoading(false);
    }
    
    fetchReceptorClasses();
    fetchAllReceptors();
  }, [id, isNew]);

  const fetchReceptorData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('receptors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setReceptor(data);
        setFormData({
          name: data.name || '',
          class_id: data.class_id || '',
          location: data.location || '',
          own_stimulus: data.own_stimulus || '',
          antistimulus: data.antistimulus || '',
          inhibition_pattern: data.inhibition_pattern || '',
          description: data.description || '',
          display_order: data.display_order || 0
        });
      }
    } catch (error) {
      console.error('Error loading receptor:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceptorClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('receptor_classes')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      setReceptorClasses(data || []);
    } catch (error) {
      console.error('Error loading receptor classes:', error);
    }
  };

  const fetchAllReceptors = async () => {
    try {
      const { data, error } = await supabase
        .from('receptors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setAllReceptors(data || []);
    } catch (error) {
      console.error('Error loading receptors:', error);
    }
  };

  const fetchReceptorPairs = async () => {
    try {
      const { data, error } = await supabase
        .from('receptor_pairs')
        .select(`
          *,
          paired_receptor:receptors!receptor_pairs_paired_receptor_id_fkey(id, name),
          paired_class:receptor_classes!receptor_pairs_paired_class_id_fkey(id, name)
        `)
        .eq('receptor_id', id)
        .order('created_at');

      if (error) throw error;
      
      setReceptorPairs(data || []);
    } catch (error) {
      console.error('Error loading receptor pairs:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'display_order' ? parseInt(value) || 0 : value
    }));
  };

  const handlePairFormChange = (e) => {
    const { name, value } = e.target;
    setPairForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPair = async () => {
    if (!pairForm.paired_receptor_id && !pairForm.paired_class_id) {
      alert('Выберите рецептор или класс для добавления в пары');
      return;
    }

    try {
      const pairData = {
        receptor_id: id,
        pair_type: pairForm.pair_type,
        notes: pairForm.notes || null
      };

      if (pairForm.paired_receptor_id) {
        pairData.paired_receptor_id = pairForm.paired_receptor_id;
      } else if (pairForm.paired_class_id) {
        pairData.paired_class_id = pairForm.paired_class_id;
      }

      const { error } = await supabase
        .from('receptor_pairs')
        .insert([pairData]);

      if (error) throw error;

      // Обновляем список пар
      await fetchReceptorPairs();
      
      // Сбрасываем форму
      setPairForm({
        pair_type: 'receptor',
        paired_receptor_id: '',
        paired_class_id: '',
        notes: ''
      });

      alert('Парная запись успешно добавлена!');
    } catch (error) {
      console.error('Error adding receptor pair:', error);
      alert('Ошибка при добавлении пары: ' + error.message);
    }
  };

  const handleDeletePair = async (pairId) => {
    // Используем window.confirm вместо глобального confirm
    if (!window.confirm('Вы уверены, что хотите удалить эту запись о паре?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('receptor_pairs')
        .delete()
        .eq('id', pairId);

      if (error) throw error;

      // Обновляем список пар
      await fetchReceptorPairs();
      alert('Запись о паре успешно удалена!');
    } catch (error) {
      console.error('Error deleting receptor pair:', error);
      alert('Ошибка при удалении пары: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNew) {
        // Create new receptor
        const { data, error } = await supabase
          .from('receptors')
          .insert([{
            name: formData.name,
            class_id: formData.class_id || null,
            location: formData.location,
            own_stimulus: formData.own_stimulus,
            antistimulus: formData.antistimulus,
            inhibition_pattern: formData.inhibition_pattern,
            description: formData.description,
            display_order: formData.display_order,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        alert('Рецептор успешно создан!');
        navigate(`/receptor/${data.id}`);
      } else {
        // Update existing receptor
        const { error } = await supabase
          .from('receptors')
          .update({
            name: formData.name,
            class_id: formData.class_id || null,
            location: formData.location,
            own_stimulus: formData.own_stimulus,
            antistimulus: formData.antistimulus,
            inhibition_pattern: formData.inhibition_pattern,
            description: formData.description,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        alert('Рецептор успешно обновлен!');
        navigate(`/receptor/${id}`);
      }
    } catch (error) {
      console.error('Error saving receptor:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!isNew && !receptor && !loading) return <div style={{ padding: '2rem' }}>Рецептор не найден</div>;

  const pageTitle = isNew ? 'Создание нового рецептора' : `Редактирование рецептора: ${receptor?.name}`;
  const backLink = isNew ? '/receptors' : `/receptor/${id}`;

  return (
    <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={backLink}>← Назад</Link>
      </div>

      <h2>{pageTitle}</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Основная информация</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Название рецептора: *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
              placeholder="Например: Мышечное веретено, Сухожильный орган Гольджи..."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Класс рецепторов:
            </label>
            <select
              name="class_id"
              value={formData.class_id}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            >
              <option value="">Не выбран</option>
              {receptorClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Место нахождения:
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              placeholder="Например: Мышечная ткань, Сухожилия, Кожа..."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Собственный стимул:
            </label>
            <input
              type="text"
              name="own_stimulus"
              value={formData.own_stimulus}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              placeholder="Что активирует этот рецептор?"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Антистимул:
            </label>
            <input
              type="text"
              name="antistimulus"
              value={formData.antistimulus}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              placeholder="Что является антистимулом для этого рецептора?"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Паттерн ингибиции:
            </label>
            <textarea
              name="inhibition_pattern"
              value={formData.inhibition_pattern}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="Опишите паттерн ингибиции для этого рецептора..."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Порядок отображения:
            </label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              min="0"
            />
            <small style={{ color: '#6c757d' }}>Чем меньше число, тем выше в списке</small>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Описание рецептора</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Подробное описание:
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '200px',
                resize: 'vertical'
              }}
              placeholder="Опишите особенности этого рецептора, его функции, характеристики, значение в организме..."
            />
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '15px',
          justifyContent: 'flex-end',
          borderTop: '1px solid #dee2e6',
          paddingTop: '20px'
        }}>
          <button
            type="button"
            onClick={() => navigate(backLink)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Отмена
          </button>
          
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {saving ? 'Сохранение...' : (isNew ? 'Создать рецептор' : 'Сохранить изменения')}
          </button>
        </div>
      </form>

      {/* Управление парными рецепторами */}
      {!isNew && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Парные рецепторы и классы</h3>
          
          {/* Форма добавления новой пары */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginBottom: '15px' }}>Добавить парную запись</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Тип пары:
              </label>
              <select
                name="pair_type"
                value={pairForm.pair_type}
                onChange={handlePairFormChange}
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              >
                <option value="receptor">Парный рецептор</option>
                <option value="class">Парный класс</option>
              </select>
            </div>

            {pairForm.pair_type === 'receptor' ? (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Парный рецептор:
                </label>
                <select
                  name="paired_receptor_id"
                  value={pairForm.paired_receptor_id}
                  onChange={handlePairFormChange}
                  style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                >
                  <option value="">Выберите рецептор</option>
                  {allReceptors
                    .filter(r => r.id !== id) // Исключаем текущий рецептор
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Парный класс:
                </label>
                <select
                  name="paired_class_id"
                  value={pairForm.paired_class_id}
                  onChange={handlePairFormChange}
                  style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                >
                  <option value="">Выберите класс</option>
                  {receptorClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Примечания:
              </label>
              <textarea
                name="notes"
                value={pairForm.notes}
                onChange={handlePairFormChange}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  fontSize: '16px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Дополнительные примечания о паре..."
              />
            </div>

            <button
              type="button"
              onClick={handleAddPair}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Добавить парную запись
            </button>
          </div>

          {/* Список существующих пар */}
          {receptorPairs.length > 0 ? (
            <div>
              <h4 style={{ marginBottom: '15px' }}>Существующие парные записи</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                gap: '15px'
              }}>
                {receptorPairs.map(pair => (
                  <div 
                    key={pair.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#fff',
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={() => handleDeletePair(pair.id)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Удалить
                    </button>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Тип пары:</strong> {pair.pair_type === 'receptor' ? 'Парный рецептор' : 'Парный класс'}
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Парная сущность:</strong> {pair.paired_receptor ? pair.paired_receptor.name : pair.paired_class?.name}
                    </div>
                    
                    {pair.notes && (
                      <div style={{ 
                        marginTop: '10px',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        color: '#666'
                      }}>
                        <strong>Примечания:</strong> {pair.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic'
            }}>
              Нет парных рецепторов или классов
            </div>
          )}
        </div>
      )}

      {!isNew && receptor && (
        <div style={{ marginTop: '30px' }}>
          <h3>Медиафайлы рецептора</h3>
          <MediaManager 
            entityType="receptor"
            entityId={id}
            entityName={receptor.name}
          />
        </div>
      )}

      {!isNew && receptor && (
        <div style={{ 
          marginTop: '30px', 
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p><strong>ID:</strong> {receptor.id}</p>
          <p><strong>Создан:</strong> {new Date(receptor.created_at).toLocaleString('ru-RU')}</p>
          {receptor.updated_at && (
            <p><strong>Обновлен:</strong> {new Date(receptor.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceptorEditPage;