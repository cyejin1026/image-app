import 'dotenv/config';
import multer from 'multer';
import { HttpError, transformImage } from '../../lib/image-transform.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  upload.single('image')(req, res, async (uploadError) => {
    if (uploadError) {
      const status = uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: status === 413 ? '이미지 파일은 10MB 이하만 업로드할 수 있습니다.' : '업로드 요청을 확인해주세요.' });
    }
    try {
      const image = await transformImage(req.file, req.body?.style);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline; filename="morph-artwork.png"');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(image);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      return res.status(status).json({ error: error.message || '서버 오류가 발생했습니다.' });
    }
  });
}
