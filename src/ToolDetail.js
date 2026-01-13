// ToolDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';

function ToolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTool(data);
    } catch (error) {
      console.error('Error loading tool:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!tool) return <div style={{ padding: '2rem' }}>Инструмент не найден</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <Link to="/tools">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/tool/${id}/edit`)}
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

      <h1 style={{ marginBottom: '20px' }}>{tool.name}</h1>

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
          {tool.display_order > 0 && (
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
                {tool.display_order}
              </div>
            </>
          )}

          {tool.description && (
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
                {tool.description}
              </div>
            </>
          )}
        </div>
      </div>

      <MediaManager 
        entityType="tool"
        entityId={id}
        entityName={tool.name}
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
        <p><strong>ID инструмента:</strong> {tool.id}</p>
        <p><strong>Создан:</strong> {new Date(tool.created_at).toLocaleString('ru-RU')}</p>
        {tool.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(tool.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ToolDetail;