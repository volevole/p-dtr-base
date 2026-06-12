// factories/EntityEditFactory.js - исправленная версия
import React from 'react';
import { Link } from 'react-router-dom';
import API_URL from '../config/api';
import MediaManager from '../MediaManager';
import { useEntityCRUD } from '../hooks/useEntityCRUD';

export function createEntityEdit(config) {
  return function EntityEditComponent() {
    const {
      entityName,
      entityType,
      tableName,
      fields = [],
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

    if (loading) return <div className="detail-container">Загрузка...</div>;
    if (!isNew && !entity && !loading) {
      return (
        <div className="detail-container">
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
      <div className="detail-container">
        <div className="detail-navigation">
          <Link to={backLink} className="link-text">← Назад</Link>
        </div>

        <h2 className="detail-title">{pageTitle}</h2>

        <form onSubmit={handleSubmit} className="muscle-form">
          <div className="form-section">
            <h3>Основная информация</h3>
            
            {renderFormFields 
              ? renderFormFields({ formData, handleChange, isNew, entity })
              : fields.map(field => (
                  <div key={field.name} className="form-section">
                    <label>{field.label}:</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        rows={field.rows || 5}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'select' && field.options ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                      >
                        <option value="">{field.placeholder || '-- Выберите --'}</option>
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))
            }
          </div>

          {renderExtraSections && renderExtraSections({ 
            formData, handleChange, isNew, entity
          })}

          <div className="form-actions">
            <button type="button" onClick={() => navigate(backLink)} className="cancel-button">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="save-button">
              {saving ? 'Сохранение...' : (isNew ? `Создать ${entityName}` : 'Сохранить')}
            </button>
          </div>
        </form>

        {!isNew && entity && hasMedia && (
          <MediaManager 
            entityType={entityType}
            entityId={id}
            entityName={entity.name}
            showTitle={true}
            readonly={true}
          />
        )}

        {!isNew && entity && (
          <div className="detail-id">
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