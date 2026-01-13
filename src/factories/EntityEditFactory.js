// factories/EntityEditFactory.js
import React from 'react';
import { Link } from 'react-router-dom';
import MediaManager from '../MediaManager';
import { useEntityCRUD } from '../hooks/useEntityCRUD';

export function createEntityEdit(config) {
  return function EntityEditComponent() {
    const {
      entityName,
      entityType,
      tableName,
      fields = [],
      relatedTables = [],
      hasMedia = true,
      renderFormFields = null,
      renderExtraSections = null
    } = config;

    const {
      isNew,
      entity,
      loading,
      saving,
      formData,
      handleChange,
      saveEntity,
      navigate,
      id
    } = useEntityCRUD({
      tableName,
      fields,
      relatedTables,
      defaultFormData: fields.reduce((acc, field) => ({
        ...acc,
        [field.name]: field.defaultValue || ''
      }), {})
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const result = await saveEntity(formData);
        
        alert(`${entityName} успешно ${isNew ? 'создан' : 'обновлен'}!`);
        navigate(`/${entityType}/${result.id}`);
      } catch (error) {
        alert(`Ошибка при сохранении: ${error.message}`);
      }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
    if (!isNew && !entity && !loading) {
      return (
        <div style={{ padding: '2rem' }}>
          <p>{entityName} не найден</p>
          <Link to={`/${entityType}s`}>← Вернуться к списку</Link>
        </div>
      );
    }

    const pageTitle = isNew 
      ? `Создание нового ${entityName.toLowerCase()}` 
      : `Редактирование ${entityName.toLowerCase()}: ${entity?.name}`;

    const backLink = isNew ? `/${entityType}s` : `/${entityType}/${id}`;

    return (
      <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link to={backLink}>← Назад</Link>
        </div>

        <h2>{pageTitle}</h2>

        {/* Форма редактирования */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3>Основная информация</h3>
            
            {renderFormFields 
              ? renderFormFields({ formData, handleChange, isNew, entity })
              : fields.map(field => (
                  <div key={field.name} style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      {field.label}:
                      {field.required && <span style={{ color: '#dc3545' }}> *</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          fontSize: '16px',
                          minHeight: field.rows ? `${field.rows * 24}px` : '100px',
                          resize: 'vertical'
                        }}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : field.type === 'select' && field.options ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                        required={field.required}
                      >
                        <option value="">{field.placeholder || '-- Выберите --'}</option>
                        {field.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                        placeholder={field.placeholder}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                      />
                    )}
                    
                    {field.description && (
                      <small style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
                        {field.description}
                      </small>
                    )}
                  </div>
                ))
            }
          </div>

          {/* Дополнительные секции */}
          {renderExtraSections && renderExtraSections({ 
            formData, handleChange, isNew, entity
          })}

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
              {saving ? 'Сохранение...' : (isNew ? `Создать ${entityName}` : 'Сохранить изменения')}
            </button>
          </div>
        </form>

        {/* Медиафайлы - только для редактирования существующего */}
        {!isNew && entity && hasMedia && (
          <div style={{ marginTop: '30px' }}>
            <h3>Медиафайлы {entityName.toLowerCase()}</h3>
            <MediaManager 
              entityType={entityType}
              entityId={id}
              entityName={entity.name}
            />
          </div>
        )}

        {/* Информация о создании/редактировании */}
        {!isNew && entity && (
          <div style={{ 
            marginTop: '30px', 
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            <p><strong>ID:</strong> {entity.id}</p>
            <p><strong>Создан:</strong> {new Date(entity.created_at).toLocaleString('ru-RU')}</p>
            {entity.updated_at && (
              <p><strong>Обновлен:</strong> {new Date(entity.updated_at).toLocaleString('ru-RU')}</p>
            )}
          </div>
        )}
      </div>
    );
  };
}