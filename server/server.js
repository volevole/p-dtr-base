require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch').default;
const cors = require('cors');
const app = express();
// �������� � ������ �����
const cache = new Map();

// Middleware
app.use(express.json());
//app.use(cors());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.vercel.app'] // ��� production frontend URL
    : ['http://localhost:3000'], // ��������� frontend
  credentials: true
}));


app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

// �������� ����� �� ������.����
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('���� �� �������');
    if (!req.body.muscleId) throw new Error('muscleId ����������');

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${req.body.muscleId}_${Date.now()}.${fileExt}`;
    const remotePath = `app:/muscle-app/${fileName}`;

    // 1. ������� ����� (���� �� ����������)
    const folderRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=app:/muscle-app`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    
    if (!folderRes.ok && folderRes.status !== 409) {
      const error = await folderRes.json();
      throw new Error(`������ �������� �����: ${error.message || error.description}`);
    }

    // 2. �������� URL ��� ��������
    const uploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(remotePath)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );
    
    if (!uploadUrlRes.ok) {
      const error = await uploadUrlRes.json();
      throw new Error(`������ ��������� URL: ${error.message || error.description}`);
    }

    // 3. ��������� ����
    const { href: uploadUrl } = await uploadUrlRes.json();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: req.file.buffer,
      headers: { 'Content-Type': req.file.mimetype },
    });
    
    if (!uploadRes.ok) throw new Error('������ �������� �����');
	

    // 4. �������� ��������� ������
    const publishRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(remotePath)}`,
      {
        method: 'PUT',
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );

    if (!publishRes.ok) {
      const error = await publishRes.json();
      throw new Error(`������ ����������: ${error.message || error.description}`);
    }

    const { href: publicUrl } = await publishRes.json();
	
	// 5. �������� ���������� �����, ��� ����� ��������� ������
    const metaRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(remotePath)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );

    if (!metaRes.ok) {
      const error = await metaRes.json();
      throw new Error(`������ ��������� ����������: ${error.message || error.description}`);
    }

    const metaData = await metaRes.json();
    const MpublicUrl = metaData.public_url; // ��� ����� ����� ������ ��� ������
	const publicPageUrl = metaData.public_url;
	//console.log(` metaData public_url= ${MpublicUrl}`);
	
	// 6. �������� ������ ������ �� ���� ����� API ��������� ��������
    const publicUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicPageUrl)}`,
      {
        headers: { Authorization: `OAuth ${process.env.YANDEX_TOKEN}` },
      }
    );

    if (!publicUrlRes.ok) {
      const error = await publicUrlRes.json();
      throw new Error(`������ ��������� ������ ������: ${error.message || error.description}`);
    }

    const publicData = await publicUrlRes.json();
    const directDownloadUrl = publicData.file; // ������ ������ �� ����!
	
	
    res.json({
      success: true,
	  url: directDownloadUrl, // ������ ������ ��� �����������    
	  publicUrl: publicPageUrl, // �������� �� ������.�����
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ������ ��� ��������� ������ ������
// ������ ��� ��������� ������ ������
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) throw new Error('URL �������� ����������');

    console.log('Proxy request for URL:', url);

    // �������� ����
    if (cache.has(url)) {
      const { contentType, data, expires } = cache.get(url);
      if (Date.now() < expires) {
        console.log('Serving from cache');
        res.set('Content-Type', contentType);
        return res.send(data);
      }
      cache.delete(url);
    }

    let imageUrl = url;

    // ���� ��� ������ ������ ������.�����, ������� disposition=attachment
    if (imageUrl.includes('downloader.disk.yandex.ru')) {
      console.log('Detected Yandex direct download URL, cleaning...');
      
      // ������� �������� disposition=attachment
      const urlObj = new URL(imageUrl);
      urlObj.searchParams.delete('disposition');
      
      imageUrl = urlObj.toString();
      console.log('Cleaned URL:', imageUrl);
    }
    // ���� ��� public_url (�������� ������.�����), �������� ������ ������
    else if (url.includes('yadi.sk') || url.includes('disk.yandex.ru')) {
      console.log('Detected Yandex Disk page URL, getting direct link...');
      
      const publicRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}`,
        { 
          headers: { 
            Authorization: `OAuth ${process.env.YANDEX_TOKEN}`,
            'Accept': 'application/json'
          } 
        }
      );
      
      console.log('Public resources API status:', publicRes.status);
      
      if (publicRes.ok) {
        const data = await publicRes.json();
        console.log('Public resources data:', data);
        
        if (data.file) {
          imageUrl = data.file;
          console.log('Using direct link:', imageUrl);
          
          // ������� �������� disposition �� ���������� ������ ������
          const urlObj = new URL(imageUrl);
          urlObj.searchParams.delete('disposition');
          imageUrl = urlObj.toString();
          console.log('Cleaned direct link:', imageUrl);
        }
      }
    }

    // ��������� �����������
    console.log('Fetching image from:', imageUrl);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://disk.yandex.ru/'
      }
    });
    
    console.log('Image response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`������ �������� �����������: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    // �������� �� 1 ���
    cache.set(url, {
      contentType,
      data: buffer,
      expires: Date.now() + 3600000 // 1 ���
    });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600'); // ����������� �� �������
    res.send(buffer);

  } catch (error) {
    console.error('Proxy error details:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});


const PORT = process.env.PORT || 3001;
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started at port ${PORT}`);
});
  