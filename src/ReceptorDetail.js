// ReceptorDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ReceptorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receptor, setReceptor] = useState(null);
  const [receptorClass, setReceptorClass] = useState(null);
  const [receptorPairs, setReceptorPairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Loading receptor data
      const { data: receptorData, error: receptorError } = await supabase
        .from('receptors')
        .select('*')
        .eq('id', id)
        .single();

      if (receptorError) throw receptorError;

      // Loading receptor class data
      let classData = null;
      if (receptorData.class_id) {
        const { data: classDataResponse, error: classError } = await supabase
          .from('receptor_classes')
          .select('*')
          .eq('id', receptorData.class_id)
          .single();

        if (!classError) {
          classData = classDataResponse;
        }
      }

      // Loading receptor pairs
      const { data: pairsData, error: pairsError } = await supabase
        .from('receptor_pairs')
        .select(`
          *,
          paired_receptor:receptors!receptor_pairs_paired_receptor_id_fkey(*),
          paired_class:receptor_classes!receptor_pairs_paired_class_id_fkey(*)
        `)
        .eq('receptor_id', id)
        .order('created_at');

      if (pairsError) throw pairsError;

      setReceptor(receptorData);
      setReceptorClass(classData);
      setReceptorPairs(pairsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!receptor) return <div style={{ padding: '2rem' }}>Рецептор не найден</div>;

  const getPairDisplayName = (pair) => {
    if (pair.paired_receptor) {
      return pair.paired_receptor.name;
    } else if (pair.paired_class) {
      return pair.paired_class.name + ' (весь класс)';
    }
    return 'Не указано';
  };

  const getPairTypeLabel = (pairType) => {
    switch (pairType) {
      case 'receptor': return 'Парный рецептор';
      case 'class': return 'Парный класс';
      default: return pairType || 'Не указан';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <Link to="/receptors">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/receptor/${id}/edit`)}
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

      <h1 style={{ marginBottom: '20px' }}>{receptor.name}</h1>

      <div style={{ 
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '180px 1fr',
          gap: '15px',
          alignItems: 'start'
        }}>
          {receptorClass && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Класс рецепторов:
              </div>
              <div style={{ 
                color: '#212529',
                textAlign: 'left'
              }}>
                <Link 
                  to={`/receptor-class/${receptorClass.id}`}
                  style={{ 
                    color: '#1976d2', 
                    textDecoration: 'none'
                  }}
                >
                  {receptorClass.name}
                </Link>
              </div>
            </>
          )}

          {receptor.location && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Место нахождения:
              </div>
              <div style={{ 
                color: '#212529',
                textAlign: 'left'
              }}>
                {receptor.location}
              </div>
            </>
          )}

          {receptor.own_stimulus && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Собственный стимул:
              </div>
              <div style={{ 
                color: '#212529',
                textAlign: 'left'
              }}>
                {receptor.own_stimulus}
              </div>
            </>
          )}

          {receptor.antistimulus && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Антистимул:
              </div>
              <div style={{ 
                color: '#212529',
                textAlign: 'left'
              }}>
                {receptor.antistimulus}
              </div>
            </>
          )}

          {receptor.inhibition_pattern && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Паттерн ингибиции:
              </div>
              <div style={{ 
                color: '#212529',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                textAlign: 'left'
              }}>
                {receptor.inhibition_pattern}
              </div>
            </>
          )}

          {receptor.display_order > 0 && (
            <>
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
              <div style={{ 
                color: '#212529',
                textAlign: 'left'
              }}>
                {receptor.display_order}
              </div>
            </>
          )}

          {receptor.description && (
            <>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                height: '100%',
                fontWeight: 'bold', 
                color: '#495057',
                textAlign: 'left'
              }}>
                Описание:
              </div>
              <div style={{ 
                color: '#212529',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                textAlign: 'left'
              }}>
                {receptor.description}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Парные рецепторы */}
      {receptorPairs.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px' }}>
            Парные рецепторы и классы
            <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
              ({receptorPairs.length})
            </span>
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '15px',
            marginTop: '15px'
          }}>
            {receptorPairs.map(pair => (
              <div 
                key={pair.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <strong>Тип пары:</strong> {getPairTypeLabel(pair.pair_type)}
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <strong>Парная сущность:</strong> {getPairDisplayName(pair)}
                  {pair.paired_receptor && (
                    <Link 
                      to={`/receptor/${pair.paired_receptor.id}`}
                      style={{ 
                        marginLeft: '5px',
                        color: '#1976d2', 
                        textDecoration: 'none'
                      }}
                    >
                      (перейти)
                    </Link>
                  )}
                  {pair.paired_class && (
                    <Link 
                      to={`/receptor-class/${pair.paired_class.id}`}
                      style={{ 
                        marginLeft: '5px',
                        color: '#1976d2', 
                        textDecoration: 'none'
                      }}
                    >
                      (перейти)
                    </Link>
                  )}
                </div>
                
                {pair.notes && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}>
                    <strong>Примечания:</strong> {pair.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MediaManager 
        entityType="receptor"
        entityId={id}
        entityName={receptor.name}
        showTitle={true}
        readonly={true}
      />

      <div style={{ 
        marginTop: '30px', 
        paddingTop: '20px',
        borderTop: '1px solid #dee2e6',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <p><strong>ID рецептора:</strong> {receptor.id}</p>
        <p><strong>Создан:</strong> {new Date(receptor.created_at).toLocaleString('ru-RU')}</p>
        {receptor.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(receptor.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ReceptorDetail;