import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, transformImage } from './lib/image-transform.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

app.disable('x-powered-by');
app.get('/', (req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(root, 'styles.css')));
app.get('/app.js', (req, res) => res.sendFile(path.join(root, 'app.js')));

app.post('/api/images/transform', upload.single('image'), async (req, res, next) => {
  try {
    const image = await transformImage(req.file, req.body.style);
    res.set({ 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="morph-artwork.png"', 'Cache-Control': 'no-store' });
    res.send(image);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: status === 413 ? '이미지 파일은 10MB 이하만 업로드할 수 있습니다.' : '업로드 요청을 확인해주세요.' });
  }
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: error.message || '서버 오류가 발생했습니다.' });
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => console.log(`morph server listening at http://localhost:${port}`));
}

export default app;
