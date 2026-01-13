// EntryEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function EntryEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchEntryData();
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  const fetchEntryData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setEntry(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          display_order: data.display_order || 0,
          is_active: data.is_active !== false // По умолчанию true
        });
      }
    } catch (error) {
      console.error('Error loading entry:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'display_order' ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNew) {
        // Создание нового захода
        const { data, error } = await supabase
          .from('entries')
          .insert([{
            name: formData.name,
            description: formData.description,
            display_order: formData.display_order,
            is_active: formData.is_active,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        alert('Заход успешно создан!');
        navigate(`/entry/${data.id}`);
      } else {
        // Обновление существующего захода
        const { error } = await supabase
          .from('entries')
          .update({
            name: formData.name,
            description: formData.description,
            display_order: formData.display_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        alert('Заход успешно обновлен!');
        navigate(`/entry/${id}`);
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!isNew && !entry && !loading) return <div style={{ padding: '2rem' }}>Заход не найден</div>;

  const pageTitle = isNew ? 'Создание нового захода' : `Редактирование захода: ${entry?.name}`;
  const backLink = isNew ? '/entries' : `/entry/${id}`;

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
              Название захода: *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
              placeholder="Например: Заход от слабой мышцы, Заход от тотального гипертонуса..."
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

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <span>Заход активен (отображается в списках)</span>
            </label>
            <small style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
              Если снять галочку, заход будет скрыт из выпадающих списков, но останется в базе данных
            </small>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Описание захода</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Подробное описание алгоритма:
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
              placeholder="Опишите алгоритм захода: последовательность действий, критерии выбора, особенности применения..."
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
            {saving ? 'Сохранение...' : (isNew ? 'Создать заход' : 'Сохранить изменения')}
          </button>
        </div>
      </form>

      {!isNew && entry && (
        <div style={{ marginTop: '30px' }}>
          <h3>Медиафайлы захода</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Здесь можно добавить схемы, алгоритмы, видео-инструкции и другие материалы, связанные с этим заходом.
          </p>
          <MediaManager 
            entityType="entry"
            entityId={id}
            entityName={entry.name}
          />
        </div>
      )}

      {!isNew && entry && (
        <div style={{ 
          marginTop: '30px', 
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p><strong>ID:</strong> {entry.id}</p>
          <p><strong>Создан:</strong> {new Date(entry.created_at).toLocaleString('ru-RU')}</p>
          {entry.updated_at && (
            <p><strong>Обновлен:</strong> {new Date(entry.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default EntryEditPage;