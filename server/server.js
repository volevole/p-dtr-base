require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch').default;  // �������� .default
const app = express();
process.env.NODE_ENV = 'utf-8'; // ��������� UTF-8

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('I was called /api/upload'); // Multer ��� �������
	// 1. �������� �����
    if (!req.file) throw new Error('���� �� �������');
    
	
	console.log('Has file:', req.file); // Multer ��� �������
    console.log(' and muscleId:', req.body.muscleId);
	
    // 2. �������� �� ������.����
    const yandexResponse = await uploadToYandexDisk(req.file, req.body.muscleId);
    
    // 3. ���������� ������  ������
    if (!yandexResponse.success) {
      throw new Error(yandexResponse.error);
    }
    
    res.json({ 
      success: true,
      url: yandexResponse.url 
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ��������� ������� ��� �������� �� �.����
async function uploadToYandexDisk(file, muscleId) {
  try {
    // ���������� ��� ����� �� binary � UTF-8
    const fileName = `${muscleId}_${Date.now()}.${file.originalname.split('.').pop()}`;
    const remotePath = `app:/muscle-app/${fileName}`;

    // 1. ���������/������� ����� (409 = ����� ��� ����������)
    const folderRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=app:/muscle-app`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    if (!folderRes.ok && folderRes.status !== 409) {
      const error = await folderRes.json();
      throw new Error(`������ �����: ${error.message || error.description}`);
    }

    // 2. �������� ������ ��� ��������
    const uploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    if (!uploadUrlRes.ok) {
      const error = await uploadUrlRes.json();
      throw new Error(`������ URL: ${error.message || error.description}`);
    }

    // 3. ��������� ����
    const { href: uploadUrl } = await uploadUrlRes.json();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file.buffer,
      headers: { 'Content-Type': file.mimetype },
    });
    if (!uploadRes.ok) throw new Error('������ �������� �����');

    // 4. ���������� ��������� ������
    return {
      success: true,
      url: `https://disk.yandex.ru/client/disk/muscle-app/${encodeURIComponent(fileName)}`,
    };
  } catch (error) {
    console.error('Yandex.Disk Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server ready at port ${PORT}`));