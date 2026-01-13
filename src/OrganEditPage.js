// OrganEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';
import API_URL from './config/api';

function OrganEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organ, setOrgan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    name_lat: '',
    system: '',
    description: '',
    functions: '',
    symptoms: '',
    diagnostic: '',
    treatment: '',
    notes: ''
  });


  useEffect(() => {
    fetchOrganData();
  }, [id]);

  // Загрузка данных органа
  const fetchOrganData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setOrgan(data);
        setFormData({
          name: data.name || '',
          name_lat: data.name_lat || '',
          system: data.system || '',
          description: data.description || '',
          functions: data.functions || '',
          symptoms: data.symptoms || '',
          diagnostic: data.diagnostic || '',
          treatment: data.treatment || '',
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки органа:', error);
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
      [name]: value
    }));
  };

  // Сохранение изменений органа
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organs')
        .update({
          name: formData.name,
          name_lat: formData.name_lat,
          system: formData.system,
          description: formData.description,
          functions: formData.functions,
          symptoms: formData.symptoms,
          diagnostic: formData.diagnostic,
          treatment: formData.treatment,
          notes: formData.notes
        })
        .eq('id', id);

      if (error) throw error;

      alert('Орган успешно обновлен!');
      navigate(`/organ/${id}`);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!organ) return <div style={{ padding: '2rem' }}>Орган не найден</div>;

  return (
    <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/organ/${id}`}>← Назад к просмотру органа</Link>
      </div>

      <h2>Редактирование органа: {organ.name}</h2>

      {/* Форма редактирования органа */}
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
              Название (рус):
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Название (лат):
            </label>
            <input
              type="text"
              name="name_lat"
              value={formData.name_lat}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Система:
            </label>
            <input
              type="text"
              name="system"
              value={formData.system}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Текстовые поля */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Описание:
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Функции:
            </label>
            <textarea
              name="functions"
              value={formData.functions}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Симптомы дисфункции:
            </label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Диагностика:
            </label>
            <textarea
              name="diagnostic"
              value={formData.diagnostic}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Лечение:
            </label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Примечания:
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

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
          {saving ? 'Сохранение...' : 'Сохранить изменения органа'}
        </button>
      </form>

      {/* Используем универсальный MediaManager */}
      <MediaManager 
        entityType="organ"
        entityId={id}
        entityName={organ.name}
        API_URL={API_URL}
      />
    </div>
  );
}

export default OrganEditPage;