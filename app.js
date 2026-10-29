// Express and Vercel both expose this multipart/form-data endpoint.
const TRANSFORM_ENDPOINT = '/api/images/transform';

const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const sourceThumb = document.querySelector('#sourceThumb');
const originalImage = document.querySelector('#originalImage');
const resultImage = document.querySelector('#resultImage');
const generateButton = document.querySelector('#generateButton');
const buttonText = document.querySelector('#buttonText');
const status = document.querySelector('#resultStatus');
const overlay = document.querySelector('#resultOverlay');
const downloadButton = document.querySelector('#downloadButton');
const toast = document.querySelector('#toast');
let selectedFile = null;
let sourceUrl = null;
let resultUrl = null;
let toastTimer;

const styleNames = { caricature: '캐리커처', animation: '애니메이션', poster: '영화 포스터', watercolor: '수채화' };

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function setSource(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return notify('이미지 파일을 선택해주세요.');
  if (file.size > 10 * 1024 * 1024) return notify('파일 크기는 10MB 이하로 업로드해주세요.');
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
  selectedFile = file;
  sourceUrl = URL.createObjectURL(file);
  sourceThumb.src = sourceUrl;
  originalImage.src = sourceUrl;
  document.querySelector('.original-side').classList.add('has-image');
  document.querySelector('.transformed-side').classList.remove('has-image');
  dropZone.classList.add('has-image');
  overlay.classList.remove('hidden');
  downloadButton.classList.add('disabled');
  downloadButton.setAttribute('aria-disabled', 'true');
  generateButton.disabled = false;
  buttonText.textContent = '나만의 이미지 만들기';
  status.innerHTML = '<i></i> 준비 완료';
}

fileInput.addEventListener('change', event => setSource(event.target.files[0]));
['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, event => {
  event.preventDefault(); dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, event => {
  event.preventDefault(); dropZone.classList.remove('dragging');
}));
dropZone.addEventListener('drop', event => setSource(event.dataTransfer.files[0]));

document.querySelectorAll('.style-card').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('.style-card').forEach(option => {
    const selected = option === card;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-checked', String(selected));
  });
}));

generateButton.addEventListener('click', async () => {
  if (!selectedFile || generateButton.disabled) return;
  const style = document.querySelector('.style-card.selected').dataset.style;
  const previousText = buttonText.textContent;
  generateButton.disabled = true;
  buttonText.textContent = '작품을 만들고 있어요…';
  status.innerHTML = '<i class="loading-dot"></i> 생성 중';
  status.setAttribute('aria-busy', 'true');
  overlay.classList.remove('hidden');
  try {
    const form = new FormData();
    form.append('image', selectedFile);
    form.append('style', style);
    const response = await fetch(TRANSFORM_ENDPOINT, { method: 'POST', body: form });
    if (!response.ok) {
      let message = `이미지 생성 요청이 실패했어요 (${response.status}).`;
      try {
        const errorData = await response.json();
        if (errorData.error) message = errorData.error;
      } catch { /* Use the status message if the server did not return JSON. */ }
      throw new Error(message);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!data.imageUrl) throw new Error('서버 응답에 imageUrl이 없습니다.');
      resultUrl = data.imageUrl;
    } else if (contentType.startsWith('image/')) {
      resultUrl = URL.createObjectURL(await response.blob());
    } else {
      throw new Error('서버는 imageUrl이 포함된 JSON 또는 이미지 파일을 반환해야 합니다.');
    }
    if (resultImage.src.startsWith('blob:')) URL.revokeObjectURL(resultImage.src);
    resultImage.onload = () => document.querySelector('.transformed-side').classList.add('has-image');
    resultImage.onerror = () => notify('결과 이미지를 불러오지 못했어요. 서버 응답을 확인해주세요.');
    resultImage.src = resultUrl;
    downloadButton.href = resultUrl;
    if (contentType.includes('application/json') && dataFileName(resultUrl)) downloadButton.download = dataFileName(resultUrl);
    else downloadButton.download = `morph-${style}.png`;
    downloadButton.classList.remove('disabled');
    downloadButton.setAttribute('aria-disabled', 'false');
    overlay.classList.add('hidden');
    status.innerHTML = '<i></i> 완성';
    notify(`${styleNames[style]} 스타일로 작품을 만들었어요.`);
  } catch (error) {
    status.innerHTML = '<i></i> 대기 중';
    notify(error instanceof TypeError ? '변환 서버에 연결할 수 없어요. 백엔드 API를 연결해주세요.' : error.message);
  } finally {
    status.setAttribute('aria-busy', 'false');
    generateButton.disabled = false;
    buttonText.textContent = selectedFile ? previousText : '이미지를 업로드해주세요';
  }
});

function dataFileName(url) {
  try { return new URL(url, window.location.href).pathname.split('/').pop() || ''; }
  catch { return ''; }
}

downloadButton.addEventListener('click', event => {
  if (downloadButton.classList.contains('disabled')) event.preventDefault();
});
