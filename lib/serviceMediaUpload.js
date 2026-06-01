export const SERVICE_VIDEO_BUCKET = 'magazine-images';
export const MAX_SERVICE_VIDEO_BYTES = 50 * 1024 * 1024;

export const SERVICE_VIDEO_MIME_BY_EXT = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function fileExtension(fileName) {
  const ext = stringValue(fileName).split('.').pop()?.toLowerCase() || '';
  return ext.replace(/[^a-z0-9]/g, '');
}

export function normalizeServiceMediaFolder(value) {
  const folder = stringValue(value);
  if (!folder) {
    return { ok: false, error: '저장 폴더 정보가 없습니다.' };
  }
  if (folder.includes('\\') || folder.includes('://') || folder.startsWith('/') || folder.includes('..')) {
    return { ok: false, error: '저장 폴더 형식이 올바르지 않습니다.' };
  }

  const parts = folder.split('/').filter(Boolean);
  const allSafe = parts.every((part) => SAFE_SEGMENT.test(part));
  if (!allSafe || parts[0] !== 'services') {
    return { ok: false, error: '서비스 미디어는 services 폴더 아래에만 저장할 수 있습니다.' };
  }

  if (parts.length === 2) {
    return { ok: true, folder: `services/${parts[1]}` };
  }
  if (parts.length === 3 && parts[1] === 'drafts') {
    return { ok: true, folder: `services/drafts/${parts[2]}` };
  }

  return { ok: false, error: '저장 폴더는 services/{id} 또는 services/drafts/{draftKey} 형식이어야 합니다.' };
}

export function validateServiceVideoUploadInput(body = {}) {
  const kind = stringValue(body.kind);
  const fileName = stringValue(body.file_name);
  const fileType = stringValue(body.file_type).toLowerCase();
  const fileSize = Number(body.file_size);
  const folderResult = normalizeServiceMediaFolder(body.folder);

  if (kind && kind !== 'video') {
    return { ok: false, error: '영상 업로드 요청만 처리할 수 있습니다.' };
  }
  if (!fileName || !fileType || !Number.isFinite(fileSize)) {
    return { ok: false, error: '파일 이름, 형식, 크기 정보가 필요합니다.' };
  }
  if (fileSize <= 0) {
    return { ok: false, error: '파일 크기 정보가 올바르지 않습니다.' };
  }
  if (fileSize > MAX_SERVICE_VIDEO_BYTES) {
    return { ok: false, error: '영상 파일 크기는 50MB 이하여야 합니다.' };
  }

  const ext = fileExtension(fileName);
  const expectedType = SERVICE_VIDEO_MIME_BY_EXT[ext];
  if (!expectedType) {
    return { ok: false, error: '지원하지 않는 영상 형식입니다. mp4, webm, mov만 업로드할 수 있습니다.' };
  }
  if (fileType !== expectedType) {
    return { ok: false, error: `파일 확장자와 MIME 형식이 일치하지 않습니다. .${ext} 파일은 ${expectedType} 이어야 합니다.` };
  }
  if (!folderResult.ok) {
    return folderResult;
  }

  return {
    ok: true,
    fileName,
    fileType,
    fileSize,
    ext,
    folder: folderResult.folder,
  };
}

export function createServiceVideoStoragePath(validated, objectName) {
  return `${validated.folder}/videos/${objectName}`;
}
