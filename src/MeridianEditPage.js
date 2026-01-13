// MeridianEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';
import API_URL from './config/api';

function MeridianEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meridian, setMeridian] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    name_lat: '',
    code: '',
    type: '',
    description: '',
    course: '',
    functions: '',
    symptoms: '',
    notes: ''
  });

  useEffect(() => {
    fetchMeridianData();
  }, [id]);

  const fetchMeridianData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('meridians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setMeridian(data);
        setFormData({
          name: data.name || '',
          name_lat: data.name_lat || '',
          code: data.code || '',
          type: data.type || '',
          description: data.description || '',
          course: data.course || '',
          functions: data.functions || '',
          symptoms: data.symptoms || '',
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки меридиана:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('meridians')
        .update({
          name: formData.name,
          name_lat: formData.name_lat,
          code: formData.code,
          type: formData.type,
          description: formData.description,
          course: formData.course,
          functions: formData.functions,
          symptoms: formData.symptoms,
          notes: formData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      alert('Меридиан успешно обновлен!');
      navigate(`/meridian/${id}`);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!meridian) return <div style={{ padding: '2rem' }}>Меридиан не найден</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/meridian/${id}`}>← Назад к просмотру меридиана</Link>
      </div>

      <h2>Редактирование меридиана: {meridian.name}</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Основная информация</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Название (рус):
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Название (лат):
              </label>
              <input
                type="text"
                name="name_lat"
                value={formData.name_lat}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Код:
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                placeholder="Например: LU, LI, ST и т.д."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Тип:
              </label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                placeholder="Например: ручной Инь, ножной Ян и т.д."
              />
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '20px'
        }}>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Описание</h4>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '180px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Общее описание меридиана..."
            />
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Ход меридиана</h4>
            <textarea
              name="course"
              value={formData.course}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '180px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Описание хода меридиана по телу..."
            />
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '20px'
        }}>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Функции</h4>
            <textarea
              name="functions"
              value={formData.functions}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '180px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Основные функции меридиана..."
            />
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Симптомы</h4>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '180px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Симптомы дисфункции меридиана..."
            />
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Примечания</h4>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            style={{ 
              width: '100%', 
              padding: '10px', 
              fontSize: '16px',
              minHeight: '120px',
              resize: 'vertical',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            placeholder="Дополнительные примечания..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 24px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!saving) e.target.style.backgroundColor = '#218838';
          }}
          onMouseLeave={(e) => {
            if (!saving) e.target.style.backgroundColor = '#28a745';
          }}
        >
          {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения меридиана'}
        </button>
      </form>

      {/* Используем универсальный MediaManager для меридиана */}
      <MediaManager 
        entityType="meridian"
        entityId={id}
        entityName={meridian.name}
        API_URL={API_URL}
      />
    </div>
  );
}

export default MeridianEditPage;