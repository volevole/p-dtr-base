// ToolEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ToolEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchToolData();
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  const fetchToolData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setTool(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          display_order: data.display_order || 0
        });
      }
    } catch (error) {
      console.error('Error loading tool:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'display_order' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNew) {
        // Создание нового инструмента
        const { data, error } = await supabase
          .from('tools')
          .insert([{
            name: formData.name,
            description: formData.description,
            display_order: formData.display_order,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        alert('Инструмент успешно создан!');
        navigate(`/tool/${data.id}`);
      } else {
        // Обновление существующего инструмента
        const { error } = await supabase
          .from('tools')
          .update({
            name: formData.name,
            description: formData.description,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        alert('Инструмент успешно обновлен!');
        navigate(`/tool/${id}`);
      }
    } catch (error) {
      console.error('Error saving tool:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!isNew && !tool && !loading) return <div style={{ padding: '2rem' }}>Инструмент не найден</div>;

  const pageTitle = isNew ? 'Создание нового инструмента' : `Редактирование инструмента: ${tool?.name}`;
  const backLink = isNew ? '/tools' : `/tool/${id}`;

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
              Наименование инструмента: *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
              placeholder="Например: Микроскоп, Стетоскоп, Нож хирургический..."
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
          <h3>Описание инструмента</h3>
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
              placeholder="Опишите назначение, особенности использования, характеристики инструмента..."
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
            {saving ? 'Сохранение...' : (isNew ? 'Создать инструмент' : 'Сохранить изменения')}
          </button>
        </div>
      </form>

      {!isNew && tool && (
        <div style={{ marginTop: '30px' }}>
          <h3>Медиафайлы инструмента</h3>
          <MediaManager 
            entityType="tool"
            entityId={id}
            entityName={tool.name}
          />
        </div>
      )}

      {!isNew && tool && (
        <div style={{ 
          marginTop: '30px', 
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p><strong>ID:</strong> {tool.id}</p>
          <p><strong>Создан:</strong> {new Date(tool.created_at).toLocaleString('ru-RU')}</p>
          {tool.updated_at && (
            <p><strong>Обновлен:</strong> {new Date(tool.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolEditPage;