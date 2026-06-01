'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  Plus,
  Quote,
  Search,
  Trash2,
  Type,
  Video,
} from 'lucide-react';
import { SECTION_TEMPLATES, SECTION_TYPES } from '@/lib/constants';
import {
  SERVICE_DETAIL_BLOCK_LABELS,
  SERVICE_DETAIL_BLOCK_TYPES,
  SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION,
  SERVICE_DETAIL_EFFECT_VARIANTS,
  SERVICE_DETAIL_PROCESS_VARIANTS,
  SERVICE_DETAIL_STORY_BLOCK_TYPES,
  SERVICE_DETAIL_STORY_TEXT_SIZES,
  SERVICE_DETAIL_STORY_TEXT_WEIGHTS,
  createServiceDetailBlock,
  legacyDetailsToServiceDetailBlocks,
  parseYouTubeUrl,
} from '@/lib/serviceDetailBlocks';
import { getSupabaseAuthHeaders } from '@/lib/clientAuthHeaders';

const TYPE_DESCRIPTIONS = {
  intro: '상품의 핵심 메시지와 요약을 넣습니다.',
  rich_text: '긴 설명이나 운영 철학을 문단으로 작성합니다.',
  effects: '기대 효과를 카드 형태로 정리합니다.',
  process: '진행 절차를 순서대로 보여줍니다.',
  gallery: '사진 여러 장을 겹치지 않는 프리셋으로 배치합니다.',
  mockup_showcase: '이미지를 휴대폰/브라우저 목업처럼 보여줍니다.',
  youtube_embed: '유튜브 링크를 임베드 영상으로 보여줍니다.',
  video: '외부 영상 또는 업로드 영상 URL을 보여줍니다.',
  sub_products: '하위 상품이나 옵션을 카드로 정리합니다.',
  case_proof: '성과 수치, 후기, 사례 링크를 보여줍니다.',
  related_magazine: '관련 매거진으로 이어지는 연결 블록입니다.',
  landing_section: '랜딩페이지 빌더의 공통 섹션을 상품 상세에 복사해 사용합니다.',
  cta: '상담 문의를 유도하는 마무리 블록입니다.',
};

const FIELD =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const LABEL = 'block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-700 mb-1.5';
const HELP = 'text-[11px] font-semibold leading-relaxed text-zinc-500';
const FRAME_RATIO_OPTIONS = [
  { value: 'first_image', label: '첫 이미지 비율' },
  { value: '16:9', label: '가로형 16:9' },
  { value: '4:3', label: '일반 4:3' },
  { value: '1:1', label: '정사각형 1:1' },
  { value: '3:4', label: '세로형 3:4' },
  { value: '9:16', label: '모바일 9:16' },
];
const FRAME_RATIO_MAP = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
};
const STORY_ITEM_TYPES = [
  { type: 'text', label: '본문', icon: Type },
  { type: 'image', label: '사진', icon: ImageIcon },
  { type: 'image_group', label: '미디어열', icon: LayoutGrid },
  { type: 'video', label: '영상', icon: Video },
  { type: 'quote', label: '후기', icon: Quote },
  { type: 'metric', label: '성과', icon: BarChart3 },
  { type: 'cta', label: '상담 CTA', icon: LinkIcon },
];
const STORY_TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: '작게' },
  { value: 'md', label: '기본' },
  { value: 'lg', label: '크게' },
  { value: 'xl', label: '강조' },
];
const STORY_TEXT_WEIGHT_OPTIONS = [
  { value: 'regular', label: '보통' },
  { value: 'medium', label: '중간' },
  { value: 'bold', label: '굵게' },
  { value: 'black', label: '매우 굵게' },
];
const EFFECT_VARIANT_OPTIONS = [
  { value: 'benefit_cards', label: '효과 카드형', description: '여러 효과를 균형 있게 보여주는 기본형입니다.' },
  { value: 'metric_focus', label: '성과 수치 강조형', description: '수치나 핵심 키워드를 크게 보여줍니다.' },
  { value: 'before_after', label: 'Before / After형', description: '도입 전 문제와 도입 후 변화를 대비합니다.' },
  { value: 'problem_solution', label: '문제 해결형', description: '문제와 해결 방향을 연결해 설득합니다.' },
];
const PROCESS_VARIANT_OPTIONS = [
  { value: 'timeline', label: '타임라인형', description: '연결선과 단계 번호로 순서를 강조합니다.' },
  { value: 'step_cards', label: '스텝 카드형', description: '각 절차를 독립 카드처럼 크게 보여줍니다.' },
  { value: 'alternating', label: '좌우 교차형', description: '이미지가 있는 절차를 데스크톱에서 교차 배치합니다.' },
  { value: 'checklist', label: '체크리스트형', description: '짧은 실행 항목을 빠르게 훑게 합니다.' },
];
const SERVICE_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
const SERVICE_VIDEO_MIME_BY_EXT = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};
const MAX_SERVICE_VIDEO_BYTES = 50 * 1024 * 1024;

function asBlocks(details) {
  return Array.isArray(details?.blocks) ? details.blocks : [];
}

function resequence(blocks) {
  return blocks.map((block, index) => ({ ...block, sort_order: index }));
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function updateAt(blocks, index, patch) {
  return blocks.map((block, idx) => (idx === index ? { ...block, ...patch } : block));
}

function updateArrayItem(items = [], index, patch) {
  return items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
}

function addArrayItem(items = [], item) {
  return [...items, item];
}

function removeArrayItem(items = [], index) {
  return items.filter((_, idx) => idx !== index);
}

function clampPercent(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, parsed));
}

function parseObjectPosition(value) {
  if (typeof value !== 'string') return { x: 50, y: 50 };
  const match = value.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if (!match) return { x: 50, y: 50 };
  return { x: clampPercent(match[1]), y: clampPercent(match[2]) };
}

function objectPositionValue(next, current) {
  const x = clampPercent(next.x ?? current.x);
  const y = clampPercent(next.y ?? current.y);
  return `${x}% ${y}%`;
}

function clampImageScale(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(25, Math.min(250, parsed));
}

function imageDimensionPatch(width, height) {
  const naturalWidth = Number.parseInt(width, 10);
  const naturalHeight = Number.parseInt(height, 10);
  if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
    return {};
  }
  return {
    natural_width: Math.round(naturalWidth),
    natural_height: Math.round(naturalHeight),
  };
}

function readFileImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imageDimensionPatch(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}

function readFileVideoDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(imageDimensionPatch(video.videoWidth, video.videoHeight));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    video.src = url;
  });
}

function aspectRatioFromDimensions(dimensions) {
  const width = Number.parseInt(dimensions?.natural_width, 10);
  const height = Number.parseInt(dimensions?.natural_height, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return '16:9';
  const ratio = width / height;
  if (ratio > 1.55) return '16:9';
  if (ratio > 1.15) return '4:3';
  if (ratio > 0.85) return '1:1';
  return '9:16';
}

function videoExtension(fileName = '') {
  return String(fileName).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

async function readUploadError(res) {
  const status = res.status;
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    raw = '';
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return parsed.error;
  } catch {
    // plain text response
  }
  if (status === 413 || /request entity too large/i.test(raw)) {
    return '파일이 서버 요청 한도를 초과했습니다. 더 작은 파일로 시도해 주세요.';
  }
  if (status >= 500) return `서버 오류 (${status}) — 잠시 후 다시 시도해 주세요.`;
  return raw?.slice(0, 200) || `요청 실패 (${status})`;
}

async function uploadImageFile(file, uploadFolder) {
  const dimensions = await readFileImageDimensions(file);
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', uploadFolder || 'services/drafts/draft');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: await getSupabaseAuthHeaders(),
    body: fd,
  });
  const data = await res.json();
  if (!res.ok || !data?.url) throw new Error(data?.error || '업로드 실패');

  return {
    id: `image-${Date.now()}`,
    url: data.url,
    alt: file.name.replace(/\.[^.]+$/, ''),
    caption: '',
    object_position: '50% 50%',
    object_scale: 100,
    ...dimensions,
  };
}

async function uploadVideoFile(file, uploadFolder) {
  if (!file) return null;
  const ext = videoExtension(file.name);
  const expectedType = SERVICE_VIDEO_MIME_BY_EXT[ext];
  if (!expectedType || file.type !== expectedType) {
    throw new Error('mp4, webm, mov 영상 파일만 업로드할 수 있습니다.');
  }
  if (file.size > MAX_SERVICE_VIDEO_BYTES) {
    throw new Error('영상 파일 크기는 50MB 이하여야 합니다.');
  }

  const dimensions = await readFileVideoDimensions(file);
  const headers = await getSupabaseAuthHeaders();
  const signRes = await fetch('/api/upload/service-media/sign', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'video',
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      folder: uploadFolder || 'services/drafts/draft',
    }),
  });

  if (!signRes.ok) {
    throw new Error(await readUploadError(signRes));
  }

  const signData = await signRes.json();
  let publicUrl = signData.publicUrl;

  if (signData.localUpload) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', signData.pathPrefix || `${uploadFolder || 'services/drafts/draft'}/videos`);
    const localRes = await fetch(signData.uploadUrl || '/api/upload', {
      method: 'POST',
      headers,
      body: fd,
    });
    if (!localRes.ok) {
      throw new Error(await readUploadError(localRes));
    }
    const localData = await localRes.json();
    publicUrl = localData.url;
  } else {
    if (!signData?.signedUrl || !signData?.publicUrl) {
      throw new Error('영상 업로드 URL 응답이 올바르지 않습니다.');
    }
    const uploadBody = new FormData();
    uploadBody.append('cacheControl', '31536000');
    uploadBody.append('', file);
    const uploadRes = await fetch(signData.signedUrl, {
      method: 'POST',
      headers: {
        'x-upsert': 'false',
      },
      body: uploadBody,
    });
    if (!uploadRes.ok) {
      throw new Error(`Storage 업로드 실패: ${await readUploadError(uploadRes)}`);
    }
  }

  if (!publicUrl) throw new Error('업로드된 영상 URL을 확인할 수 없습니다.');

  return {
    id: `video-${Date.now()}`,
    type: 'video',
    url: publicUrl,
    title: file.name.replace(/\.[^.]+$/, ''),
    caption: '',
    alt: '',
    aspect_ratio: aspectRatioFromDimensions(dimensions),
    fit: 'contain',
    object_position: '50% 50%',
    object_scale: 100,
    autoplay: true,
    ...dimensions,
  };
}

function getImageRatio(image) {
  const width = Number.parseInt(image?.natural_width, 10);
  const height = Number.parseInt(image?.natural_height, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { css: `${width} / ${height}`, value: width / height };
}

function ratioValue(cssRatio) {
  const [width, height] = String(cssRatio || '4 / 3').split('/').map((part) => Number.parseFloat(part.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 4 / 3;
  return width / height;
}

function getImageEditorFrameRatio(block, images = []) {
  if (block.type === 'mockup_showcase') {
    return block.variant === 'phone_stack' ? '9 / 16' : '16 / 9';
  }
  if (block.type !== 'gallery') return '4 / 3';
  if ((block.frame_ratio || 'first_image') === 'first_image') {
    return getImageRatio(images[0])?.css || '4 / 3';
  }
  return FRAME_RATIO_MAP[block.frame_ratio] || '4 / 3';
}

function getEffectiveImageScale(image, frameRatio, fitMode = 'contain') {
  const imageRatio = getImageRatio(image)?.value;
  const frameRatioValue = ratioValue(frameRatio);
  const userScale = clampImageScale(image?.object_scale) / 100;
  if (fitMode !== 'cover' || !imageRatio || !frameRatioValue) return userScale;
  return Math.max(frameRatioValue / imageRatio, imageRatio / frameRatioValue, 1) * userScale;
}

function swap(blocks, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[target]] = [next[target], next[index]];
  return resequence(next);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function createStoryItem(type) {
  const id = `story-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case 'text':
      return { id, type, body: '', text_size: 'md', text_weight: 'medium' };
    case 'image':
      return { id, type, image: createBlankImage(`${id}-image`) };
    case 'image_group':
      return { id, type, variant: 'carousel', frame_ratio: 'first_image', fit: 'contain', images: [] };
    case 'video':
      return { id, type, media_type: 'video', url: '', title: '', aspect_ratio: '16:9', fit: 'contain', object_position: '50% 50%', object_scale: 100, autoplay: true };
    case 'quote':
      return { id, type, quote: '', author: '', role: '', media: null };
    case 'metric':
      return { id, type, title: '', desc: '', icon: '', media: null };
    case 'cta':
      return { id, type, copy: '', button_label: '카카오톡 문의', button_href: '' };
    default:
      return { id, type: 'text', body: '' };
  }
}

function createBlankImage(idPrefix = 'image') {
  return {
    id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: '',
    alt: '',
    caption: '',
    object_position: '50% 50%',
    object_scale: 100,
  };
}

function seedStoryItemsFromBlock(block) {
  if (Array.isArray(block.story_items) && block.story_items.length > 0) return block.story_items;

  if (block.type === 'intro') {
    const body = [block.headline, block.summary].filter(Boolean).join('\n\n');
    return body ? [{ ...createStoryItem('text'), body }] : [];
  }
  if (block.type === 'rich_text') {
    return block.body ? [{ ...createStoryItem('text'), body: block.body }] : [];
  }
  if (block.type === 'effects') {
    return (block.cards || []).map((card) => ({
      ...createStoryItem('metric'),
      title: card.title || '',
      desc: card.desc || '',
      icon: card.icon || '',
    }));
  }
  if (block.type === 'process') {
    return (block.steps || []).map((step) => ({
      ...createStoryItem('text'),
      body: [step.name, step.desc].filter(Boolean).join('\n'),
    })).filter((item) => item.body);
  }
  if (block.type === 'case_proof') {
    return [
      ...(block.metrics || []).map((metric) => ({
        ...createStoryItem('metric'),
        title: metric.title || '',
        desc: metric.desc || '',
        icon: metric.icon || '',
        media: metric.media || null,
      })),
      ...(block.quote ? [{ ...createStoryItem('quote'), quote: block.quote }] : []),
    ];
  }

  return [];
}

function createLandingSectionBlock({ sectionType, title, subtitle = '', content = {}, sourceLabel = '' }, sortOrder) {
  return createServiceDetailBlock('landing_section', {
    sort_order: sortOrder,
    section_type: sectionType,
    title,
    subtitle,
    content: cloneValue(content),
    source_label: sourceLabel,
  });
}

function blockAdminTitle(block) {
  return block.display_title
    || (block.type === 'landing_section' ? block.title : '')
    || SERVICE_DETAIL_BLOCK_LABELS[block.type]
    || block.type;
}

function productLibraryItems() {
  return SERVICE_DETAIL_BLOCK_TYPES
    .filter((type) => type !== 'landing_section')
    .map((type) => ({
      key: `product-${type}`,
      kind: 'product',
      type,
      label: SERVICE_DETAIL_BLOCK_LABELS[type],
      description: TYPE_DESCRIPTIONS[type],
      badge: '상품 전용',
    }));
}

function landingTemplateItems() {
  return Object.entries(SECTION_TYPES).map(([sectionType, meta]) => ({
    key: `landing-template-${sectionType}`,
    kind: 'landing-template',
    sectionType,
    label: meta.label,
    description: meta.description || '랜딩페이지 빌더에서 쓰는 공통 섹션입니다.',
    badge: '랜딩 기본',
  }));
}

function blockWarnings(block) {
  const warnings = [];
  if (block.type === 'youtube_embed' && block.url && !parseYouTubeUrl(block.url).ok) {
    warnings.push('유튜브 링크 형식을 확인해 주세요.');
  }
  if ((block.type === 'gallery' || block.type === 'mockup_showcase') && (!block.images || block.images.length === 0)) {
    warnings.push(`${block.type === 'gallery' ? '미디어' : '이미지'}를 1개 이상 추가해야 화면에 노출됩니다.`);
  }
  if (Array.isArray(block.images) && block.images.some((image) => image.type !== 'video' && image.url && !image.alt)) {
    warnings.push('이미지 대체 텍스트가 비어 있습니다.');
  }
  if (block.type === 'video' && !block.url) {
    warnings.push('영상 파일을 업로드하거나 URL을 입력해야 화면에 노출됩니다.');
  }
  if (block.type === 'landing_section' && !block.section_type) {
    warnings.push('랜딩 공통 섹션 타입을 선택해야 화면에 노출됩니다.');
  }
  return warnings;
}

function LandingContentJsonEditor({ content, onCommit }) {
  const [draft, setDraft] = useState(() => JSON.stringify(content || {}, null, 2));
  const [error, setError] = useState('');

  const commit = () => {
    try {
      const parsed = JSON.parse(draft || '{}');
      setError('');
      onCommit(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
    } catch {
      setError('JSON 형식이 올바르지 않습니다. 쉼표, 따옴표, 중괄호를 확인해 주세요.');
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        className={`${FIELD} min-h-40 resize-y font-mono text-xs leading-relaxed`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
      <p className={HELP}>랜딩페이지 빌더의 고급 편집과 같은 구조입니다. 일반 문구는 위의 제목/서브타이틀에서 수정하고, 섹션 내부 항목은 JSON으로 조정합니다.</p>
    </div>
  );
}

function ImageListEditor({ block, onChange, uploadFolder }) {
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const images = Array.isArray(block.images) ? block.images : [];

  const uploadFile = async (file, kind = 'image') => {
    if (!file) return;
    setUploading(true);
    try {
      const uploadedImage = kind === 'video'
        ? await uploadVideoFile(file, uploadFolder)
        : { ...(await uploadImageFile(file, uploadFolder)), type: 'image' };
      onChange({
        images: addArrayItem(images, uploadedImage),
        ...(block.type === 'gallery' && !block.frame_ratio ? { frame_ratio: 'first_image' } : {}),
      });
    } catch (err) {
      alert(`${kind === 'video' ? '영상' : '이미지'} 업로드 실패: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className={LABEL}>미디어</span>
          <p className={HELP}>이미지 URL을 직접 넣거나, 사진/영상을 업로드할 수 있습니다. 영상은 무음 자동재생으로 저장됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ images: addArrayItem(images, { id: `image-${Date.now()}`, type: 'image', url: '', alt: '', caption: '', object_position: '50% 50%', object_scale: 100 }) })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
          >
            URL 추가
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-black text-white hover:bg-black"
          >
            {uploading ? '업로드 중' : '사진 업로드'}
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="rounded-lg border border-zinc-900 px-3 py-2 text-[11px] font-black text-zinc-900 hover:bg-zinc-100"
          >
            영상 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              uploadFile(e.target.files?.[0], 'image');
              e.target.value = '';
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept={SERVICE_VIDEO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              uploadFile(e.target.files?.[0], 'video');
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {images.map((image, index) => {
          const isVideo = image.type === 'video';
          const position = parseObjectPosition(image.object_position);
          const scale = clampImageScale(image.object_scale);
          const frameRatio = getImageEditorFrameRatio(block, images);
          const fitMode = block.fit === 'cover' ? 'cover' : 'contain';
          const effectiveScale = getEffectiveImageScale(image, frameRatio, fitMode);
          const updatePosition = (patch) => {
            onChange({ images: updateArrayItem(images, index, { object_position: objectPositionValue(patch, position) }) });
          };
          const rememberDimensions = (event) => {
            const patch = imageDimensionPatch(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
            if (!patch.natural_width || !patch.natural_height) return;
            if (patch.natural_width === image.natural_width && patch.natural_height === image.natural_height) return;
            onChange({ images: updateArrayItem(images, index, patch) });
          };
          const rememberVideoDimensions = (event) => {
            const patch = imageDimensionPatch(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
            if (!patch.natural_width || !patch.natural_height) return;
            if (patch.natural_width === image.natural_width && patch.natural_height === image.natural_height) return;
            onChange({ images: updateArrayItem(images, index, patch) });
          };

          return (
            <div
              key={image.id || index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex === null) return;
                onChange({ images: moveItem(images, dragIndex, index) });
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`grid cursor-grab grid-cols-1 gap-2 rounded-2xl border bg-zinc-50 p-3 md:grid-cols-[96px_1fr_auto] ${
                dragIndex === index ? 'border-zinc-900 opacity-70' : 'border-zinc-200'
              }`}
            >
              <div className="overflow-hidden rounded-xl bg-zinc-200" style={{ aspectRatio: frameRatio }}>
                {image.url && isVideo ? (
                  <video
                    src={image.url}
                    className="h-full w-full"
                    muted
                    loop
                    playsInline
                    autoPlay
                    onLoadedMetadata={rememberVideoDimensions}
                    style={{
                      objectFit: fitMode,
                      objectPosition: image.object_position || '50% 50%',
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: image.object_position || '50% 50%',
                    }}
                  />
                ) : image.url ? (
                  <img
                    src={image.url}
                    alt={image.alt || ''}
                    className="h-full w-full"
                    onLoad={rememberDimensions}
                    style={{
                      objectFit: fitMode,
                      objectPosition: image.object_position || '50% 50%',
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: image.object_position || '50% 50%',
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500">
                    {isVideo ? <Video size={18} /> : <ImageIcon size={18} />}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <input
                  className={FIELD}
                  placeholder={isVideo ? '영상 URL' : '이미지 URL'}
                  value={image.url || ''}
                  onChange={(e) => onChange({ images: updateArrayItem(images, index, { url: e.target.value }) })}
                />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    className={FIELD}
                    placeholder={isVideo ? '영상 제목' : '대체 텍스트'}
                    value={isVideo ? (image.title || '') : (image.alt || '')}
                    onChange={(e) => onChange({ images: updateArrayItem(images, index, isVideo ? { title: e.target.value } : { alt: e.target.value }) })}
                  />
                  <input
                    className={FIELD}
                    placeholder="캡션"
                    value={image.caption || ''}
                    onChange={(e) => onChange({ images: updateArrayItem(images, index, { caption: e.target.value }) })}
                  />
                </div>
                {isVideo && (
                  <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700">
                    <input
                      type="checkbox"
                      checked={image.autoplay !== false}
                      onChange={(e) => onChange({ images: updateArrayItem(images, index, { autoplay: e.target.checked }) })}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                    />
                    무음 자동재생
                  </label>
                )}
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-700">{isVideo ? '영상 초점' : '이미지 초점'}</span>
                    <span className="text-[11px] font-black text-zinc-500">{position.x}% / {position.y}%</span>
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      {isVideo ? '영상 크기' : '사진 크기'}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="25"
                          max="250"
                          value={scale}
                          onChange={(e) => onChange({ images: updateArrayItem(images, index, { object_scale: clampImageScale(e.target.value) }) })}
                          className="min-w-0 flex-1"
                        />
                        <span className="w-12 text-right text-[11px] font-black text-zinc-500">{scale}%</span>
                      </div>
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      가로 위치
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={position.x}
                        onChange={(e) => updatePosition({ x: e.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                      세로 위치
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={position.y}
                        onChange={(e) => updatePosition({ y: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ['중앙', { x: 50, y: 50 }],
                      ['위', { x: 50, y: 0 }],
                      ['아래', { x: 50, y: 100 }],
                      ['왼쪽', { x: 0, y: 50 }],
                      ['오른쪽', { x: 100, y: 50 }],
                    ].map(([label, patch]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updatePosition(patch)}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-black text-zinc-700 hover:border-zinc-900 hover:text-zinc-950"
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onChange({ images: updateArrayItem(images, index, { object_scale: 100 }) })}
                      className="rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-black text-zinc-700 hover:border-zinc-900 hover:text-zinc-950"
                    >
                      크기 초기화
                    </button>
                  </div>
                  <p className={`${HELP} mt-2`}>
                    원본 미디어를 먼저 보존한 뒤 프레임 안에서 확대/축소합니다. 크기를 줄이면 잘려 보이던 원본 영역이 다시 보이고, 초점은 확대 기준점으로 쓰입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onChange({ images: removeArrayItem(images, index) })}
                className="h-10 rounded-lg px-3 text-zinc-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SingleImageEditor({ label = '이미지', image, onChange, onRemove, uploadFolder, help }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const current = image || { id: 'image-draft', url: '', alt: '', caption: '', object_position: '50% 50%', object_scale: 100 };
  const position = parseObjectPosition(current.object_position);
  const scale = clampImageScale(current.object_scale);
  const frameRatio = getImageRatio(current)?.css || '4 / 3';
  const effectiveScale = getEffectiveImageScale(current, frameRatio, 'contain');

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImageFile(file, uploadFolder));
    } catch (err) {
      alert(`이미지 업로드 실패: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const updateImage = (patch) => {
    onChange({
      ...current,
      id: current.id || `image-${Date.now()}`,
      object_position: current.object_position || '50% 50%',
      object_scale: current.object_scale || 100,
      ...patch,
    });
  };

  const updatePosition = (patch) => {
    updateImage({ object_position: objectPositionValue(patch, position) });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className={LABEL}>{label}</span>
          {help && <p className={HELP}>{help}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-black text-white hover:bg-black"
          >
            {uploading ? '업로드 중' : '업로드'}
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-700 hover:bg-red-50 hover:text-red-600"
            >
              제거
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              uploadFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[132px_1fr]">
        <div className="overflow-hidden rounded-xl bg-zinc-200" style={{ aspectRatio: frameRatio }}>
          {current.url ? (
            <img
              src={current.url}
              alt={current.alt || ''}
              className="h-full w-full object-contain"
              onLoad={(event) => {
                const patch = imageDimensionPatch(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
                if (!patch.natural_width || !patch.natural_height) return;
                if (patch.natural_width === current.natural_width && patch.natural_height === current.natural_height) return;
                updateImage(patch);
              }}
              style={{
                objectPosition: current.object_position || '50% 50%',
                transform: `scale(${effectiveScale})`,
                transformOrigin: current.object_position || '50% 50%',
              }}
            />
          ) : (
            <div className="flex h-full min-h-28 items-center justify-center text-zinc-500">
              <ImageIcon size={18} />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <input
            className={FIELD}
            placeholder="이미지 URL"
            value={current.url || ''}
            onChange={(e) => updateImage({ url: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              className={FIELD}
              placeholder="대체 텍스트"
              value={current.alt || ''}
              onChange={(e) => updateImage({ alt: e.target.value })}
            />
            <input
              className={FIELD}
              placeholder="캡션"
              value={current.caption || ''}
              onChange={(e) => updateImage({ caption: e.target.value })}
            />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-700">이미지 조정</span>
              <span className="text-[11px] font-black text-zinc-500">{position.x}% / {position.y}% / {scale}%</span>
            </div>
            <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
              사진 크기
              <input
                type="range"
                min="25"
                max="250"
                value={scale}
                onChange={(e) => updateImage({ object_scale: clampImageScale(e.target.value) })}
              />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                가로 위치
                <input type="range" min="0" max="100" value={position.x} onChange={(e) => updatePosition({ x: e.target.value })} />
              </label>
              <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                세로 위치
                <input type="range" min="0" max="100" value={position.y} onChange={(e) => updatePosition({ y: e.target.value })} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function imageFromMedia(media) {
  if (media?.image) return media.image;
  if (media?.type === 'image' && media?.url) {
    return {
      id: media.id || 'media-image-draft',
      url: media.url,
      alt: media.alt || '',
      caption: media.caption || '',
      object_position: media.object_position || '50% 50%',
      object_scale: media.object_scale || 100,
      natural_width: media.natural_width,
      natural_height: media.natural_height,
    };
  }
  return null;
}

function VideoAssetEditor({ label = '업로드 영상', media, onChange, uploadFolder, allowRemove = false, onRemove }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const current = {
    id: media?.id || 'video-draft',
    type: 'video',
    url: '',
    title: '',
    aspect_ratio: '16:9',
    fit: 'contain',
    object_position: '50% 50%',
    object_scale: 100,
    autoplay: true,
    ...media,
  };
  const position = parseObjectPosition(current.object_position);
  const scale = clampImageScale(current.object_scale);
  const frameRatio = FRAME_RATIO_MAP[current.aspect_ratio] || getImageRatio(current)?.css || '16 / 9';
  const effectiveScale = getEffectiveImageScale(current, frameRatio, current.fit === 'cover' ? 'cover' : 'contain');

  const updateVideo = (patch) => {
    onChange({
      ...current,
      type: 'video',
      object_position: current.object_position || '50% 50%',
      object_scale: current.object_scale || 100,
      autoplay: current.autoplay !== false,
      ...patch,
    });
  };
  const updatePosition = (patch) => {
    updateVideo({ object_position: objectPositionValue(patch, position) });
  };
  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadVideoFile(file, uploadFolder);
      updateVideo(uploaded);
    } catch (err) {
      alert(`영상 업로드 실패: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className={LABEL}>{label}</span>
          <p className={HELP}>파일 업로드가 기본입니다. URL을 직접 넣는 경우에도 같은 맞춤/초점/크기 설정을 적용합니다.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-black text-white hover:bg-black"
          >
            {uploading ? '업로드 중' : '영상 업로드'}
          </button>
          {allowRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-700 hover:bg-red-50 hover:text-red-600"
            >
              제거
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={SERVICE_VIDEO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              uploadFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <div className="overflow-hidden rounded-xl bg-zinc-200" style={{ aspectRatio: frameRatio }}>
          {current.url ? (
            <video
              src={current.url}
              className="h-full w-full"
              muted
              loop
              playsInline
              autoPlay={current.autoplay !== false}
              controls={current.autoplay === false}
              onLoadedMetadata={(event) => {
                const patch = imageDimensionPatch(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
                if (!patch.natural_width || !patch.natural_height) return;
                if (patch.natural_width === current.natural_width && patch.natural_height === current.natural_height) return;
                updateVideo(patch);
              }}
              style={{
                objectFit: current.fit === 'cover' ? 'cover' : 'contain',
                objectPosition: current.object_position || '50% 50%',
                transform: `scale(${effectiveScale})`,
                transformOrigin: current.object_position || '50% 50%',
              }}
            />
          ) : (
            <div className="flex h-full min-h-28 items-center justify-center text-zinc-500">
              <Video size={18} />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <input
            className={FIELD}
            placeholder="영상 URL 또는 업로드 후 생성된 URL"
            value={current.url || ''}
            onChange={(e) => updateVideo({ url: e.target.value })}
          />
          <input
            className={FIELD}
            placeholder="영상 제목"
            value={current.title || ''}
            onChange={(e) => updateVideo({ title: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label>
              <span className={LABEL}>비율</span>
              <select className={FIELD} value={current.aspect_ratio || '16:9'} onChange={(e) => updateVideo({ aspect_ratio: e.target.value })}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
            <label>
              <span className={LABEL}>맞춤</span>
              <select className={FIELD} value={current.fit || 'contain'} onChange={(e) => updateVideo({ fit: e.target.value })}>
                <option value="contain">전체 보이기</option>
                <option value="cover">꽉 채우기</option>
              </select>
            </label>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-700">
            <input
              type="checkbox"
              checked={current.autoplay !== false}
              onChange={(e) => updateVideo({ autoplay: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
            />
            무음 자동재생
          </label>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-700">영상 조정</span>
              <span className="text-[11px] font-black text-zinc-500">{position.x}% / {position.y}% / {scale}%</span>
            </div>
            <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
              영상 크기
              <input type="range" min="25" max="250" value={scale} onChange={(e) => updateVideo({ object_scale: clampImageScale(e.target.value) })} />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                가로 위치
                <input type="range" min="0" max="100" value={position.x} onChange={(e) => updatePosition({ x: e.target.value })} />
              </label>
              <label className="grid gap-1 text-[11px] font-bold text-zinc-600">
                세로 위치
                <input type="range" min="0" max="100" value={position.y} onChange={(e) => updatePosition({ y: e.target.value })} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaEditor({ label = '선택 미디어', media, onChange, uploadFolder }) {
  const current = media || { type: 'image', url: '', title: '', fit: 'contain', frame_ratio: 'first_image', aspect_ratio: '16:9' };
  const type = current.type || 'image';
  const updateMedia = (patch) => onChange({ ...current, ...patch });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className={LABEL}>{label}</span>
          <p className={HELP}>없어도 저장됩니다. 사진과 업로드 영상은 같은 방식으로 비율, 맞춤, 위치, 크기를 조정합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-700 hover:bg-red-50 hover:text-red-600"
        >
          미디어 제거
        </button>
      </div>
      <label>
        <span className={LABEL}>미디어 종류</span>
        <select
          className={FIELD}
          value={type}
          onChange={(e) => updateMedia({
            type: e.target.value,
            ...(e.target.value === 'video' ? { autoplay: current.autoplay !== false, fit: current.fit || 'contain', object_position: current.object_position || '50% 50%', object_scale: current.object_scale || 100 } : {}),
          })}
        >
          <option value="image">사진</option>
          <option value="youtube">유튜브 링크</option>
          <option value="video">업로드 영상</option>
        </select>
      </label>

      {type === 'image' ? (
        <div className="mt-3">
          <SingleImageEditor
            label="사진"
            image={imageFromMedia(current)}
            uploadFolder={uploadFolder}
            onChange={(image) => updateMedia({ type: 'image', url: image.url || '', image })}
          />
        </div>
      ) : type === 'video' ? (
        <div className="mt-3">
          <VideoAssetEditor
            label="영상"
            media={current}
            uploadFolder={uploadFolder}
            onChange={(video) => updateMedia(video)}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <label>
            <span className={LABEL}>유튜브 링크</span>
            <input className={FIELD} value={current.url || ''} onChange={(e) => updateMedia({ url: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className={LABEL}>제목</span>
              <input className={FIELD} value={current.title || ''} onChange={(e) => updateMedia({ title: e.target.value })} />
            </label>
            <label>
              <span className={LABEL}>영상 비율</span>
              <select className={FIELD} value={current.aspect_ratio || '16:9'} onChange={(e) => updateMedia({ aspect_ratio: e.target.value })}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryItemEditor({ item, onChange, uploadFolder }) {
  if (item.type === 'text') {
    const textSize = SERVICE_DETAIL_STORY_TEXT_SIZES.includes(item.text_size) ? item.text_size : 'md';
    const textWeight = SERVICE_DETAIL_STORY_TEXT_WEIGHTS.includes(item.text_weight) ? item.text_weight : 'medium';
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>텍스트 크기</span>
            <select className={FIELD} value={textSize} onChange={(e) => onChange({ text_size: e.target.value })}>
              {STORY_TEXT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>굵기</span>
            <select className={FIELD} value={textWeight} onChange={(e) => onChange({ text_weight: e.target.value })}>
              {STORY_TEXT_WEIGHT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span className={LABEL}>본문</span>
          <textarea
            className={`${FIELD} min-h-36 resize-y leading-relaxed`}
            value={item.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="문단을 입력하세요. 모바일 줄 길이는 엔터로 직접 조절할 수 있습니다."
          />
        </label>
      </div>
    );
  }

  if (item.type === 'image') {
    return (
      <SingleImageEditor
        label="사진"
        image={item.image}
        uploadFolder={uploadFolder}
        help="한 열에 한 장만 넣는 사진은 원본 규격을 우선 보존합니다."
        onChange={(image) => onChange({ image })}
      />
    );
  }

  if (item.type === 'image_group') {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label>
            <span className={LABEL}>배치</span>
            <select className={FIELD} value={item.variant || 'carousel'} onChange={(e) => onChange({ variant: e.target.value })}>
              <option value="carousel">가로 스크롤</option>
              <option value="grid_2">2열 그리드</option>
              <option value="grid_3">3열 그리드</option>
            </select>
          </label>
          <label>
            <span className={LABEL}>프레임 비율</span>
            <select className={FIELD} value={item.frame_ratio || 'first_image'} onChange={(e) => onChange({ frame_ratio: e.target.value })}>
              {FRAME_RATIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>이미지 맞춤</span>
            <select className={FIELD} value={item.fit || 'contain'} onChange={(e) => onChange({ fit: e.target.value })}>
              <option value="contain">전체 보이기</option>
              <option value="cover">꽉 채우기</option>
            </select>
          </label>
        </div>
        <ImageListEditor
          block={{ type: 'gallery', variant: item.variant || 'carousel', frame_ratio: item.frame_ratio || 'first_image', fit: item.fit || 'contain', images: item.images || [] }}
          uploadFolder={uploadFolder}
          onChange={(patch) => onChange({ ...patch })}
        />
      </div>
    );
  }

  if (item.type === 'video') {
    const mediaType = item.media_type || item.provider || (item.video_id ? 'youtube' : 'video');
    const isYoutube = mediaType === 'youtube';
    const parsed = isYoutube && item.url ? parseYouTubeUrl(item.url) : { ok: true };
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>영상 종류</span>
            <select className={FIELD} value={mediaType} onChange={(e) => onChange({ media_type: e.target.value })}>
              <option value="video">업로드 영상</option>
              <option value="youtube">유튜브</option>
            </select>
          </label>
          {isYoutube && (
            <label>
              <span className={LABEL}>비율</span>
              <select className={FIELD} value={item.aspect_ratio || '16:9'} onChange={(e) => onChange({ aspect_ratio: e.target.value })}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
          )}
        </div>
        {isYoutube ? (
          <>
            <label>
              <span className={LABEL}>유튜브 링크</span>
              <input className={FIELD} value={item.url || ''} onChange={(e) => onChange({ url: e.target.value })} />
            </label>
            {item.url && !parsed.ok && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{parsed.error}</p>}
            <label>
              <span className={LABEL}>영상 제목</span>
              <input className={FIELD} value={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
            </label>
          </>
        ) : (
          <VideoAssetEditor
            label="스토리 영상"
            media={{ ...item, type: 'video' }}
            uploadFolder={uploadFolder}
            onChange={(video) => onChange({ ...video, media_type: 'video' })}
          />
        )}
      </div>
    );
  }

  if (item.type === 'quote') {
    return (
      <div className="grid gap-3">
        <label>
          <span className={LABEL}>후기/인용문</span>
          <textarea className={`${FIELD} min-h-28 resize-y`} value={item.quote || ''} onChange={(e) => onChange({ quote: e.target.value })} />
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>이름</span>
            <input className={FIELD} value={item.author || ''} onChange={(e) => onChange({ author: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>역할/소속</span>
            <input className={FIELD} value={item.role || ''} onChange={(e) => onChange({ role: e.target.value })} />
          </label>
        </div>
        <MediaEditor label="후기에 붙일 사진/영상" media={item.media} onChange={(media) => onChange({ media })} uploadFolder={uploadFolder} />
      </div>
    );
  }

  if (item.type === 'metric') {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_96px]">
          <label>
            <span className={LABEL}>성과 수치/제목</span>
            <input className={FIELD} value={item.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>아이콘</span>
            <input className={FIELD} value={item.icon || ''} onChange={(e) => onChange({ icon: e.target.value })} placeholder="선택" />
          </label>
        </div>
        <label>
          <span className={LABEL}>설명</span>
          <textarea className={`${FIELD} min-h-24 resize-y`} value={item.desc || ''} onChange={(e) => onChange({ desc: e.target.value })} />
        </label>
        <MediaEditor label="성과 근거 사진/영상" media={item.media} onChange={(media) => onChange({ media })} uploadFolder={uploadFolder} />
      </div>
    );
  }

  if (item.type === 'cta') {
    return (
      <div className="grid gap-3">
        <label>
          <span className={LABEL}>유도 문구</span>
          <textarea className={`${FIELD} min-h-24 resize-y`} value={item.copy || ''} onChange={(e) => onChange({ copy: e.target.value })} />
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>버튼 라벨</span>
            <input className={FIELD} value={item.button_label || ''} onChange={(e) => onChange({ button_label: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>이동 주소</span>
            <input className={FIELD} value={item.button_href || ''} onChange={(e) => onChange({ button_href: e.target.value })} placeholder="리드폼 경로 또는 카카오톡 외부 링크" />
          </label>
        </div>
      </div>
    );
  }

  return null;
}

function StoryItemsEditor({ items = [], onChange, uploadFolder }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [collapsedItemIds, setCollapsedItemIds] = useState(() => new Set());
  const addItem = (type) => onChange(addArrayItem(items, createStoryItem(type)));
  const itemKey = (item, index) => item.id || `${item.type || 'story'}-${index}`;
  const toggleItemCollapsed = (key) => {
    setCollapsedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <span className={LABEL}>스토리 조각</span>
            <p className={HELP}>사진, 본문, 미디어열, 영상, 후기, 성과, 상담 CTA를 원하는 순서로 쌓습니다. 저장 전까지는 오른쪽 미리보기에만 즉시 반영됩니다.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STORY_ITEM_TYPES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => addItem(option.type)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[11px] font-black text-zinc-800 hover:border-zinc-900 hover:text-zinc-950"
              >
                <Icon size={14} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm font-bold text-zinc-500">
          아직 스토리 조각이 없습니다. 위 버튼으로 본문이나 사진을 추가하세요.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const meta = STORY_ITEM_TYPES.find((option) => option.type === item.type) || STORY_ITEM_TYPES[0];
            const Icon = meta.icon;
            const key = itemKey(item, index);
            const isCollapsed = collapsedItemIds.has(key);
            return (
              <div
                key={key}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex === null) return;
                  onChange(moveItem(items, dragIndex, index));
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`rounded-2xl border bg-white ${
                  dragIndex === index ? 'border-zinc-900 opacity-80' : 'border-zinc-200'
                }`}
              >
                <div className={`flex flex-col gap-3 bg-zinc-50 px-4 py-3 md:flex-row md:items-center md:justify-between ${
                  isCollapsed ? '' : 'border-b border-zinc-200'
                }`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded-lg bg-zinc-900 p-2 text-white"><Icon size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-900">{String(index + 1).padStart(2, '0')}. {meta.label}</p>
                      <p className="text-[11px] font-semibold text-zinc-500">드래그하거나 화살표로 순서를 바꿀 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleItemCollapsed(key)}
                      aria-expanded={!isCollapsed}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-black text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
                    >
                      {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                      {isCollapsed ? '펼치기' : '접기'}
                    </button>
                    <button type="button" onClick={() => onChange(moveItem(items, index, index - 1))} disabled={index === 0} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ArrowUp size={15} /></button>
                    <button type="button" onClick={() => onChange(moveItem(items, index, index + 1))} disabled={index === items.length - 1} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ArrowDown size={15} /></button>
                    <button type="button" onClick={() => onChange(removeArrayItem(items, index))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="p-4">
                    <StoryItemEditor
                      item={item}
                      uploadFolder={uploadFolder}
                      onChange={(patch) => onChange(updateArrayItem(items, index, patch))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardsEditor({ label, items = [], onChange, titlePlaceholder = '제목', descPlaceholder = '설명' }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={LABEL}>{label}</span>
        <button
          type="button"
          onClick={() => onChange(addArrayItem(items, { title: '', desc: '', icon: '' }))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
        >
          항목 추가
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
          <input
            className={FIELD}
            placeholder={titlePlaceholder}
            value={item.title || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { title: e.target.value }))}
          />
          <textarea
            className={`${FIELD} min-h-24 resize-y`}
            placeholder={descPlaceholder}
            value={item.desc || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { desc: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => onChange(removeArrayItem(items, index))}
            className="justify-self-end rounded-lg px-3 py-1.5 text-[11px] font-black text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}

function EffectCardsEditor({ items = [], onChange }) {
  const addEffect = () => onChange(addArrayItem(items, {
    title: '',
    desc: '',
    icon: '',
    metric: '',
    before: '',
    after: '',
    is_featured: false,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={LABEL}>효과 항목</span>
        <button
          type="button"
          onClick={addEffect}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
        >
          효과 추가
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_150px_120px]">
            <input
              className={FIELD}
              placeholder="효과 제목"
              value={item.title || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { title: e.target.value }))}
            />
            <input
              className={FIELD}
              placeholder="수치/키워드"
              value={item.metric || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { metric: e.target.value }))}
            />
            <input
              className={FIELD}
              placeholder="라벨"
              value={item.icon || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { icon: e.target.value }))}
            />
          </div>
          <textarea
            className={`${FIELD} min-h-24 resize-y`}
            placeholder="효과 설명"
            value={item.desc || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { desc: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <textarea
              className={`${FIELD} min-h-20 resize-y`}
              placeholder="도입 전 문제"
              value={item.before || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { before: e.target.value }))}
            />
            <textarea
              className={`${FIELD} min-h-20 resize-y`}
              placeholder="도입 후 변화"
              value={item.after || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { after: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-black text-zinc-700">
              <input
                type="checkbox"
                checked={item.is_featured === true}
                onChange={(e) => onChange(updateArrayItem(items, index, { is_featured: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
              />
              대표 효과로 강조
            </label>
            <button
              type="button"
              onClick={() => onChange(removeArrayItem(items, index))}
              className="rounded-lg px-3 py-1.5 text-[11px] font-black text-zinc-500 hover:bg-red-50 hover:text-red-600"
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepsEditor({ items = [], onChange, uploadFolder }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={LABEL}>절차</span>
        <button
          type="button"
          onClick={() => onChange(addArrayItem(items, { step: String(items.length + 1).padStart(2, '0'), name: '', desc: '' }))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
        >
          절차 추가
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[72px_1fr] gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
          <input
            className={`${FIELD} text-center`}
            value={item.step || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { step: e.target.value }))}
          />
          <div className="grid gap-2">
            <input
              className={FIELD}
              placeholder="절차명"
              value={item.name || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { name: e.target.value }))}
            />
            <textarea
              className={`${FIELD} min-h-20 resize-y`}
              placeholder="설명"
              value={item.desc || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { desc: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className={FIELD}
                placeholder="기간/타이밍"
                value={item.duration || ''}
                onChange={(e) => onChange(updateArrayItem(items, index, { duration: e.target.value }))}
              />
              <input
                className={FIELD}
                placeholder="산출물/결과물"
                value={item.deliverable || ''}
                onChange={(e) => onChange(updateArrayItem(items, index, { deliverable: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(removeArrayItem(items, index))}
              className="justify-self-end rounded-lg px-3 py-1.5 text-[11px] font-black text-zinc-500 hover:bg-red-50 hover:text-red-600"
            >
              삭제
            </button>
            {item.image ? (
              <SingleImageEditor
                label="절차 이미지"
                image={item.image}
                uploadFolder={uploadFolder}
                help="이 단계에만 붙는 선택 이미지입니다. 없어도 절차는 정상 표시됩니다."
                onChange={(image) => onChange(updateArrayItem(items, index, { image }))}
                onRemove={() => onChange(updateArrayItem(items, index, { image: null }))}
              />
            ) : (
              <button
                type="button"
                onClick={() => onChange(updateArrayItem(items, index, { image: createBlankImage(`step-${index + 1}`) }))}
                className="justify-self-start rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
              >
                절차 이미지 추가
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProofMetricsEditor({ items = [], onChange, uploadFolder }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={LABEL}>성과 수치</span>
        <button
          type="button"
          onClick={() => onChange(addArrayItem(items, { id: `metric-${Date.now()}`, title: '', desc: '', icon: '', media: null }))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
        >
          성과 추가
        </button>
      </div>
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-sm font-bold text-zinc-500">
          아직 성과 수치가 없습니다.
        </div>
      )}
      {items.map((item, index) => (
        <div key={item.id || index} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_96px]">
            <input
              className={FIELD}
              placeholder="수치 또는 제목"
              value={item.title || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { title: e.target.value }))}
            />
            <input
              className={FIELD}
              placeholder="아이콘"
              value={item.icon || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { icon: e.target.value }))}
            />
          </div>
          <textarea
            className={`${FIELD} min-h-24 resize-y`}
            placeholder="성과 설명"
            value={item.desc || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { desc: e.target.value }))}
          />
          <MediaEditor
            label="성과 근거 사진/영상"
            media={item.media}
            uploadFolder={uploadFolder}
            onChange={(media) => onChange(updateArrayItem(items, index, { media }))}
          />
          <button
            type="button"
            onClick={() => onChange(removeArrayItem(items, index))}
            className="justify-self-end rounded-lg px-3 py-1.5 text-[11px] font-black text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}

function TestimonialsEditor({ items = [], onChange, uploadFolder }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={LABEL}>후기 / 인용문</span>
        <button
          type="button"
          onClick={() => onChange(addArrayItem(items, { id: `testimonial-${Date.now()}`, quote: '', author: '', role: '', media: null }))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-[11px] font-black text-zinc-800 hover:bg-zinc-100"
        >
          후기 추가
        </button>
      </div>
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-sm font-bold text-zinc-500">
          아직 후기나 인용문이 없습니다.
        </div>
      )}
      {items.map((item, index) => (
        <div key={item.id || index} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
          <textarea
            className={`${FIELD} min-h-28 resize-y`}
            placeholder="후기 또는 인용문"
            value={item.quote || ''}
            onChange={(e) => onChange(updateArrayItem(items, index, { quote: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              className={FIELD}
              placeholder="이름"
              value={item.author || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { author: e.target.value }))}
            />
            <input
              className={FIELD}
              placeholder="역할/소속"
              value={item.role || ''}
              onChange={(e) => onChange(updateArrayItem(items, index, { role: e.target.value }))}
            />
          </div>
          <MediaEditor
            label="후기 근거 사진/영상"
            media={item.media}
            uploadFolder={uploadFolder}
            onChange={(media) => onChange(updateArrayItem(items, index, { media }))}
          />
          <button
            type="button"
            onClick={() => onChange(removeArrayItem(items, index))}
            className="justify-self-end rounded-lg px-3 py-1.5 text-[11px] font-black text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}

function BlockFields({ block, onChange, uploadFolder, magazines = [] }) {
  if (block.type === 'intro') {
    return (
      <div className="grid gap-3">
        <label>
          <span className={LABEL}>헤드라인</span>
          <textarea
            className={`${FIELD} min-h-28 resize-y leading-relaxed`}
            value={block.headline || ''}
            onChange={(e) => onChange({ headline: e.target.value })}
          />
          <p className={`${HELP} mt-2`}>
            모바일에서 문장이 애매하게 끊기지 않도록 원하는 위치에 엔터를 넣어 줄 길이를 직접 조절할 수 있습니다.
          </p>
        </label>
        <label>
          <span className={LABEL}>요약</span>
          <textarea
            className={`${FIELD} min-h-28 resize-y leading-relaxed`}
            value={block.summary || ''}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
          <p className={`${HELP} mt-2`}>
            엔터로 만든 줄바꿈은 데스크톱과 모바일 프리뷰, 저장 후 공개 화면에서도 유지됩니다.
          </p>
        </label>
      </div>
    );
  }

  if (block.type === 'rich_text') {
    return (
      <label>
        <span className={LABEL}>본문</span>
        <textarea className={`${FIELD} min-h-40 resize-y`} value={block.body || ''} onChange={(e) => onChange({ body: e.target.value })} />
        <p className={`${HELP} mt-2`}>
          문장 중간에서 엔터를 넣으면 그 줄바꿈이 모바일에도 그대로 반영됩니다.
        </p>
      </label>
    );
  }

  if (block.type === 'effects') {
    const variant = SERVICE_DETAIL_EFFECT_VARIANTS.includes(block.variant) ? block.variant : 'benefit_cards';
    const selected = EFFECT_VARIANT_OPTIONS.find((option) => option.value === variant);
    return (
      <div className="grid gap-4">
        <label>
          <span className={LABEL}>표시 방식</span>
          <select className={FIELD} value={variant} onChange={(e) => onChange({ variant: e.target.value })}>
            {EFFECT_VARIANT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {selected?.description && <p className={`${HELP} mt-2`}>{selected.description}</p>}
        </label>
        <EffectCardsEditor items={block.cards || []} onChange={(cards) => onChange({ cards })} />
      </div>
    );
  }

  if (block.type === 'process') {
    const variant = SERVICE_DETAIL_PROCESS_VARIANTS.includes(block.variant) ? block.variant : 'timeline';
    const selected = PROCESS_VARIANT_OPTIONS.find((option) => option.value === variant);
    return (
      <div className="grid gap-4">
        <label>
          <span className={LABEL}>표시 방식</span>
          <select className={FIELD} value={variant} onChange={(e) => onChange({ variant: e.target.value })}>
            {PROCESS_VARIANT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {selected?.description && <p className={`${HELP} mt-2`}>{selected.description}</p>}
        </label>
        <StepsEditor items={block.steps || []} uploadFolder={uploadFolder} onChange={(steps) => onChange({ steps })} />
      </div>
    );
  }

  if (block.type === 'gallery') {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label>
            <span className={LABEL}>배치 방식</span>
            <select className={FIELD} value={block.variant || 'grid_2'} onChange={(e) => onChange({ variant: e.target.value })}>
              <option value="grid_2">2열 그리드</option>
              <option value="grid_3">3열 그리드</option>
              <option value="stacked">세로 스택</option>
              <option value="carousel">가로 스크롤</option>
              <option value="comparison">비교형 2분할</option>
            </select>
          </label>
          <label>
            <span className={LABEL}>프레임 비율</span>
            <select className={FIELD} value={block.frame_ratio || 'first_image'} onChange={(e) => onChange({ frame_ratio: e.target.value })}>
              {FRAME_RATIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className={`${HELP} mt-2`}>첫 이미지 비율을 선택하면 처음 등록한 이미지의 원본 규격을 기준으로 모든 갤러리 이미지 프레임이 맞춰집니다.</p>
          </label>
          <label>
            <span className={LABEL}>미디어 맞춤</span>
            <select className={FIELD} value={block.fit || 'contain'} onChange={(e) => onChange({ fit: e.target.value })}>
              <option value="contain">전체 보이기</option>
              <option value="cover">꽉 채우기</option>
            </select>
            <p className={`${HELP} mt-2`}>같은 열의 미디어는 프레임을 통일하고, 내부 초점/크기는 항목별로 조정합니다.</p>
          </label>
        </div>
        <ImageListEditor block={block} onChange={onChange} uploadFolder={uploadFolder} />
      </div>
    );
  }

  if (block.type === 'mockup_showcase') {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>목업 프레임</span>
            <select className={FIELD} value={block.variant || 'desktop_browser'} onChange={(e) => onChange({ variant: e.target.value })}>
              <option value="desktop_browser">웹사이트 브라우저</option>
              <option value="phone_stack">모바일 화면 묶음</option>
              <option value="dashboard_frame">관리자/대시보드 화면</option>
              <option value="split_mockup">좌우 비교 목업</option>
            </select>
            <p className={`${HELP} mt-2`}>이미지 자체를 바꾸는 기능이 아니라, 같은 이미지를 어떤 화면 틀에 담아 보여줄지 고르는 옵션입니다.</p>
          </label>
          <label>
            <span className={LABEL}>이미지 맞춤</span>
            <select className={FIELD} value={block.fit || 'cover'} onChange={(e) => onChange({ fit: e.target.value })}>
              <option value="cover">꽉 채우기</option>
              <option value="contain">전체 보이기</option>
            </select>
            <p className={`${HELP} mt-2`}>꽉 채우기는 빈 공간 없이 맞추되 일부가 잘릴 수 있습니다. 전체 보이기는 잘림 없이 보여주지만 여백이 생길 수 있습니다. 아래 이미지별 초점으로 프레임 안에 남길 영역을 조정합니다.</p>
          </label>
        </div>
        <ImageListEditor block={block} onChange={onChange} uploadFolder={uploadFolder} />
      </div>
    );
  }

  if (block.type === 'youtube_embed') {
    const parsed = block.url ? parseYouTubeUrl(block.url) : { ok: false };
    return (
      <div className="grid gap-3">
        <label>
          <span className={LABEL}>유튜브 링크</span>
          <input className={FIELD} value={block.url || ''} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
        </label>
        {block.url && !parsed.ok && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{parsed.error}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>제목</span>
            <input className={FIELD} value={block.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>비율</span>
            <select className={FIELD} value={block.aspect_ratio || '16:9'} onChange={(e) => onChange({ aspect_ratio: e.target.value })}>
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
            </select>
          </label>
        </div>
        <label>
          <span className={LABEL}>설명</span>
          <textarea className={`${FIELD} min-h-24 resize-y`} value={block.description || ''} onChange={(e) => onChange({ description: e.target.value })} />
        </label>
      </div>
    );
  }

  if (block.type === 'video') {
    return (
      <VideoAssetEditor
        label="일반 영상"
        media={{ ...block, type: 'video' }}
        uploadFolder={uploadFolder}
        onChange={(video) => onChange(video)}
      />
    );
  }

  if (block.type === 'sub_products') {
    return <CardsEditor label="하위 상품" items={block.items || []} onChange={(items) => onChange({ items })} titlePlaceholder="상품명" />;
  }

  if (block.type === 'case_proof') {
    const testimonialItems = Array.isArray(block.testimonials) && block.testimonials.length > 0
      ? block.testimonials
      : (block.quote ? [{ id: 'legacy-quote', quote: block.quote, author: '', role: '', media: null }] : []);

    return (
      <div className="grid gap-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>미디어 프레임 비율</span>
            <select className={FIELD} value={block.media_frame_ratio || '16:9'} onChange={(e) => onChange({ media_frame_ratio: e.target.value })}>
              {FRAME_RATIO_OPTIONS.filter((option) => option.value !== 'first_image').map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>이미지 맞춤</span>
            <select className={FIELD} value={block.media_fit || 'contain'} onChange={(e) => onChange({ media_fit: e.target.value })}>
              <option value="contain">전체 보이기</option>
              <option value="cover">꽉 채우기</option>
            </select>
          </label>
        </div>
        <ProofMetricsEditor
          items={block.metrics || []}
          uploadFolder={uploadFolder}
          onChange={(metrics) => onChange({ metrics })}
        />
        <TestimonialsEditor
          items={testimonialItems}
          uploadFolder={uploadFolder}
          onChange={(testimonials) => onChange({ testimonials, quote: '' })}
        />
      </div>
    );
  }

  if (block.type === 'related_magazine') {
    const selected = magazines.find((magazine) => magazine.slug === block.magazine_slug);
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label>
          <span className={LABEL}>연결할 매거진</span>
          <select className={FIELD} value={block.magazine_slug || ''} onChange={(e) => onChange({ magazine_slug: e.target.value })}>
            <option value="">연결 없음</option>
            {magazines.map((magazine) => (
              <option key={magazine.id || magazine.slug} value={magazine.slug}>{magazine.title}</option>
            ))}
          </select>
          {selected?.slug && <p className={`${HELP} mt-2`}>저장값은 기존 구조와 동일하게 slug `{selected.slug}`로 보관됩니다.</p>}
        </label>
        <label>
          <span className={LABEL}>헤더 텍스트</span>
          <input className={FIELD} value={block.header || ''} onChange={(e) => onChange({ header: e.target.value })} />
        </label>
      </div>
    );
  }

  if (block.type === 'landing_section') {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-relaxed text-indigo-950">
          랜딩페이지 빌더에서 쓰는 공통 섹션을 이 상품 상세 페이지 안에 복사해 둔 블록입니다. 원본 랜딩 섹션을 수정해도 이 상품에 복사된 내용은 자동으로 바뀌지 않습니다.
        </div>
        <label>
          <span className={LABEL}>랜딩 섹션 타입</span>
          <select
            className={FIELD}
            value={block.section_type || 'services'}
            onChange={(e) => {
              const nextType = e.target.value;
              onChange({
                section_type: nextType,
                title: block.title || SECTION_TYPES[nextType]?.label || '',
                subtitle: block.subtitle || '',
                content: cloneValue(SECTION_TEMPLATES[nextType] || {}),
              });
            }}
          >
            {Object.entries(SECTION_TYPES).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>섹션 제목</span>
            <input className={FIELD} value={block.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>섹션 서브타이틀</span>
            <input className={FIELD} value={block.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
          </label>
        </div>
        <label>
          <span className={LABEL}>섹션 내부 데이터</span>
          <LandingContentJsonEditor key={`${block.id || 'landing'}-${block.section_type || 'section'}`} content={block.content || {}} onCommit={(content) => onChange({ content })} />
        </label>
      </div>
    );
  }

  if (block.type === 'cta') {
    return (
      <div className="grid gap-3">
        <label>
          <span className={LABEL}>문구</span>
          <textarea className={`${FIELD} min-h-24 resize-y`} value={block.copy || ''} onChange={(e) => onChange({ copy: e.target.value })} />
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={LABEL}>버튼 라벨</span>
            <input className={FIELD} value={block.button_label || ''} onChange={(e) => onChange({ button_label: e.target.value })} />
          </label>
          <label>
            <span className={LABEL}>버튼 링크</span>
            <input className={FIELD} value={block.button_href || ''} onChange={(e) => onChange({ button_href: e.target.value })} />
          </label>
        </div>
      </div>
    );
  }

  return null;
}

function BlockEditorFields({ block, onChange, uploadFolder, magazines = [] }) {
  const defaultTitle = block.type === 'landing_section'
    ? (block.title || SERVICE_DETAIL_BLOCK_LABELS[block.type] || block.type)
    : (SERVICE_DETAIL_BLOCK_LABELS[block.type] || block.type);
  const supportsStoryMode = SERVICE_DETAIL_STORY_BLOCK_TYPES.includes(block.type);
  const isStoryMode = supportsStoryMode && block.editor_mode === 'story';

  return (
    <div className="space-y-5">
      <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <span className={LABEL}>페이지에 보일 섹션 제목</span>
        <input
          className={FIELD}
          value={block.display_title || ''}
          onChange={(e) => onChange({ display_title: e.target.value })}
          placeholder={`비워두면 "${defaultTitle}"로 표시됩니다.`}
        />
        <p className={`${HELP} mt-2`}>
          이 이름이 오른쪽 미리보기와 실제 상세 페이지의 큰 제목 타일에 표시됩니다. 블록 종류 이름은 관리용으로만 남습니다.
        </p>
      </label>
      {supportsStoryMode && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <span className={LABEL}>편집 방식</span>
              <p className={HELP}>기본형은 기존 카드/절차 구조를 씁니다. 스토리형은 블로그처럼 본문, 사진, 영상, CTA 조각을 원하는 순서로 쌓습니다.</p>
            </div>
            <div className="inline-flex rounded-xl border border-zinc-300 bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => onChange({ editor_mode: 'default' })}
                className={`rounded-lg px-3 py-2 text-[11px] font-black ${!isStoryMode ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                기본형
              </button>
              <button
                type="button"
                onClick={() => onChange({ editor_mode: 'story', story_items: seedStoryItemsFromBlock(block) })}
                className={`rounded-lg px-3 py-2 text-[11px] font-black ${isStoryMode ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                스토리형
              </button>
            </div>
          </div>
          <p className={HELP}>
            스토리형으로 전환해도 기존 기본형 입력값은 지우지 않습니다. 다시 기본형으로 돌아오면 기존 구조를 계속 수정할 수 있습니다.
          </p>
        </div>
      )}
      {isStoryMode ? (
        <StoryItemsEditor
          items={block.story_items || []}
          uploadFolder={uploadFolder}
          onChange={(storyItems) => onChange({ story_items: storyItems })}
        />
      ) : (
        <BlockFields block={block} onChange={onChange} uploadFolder={uploadFolder} magazines={magazines} />
      )}
    </div>
  );
}

function hasLegacyDetails(details = {}) {
  return Boolean(
    details.operation
    || details.duration
    || details.reference_img
    || details.related_magazine_slug
    || (Array.isArray(details.effects) && details.effects.length > 0)
    || (Array.isArray(details.process) && details.process.length > 0)
    || (Array.isArray(details.sub_items) && details.sub_items.length > 0)
  );
}

function uniquifyLegacyBlocks(blocks, offset) {
  const stamp = Date.now().toString(36);
  return blocks.map((block, index) => ({
    ...block,
    id: `${block.id || block.type}-${stamp}-${index}`,
    sort_order: offset + index,
    images: Array.isArray(block.images)
      ? block.images.map((image, imageIndex) => ({ ...image, id: `${image.id || 'image'}-${stamp}-${index}-${imageIndex}` }))
      : block.images,
  }));
}

export default function ProductDetailBlockBuilder({ details, onChange, uploadFolder = 'services/drafts/draft', landingSections = [], sectionLibrary = { blocks: [] }, magazines = [] }) {
  const blocks = asBlocks(details);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState(() => new Set());

  const blockKey = (block, index) => block.id || `${block.type || 'block'}-${index}`;
  const toggleBlockCollapsed = (key) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const commit = (nextBlocks) => {
    onChange({
      ...details,
      blocks_schema_version: SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION,
      blocks: resequence(nextBlocks),
    });
  };

  const addBlock = (type) => {
    commit([...blocks, createServiceDetailBlock(type, { sort_order: blocks.length })]);
  };

  const addLandingBlock = (item) => {
    if (item.kind === 'landing-template') {
      commit([
        ...blocks,
        createLandingSectionBlock({
          sectionType: item.sectionType,
          title: SECTION_TYPES[item.sectionType]?.label || item.label,
          subtitle: '',
          content: SECTION_TEMPLATES[item.sectionType] || {},
          sourceLabel: '랜딩 기본 블록',
        }, blocks.length),
      ]);
      return;
    }

    if (item.kind === 'landing-existing') {
      commit([
        ...blocks,
        createLandingSectionBlock({
          sectionType: item.section.type,
          title: item.section.title || SECTION_TYPES[item.section.type]?.label || item.label,
          subtitle: item.section.subtitle || '',
          content: item.section.content || SECTION_TEMPLATES[item.section.type] || {},
          sourceLabel: '기존 랜딩 섹션',
        }, blocks.length),
      ]);
      return;
    }

    if (item.kind === 'landing-master') {
      commit([
        ...blocks,
        createLandingSectionBlock({
          sectionType: item.master.type,
          title: item.master.name || SECTION_TYPES[item.master.type]?.label || item.label,
          subtitle: item.master.subtitle || '',
          content: item.master.content || SECTION_TEMPLATES[item.master.type] || {},
          sourceLabel: '마스터 블록 라이브러리',
        }, blocks.length),
      ]);
    }
  };

  const libraryItems = useMemo(() => {
    const existing = landingSections.map((section) => ({
      key: `landing-existing-${section.id}`,
      kind: 'landing-existing',
      section,
      label: section.title || SECTION_TYPES[section.type]?.label || section.type,
      description: SECTION_TYPES[section.type]?.description || section.subtitle || '이미 만들어진 랜딩 섹션을 이 상품에 복사합니다.',
      badge: '기존 랜딩',
    }));

    const master = (sectionLibrary?.blocks || []).map((block, index) => ({
      key: `landing-master-${index}`,
      kind: 'landing-master',
      master: block,
      label: block.name || SECTION_TYPES[block.type]?.label || block.type,
      description: block.subtitle || SECTION_TYPES[block.type]?.description || '마스터 라이브러리에 저장된 랜딩 블록입니다.',
      badge: '마스터',
    }));

    const items = [...productLibraryItems(), ...master, ...existing, ...landingTemplateItems()];
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.label, item.description, item.badge, item.type, item.sectionType, item.section?.type, item.master?.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q));
  }, [landingSections, libraryQuery, sectionLibrary]);

  const addLibraryItem = (item) => {
    if (item.kind === 'product') {
      addBlock(item.type);
      return;
    }
    addLandingBlock(item);
  };

  const applyLegacyDraft = () => {
    const draft = legacyDetailsToServiceDetailBlocks(details);
    if (draft.length === 0) {
      alert('블록 초안으로 변환할 기존 상세 정보가 없습니다.');
      return;
    }
    if (blocks.length > 0 && !confirm('기존 블록 뒤에 변환된 블록을 추가합니다. 계속할까요?')) {
      return;
    }
    commit([...blocks, ...uniquifyLegacyBlocks(draft, blocks.length)]);
  };

  const totalWarnings = blocks.flatMap((block) => blockWarnings(block));

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-900">
              <Layers size={18} />
              <h3 className="text-lg font-black tracking-tight">상품 상세페이지 빌더</h3>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-600">
              상품 전용 블록과 랜딩페이지 빌더의 공통 블록을 한 라이브러리에서 추가합니다. 왼쪽에서 수정하고 오른쪽에서 바로 확인합니다.
            </p>
          </div>
          {hasLegacyDetails(details) && (
            <button
              type="button"
              onClick={applyLegacyDraft}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-black text-zinc-800 hover:bg-zinc-100"
            >
              기존 내용으로 블록 변환
            </button>
          )}
        </div>

        {totalWarnings.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">저장 전 확인</p>
            <ul className="mt-2 space-y-1 text-sm font-semibold text-amber-800">
              {[...new Set(totalWarnings)].map((warning) => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-6">
          {blocks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-zinc-600">아직 상세페이지 블록이 없습니다.</p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">아래 통합 라이브러리에서 필요한 블록을 추가하세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => {
                const warnings = blockWarnings(block);
                const key = blockKey(block, index);
                const isCollapsed = collapsedBlockIds.has(key);
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex === null) return;
                      commit(resequence(moveItem(blocks, dragIndex, index)));
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                      dragIndex === index ? 'border-zinc-900 opacity-80' : 'border-zinc-200'
                    }`}
                  >
                    <div className={`flex flex-col gap-3 bg-zinc-50 px-5 py-4 md:flex-row md:items-center md:justify-between ${
                      isCollapsed ? '' : 'border-b border-zinc-200'
                    }`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-black text-white">{String(index + 1).padStart(2, '0')}</span>
                          <h4 className="text-sm font-black text-zinc-900">
                            {blockAdminTitle(block)}
                          </h4>
                          <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-600">
                            {block.type === 'landing_section' ? '랜딩 공통' : '상품 전용'}
                          </span>
                          {block.is_visible === false && <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-600">숨김</span>}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">{TYPE_DESCRIPTIONS[block.type]}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleBlockCollapsed(key)}
                          aria-expanded={!isCollapsed}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-black text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
                        >
                          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                          {isCollapsed ? '펼치기' : '접기'}
                        </button>
                        <button type="button" onClick={() => commit(swap(blocks, index, -1))} disabled={index === 0} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ArrowUp size={15} /></button>
                        <button type="button" onClick={() => commit(swap(blocks, index, 1))} disabled={index === blocks.length - 1} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ArrowDown size={15} /></button>
                        <button type="button" onClick={() => commit(updateAt(blocks, index, { is_visible: block.is_visible === false }))} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200">{block.is_visible === false ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                        <button type="button" onClick={() => commit([...blocks.slice(0, index + 1), { ...block, id: `${block.id || block.type}-copy-${Date.now()}` }, ...blocks.slice(index + 1)])} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200"><Copy size={15} /></button>
                        <button type="button" onClick={() => commit(blocks.filter((_, idx) => idx !== index))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="space-y-4 p-5">
                        {warnings.length > 0 && (
                          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                            {warnings.map((warning) => (
                              <div key={warning}>- {warning}</div>
                            ))}
                          </div>
                        )}
                        <BlockEditorFields
                          block={block}
                          uploadFolder={uploadFolder}
                          magazines={magazines}
                          onChange={(patch) => commit(updateAt(blocks, index, patch))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-3xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-sm font-black text-zinc-900">블록 추가 라이브러리</h4>
                <p className={HELP}>현재 구성 수정 영역을 먼저 보고, 필요한 블록만 아래에서 추가합니다.</p>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 md:max-w-md">
                <Search size={16} className="text-zinc-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none placeholder:text-zinc-500"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="상품 전용 블록, 기존 랜딩 블록, 마스터 블록 검색"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {libraryItems.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => addLibraryItem(item)}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-900 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-600">{item.badge}</span>
                    <Plus size={15} className="text-zinc-500" />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-900">
                    {(item.type || item.sectionType || item.section?.type || item.master?.type || '').includes('video') ? <Video size={15} /> : <ImageIcon size={15} />}
                    <span className="truncate text-sm font-black">{item.label}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-zinc-500">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-relaxed text-blue-900">
        <div className="mb-1 flex items-center gap-2 font-black">
          <LinkIcon size={14} />
          공개 페이지 연결 기준
        </div>
        저장 후 공개 상품 상세 페이지는 유효한 블록만 같은 순서로 렌더링합니다. 블록이 없으면 기존 상세 정보 화면을 그대로 사용합니다.
      </div>
    </section>
  );
}
