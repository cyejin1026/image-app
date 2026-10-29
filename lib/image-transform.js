import OpenAI, { toFile } from 'openai';

const STYLE_PROMPTS = {
  caricature:
    'Create a polished, warm caricature portrait based on the uploaded photo. Exaggerate a few distinctive facial features playfully while keeping the person recognizable, friendly, and flattering. Use clean editorial illustration, expressive shapes, and a tasteful simple background.',
  animation:
    'Transform the person in the uploaded photo into an original, warm animated-film portrait. Preserve their recognizable facial identity, expression, hairstyle, and key features. Use soft cinematic lighting, expressive hand-painted details, and a gentle colorful background.',
  poster:
    'Turn the person in the uploaded photo into the star of an original cinematic movie poster. Preserve their recognizable face and features. Use dramatic cinematic lighting, a strong composition, rich color grading, and a refined atmospheric background. Do not add text or logos.',
  watercolor:
    'Transform the uploaded photo into an elegant watercolor portrait. Preserve the person’s recognizable face, expression, hairstyle, and key features. Use soft translucent washes, delicate paper texture, subtle edges, and a restrained artistic palette.',
};

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateImageFile(file) {
  if (!file) throw new HttpError(400, '이미지 파일을 업로드해주세요.');
  if (file.size > 10 * 1024 * 1024) {
    throw new HttpError(413, '이미지 파일은 10MB 이하만 업로드할 수 있습니다.');
  }

  const isPng = file.mimetype === 'image/png' && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = file.mimetype === 'image/jpeg' && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer.at(-2) === 0xff && file.buffer.at(-1) === 0xd9;
  const isWebp = file.mimetype === 'image/webp' && file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    throw new HttpError(415, 'JPG, PNG 또는 WEBP 이미지 파일만 지원합니다.');
  }
}

export async function transformImage(file, style) {
  validateImageFile(file);
  const prompt = STYLE_PROMPTS[style];
  if (!prompt) throw new HttpError(400, '지원하지 않는 이미지 스타일입니다.');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key') {
    throw new HttpError(503, '서버에 OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst',
      image: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
      prompt,
      quality: 'medium',
      output_format: 'png',
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) throw new Error('OpenAI response did not include image data.');
    return Buffer.from(base64, 'base64');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('OpenAI image edit failed:', error.message);
    if (error.status === 401) throw new HttpError(502, 'OpenAI API 키가 유효하지 않습니다.');
    if (error.status === 429) throw new HttpError(503, '이미지 변환 요청이 많습니다. 잠시 후 다시 시도해주세요.');
    throw new HttpError(502, '이미지 변환 중 오류가 발생했습니다. 서버 로그를 확인해주세요.');
  }
}
