// server.js
// 1. Импорты
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch').default;
const cors = require('cors');

// 2. Инициализация
const app = express();
const supabaseUrl = 'https://btqttycwerqqbvfzmqlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cXR0eWN3ZXJxcWJ2ZnptcWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODEwMjgsImV4cCI6MjA2ODE1NzAyOH0.Y5btj0hHvC2fUK2oxjWyQHfAno75KlNAvRytTWVgfX8';
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Middleware
app.use(express.json());

// Настройка CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://p-dtr-base.onrender.com',
    'https://larchik-p-dtr.vercel.app',         // Ваш основной фронтенд
    'https://*.vercel.app',                     // Все Vercel домены
    /\.vercel\.app$/,                           // Регулярка для всех vercel.app поддоменов
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 часа кэширования preflight
};

app.use(cors(corsOptions));

// Обработка preflight запросов для всех API endpoints
//app.options('*', cors(corsOptions));  // ? Это обработает ВСЕ OPTIONS запросы

app.use(express.urlencoded({ extended: true }));

// 4. Multer middleware
const upload = multer({ storage: multer.memoryStorage() });


 
// Кэш для прямых ссылок (храним public_url -> { direct_url, expires }
const linkCache = new Map();

// ============================================
// УНИВЕРСАЛЬНЫЕ ЭНДПОИНТЫ МЕДИА (НОВАЯ СИСТЕМА)
// ============================================

// 1. Универсальная загрузка медиа для любой сущности
app.post('/api/media/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('[UNIVERSAL UPLOAD] Called with files:', req.files);
    
    // Основной файл
    const mainFile = req.files?.file?.[0];
    if (!mainFile) throw new Error('Main file not received');
    
    if (!req.body.entityId) throw new Error('entityId is required');
    if (!req.body.entityType) throw new Error('entityType is required');

    const { entityType, entityId, description = '' } = req.body;
    const file = mainFile;

    console.log(`[UNIVERSAL UPLOAD] Upload for ${entityType} ${entityId}: ${file.originalname}`);

    // Поддерживаемые типы сущностей
    const supportedEntities = ['muscle', 'organ', 'meridian', 'dysfunction', 'muscle_group' , 'receptor_class', 'tool', 'entry' ];
    if (!supportedEntities.includes(entityType)) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Определяем тип файла по расширению
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${entityType}_${entityId}_${Date.now()}.${fileExt}`;
    const remotePath = `app:/${entityType}-app/${fileName}`;

    // 1. Создаем папку для сущности (если не существует)
    const folderRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=app:/${entityType}-app`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    
    // 409 - папка уже существует, это нормально
    if (!folderRes.ok && folderRes.status !== 409) {
      const error = await folderRes.json();
      throw new Error(`Folder creation error: ${error.message || error.description}`);
    }

    // 2. Получаем URL для загрузки основного файла
    const uploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    
    if (!uploadUrlRes.ok) {
      const error = await uploadUrlRes.json();
      throw new Error(`Error getting upload URL: ${error.message || error.description}`);
    }

    // 3. Загружаем основной файл
    const { href: uploadUrl } = await uploadUrlRes.json();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file.buffer,
      headers: { 'Content-Type': file.mimetype },
    });
    
    if (!uploadRes.ok) throw new Error('File upload error');

    // 4. Публикуем основной файл
    const publishRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(remotePath)}`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );

    if (!publishRes.ok) {
      const error = await publishRes.json();
      throw new Error(`Publishing error: ${error.message || error.description}`);
    }

    // 5. Получаем метаданные с public_url
    const metaRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(remotePath)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );

    if (!metaRes.ok) {
      const error = await metaRes.json();
      throw new Error(`Metadata retrieval error: ${error.message || error.description}`);
    }

    const metaData = await metaRes.json();
    const publicPageUrl = metaData.public_url;

    console.log(`[UNIVERSAL UPLOAD] Main file uploaded. Public URL: ${publicPageUrl}`);

    // Определяем тип файла
    const fileType = fileExt.match(/(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image' :
                    fileExt.match(/(mp4|webm|mov|avi|mkv)$/i) ? 'video' :
                    fileExt.match(/(mp3|wav|ogg|m4a|flac)$/i) ? 'audio' : 'document';

    // 6. Получаем превью и метаданные от Яндекс.Диска
    let thumbnailUrl = null;
    let durationSeconds = null;
    let width = null;
    let height = null;

    // Типы файлов, для которых Яндекс может дать превью
    const yandexPreviewTypes = ['video', 'document', 'image'];

    if (yandexPreviewTypes.includes(fileType)) {
      try {
        console.log(`[UNIVERSAL UPLOAD] Requesting Yandex preview for ${fileType}`);
        
        const previewApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicPageUrl)}&fields=preview,video,image`;
        
        const previewRes = await fetch(previewApiUrl, {
          headers: { 
            'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        
        console.log(`[UNIVERSAL UPLOAD] Yandex preview API status: ${previewRes.status}`);
        
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          console.log(`[UNIVERSAL UPLOAD] Yandex preview response received`);
          
          // Обрабатываем превью
          if (previewData.preview) {
            // Превью может быть строкой или объектом с размерами
            if (typeof previewData.preview === 'string') {
              thumbnailUrl = previewData.preview;
              console.log(`[UNIVERSAL UPLOAD] Got string preview`);
            } 
            // Яндекс обычно возвращает объект с размерами: S, M, L, XL, XXL, XXXL
            else if (typeof previewData.preview === 'object') {
              // Берем маленький размер для thumbnail (S = 150px)
              if (previewData.preview.S) {
                thumbnailUrl = previewData.preview.S;
                console.log(`[UNIVERSAL UPLOAD] Got S-size preview`);
              }
              // Или средний если маленького нет
              else if (previewData.preview.M) {
                thumbnailUrl = previewData.preview.M;
                console.log(`[UNIVERSAL UPLOAD] Got M-size preview`);
              }
              // Или первый доступный размер
              else {
                const firstSize = Object.values(previewData.preview)[0];
                if (firstSize) {
                  thumbnailUrl = firstSize;
                  console.log(`[UNIVERSAL UPLOAD] Got first available preview size`);
                }
              }
            }
          }
          
          // Обрабатываем информацию о видео
          if (fileType === 'video' && previewData.video) {
            console.log(`[UNIVERSAL UPLOAD] Video metadata available`);
            
            if (previewData.video.duration) {
              durationSeconds = Math.round(previewData.video.duration);
              console.log(`[UNIVERSAL UPLOAD] Video duration: ${durationSeconds} seconds`);
            }
          }
          
          // Обрабатываем информацию об изображении
          if (fileType === 'image' && previewData.image) {
            console.log(`[UNIVERSAL UPLOAD] Image metadata available`);
            
            if (previewData.image.width && previewData.image.height) {
              width = previewData.image.width;
              height = previewData.image.height;
              console.log(`[UNIVERSAL UPLOAD] Image dimensions: ${width}x${height}`);
            }
          }
          
        } else {
          console.log(`[UNIVERSAL UPLOAD] Yandex preview not available (status ${previewRes.status})`);
        }
        
      } catch (previewError) {
        console.warn(`[UNIVERSAL UPLOAD] Yandex preview error:`, previewError.message);
      }
    }

    // 7. Обработка thumbnail от клиента (если есть)
    const thumbnailFile = req.files?.thumbnail?.[0];
    
    if (thumbnailFile) {
      console.log(`[UNIVERSAL UPLOAD] Uploading client-provided thumbnail: ${thumbnailFile.originalname}`);
      
      const thumbFileName = `${fileName}.thumb.jpg`;
      const thumbRemotePath = `app:/${entityType}-app/${thumbFileName}`;
      
      // Загружаем thumbnail
      const thumbUploadUrlRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(thumbRemotePath)}`,
        {
          headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
        }
      );
      
      if (thumbUploadUrlRes.ok) {
        const { href: thumbUploadUrl } = await thumbUploadUrlRes.json();
        
        await fetch(thumbUploadUrl, {
          method: 'PUT',
          body: thumbnailFile.buffer,
          headers: { 'Content-Type': thumbnailFile.mimetype },
        });
        
        // Публикуем thumbnail
        await fetch(
          `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(thumbRemotePath)}`,
          {
            method: 'PUT',
            headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
          }
        );
        
        // Получаем public_url для thumbnail
        const thumbMetaRes = await fetch(
          `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(thumbRemotePath)}`,
          {
            headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
          }
        );
        
        if (thumbMetaRes.ok) {
          const thumbMetaData = await thumbMetaRes.json();
          // Используем thumbnail от клиента вместо яндексовского
          thumbnailUrl = thumbMetaData.public_url;
          console.log(`[UNIVERSAL UPLOAD] Client thumbnail created: ${thumbnailUrl}`);
        }
      }
    } 
    // 8. Для изображений без превью от Яндекса используем само изображение
    else if (fileType === 'image' && !thumbnailUrl) {
      console.log(`[UNIVERSAL UPLOAD] Using image itself as thumbnail`);
      thumbnailUrl = publicPageUrl;
    }

    // 9. Сохраняем в БД (новая система)
    console.log(`[UNIVERSAL UPLOAD] Saving for ${entityType} in new system`);

    // Сохраняем в media_files
    const { data: newFile, error: newError } = await supabase
      .from('media_files')
      .insert({
        file_url: publicPageUrl,
        file_name: fileName,
        file_type: fileType,
        mime_type: file.mimetype,
        file_size: file.size,
        width: width,
        height: height,
        duration_seconds: durationSeconds,
        thumbnail_url: thumbnailUrl,
        public_url: publicPageUrl,
        description: description,
        display_order: 0
      })
      .select()
      .single();

    if (newError) throw newError;

    // Создаем связь между файлом и сущностью
    await supabase
      .from('entity_media')
      .insert({
        media_file_id: newFile.id,
        entity_type: entityType,
        entity_id: entityId,
        relation_type: 'primary',
        display_order: 0
      });

    const savedMedia = {
      id: newFile.id,
      entity_id: entityId,
      entity_type: entityType,
      file_url: newFile.file_url,
      file_name: newFile.file_name,
      file_type: newFile.file_type,
      thumbnail_url: newFile.thumbnail_url,
      public_url: newFile.public_url,
      description: newFile.description,
      display_order: 0,
      duration_seconds: newFile.duration_seconds,
      width: newFile.width,
      height: newFile.height
    };

    // Гарантируем, что savedMedia содержит created_at в правильном формате
    if (savedMedia) {
      if (!savedMedia.created_at) {
        savedMedia.created_at = new Date().toISOString();
      }
      
      if (savedMedia.created_at && typeof savedMedia.created_at === 'string') {
        try {
          const date = new Date(savedMedia.created_at);
          if (!isNaN(date.getTime())) {
            savedMedia.created_at = date.toISOString();
          } else {
            savedMedia.created_at = new Date().toISOString();
          }
        } catch (error) {
          savedMedia.created_at = new Date().toISOString();
        }
      }
    }

    // Возвращаем успешный результат
    res.json({
      success: true,
      publicUrl: publicPageUrl,
      fileName: fileName,
      thumbnailUrl: thumbnailUrl,
      durationSeconds: durationSeconds,
      width: width,
      height: height,
      media: savedMedia,
      createdAt: savedMedia?.created_at || new Date().toISOString()
    });

  } catch (error) {
    console.error('[UNIVERSAL UPLOAD] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});


// 2. Универсальное получение медиа для любой сущности
	app.get('/api/media/:entityType/:entityId', async (req, res) => {
	  try {
		const { entityType, entityId } = req.params;
		const { relation_type = 'primary' } = req.query;    

		// Use correct query with ordering by display_order from entity_media
		const { data, error } = await supabase
		  .from('entity_media')
		  .select(`
			display_order,
			relation_type,
			created_at,
			media_files(
			  id,
			  file_url,
			  file_name,
			  file_type,
			  mime_type,
			  file_size,
			  width,
			  height,
			  duration_seconds,
			  thumbnail_url,
			  public_url,
			  description,
			  created_at,
			  updated_at,
			  is_active,
			  thumbnail_updated_at
			)
		  `)
		  .eq('entity_type', entityType)
		  .eq('entity_id', entityId)
		  .eq('relation_type', relation_type)
		  .order('display_order');

		if (error) throw error;

		// Format response
		const formattedData = data.map(item => ({
		  id: item.media_files.id,
		  entity_id: entityId,
		  entity_type: entityType,
		  file_url: item.media_files.file_url,
		  file_name: item.media_files.file_name,
		  file_type: item.media_files.file_type,
		  public_url: item.media_files.public_url,
		  description: item.media_files.description,
		  display_order: item.display_order || 0,
		  created_at: item.created_at || item.media_files.created_at,
		  thumbnail_url: item.media_files.thumbnail_url,
		  duration_seconds: item.media_files.duration_seconds,
		  width: item.media_files.width,
		  height: item.media_files.height,
		  file_size: item.media_files.file_size,
		  mime_type: item.media_files.mime_type,
		  updated_at: item.media_files.updated_at,
		  is_active: item.media_files.is_active,
		  thumbnail_updated_at: item.media_files.thumbnail_updated_at
		}));

		// Debug log - LATIN ONLY
		console.log(`[API] Got ${formattedData.length} media files for ${entityType}/${entityId}`);
		if (formattedData.length > 0) {
		  console.log('[API] First file thumbnail_updated_at:', formattedData[0].thumbnail_updated_at);
		  console.log('[API] First file fields:', Object.keys(formattedData[0]));
		}

		res.json({
		  success: true,
		  data: formattedData
		});

	  } catch (error) {
		console.error('[UNIVERSAL GET] Error:', error.message);
		res.status(500).json({ 
		  success: false,
		  error: error.message 
		});
	  }
	});

// 3. Универсальное удаление медиа
app.delete('/api/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { entityType, entityId } = req.body;

    console.log(`[UNIVERSAL DELETE] Удаление медиа ${mediaId} для ${entityType} ${entityId}`);


    // Всегда удаляем связь из новой системы
    const { error: linkError } = await supabase
      .from('entity_media')
      .delete()
      .eq('media_file_id', mediaId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (linkError) throw linkError;

    // Проверяем, остались ли другие связи с этим файлом
    const { data: links, error: countError } = await supabase
      .from('entity_media')
      .select('id')
      .eq('media_file_id', mediaId);

    if (countError) throw countError;

    // Если больше нет связей - помечаем файл как неактивный
    if (!links || links.length === 0) {
      await supabase
        .from('media_files')
        .update({ is_active: false })
        .eq('id', mediaId);
    }

    res.json({
      success: true,
      message: 'Медиафайл удален'
    });

  } catch (error) {
    console.error('[UNIVERSAL DELETE] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 4. Универсальное обновление порядка
app.post('/api/media/reorder', async (req, res) => {
  try {
    const { entityType, entityId, orderedIds } = req.body;

    console.log(`[UNIVERSAL REORDER] Обновление порядка для ${entityType} ${entityId}`);

    if (!orderedIds || !Array.isArray(orderedIds)) {
      throw new Error('orderedIds должен быть массивом');
    }

    

    // Обновляем в новой системе
    for (let i = 0; i < orderedIds.length; i++) {
      const mediaFileId = orderedIds[i];
      
      const { error } = await supabase
        .from('entity_media')
        .update({ 
          display_order: i
        })
        .eq('media_file_id', mediaFileId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) {
        console.error(`Ошибка обновления порядка в новой системе для ${mediaFileId}:`, error);
        // Не прерываем, если это мышца (старая система главная)
        if (entityType !== 'muscle') throw error;
      }
    }

    res.json({
      success: true,
      message: 'Порядок обновлен'
    });

  } catch (error) {
    console.error('[UNIVERSAL REORDER] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 5. Получение информации о поддерживаемых типах сущностей
app.get('/api/media/supported-entities', async (req, res) => {
  try {
    res.json({
      success: true,
      entities: [
        {
          type: 'muscle',
          name: 'Мышцы',
          description: 'Мышцы человеческого тела',
          hasLegacySupport: false
        },
        {
          type: 'organ',
          name: 'Органы',
          description: 'Внутренние органы',
          hasLegacySupport: false
        },
        {
          type: 'meridian',
          name: 'Меридианы',
          description: 'Энергетические меридианы',
          hasLegacySupport: false
        },
        {
          type: 'dysfunction',
          name: 'Дисфункции',
          description: 'Функциональные нарушения',
          hasLegacySupport: false
        },
        {
          type: 'muscle_group',
          name: 'Группы мышц',
          description: 'Группы связанных мышц',
          hasLegacySupport: false
        },
		{
          type: 'receptor_class',
          name: 'Классы рецепторов',
          description: 'Классы рецепторов - механо, ноци и т.д.',
          hasLegacySupport: false
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.post('/api/media/:mediaId/update-yandex-preview', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Получаем файл из БД
    const { data: mediaFile, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', mediaId)
      .single();
    
    if (error) throw error;
    
    if (!mediaFile.public_url) {
      throw new Error('No public URL for this media file');
    }
    
    console.log(`[UPDATE PREVIEW] Getting Yandex preview for ${mediaId} (${mediaFile.file_type})`);
    
    // Запрашиваем ВСЕ метаданные у Яндекса
    const previewApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(mediaFile.public_url)}&fields=preview,video,image,name,path,type,mime_type,size,created,modified`;
    
    const previewRes = await fetch(previewApiUrl, {
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (!previewRes.ok) {
      throw new Error(`Yandex API error: ${previewRes.status}`);
    }
    
    const previewData = await previewRes.json();
    console.log(`[UPDATE PREVIEW] Received Yandex data:`, JSON.stringify(previewData, null, 2));
    
    // Подготавливаем данные для обновления
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    let changes = [];
    
    // 1. ПРЕВЬЮ (thumbnail)
    if (previewData.preview) {
      let newThumbnailUrl = null;
      
      if (typeof previewData.preview === 'string') {
        newThumbnailUrl = previewData.preview;
      } else if (previewData.preview.S) {
        newThumbnailUrl = previewData.preview.S; // Маленькое превью (150px)
      } else if (previewData.preview.M) {
        newThumbnailUrl = previewData.preview.M; // Среднее превью (300px)
      } else if (previewData.preview.L) {
        newThumbnailUrl = previewData.preview.L; // Большое превью (500px)
      }
      
     if (newThumbnailUrl && newThumbnailUrl !== mediaFile.thumbnail_url) {
		  updateData.thumbnail_url = newThumbnailUrl;
		  updateData.thumbnail_updated_at = new Date().toISOString(); // ? ДОБАВЬТЕ ЭТУ СТРОКУ!
		  changes.push('thumbnail');
		  console.log(`[UPDATE PREVIEW] Updated thumbnail for ${mediaFile.file_name}`);
		}
    }
    
    // 2. ДЛИТЕЛЬНОСТЬ ВИДЕО
    if (mediaFile.file_type === 'video' && previewData.video) {
      console.log(`[UPDATE PREVIEW] Video data available:`, previewData.video);
      
      if (previewData.video.duration) {
        const newDuration = Math.round(previewData.video.duration);
        if (newDuration !== mediaFile.duration_seconds) {
          updateData.duration_seconds = newDuration;
          changes.push('duration');
          console.log(`[UPDATE PREVIEW] Updated duration for ${mediaFile.file_name}: ${newDuration} seconds`);
        }
      } else {
        console.log(`[UPDATE PREVIEW] No duration in video data`);
      }
    }
    
    // 3. РАЗМЕРЫ ИЗОБРАЖЕНИЯ
    if (mediaFile.file_type === 'image' && previewData.image) {
      console.log(`[UPDATE PREVIEW] Image data available:`, previewData.image);
      
      if (previewData.image.width && previewData.image.height) {
        if (previewData.image.width !== mediaFile.width || previewData.image.height !== mediaFile.height) {
          updateData.width = previewData.image.width;
          updateData.height = previewData.image.height;
          changes.push('dimensions');
          console.log(`[UPDATE PREVIEW] Updated dimensions for ${mediaFile.file_name}: ${previewData.image.width}x${previewData.image.height}`);
        }
      } else {
        console.log(`[UPDATE PREVIEW] No dimensions in image data`);
      }
    }
    
    // 4. РАЗМЕР ФАЙЛА
    if (previewData.size && previewData.size !== mediaFile.file_size) {
      updateData.file_size = previewData.size;
      changes.push('file_size');
      console.log(`[UPDATE PREVIEW] Updated file size for ${mediaFile.file_name}: ${previewData.size}`);
    }
    
    // 5. MIME TYPE
    if (previewData.mime_type && previewData.mime_type !== mediaFile.mime_type) {
      updateData.mime_type = previewData.mime_type;
      changes.push('mime_type');
      console.log(`[UPDATE PREVIEW] Updated MIME type for ${mediaFile.file_name}: ${previewData.mime_type}`);
    }
    
    // 6. ИМЯ ФАЙЛА
    if (previewData.name && previewData.name !== mediaFile.file_name) {
      updateData.file_name = previewData.name;
      changes.push('file_name');
      console.log(`[UPDATE PREVIEW] Updated file name for ${mediaFile.id}: ${previewData.name}`);
    }
    
    // Если есть изменения - обновляем в БД
    let updated = false;
    if (changes.length > 0) {
      console.log(`[UPDATE PREVIEW] Updating database with:`, updateData);
      
      const { error: updateError } = await supabase
        .from('media_files')
        .update(updateData)
        .eq('id', mediaId);
      
      if (updateError) {
        console.error(`[UPDATE PREVIEW] Database update error:`, updateError);
        throw updateError;
      }
      
      updated = true;
      console.log(`[UPDATE PREVIEW] Successfully updated ${mediaFile.file_name} with changes: ${changes.join(', ')}`);
    } else {
      console.log(`[UPDATE PREVIEW] No changes needed for ${mediaFile.file_name}`);
    }
    
    // Возвращаем детальную информацию
    res.json({
      success: true,
      mediaId,
      fileName: mediaFile.file_name,
      fileType: mediaFile.file_type,
      updated,
      changes,
      hasPreview: !!previewData.preview,
      previewType: typeof previewData.preview,
      videoInfo: previewData.video,
      imageInfo: previewData.image,
      yandexResponse: {
        hasVideo: !!previewData.video,
        hasImage: !!previewData.image,
        videoDuration: previewData.video?.duration,
        imageWidth: previewData.image?.width,
        imageHeight: previewData.image?.height,
        fileSize: previewData.size
      },
      updateData
    });
    
  } catch (error) {
    console.error('[UPDATE PREVIEW] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});


// server.js - добавьте этот endpoint

// Обновление метаданных медиафайла
app.put('/api/media/:mediaId/update-metadata', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const updateData = req.body;
    
    console.log(`[UPDATE METADATA] Обновление метаданных для медиафайла ${mediaId}:`, updateData);
    
    // Обновляем в базе данных
    const { data, error } = await supabase
      .from('media_files')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', mediaId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data,
      message: 'Метаданные успешно обновлены'
    });
    
  } catch (error) {
    console.error('[UPDATE METADATA] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============================================
// СТАРЫЕ ЭНДПОИНТЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ!
// Они будут использоваться для мышц, пока не завершится миграция
// ============================================


// Получение актуальной прямой ссылки
// Обновленная и упрощенная функция getDirectLink (логи на английском, комментарии на русском)
async function getDirectLink(url) {
  //console.log('[DEBUG] getDirectLink called for URL:', url);

  // Если это НЕ публичная страница (yadi.sk), а прямая ссылка (downloader...)
  if (!url.includes('yadi.sk') && !url.includes('disk.yandex.ru')) {
    //console.log('[DEBUG] Input URL is a direct link. Trying to find its public_url via Yandex.Disk API.');

    try {
      const urlObj = new URL(url);
      const filename = urlObj.searchParams.get('filename');

      if (filename) {
        //console.log('[DEBUG] Extracted filename from URL:', filename);
        const apiPath = `app:/muscle-app/${filename}`;
        const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(apiPath)}&fields=public_url`;

        const resourceRes = await fetch(apiUrl, {
          headers: {
            'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        if (resourceRes.ok) {
          const data = await resourceRes.json();
          if (data.public_url) {
            //console.log('[DEBUG] Found public_url via API:', data.public_url);
            // Рекурсивно вызываем эту же функцию с найденным public_url
            return await getDirectLink(data.public_url);
          }
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error while trying to find public_url:', error.message);
    }
    
    console.log('[DEBUG] Could not find public_url. Returning original URL.');
    return url;
  }
  
  // Если это публичная страница (yadi.sk или disk.yandex.ru) — используем API
  try {
    //console.log('[DEBUG] Getting fresh direct link via /download API for:', url);
    
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(url)}`;
    const publicRes = await fetch(apiUrl, { 
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000 // Таймаут 10 секунд
    });
    
    //console.log(`[DEBUG] API /download response status: ${publicRes.status}`);

    if (!publicRes.ok) {
      let errorBody = 'Could not read error body';
      try {
        errorBody = await publicRes.text();
      } catch (e) { /* игнорируем, если не прочиталось */ }
      console.error(`[DEBUG] API Error! Status: ${publicRes.status}, Body:`, errorBody);
      throw new Error(`API returned status ${publicRes.status}`);
    }

    const data = await publicRes.json();
    //console.log('[DEBUG] Full API response:', JSON.stringify(data));

    if (data.href) {
      //console.log('[DEBUG] Success! Obtained fresh direct link.');
      return data.href;
    } else {
      console.error('[DEBUG] Error: "href" field is missing in API response.');
      throw new Error('Field "href" is missing in API response');
    }

  } catch (error) {
    console.error('[DEBUG] Critical error in getDirectLink:', error.message);
    // В случае ошибки возвращаем исходный URL как запасной вариант
    return url;
  }
}

// Прокси для получения прямых ссылок
// Приоритет для прямых ссылок - сначала обрабатываем file_url (прямые ссылки)
// Очистка параметров - убираем disposition=attachment из прямых ссылок
// Кэширование - кэшируем обработанные прямые ссылки на 10 часов
//
//Теперь система будет:
// Принимать прямые ссылки из file_url
// Автоматически обновлять устаревшие ссылки
// Кэшировать актуальные ссылки
// Работать с обоими типами URL в вашей БД
// Поддержка обоих типов - работает как с прямыми ссылками, так и с публичными страницами

//  добавляем эту функцию рядом с getDirectLink  обновление Превью
async function getFreshPreviewUrl(publicUrl) {
  try {
    console.log(`[GET FRESH PREVIEW] Getting fresh preview for: ${publicUrl}`);
    
    // Запрашиваем превью через API Яндекс.Диска
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}&fields=preview`;
    
    const response = await fetch(apiUrl, {
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`[GET FRESH PREVIEW] API status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`[GET FRESH PREVIEW] Yandex API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Извлекаем превью из ответа
    if (data.preview) {
      let previewUrl = null;
      
      if (typeof data.preview === 'string') {
        previewUrl = data.preview;
        console.log(`[GET FRESH PREVIEW] Got string preview`);
      } else if (data.preview.S) {
        // Маленькое превью (150px)
        previewUrl = data.preview.S;
        console.log(`[GET FRESH PREVIEW] Got S-size preview`);
      } else if (data.preview.M) {
        // Среднее превью (300px)
        previewUrl = data.preview.M;
        console.log(`[GET FRESH PREVIEW] Got M-size preview`);
      } else if (data.preview.L) {
        // Большое превью (500px)
        previewUrl = data.preview.L;
        console.log(`[GET FRESH PREVIEW] Got L-size preview`);
      }
      
      if (previewUrl) {
        console.log(`[GET FRESH PREVIEW] Got preview URL: ${previewUrl.substring(0, 80)}...`);
        
        // Получаем ПРЯМУЮ ссылку на превью
        // Важно: previewUrl от Яндекса может быть уже прямой ссылкой или публичной страницей
        const directUrl = await getDirectLink(previewUrl);
        console.log(`[GET FRESH PREVIEW] Converted to direct link: ${directUrl.substring(0, 80)}...`);
        
        return directUrl;
      }
    }
    
    console.log(`[GET FRESH PREVIEW] No preview available for this file`);
    return null;
    
  } catch (error) {
    console.error('[GET FRESH PREVIEW] Error:', error);
    return null;
  }
}


// Прокси для изображений
app.get('/api/proxy-image', async (req, res) => {
  try {
    // Обработка HEAD-запроса для проверки соединения
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    const { url } = req.query;
    if (!url) {
      throw new Error('URL parameter is required');
    }

    console.log('Proxy request for URL:', url);

    // Получаем актуальную прямую ссылку
    const directUrl = await getDirectLink(url);
    //console.log('Using direct URL:', directUrl);

    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://disk.yandex.ru/',
        'Accept': 'image/*,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    console.log('Image response status:', response.status);
    
    if (!response.ok) {
      // Пробуем оригинальную ссылку как fallback
      console.log('Trying original URL as fallback');
      const fallbackResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://disk.yandex.ru/'
        }
      });
      
      if (fallbackResponse.ok) {
        const contentType = fallbackResponse.headers.get('content-type');
        const buffer = await fallbackResponse.buffer();
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(buffer);
      }
      
      throw new Error(`Loading picture error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);

  } catch (error) {
    console.error('Proxy error details:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

// Добавьте в server.js
app.get('/api/check-token', async (req, res) => {
  try {
    const response = await fetch('https://cloud-api.yandex.net/v1/disk/', {
      headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` }
    });
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      tokenValid: response.ok,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// использовать  проверьте конкретную проблемную ссылку:  http://localhost:3001/api/debug-link?url=ВАША_ПРОБЛЕМНАЯ_ССЫЛКА
//  Это поможет понять, в чем именно проблема с вашими старыми ссылками.
app.get('/api/debug-link', async (req, res) => {  
  try {
    const { url } = req.query;
    if (!url) throw new Error('URL параметр обязателен');

    console.log('Debugging link:', url);
    
    // Проверяем тип ссылки
    const isDirectLink = url.includes('downloader.disk.yandex.ru');
    const isPublicPage = url.includes('yadi.sk') || url.includes('disk.yandex.ru');
    
    let result = {
      originalUrl: url,
      isDirectLink,
      isPublicPage,
      steps: []
    };

    // Если это прямая ссылка
    if (isDirectLink) {
      result.steps.push('Обнаружена прямая ссылка');
      
      // Пробуем очистить параметры
      try {
        const urlObj = new URL(url);
        const originalParams = Array.from(urlObj.searchParams.entries());
        urlObj.searchParams.delete('disposition');
        urlObj.searchParams.delete('tknv');
        urlObj.searchParams.delete('limit');
        
        const cleanedUrl = urlObj.toString();
        result.steps.push(`Очищены параметры: ${JSON.stringify(originalParams)}`);
        result.steps.push(`Очищенная ссылка: ${cleanedUrl}`);
        
        // Пробуем загрузить
        const testResponse = await fetch(cleanedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://disk.yandex.ru/'
          }
        });
        
        result.steps.push(`Статус очищенной ссылки: ${testResponse.status}`);
        result.cleanedUrl = cleanedUrl;
        result.cleanedUrlStatus = testResponse.status;
        
      } catch (error) {
        result.steps.push(`Ошибка обработки: ${error.message}`);
      }
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Проверьте поддержку форматов превью на Я-Диске:
app.get('/api/test-yandex-preview', async (req, res) => {
  const testUrls = {
    pdf: 'https://yadi.sk/i/ваш_pdf_файл',
    image: 'https://yadi.sk/i/ваше_изображение',
    video: 'https://yadi.sk/i/ваше_видео',
    doc: 'https://yadi.sk/i/ваш_doc_файл'
  };
  
  const results = {};
  
  for (const [type, url] of Object.entries(testUrls)) {
    try {
      const previewUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&fields=preview,video,image`;
      const response = await fetch(previewUrl, {
        headers: { 'Authorization': `OAuth ${process.env.YANDEX_TOKEN}` }
      });
      
      results[type] = {
        status: response.status,
        data: response.ok ? await response.json() : null
      };
    } catch (error) {
      results[type] = { error: error.message };
    }
  }
  
  res.json(results);
});


app.get('/api/debug-yandex-preview-details', async (req, res) => {
  try {
    // Берем один PDF и одно видео для теста
    const { data: files, error } = await supabase
      .from('media_files')
      .select('id, file_name, file_type, public_url')
      .in('file_type', ['document', 'video'])
      .order('created_at', { ascending: false })
      .limit(2);
    
    if (error) throw error;
    
    const results = [];
    
    for (const file of files) {
      try {
        const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(file.public_url)}&fields=preview,video`;
        
        console.log(`[DEBUG] Requesting: ${apiUrl}`);
        
        const apiRes = await fetch(apiUrl, {
          headers: { 
            'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        const responseText = await apiRes.text();
        console.log(`[DEBUG] Response for ${file.file_type}:`, responseText.substring(0, 500));
        
        if (apiRes.ok) {
          const apiData = JSON.parse(responseText);
          
          results.push({
            id: file.id,
            fileName: file.file_name,
            fileType: file.file_type,
            publicUrl: file.public_url,
            previewData: apiData.preview,
            videoData: apiData.video,
            hasPreview: !!apiData.preview,
            hasVideoInfo: !!apiData.video,
            previewType: typeof apiData.preview,
            previewKeys: apiData.preview ? Object.keys(apiData.preview) : []
          });
        } else {
          results.push({
            id: file.id,
            fileName: file.file_name,
            fileType: file.file_type,
            error: `API error: ${apiRes.status}`,
            responseText: responseText.substring(0, 200)
          });
        }
        
      } catch (fileError) {
        results.push({
          id: file.id,
          fileName: file.file_name,
          fileType: file.file_type,
          error: fileError.message
        });
      }
    }
    
    res.json(results);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавьте этот endpoint для проверки реальных URL
app.get('/api/debug-public-urls', async (req, res) => {
  try {
    // Берем несколько последних записей
    const { data: files, error } = await supabase
      .from('media_files')
      .select('id, file_name, file_type, public_url')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    const results = [];
    
    for (const file of files) {
      if (!file.public_url) continue;
      
      // Проверяем тип URL
      const isPublicPage = file.public_url.includes('yadi.sk') || 
                          file.public_url.includes('disk.yandex.ru');
      const isDirectLink = file.public_url.includes('downloader.disk.yandex.ru');
      
      // Тестируем доступность через API
      let apiStatus = 'not_tested';
      let previewAvailable = false;
      
      if (isPublicPage) {
        try {
          const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(file.public_url)}&fields=preview`;
          const apiRes = await fetch(apiUrl, {
            headers: { 'Authorization': `OAuth ${process.env.YANDEX_TOKEN}` }
          });
          
          apiStatus = apiRes.status;
          
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            previewAvailable = !!apiData.preview;
          }
        } catch (apiError) {
          apiStatus = `error: ${apiError.message}`;
        }
      }
      
      results.push({
        id: file.id,
        fileName: file.file_name,
        fileType: file.file_type,
        publicUrl: file.public_url,
        urlType: isPublicPage ? 'public_page' : isDirectLink ? 'direct_link' : 'unknown',
        isPublicPage,
        isDirectLink,
        apiStatus,
        previewAvailable
      });
    }
    
    res.json(results);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// server.js - добавьте этот код после существующего endpoint /api/media/:mediaId/update-yandex-preview

// ============================================
// ЭНДПОИНТ ДЛЯ МАССОВОГО ОБНОВЛЕНИЯ ПРЕВЬЮ
// ============================================

// Эндпоинт для обновления превью у нескольких медиафайлов одновременно
app.post('/api/update-media-previews', async (req, res) => {
  try {
    const { mediaIds, entityType, entityId } = req.body;
    
    console.log(`[UPDATE MEDIA PREVIEWS] Запрос на обновление превью для ${mediaIds?.length || 0} медиафайлов`);
    console.log(`[UPDATE MEDIA PREVIEWS] Сущность: ${entityType}, ID: ${entityId}`);
    
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'mediaIds must be a non-empty array'
      });
    }
    
    const results = [];
    let successfulUpdates = 0;
    
    // Обрабатываем каждый медиафайл
    for (const mediaId of mediaIds) {
      try {
        console.log(`[UPDATE MEDIA PREVIEWS] Обработка медиафайла: ${mediaId}`);
        
        // Используем существующий эндпоинт для обновления превью
        const updateResponse = await fetch(`http://localhost:${PORT}/api/media/${mediaId}/update-yandex-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        let updateResult;
        try {
          updateResult = await updateResponse.json();
        } catch (jsonError) {
          updateResult = {
            success: false,
            error: `Invalid JSON response: ${jsonError.message}`
          };
        }
        
        // Получаем информацию о файле для логов
        let fileName = 'unknown';
        try {
          const { data: mediaFile } = await supabase
            .from('media_files')
            .select('file_name')
            .eq('id', mediaId)
            .single();
          
          if (mediaFile) {
            fileName = mediaFile.file_name;
          }
        } catch (dbError) {
          console.warn(`[UPDATE MEDIA PREVIEWS] Could not get filename for ${mediaId}: ${dbError.message}`);
        }
        
		if (updateResult.success && updateResult.changes && updateResult.changes.includes('thumbnail')) {
		  const { error: timestampError } = await supabase
			.from('media_files')
			.update({ 
			  thumbnail_updated_at: new Date().toISOString()
			})
			.eq('id', mediaId);
		  
		  if (timestampError) {
			console.warn(`[UPDATE MEDIA PREVIEWS] Could not update thumbnail_updated_at for ${mediaId}: ${timestampError.message}`);
		  }
		}
		
		
        const result = {
          mediaId,
          file_name: fileName,
          success: updateResult.success || false,
          changes: updateResult.changes || [],
          hasPreview: updateResult.hasPreview || false,
          message: updateResult.message || (updateResult.success ? 'Updated' : 'Failed')
        };
        
        if (updateResult.error) {
          result.error = updateResult.error;
        }
        
        if (result.success) {
          successfulUpdates++;
        }
        
        results.push(result);
        
        // Небольшая пауза между запросами, чтобы не перегружать API Яндекс Диска
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[UPDATE MEDIA PREVIEWS] Error processing media ${mediaId}:`, error.message);
        
        results.push({
          mediaId,
          success: false,
          error: error.message,
          message: `Processing error: ${error.message}`
        });
      }
    }
    
    // Формируем итоговый ответ
    const response = {
      success: true,
      updated: successfulUpdates,
      total: mediaIds.length,
      results
    };
    
    console.log(`[UPDATE MEDIA PREVIEWS] Завершено. Успешно обновлено: ${successfulUpdates}/${mediaIds.length}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('[UPDATE MEDIA PREVIEWS] Global error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      updated: 0,
      total: 0,
      results: []
    });
  }
});


// ============================================
// ЭНДПОИНТ ДЛЯ ОБНОВЛЕНИЯ ССЫЛОК С УЧЕТОМ СУЩНОСТИ
// ============================================

// Обновляем существующий эндпоинт refresh-links для поддержки entityType и entityId
// как основной файл, так и превью
app.post('/api/refresh-links', async (req, res) => {
  try {
    const { urls, entityType, entityId, mediaItems } = req.body;
    
    console.log(`[REFRESH LINKS] Запрос на обновление ссылок`);
    console.log(`[REFRESH LINKS] Сущность: ${entityType}, ID: ${entityId}`);
    
    // Поддерживаем два формата запроса:
    // 1. Старый: { urls: [...], entityType, entityId }
    // 2. Новый: { mediaItems: [...], entityType, entityId }
    
    let itemsToProcess = [];
    
    if (mediaItems && Array.isArray(mediaItems)) {
      // Новый формат - более детальный
      console.log(`[REFRESH LINKS] Используем новый формат с ${mediaItems.length} медиафайлов`);
      itemsToProcess = mediaItems;
    } else if (urls && Array.isArray(urls)) {
      // Старый формат - для обратной совместимости
      console.log(`[REFRESH LINKS] Используем старый формат с ${urls.length} URL`);
      itemsToProcess = urls.map(url => ({ publicUrl: url }));
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Требуется либо urls array, либо mediaItems array' 
      });
    }
    
    const results = [];
    let updatedCount = 0;
    
    for (const item of itemsToProcess) {
      try {
        const publicUrl = item.publicUrl;
        const mediaId = item.id;
        const fileName = item.fileName || 'unknown';
        const fileType = item.fileType;
        
        console.log(`[REFRESH LINKS] Обработка: ${fileName} (${fileType})`);
        
        if (!publicUrl) {
          console.warn(`[REFRESH LINKS] Пропускаем - нет public_url`);
          results.push({
            fileName,
            success: false,
            error: 'No public_url'
          });
          continue;
        }
        
        const updates = {};
        const changes = [];
        
        // 1. Обновляем основную ссылку на файл
        try {
          const freshDirectUrl = await getDirectLink(publicUrl);
          
          if (freshDirectUrl && freshDirectUrl !== item.currentFileUrl) {
            updates.file_url = freshDirectUrl;
            changes.push('main_link');
            console.log(`[REFRESH LINKS] Обновлена основная ссылка для ${fileName}`);
          }
        } catch (mainLinkError) {
          console.warn(`[REFRESH LINKS] Ошибка основной ссылки для ${fileName}:`, mainLinkError.message);
        }
        
        // 2. Обновляем ссылку на превью (если она есть)
        try {
          // Получаем свежее превью от Яндекс.Диска
          const freshPreviewUrl = await getFreshPreviewUrl(publicUrl);
          
          if (freshPreviewUrl && freshPreviewUrl !== item.currentThumbnailUrl) {
            updates.thumbnail_url = freshPreviewUrl;
			updates.thumbnail_updated_at = new Date().toISOString(); // 
            changes.push('preview_link');
            console.log(`[REFRESH LINKS] Обновлена ссылка на превью для ${fileName}`);
          } else if (!freshPreviewUrl && item.currentThumbnailUrl) {
            // Если Яндекс не дал превью, но у нас оно было - возможно стоит сбросить
            console.log(`[REFRESH LINKS] Яндекс не вернул превью для ${fileName}`);
          }
        } catch (previewError) {
          console.warn(`[REFRESH LINKS] Ошибка превью для ${fileName}:`, previewError.message);
        }
        
        // 3. Обновляем в базе данных
        if (Object.keys(updates).length > 0 && mediaId) {
          try {
            // Определяем таблицу
            let tableName = 'media_files';
            if (entityType === 'muscle') {
              // Проверяем, существует ли запись в muscle_media
              const { data: muscleMedia } = await supabase
                .from('muscle_media')
                .select('id')
                .eq('id', mediaId)
                .single();
              
              if (muscleMedia) {
                tableName = 'muscle_media';
              }
            }
            
            const { error: updateError } = await supabase
              .from(tableName)
              .update({
                ...updates,
                updated_at: new Date().toISOString()
              })
              .eq('id', mediaId);
            
            if (!updateError) {
              updatedCount++;
              console.log(`[REFRESH LINKS] База данных обновлена для ${fileName}`);
            } else {
              console.error(`[REFRESH LINKS] Ошибка БД для ${fileName}:`, updateError);
            }
            
          } catch (dbError) {
            console.error(`[REFRESH LINKS] Ошибка обновления БД для ${fileName}:`, dbError.message);
          }
        }
        
        results.push({
          mediaId,
          fileName,
          fileType,
          success: true,
          changes: changes,
          updated: Object.keys(updates).length > 0
        });
        
        // Пауза между запросами к API Яндекса
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`[REFRESH LINKS] Ошибка обработки элемента:`, error.message);
        results.push({
          fileName: item.fileName || 'unknown',
          success: false,
          error: error.message
        });
      }
    }
    
    const response = {
      success: true,
      updated: updatedCount,
      total: itemsToProcess.length,
      results
    };
    
    console.log(`[REFRESH LINKS] Завершено. Обновлено: ${updatedCount}/${itemsToProcess.length} файлов`);
    
    res.json(response);
    
  } catch (error) {
    console.error('[REFRESH LINKS] Global error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      updated: 0,
      total: 0,
      results: []
    });
  }
});

// server.js - добавляем debug endpoint

// Эндпоинт для детальной отладки Яндекс API
// Можно так использовать через браузер  http://localhost:3001/api/debug-yandex-api/095ff625-a2ac-47f1-b719-10b13c1571f3
app.get('/api/debug-yandex-api/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Получаем файл из БД
    const { data: mediaFile, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', mediaId)
      .single();
    
    if (error) throw error;
    
    if (!mediaFile.public_url) {
      throw new Error('No public URL for this media file');
    }
    
    console.log(`[DEBUG YANDEX API] Checking ${mediaFile.file_type}: ${mediaFile.file_name}`);
    
    // Запрашиваем данные у Яндекса
    const previewApiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(mediaFile.public_url)}&fields=preview,video,image`;
    
    console.log(`[DEBUG YANDEX API] Request URL: ${previewApiUrl}`);
    
    const previewRes = await fetch(previewApiUrl, {
      headers: { 
        'Authorization': `OAuth ${process.env.YANDEX_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    const responseText = await previewRes.text();
    console.log(`[DEBUG YANDEX API] Response status: ${previewRes.status}`);
    console.log(`[DEBUG YANDEX API] Response body (first 500 chars): ${responseText.substring(0, 500)}`);
    
    let previewData;
    try {
      previewData = JSON.parse(responseText);
    } catch (parseError) {
      previewData = { parseError: parseError.message, rawText: responseText };
    }
    
    res.json({
      success: true,
      mediaId,
      fileName: mediaFile.file_name,
      fileType: mediaFile.file_type,
      publicUrl: mediaFile.public_url,
      requestUrl: previewApiUrl,
      responseStatus: previewRes.status,
      responseOk: previewRes.ok,
      yandexData: previewData,
      currentData: {
        thumbnail_url: mediaFile.thumbnail_url,
        duration_seconds: mediaFile.duration_seconds,
        width: mediaFile.width,
        height: mediaFile.height,
        file_size: mediaFile.file_size
      }
    });
    
  } catch (error) {
    console.error('[DEBUG YANDEX API] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});


// server.js - добавляем после других медиа-эндпоинтов

// ============================================
// ЭНДПОИНТ ДЛЯ СВЯЗЫВАНИЯ СУЩЕСТВУЮЩЕГО МЕДИА С СУЩНОСТЬЮ
// ============================================

// Получение списка медиафайлов для выбора (с фильтрацией) - ВЕРСИЯ С ДЕТАЛЬНОЙ ОТЛАДКОЙ
// Альтернативная логика: показываем все, кроме привязанных к текущей сущности
	app.get('/api/media/files', async (req, res) => {
	  try {
		const { 
		  search = '', 
		  file_type = '', 
		  limit = 50, 
		  exclude_entity_type, 
		  exclude_entity_id 
		} = req.query;
		
		console.log(`[DEBUG] === START /api/media/files ===`);
		console.log(`[DEBUG] Params:`, { exclude_entity_type, exclude_entity_id, search, file_type });
		
		// 1. Получаем ВСЕ медиафайлы (включая is_active = false)
		let query = supabase
		  .from('media_files')
		  .select('*', { count: 'exact' })
		  .order('created_at', { ascending: false });
		
		// Фильтры поиска
		if (search) {
		  query = query.or(`file_name.ilike.%${search}%,description.ilike.%${search}%`);
		}
		
		if (file_type) {
		  query = query.eq('file_type', file_type);
		}
		
		// Выполняем запрос
		const { data: allMedia, error, count } = await query;
		
		if (error) throw error;
		
		console.log(`[DEBUG] Total media in DB (including inactive): ${allMedia?.length || 0}`);
		
		let availableMedia = allMedia || [];
		
		// 2. Если нужно исключить медиа текущей сущности
		if (exclude_entity_type && exclude_entity_id) {
		  console.log(`[DEBUG] Checking links for: ${exclude_entity_type}/${exclude_entity_id}`);
		  
		  const { data: linkedMedia, error: linkError } = await supabase
			.from('entity_media')
			.select('media_file_id')
			.eq('entity_type', exclude_entity_type)
			.eq('entity_id', exclude_entity_id);
		  
		  if (linkError) {
			console.error('[DEBUG] Link query error:', linkError);
		  } else {
			console.log(`[DEBUG] Found ${linkedMedia?.length || 0} linked media`);
			
			if (linkedMedia && linkedMedia.length > 0) {
			  const linkedIds = linkedMedia.map(item => item.media_file_id);
			  console.log(`[DEBUG] Linked media IDs:`, linkedIds);
			  
			  // Исключаем медиа, уже привязанные к текущей сущности
			  const beforeCount = availableMedia.length;
			  availableMedia = availableMedia.filter(media => !linkedIds.includes(media.id));
			  
			  console.log(`[DEBUG] Filtered: ${beforeCount} -> ${availableMedia.length} (excluded ${beforeCount - availableMedia.length})`);
			}
		  }
		}
		
		// 3. Применяем лимит
		const limitNum = parseInt(limit) || 50;
		const beforeLimit = availableMedia.length;
		availableMedia = availableMedia.slice(0, limitNum);
		
		console.log(`[DEBUG] Final result: ${availableMedia.length} files (limited from ${beforeLimit})`);
		
		// Логируем статус is_active для отладки
		const activeCount = availableMedia.filter(m => m.is_active).length;
		const inactiveCount = availableMedia.filter(m => !m.is_active).length;
		console.log(`[DEBUG] Active/Inactive in result: ${activeCount}/${inactiveCount}`);
		
		res.json({
		  success: true,
		  count: availableMedia.length,
		  files: availableMedia
		});
		
	  } catch (error) {
		console.error('[ERROR] /api/media/files Error:', error.message);
		res.status(500).json({ 
		  success: false,
		  error: error.message 
		});
	  }
	});

// Связывание существующего медиафайла с сущностью
	app.post('/api/media/link', async (req, res) => {
	  try {
		const { mediaFileId, entityType, entityId, relationType = 'primary' } = req.body;
		
		console.log('[LINK] Request:', { mediaFileId, entityType, entityId, relationType });
		
		if (!mediaFileId || !entityType || !entityId) {
		  return res.status(400).json({
			success: false,
			error: 'Требуются параметры: mediaFileId, entityType, entityId'
		  });
		}
		
		// ИСПРАВЛЕНИЕ: Убираем проверку is_active при поиске медиафайла
		const { data: mediaFile, error: mediaError } = await supabase
		  .from('media_files')
		  .select('*')
		  .eq('id', mediaFileId)
		  // .eq('is_active', true)  ? УБРАТЬ ЭТУ СТРОКУ
		  .single();
		
		if (mediaError || !mediaFile) {
		  console.log('[LINK] Media file not found:', mediaError || 'No data');
		  return res.status(404).json({
			success: false,
			error: 'Медиафайл не найден'
		  });
		}
		
		console.log('[LINK] Found media file:', { 
		  id: mediaFile.id, 
		  name: mediaFile.file_name,
		  is_active: mediaFile.is_active 
		});
		
		// Проверяем, не существует ли уже такая связь
		const { data: existingLink } = await supabase
		  .from('entity_media')
		  .select('id')
		  .eq('media_file_id', mediaFileId)
		  .eq('entity_type', entityType)
		  .eq('entity_id', entityId)
		  .eq('relation_type', relationType)
		  .single();
		
		if (existingLink) {
		  return res.status(409).json({
			success: false,
			error: 'Этот медиафайл уже связан с данной сущностью'
		  });
		}
		
		// Получаем максимальный display_order для этой сущности
		const { data: maxOrderData } = await supabase
		  .from('entity_media')
		  .select('display_order')
		  .eq('entity_type', entityType)
		  .eq('entity_id', entityId)
		  .order('display_order', { ascending: false })
		  .limit(1);
		
		const nextDisplayOrder = maxOrderData && maxOrderData.length > 0 
		  ? maxOrderData[0].display_order + 1 
		  : 0;
		
		// Создаем связь
		const { data: newLink, error: createError } = await supabase
		  .from('entity_media')
		  .insert({
			media_file_id: mediaFileId,
			entity_type: entityType,
			entity_id: entityId,
			relation_type: relationType,
			display_order: nextDisplayOrder
		  })
		  .select()
		  .single();
		
		if (createError) {
		  console.error('[LINK] Error creating link:', createError);
		  throw createError;
		}
		
		// ВАЖНОЕ ДОПОЛНЕНИЕ: Активируем медиафайл при связывании
		if (!mediaFile.is_active) {
		  const { error: updateError } = await supabase
			.from('media_files')
			.update({ 
			  is_active: true,
			  updated_at: new Date().toISOString()
			})
			.eq('id', mediaFileId);
		  
		  if (updateError) {
			console.warn('[LINK] Warning: could not activate media file:', updateError);
		  } else {
			console.log('[LINK] Activated media file:', mediaFileId);
			mediaFile.is_active = true; // Обновляем локальный объект
		  }
		}
		
		// Форматируем ответ в совместимом формате
		const resultMedia = {
		  id: mediaFile.id,
		  entity_id: entityId,
		  entity_type: entityType,
		  file_url: mediaFile.file_url,
		  file_name: mediaFile.file_name,
		  file_type: mediaFile.file_type,
		  thumbnail_url: mediaFile.thumbnail_url,
		  public_url: mediaFile.public_url,
		  description: mediaFile.description,
		  display_order: nextDisplayOrder,
		  duration_seconds: mediaFile.duration_seconds,
		  width: mediaFile.width,
		  height: mediaFile.height,
		  file_size: mediaFile.file_size,
		  mime_type: mediaFile.mime_type,
		  created_at: newLink.created_at,
		  updated_at: mediaFile.updated_at,
		  thumbnail_updated_at: mediaFile.thumbnail_updated_at,
		  is_active: true // Теперь всегда true после связывания
		};
		
		console.log(`[LINK] Успешно создана связь для ${mediaFile.file_name}`);
		
		res.json({
		  success: true,
		  message: 'Медиафайл успешно связан с сущностью',
		  media: resultMedia,
		  link: newLink
		});
		
	  } catch (error) {
		console.error('[LINK] Error:', error.message);
		res.status(500).json({ 
		  success: false,
		  error: error.message 
		});
	  }
	});

// ДОБАВЬТЕ в самый конец файла, перед app.listen:

console.log('Test end points:');
console.log('Test GET  /api/check-token               :  http://localhost:3001/api/check-token');
console.log('Test GET  /api/media/supported-entities  :  http://localhost:3001/api/media/supported-entities');

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started at port ${PORT}`);
});