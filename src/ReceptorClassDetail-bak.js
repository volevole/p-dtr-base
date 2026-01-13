// ReceptorClassDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ReceptorClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receptorClass, setReceptorClass] = useState(null);
  const [receptors, setReceptors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Загрузка класса рецепторов
      const { data: classData, error: classError } = await supabase
        .from('receptor_classes')
        .select('*')
        .eq('id', id)
        .single();

      if (classError) throw classError;

      // Загрузка рецепторов этого класса
      const { data: receptorsData, error: receptorsError } = await supabase
        .from('receptors')
        .select('*')
        .eq('class_id', id)
        .eq('is_active', true)
        .order('display_order');

      if (receptorsError) throw receptorsError;

      setReceptorClass(classData);
      setReceptors(receptorsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!receptorClass) return <div style={{ padding: '2rem' }}>Класс рецепторов не найден</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
      {/* Навигация и кнопка редактирования */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <Link to="/receptor-classes">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/receptor-class/${id}/edit`)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ✏️ Редактировать
        </button>
      </div>

      {/* Заголовок */}
      <h1 style={{ marginBottom: '20px' }}>{receptorClass.name}</h1>

      {/* Информация о классе рецепторов - БЕЗ ТАБЛИЦЫ */}
	  
	  <div style={{ 
		  backgroundColor: '#f8f9fa',
		  padding: '20px',
		  borderRadius: '8px',
		  marginBottom: '30px',
		  border: '1px solid #dee2e6'
		}}>
		  <div style={{ 
			display: 'grid', 
			gridTemplateColumns: '150px 1fr',
			gap: '15px',
			alignItems: 'start'
		  }}>
			{receptorClass.antistimulus && (
			  <div style={{ 
				display: 'flex',
				alignItems: 'center',
				height: '100%',
				fontWeight: 'bold', 
				color: '#495057',
				textAlign: 'left' // Явное выравнивание по левому краю
			  }}>
				Антистимул:
			  </div>
			)}
			{receptorClass.antistimulus && (
			  <div style={{ 
				color: '#212529',
				textAlign: 'left' // Явное выравнивание по левому краю
			  }}>
				{receptorClass.antistimulus}
			  </div>
			)}
			
			{receptorClass.description && (
			  <div style={{ 
				display: 'flex',
				alignItems: 'flex-start', // Для многострочного текста выравниваем по верху
				height: '100%',
				fontWeight: 'bold', 
				color: '#495057',
				textAlign: 'left'
			  }}>
				Описание:
			  </div>
			)}
			{receptorClass.description && (
			  <div style={{ 
				color: '#212529',
				lineHeight: '1.6',
				whiteSpace: 'pre-wrap',
				textAlign: 'left'
			  }}>
				{receptorClass.description}
			  </div>
			)}
			
			{receptorClass.display_order > 0 && (
			  <div style={{ 
				display: 'flex',
				alignItems: 'center',
				height: '100%',
				fontWeight: 'bold', 
				color: '#495057',
				textAlign: 'left'
			  }}>
				Порядок отображения:
			  </div>
			)}
			{receptorClass.display_order > 0 && (
			  <div style={{ 
				color: '#212529',
				textAlign: 'left'
			  }}>
				{receptorClass.display_order}
			  </div>
			)}
		  </div>
		</div>
	  
	  
     

      {/* Медиафайлы класса рецепторов */}
      <MediaManager 
        entityType="receptor_class"
        entityId={id}
        entityName={receptorClass.name}
        showTitle={true}
        readonly={true}
      />

      {/* Рецепторы этого класса */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ marginBottom: '15px' }}>
          Рецепторы этого класса
          <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
            ({receptors.length})
          </span>
        </h2>

        {receptors.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Нет рецепторов в этом классе
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '15px',
            marginTop: '15px'
          }}>
            {receptors.map(receptor => (
              <div 
                key={receptor.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>
                  <Link 
                    to={`/receptor/${receptor.id}`}
                    style={{ 
                      color: '#1976d2', 
                      textDecoration: 'none',
                      ':hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {receptor.name}
                  </Link>
                </h3>

                <div style={{ 
                  display: 'grid', 
                  gap: '5px',
                  fontSize: '14px'
                }}>
                  {receptor.location && (
                    <div>
                      <strong>Место нахождения:</strong> {receptor.location}
                    </div>
                  )}

                  {receptor.own_stimulus && (
                    <div>
                      <strong>Собственный стимул:</strong> {receptor.own_stimulus}
                    </div>
                  )}

                  {receptor.antistimulus && (
                    <div>
                      <strong>Антистимул:</strong> {receptor.antistimulus}
                    </div>
                  )}
                </div>

                {receptor.description && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}>
                    {receptor.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Техническая информация */}
      <div style={{ 
        marginTop: '30px', 
        paddingTop: '20px',
        borderTop: '1px solid #dee2e6',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <p><strong>ID класса:</strong> {receptorClass.id}</p>
        <p><strong>Создан:</strong> {new Date(receptorClass.created_at).toLocaleString('ru-RU')}</p>
        {receptorClass.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(receptorClass.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ReceptorClassDetail;