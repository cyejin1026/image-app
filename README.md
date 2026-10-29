# morph AI 이미지 스튜디오

정적 HTML/CSS/JavaScript 프론트엔드와 Express 백엔드로 구성된 이미지 편집 앱입니다. `POST /api/images/transform`은 `image` 파일과 `style` 값을 multipart form-data로 받고, 변환한 PNG를 응답합니다. OpenAI 키는 서버 환경 변수에서만 읽습니다.

## 로컬 실행

1. Node.js 22 이상을 설치합니다.
2. 터미널에서 프로젝트 폴더로 이동해 의존성을 설치합니다.

   ```bash
   npm install
   ```

3. `.env.example`을 복사해 `.env` 파일을 만듭니다. 기존 `.env`가 있다면 그대로 둡니다.

   ```bash
   test -f .env || cp .env.example .env
   ```

4. `.env`에 OpenAI API 키를 입력합니다.

   ```dotenv
   OPENAI_API_KEY=실제_API_키
   OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
   PORT=3000
   ```

5. 서버를 시작하고 브라우저에서 `http://localhost:3000`을 엽니다.

   ```bash
   npm run dev
   ```

`npm start`를 사용하면 파일 변경 감시 없이 서버를 실행합니다. 변환 기능은 OpenAI API를 호출하므로 API 사용 권한과 결제 설정이 필요합니다.

## API

`POST /api/images/transform`

- Content-Type: `multipart/form-data`
- `image`: JPG, PNG 또는 WEBP 파일, 최대 10MB
- `style`: `caricature`, `animation`, `poster`, `watercolor`
- 성공: `image/png` 응답
- 오류: `{ "error": "..." }` JSON 응답

## Vercel 배포

프로젝트를 Vercel에 가져온 뒤 프로젝트 설정의 Environment Variables에 `OPENAI_API_KEY`를 추가하고 배포합니다. 필요하면 `OPENAI_IMAGE_MODEL`도 설정할 수 있습니다. 프론트엔드 파일은 정적 파일로 제공되고, `/api/images/transform`은 `api/images/transform.js` 함수에서 처리됩니다. `.env`는 Git에 포함되지 않으므로 배포 환경 변수에 키를 별도로 입력해야 합니다.
