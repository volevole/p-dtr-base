// ReceptorClassEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ReceptorClassEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [receptorClass, setReceptorClass] = useState(null);
  const [loading, setLoading] = useState(!isNew); // НЕ загружаем для нового
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    antistimulus: '',
    description: '',
    display_order: 0
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchReceptorClassData();
    } else {
      // Для нового класса сразу готовим форму
      setLoading(false);
    }
  }, [id, isNew]);

  // Загрузка данных класса рецепторов
  const fetchReceptorClassData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('receptor_classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setReceptorClass(data);
        setFormData({
          name: data.name || '',
          antistimulus: data.antistimulus || '',
          description: data.description || '',
          display_order: data.display_order || 0
        });
      }
    } catch (error) {
      console.error('Error loading receptor class:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'display_order' ? parseInt(value) || 0 : value
    }));
  };

  // Сохранение изменений класса рецепторов
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNew) {
        // Создание нового класса рецепторов
        const { data, error } = await supabase
          .from('receptor_classes')
          .insert([{
            name: formData.name,
            antistimulus: formData.antistimulus,
            description: formData.description,
            display_order: formData.display_order,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        alert('Класс рецепторов успешно создан!');
        navigate(`/receptor-class/${data.id}`);
      } else {
        // Обновление существующего класса
        const { error } = await supabase
          .from('receptor_classes')
          .update({
            name: formData.name,
            antistimulus: formData.antistimulus,
            description: formData.description,
            display_order: formData.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        alert('Класс рецепторов успешно обновлен!');
        navigate(`/receptor-class/${id}`);
      }
    } catch (error) {
      console.error('Error saving receptor class:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!isNew && !receptorClass && !loading) return <div style={{ padding: '2rem' }}>Класс рецепторов не найден</div>;

  const pageTitle = isNew ? 'Создание нового класса рецепторов' : `Редактирование класса: ${receptorClass?.name}`;
  const backLink = isNew ? '/receptor-classes' : `/receptor-class/${id}`;

  return (
    <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={backLink}>← Назад</Link>
      </div>

      <h2>{pageTitle}</h2>

      {/* Форма редактирования класса рецепторов */}
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
              Название класса:
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
              placeholder="Например: Проприорецепторы, Хеморецепторы..."
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
              placeholder="Что является антистимулом для этого класса рецепторов?"
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

        {/* Описание */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Описание класса</h3>
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
              placeholder="Опишите особенности этого класса рецепторов, их функции, характеристики..."
            />
          </div>
        </div>

        {/* Кнопки действий */}
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
            {saving ? 'Сохранение...' : (isNew ? 'Создать класс' : 'Сохранить изменения')}
          </button>
        </div>
      </form>

      {/* Медиафайлы - только для редактирования существующего */}
      {!isNew && receptorClass && (
        <div style={{ marginTop: '30px' }}>
          <h3>Медиафайлы класса рецепторов</h3>
          <MediaManager 
            entityType="receptor_class"
            entityId={id}
            entityName={receptorClass.name}
          />
        </div>
      )}

      {/* Информация о создании/редактировании */}
      {!isNew && receptorClass && (
        <div style={{ 
          marginTop: '30px', 
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p><strong>ID:</strong> {receptorClass.id}</p>
          <p><strong>Создан:</strong> {new Date(receptorClass.created_at).toLocaleString('ru-RU')}</p>
          {receptorClass.updated_at && (
            <p><strong>Обновлен:</strong> {new Date(receptorClass.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceptorClassEditPage;