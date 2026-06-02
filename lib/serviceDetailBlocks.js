import { legacyStoryTextStyle, normalizeServiceTextStyle } from './serviceTextStyles.js';

export const SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION = 2;

export const SERVICE_DETAIL_BLOCK_TYPES = [
  'intro',
  'rich_text',
  'effects',
  'process',
  'gallery',
  'mockup_showcase',
  'youtube_embed',
  'video',
  'sub_products',
  'case_proof',
  'related_magazine',
  'landing_section',
  'cta',
];

export const SERVICE_DETAIL_BLOCK_LABELS = {
  intro: '핵심 소개',
  rich_text: '본문',
  effects: '도입 효과',
  process: '진행 절차',
  gallery: '이미지 갤러리',
  mockup_showcase: '목업 쇼케이스',
  youtube_embed: '유튜브 영상',
  video: '일반 영상',
  sub_products: '하위 상품',
  case_proof: '사례/근거',
  related_magazine: '관련 매거진',
  landing_section: '랜딩 공통 섹션',
  cta: '상담 CTA',
};

const GALLERY_VARIANTS = ['grid_2', 'grid_3', 'stacked', 'carousel', 'comparison'];
const GALLERY_FRAME_RATIOS = ['first_image', '16:9', '4:3', '1:1', '3:4', '9:16'];
const MOCKUP_VARIANTS = ['phone_stack', 'desktop_browser', 'dashboard_frame', 'split_mockup'];
const VIDEO_RATIOS = ['16:9', '4:3', '1:1', '9:16'];
const MEDIA_FIT_MODES = ['contain', 'cover'];

export const SERVICE_DETAIL_EFFECT_VARIANTS = ['benefit_cards', 'metric_focus', 'before_after', 'problem_solution'];
export const SERVICE_DETAIL_PROCESS_VARIANTS = ['timeline', 'step_cards', 'alternating', 'checklist'];
export const SERVICE_DETAIL_STORY_BLOCK_TYPES = ['intro', 'rich_text', 'effects', 'process', 'case_proof'];
export const SERVICE_DETAIL_STORY_ITEM_TYPES = ['text', 'image', 'image_group', 'video', 'quote', 'metric', 'cta'];
export const SERVICE_DETAIL_MEDIA_TYPES = ['image', 'video', 'youtube'];
export const SERVICE_DETAIL_STORY_TEXT_SIZES = ['sm', 'md', 'lg', 'xl'];
export const SERVICE_DETAIL_STORY_TEXT_WEIGHTS = ['regular', 'medium', 'bold', 'black'];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function bool(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeVariant(value, allowed, fallback) {
  const raw = text(value);
  return oneOf(raw === 'default' ? '' : raw, allowed, fallback);
}

function normalizeTextStyle(value, fallback) {
  return normalizeServiceTextStyle(value, fallback);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function percent(value, fallback = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeObjectPosition(value) {
  if (typeof value !== 'string') return '50% 50%';
  const match = value.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if (!match) return '50% 50%';
  return `${percent(match[1])}% ${percent(match[2])}%`;
}

function normalizeImageScale(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(25, Math.min(250, parsed));
}

function normalizeImageDimension(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.min(20000, parsed));
}

function normalizeMediaDimensions(media) {
  const naturalWidth = normalizeImageDimension(media?.natural_width || media?.width);
  const naturalHeight = normalizeImageDimension(media?.natural_height || media?.height);
  return naturalWidth && naturalHeight ? { natural_width: naturalWidth, natural_height: naturalHeight } : {};
}

export function createServiceDetailBlockId(type = 'block') {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `${type}-${Date.now().toString(36)}-${suffix}`;
}

export function parseYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return { ok: false, videoId: '', error: '유튜브 링크를 입력해 주세요.' };
  }

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { ok: false, videoId: '', error: '올바른 유튜브 링크가 아닙니다.' };
    }

    return {
      ok: true,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      error: '',
    };
  } catch {
    return { ok: false, videoId: '', error: '유튜브 링크 형식을 확인해 주세요.' };
  }
}

function normalizeImage(item, fallbackId = 'image-1') {
  if (!isObject(item)) return null;
  const url = text(item.url, text(item.src, text(item.image_url)));
  if (!url) return null;

  const naturalWidth = normalizeImageDimension(item.natural_width || item.width);
  const naturalHeight = normalizeImageDimension(item.natural_height || item.height);

  return {
    id: text(item.id, fallbackId),
    url,
    alt: text(item.alt, text(item.caption, '')),
    caption: text(item.caption),
    object_position: normalizeObjectPosition(item.object_position),
    object_scale: normalizeImageScale(item.object_scale),
    ...(naturalWidth && naturalHeight ? { natural_width: naturalWidth, natural_height: naturalHeight } : {}),
  };
}

function normalizeImages(images) {
  return list(images)
    .map((item, index) => normalizeImage(item, `image-${index + 1}`))
    .filter(Boolean);
}

function normalizeCards(cards) {
  return list(cards)
    .filter((item) => isObject(item) && (text(item.title) || text(item.desc) || text(item.description)))
    .map((item) => ({
      title: text(item.title),
      desc: text(item.desc, text(item.description)),
      icon: text(item.icon),
      title_style: normalizeTextStyle(item.title_style, { role: 'h4', color: 'default' }),
      desc_style: normalizeTextStyle(item.desc_style, { role: 'body', color: 'default' }),
    }));
}

function normalizeEffectCards(cards) {
  return list(cards)
    .map((item) => {
      if (!isObject(item)) return null;
      const card = {
        title: text(item.title),
        desc: text(item.desc, text(item.description, text(item.label))),
        icon: text(item.icon),
        metric: text(item.metric, text(item.value)),
        before: text(item.before, text(item.problem)),
        after: text(item.after, text(item.solution)),
        is_featured: bool(item.is_featured ?? item.featured, false),
        title_style: normalizeTextStyle(item.title_style, { role: 'h4', color: 'default' }),
        desc_style: normalizeTextStyle(item.desc_style, { role: 'body', color: 'default' }),
        metric_style: normalizeTextStyle(item.metric_style, { role: 'h2', color: 'strong' }),
        before_style: normalizeTextStyle(item.before_style, { role: 'body', color: 'muted' }),
        after_style: normalizeTextStyle(item.after_style, { role: 'body', color: 'inverse' }),
      };
      return card.title || card.desc || card.metric || card.before || card.after ? card : null;
    })
    .filter(Boolean);
}

function normalizeSteps(steps) {
  return list(steps)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const image = normalizeImage(item.image || { url: text(item.image_url), alt: text(item.name, text(item.title)) }, `step-image-${index + 1}`);
      const step = {
        step: text(item.step, String(index + 1).padStart(2, '0')),
        name: text(item.name, text(item.title)),
        desc: text(item.desc, text(item.description)),
        duration: text(item.duration),
        deliverable: text(item.deliverable),
        name_style: normalizeTextStyle(item.name_style, { role: 'h4', color: 'default' }),
        desc_style: normalizeTextStyle(item.desc_style, { role: 'body', color: 'default' }),
        ...(image ? { image } : {}),
      };
      return step.name || step.desc || step.duration || step.deliverable || image ? step : null;
    })
    .filter(Boolean);
}

function normalizeMediaType(media) {
  if (text(media.type)) {
    return oneOf(media.type, SERVICE_DETAIL_MEDIA_TYPES, 'image');
  }
  if (text(media.youtube_url) || text(media.youtubeUrl)) return 'youtube';
  if (text(media.video_url) || text(media.videoUrl)) return 'video';
  return 'image';
}

function normalizeMedia(media, fallbackId = 'media-1') {
  if (!isObject(media)) return null;

  const type = normalizeMediaType(media);
  const directImage = type === 'image' ? normalizeImage(media, `${fallbackId}-image`) : null;
  const nestedImage = normalizeImage(media.image, `${fallbackId}-image`);
  const image = nestedImage || directImage;
  const thumbnail = normalizeImage(media.thumbnail || media.thumbnail_image || media.poster, `${fallbackId}-thumbnail`);
  const url = text(
    media.url,
    text(media.src, text(media.image_url, text(media.video_url, text(media.videoUrl, text(media.youtube_url, text(media.youtubeUrl, image?.url || ''))))))
  );
  const thumbnailUrl = text(media.thumbnail_url, text(media.thumbnailUrl, text(media.poster_url, text(media.posterUrl, thumbnail?.url || ''))));

  if (!url && !image && !thumbnailUrl) return null;

  const parsedYouTube = type === 'youtube' ? parseYouTubeUrl(url) : { ok: false, videoId: '' };
  const dimensions = normalizeMediaDimensions(media);

  return {
    id: text(media.id, fallbackId),
    type,
    url,
    title: text(media.title),
    alt: text(media.alt),
    caption: text(media.caption),
    fit: oneOf(media.fit, MEDIA_FIT_MODES, 'contain'),
    frame_ratio: oneOf(media.frame_ratio, GALLERY_FRAME_RATIOS, type === 'image' ? 'first_image' : '16:9'),
    aspect_ratio: oneOf(media.aspect_ratio, VIDEO_RATIOS, '16:9'),
    object_position: normalizeObjectPosition(media.object_position),
    object_scale: normalizeImageScale(media.object_scale),
    ...dimensions,
    ...(type === 'video' ? { autoplay: bool(media.autoplay, true) } : {}),
    ...(image ? { image } : {}),
    ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    ...(parsedYouTube.ok ? { video_id: parsedYouTube.videoId } : text(media.video_id) ? { video_id: text(media.video_id) } : {}),
  };
}

function normalizeGalleryMediaItem(item, fallbackId = 'media-1') {
  if (!isObject(item)) return null;
  const type = normalizeMediaType(item);
  if (type === 'video') {
    return normalizeMedia({ ...item, type: 'video' }, fallbackId);
  }

  const image = normalizeImage(item.image || item, fallbackId.replace(/^media-/, 'image-'));
  return image ? { type: 'image', ...image } : null;
}

function normalizeGalleryMediaItems(items) {
  return list(items)
    .map((item, index) => normalizeGalleryMediaItem(item, `media-${index + 1}`))
    .filter(Boolean);
}

function normalizeProofMediaItems(item, fallbackPrefix) {
  const mediaItems = list(item.media_items || item.mediaItems || item.media_list || item.medias)
    .map((media, index) => normalizeMedia(media, `${fallbackPrefix}-${index + 1}`))
    .filter(Boolean);
  if (mediaItems.length > 0) return mediaItems;

  const legacyMedia = normalizeMedia(item.media || item.visual, `${fallbackPrefix}-1`);
  return legacyMedia ? [legacyMedia] : [];
}

function normalizeProofCards(cards) {
  return list(cards)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const mediaItems = normalizeProofMediaItems(item, `metric-media-${index + 1}`);
      const card = {
        id: text(item.id, `metric-${index + 1}`),
        title: text(item.title, text(item.value)),
        desc: text(item.desc, text(item.description, text(item.label))),
        icon: text(item.icon),
        title_style: normalizeTextStyle(item.title_style, { role: 'h3', color: 'strong' }),
        desc_style: normalizeTextStyle(item.desc_style, { role: 'body', color: 'default' }),
        ...(mediaItems.length > 0 ? { media_items: mediaItems, media: mediaItems[0] } : {}),
      };
      return (card.title || card.desc || mediaItems.length > 0) ? card : null;
    })
    .filter(Boolean);
}

function normalizeTestimonials(testimonials, legacyQuote = '') {
  const normalized = list(testimonials)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const mediaItems = normalizeProofMediaItems(item, `testimonial-media-${index + 1}`);
      const quote = text(item.quote, text(item.body, text(item.content)));
      const testimonial = {
        id: text(item.id, `testimonial-${index + 1}`),
        quote,
        author: text(item.author, text(item.name)),
        role: text(item.role, text(item.position)),
        quote_style: normalizeTextStyle(item.quote_style, { role: 'quote', color: 'default' }),
        author_style: normalizeTextStyle(item.author_style, { role: 'caption', color: 'muted' }),
        role_style: normalizeTextStyle(item.role_style, { role: 'caption', color: 'muted' }),
        ...(mediaItems.length > 0 ? { media_items: mediaItems, media: mediaItems[0] } : {}),
      };
      return (testimonial.quote || testimonial.author || testimonial.role || mediaItems.length > 0) ? testimonial : null;
    })
    .filter(Boolean);

  if (normalized.length > 0 || !legacyQuote) return normalized;

  return [{
    id: 'testimonial-1',
    quote: legacyQuote,
    quote_style: normalizeTextStyle(null, { role: 'quote', color: 'default' }),
    author: '',
    author_style: normalizeTextStyle(null, { role: 'caption', color: 'muted' }),
    role: '',
    role_style: normalizeTextStyle(null, { role: 'caption', color: 'muted' }),
  }];
}

function normalizeStoryItemType(type) {
  if (type === 'gallery') return 'image_group';
  return oneOf(type, SERVICE_DETAIL_STORY_ITEM_TYPES, 'text');
}

function normalizeStoryItems(items) {
  return list(items)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const type = normalizeStoryItemType(item.type);
      const base = {
        id: text(item.id, `story-item-${index + 1}`),
        type,
      };

      switch (type) {
        case 'text': {
          const body = text(item.body, text(item.content, text(item.text)));
          return body ? {
            ...base,
            body,
            text_size: oneOf(item.text_size || item.font_size || item.size, SERVICE_DETAIL_STORY_TEXT_SIZES, 'md'),
            text_weight: oneOf(item.text_weight || item.font_weight || item.weight, SERVICE_DETAIL_STORY_TEXT_WEIGHTS, 'medium'),
            text_style: normalizeTextStyle(
              item.text_style,
              legacyStoryTextStyle(item.text_size || item.font_size || item.size, item.text_weight || item.font_weight || item.weight)
            ),
          } : null;
        }
        case 'image': {
          const image = normalizeImage(item.image || item, `story-image-${index + 1}`);
          return image ? { ...base, image } : null;
        }
        case 'image_group': {
          const images = normalizeGalleryMediaItems(item.images);
          if (images.length === 0) return null;
          return {
            ...base,
            variant: oneOf(item.variant, ['grid_2', 'grid_3', 'carousel'], 'carousel'),
            frame_ratio: oneOf(item.frame_ratio, GALLERY_FRAME_RATIOS, 'first_image'),
            fit: oneOf(item.fit, MEDIA_FIT_MODES, 'contain'),
            images,
          };
        }
        case 'video': {
          const media = normalizeMedia({ ...item, type: item.provider === 'youtube' ? 'youtube' : item.media_type || item.type }, `story-video-${index + 1}`);
          return media ? { ...base, media } : null;
        }
        case 'quote': {
          const mediaItems = normalizeProofMediaItems(item, `story-quote-media-${index + 1}`);
          const quote = text(item.quote, text(item.body, text(item.content)));
          if (!quote && mediaItems.length === 0) return null;
          return {
            ...base,
            quote,
            author: text(item.author, text(item.name)),
            role: text(item.role, text(item.position)),
            quote_style: normalizeTextStyle(item.quote_style, { role: 'quote', color: 'default' }),
            author_style: normalizeTextStyle(item.author_style, { role: 'caption', color: 'muted' }),
            role_style: normalizeTextStyle(item.role_style, { role: 'caption', color: 'muted' }),
            ...(mediaItems.length > 0 ? { media_items: mediaItems, media: mediaItems[0] } : {}),
          };
        }
        case 'metric': {
          const mediaItems = normalizeProofMediaItems(item, `story-metric-media-${index + 1}`);
          const title = text(item.title, text(item.value));
          const desc = text(item.desc, text(item.description, text(item.label)));
          if (!title && !desc && mediaItems.length === 0) return null;
          return {
            ...base,
            title,
            desc,
            icon: text(item.icon),
            title_style: normalizeTextStyle(item.title_style, { role: 'h3', color: 'strong' }),
            desc_style: normalizeTextStyle(item.desc_style, { role: 'body', color: 'default' }),
            ...(mediaItems.length > 0 ? { media_items: mediaItems, media: mediaItems[0] } : {}),
          };
        }
        case 'cta': {
          const copy = text(item.copy, text(item.body));
          const buttonLabel = text(item.button_label, text(item.label));
          const buttonHref = text(item.button_href, text(item.href, text(item.url)));
          if (!copy && !buttonLabel && !buttonHref) return null;
          return {
            ...base,
            copy,
            button_label: buttonLabel || '상담 문의하기',
            button_href: buttonHref || '/contact',
            copy_style: normalizeTextStyle(item.copy_style, { role: 'body', color: 'inverse' }),
          };
        }
        default:
          return null;
      }
    })
    .filter(Boolean);
}

function normalizeStoryFields(block) {
  if (!SERVICE_DETAIL_STORY_BLOCK_TYPES.includes(block.type)) return {};
  return {
    editor_mode: block.editor_mode === 'story' ? 'story' : 'default',
    story_items: normalizeStoryItems(block.story_items || block.storyItems),
  };
}

export function createServiceDetailBlock(type, overrides = {}) {
  const safeType = SERVICE_DETAIL_BLOCK_TYPES.includes(type) ? type : 'rich_text';
  const storyDefaults = SERVICE_DETAIL_STORY_BLOCK_TYPES.includes(safeType)
    ? { editor_mode: 'default', story_items: [] }
    : {};
  const base = {
    id: overrides.id || createServiceDetailBlockId(safeType),
    type: safeType,
    display_title: text(overrides.display_title),
    display_title_style: normalizeTextStyle(overrides.display_title_style, { role: 'h2', color: 'default' }),
    variant: overrides.variant || 'default',
    is_visible: overrides.is_visible ?? true,
    sort_order: Number.isFinite(overrides.sort_order) ? overrides.sort_order : 0,
    ...storyDefaults,
  };

  switch (safeType) {
    case 'intro':
      return {
        ...base,
        variant: overrides.variant || 'default',
        headline: '',
        headline_style: normalizeTextStyle(overrides.headline_style, { role: 'h2', color: 'default' }),
        summary: '',
        summary_style: normalizeTextStyle(overrides.summary_style, { role: 'body', color: 'muted' }),
        badges: [],
        ...overrides,
      };
    case 'rich_text':
      return { ...base, body: '', body_style: normalizeTextStyle(overrides.body_style, { role: 'body', color: 'default' }), ...overrides };
    case 'effects':
      return { ...base, cards: [{ title: '', desc: '', icon: '', metric: '', before: '', after: '', is_featured: false }], ...overrides, variant: normalizeVariant(overrides.variant, SERVICE_DETAIL_EFFECT_VARIANTS, 'benefit_cards') };
    case 'process':
      return { ...base, steps: [{ step: '01', name: '', desc: '', duration: '', deliverable: '', image: null }], ...overrides, variant: normalizeVariant(overrides.variant, SERVICE_DETAIL_PROCESS_VARIANTS, 'timeline') };
    case 'gallery':
      return { ...base, variant: overrides.variant || 'grid_2', frame_ratio: 'first_image', images: [], ...overrides };
    case 'mockup_showcase':
      return { ...base, variant: overrides.variant || 'desktop_browser', images: [], fit: 'cover', ...overrides };
    case 'youtube_embed':
      return {
        ...base,
        url: '',
        video_id: '',
        title: '',
        title_style: normalizeTextStyle(overrides.title_style, { role: 'h3', color: 'default' }),
        description: '',
        description_style: normalizeTextStyle(overrides.description_style, { role: 'body', color: 'muted' }),
        aspect_ratio: '16:9',
        ...overrides,
      };
    case 'video':
      return {
        ...base,
        url: '',
        poster_url: '',
        title: '',
        title_style: normalizeTextStyle(overrides.title_style, { role: 'h3', color: 'default' }),
        aspect_ratio: '16:9',
        fit: 'contain',
        object_position: '50% 50%',
        object_scale: 100,
        autoplay: true,
        ...overrides,
      };
    case 'sub_products':
      return { ...base, items: [{ title: '', desc: '' }], ...overrides };
    case 'case_proof':
      return { ...base, metrics: [], testimonials: [], quote: '', image_url: '', link_url: '', media_frame_ratio: '16:9', media_fit: 'contain', ...overrides };
    case 'related_magazine':
      return { ...base, magazine_slug: '', header: '', header_style: normalizeTextStyle(overrides.header_style, { role: 'caption', color: 'muted' }), ...overrides };
    case 'landing_section':
      return {
        ...base,
        section_type: 'services',
        title: '',
        title_style: normalizeTextStyle(overrides.title_style, { role: 'h2', color: 'default' }),
        subtitle: '',
        subtitle_style: normalizeTextStyle(overrides.subtitle_style, { role: 'body', color: 'muted' }),
        content: {},
        source_label: '',
        ...overrides,
      };
    case 'cta':
      return { ...base, copy: '', copy_style: normalizeTextStyle(overrides.copy_style, { role: 'body', color: 'inverse' }), button_label: '상담 문의하기', button_href: '/contact', ...overrides };
    default:
      return { ...base, body: '', body_style: normalizeTextStyle(overrides.body_style, { role: 'body', color: 'default' }), ...overrides };
  }
}

export function normalizeServiceDetailBlock(block, index = 0) {
  if (!isObject(block) || !SERVICE_DETAIL_BLOCK_TYPES.includes(block.type)) {
    return { block: null, errors: ['알 수 없는 블록 타입입니다.'] };
  }

  const common = {
    id: text(block.id, `${block.type}-${index + 1}`),
    type: block.type,
    display_title: text(block.display_title),
    display_title_style: normalizeTextStyle(block.display_title_style, { role: 'h2', color: 'default' }),
    variant: text(block.variant, 'default'),
    is_visible: bool(block.is_visible ?? block.enabled, true),
    sort_order: Number.isFinite(block.sort_order) ? block.sort_order : index,
  };

  switch (block.type) {
    case 'intro':
      return {
        block: {
          ...common,
          ...normalizeStoryFields(block),
          headline: text(block.headline, text(block.title)),
          headline_style: normalizeTextStyle(block.headline_style, { role: 'h2', color: 'default' }),
          summary: text(block.summary, text(block.description)),
          summary_style: normalizeTextStyle(block.summary_style, { role: 'body', color: 'muted' }),
          badges: list(block.badges).filter((badge) => typeof badge === 'string'),
        },
        errors: [],
      };
    case 'rich_text':
      return {
        block: {
          ...common,
          ...normalizeStoryFields(block),
          body: text(block.body, text(block.content)),
          body_style: normalizeTextStyle(block.body_style, { role: 'body', color: 'default' }),
        },
        errors: [],
      };
    case 'effects':
      return { block: { ...common, variant: normalizeVariant(block.variant, SERVICE_DETAIL_EFFECT_VARIANTS, 'benefit_cards'), ...normalizeStoryFields(block), cards: normalizeEffectCards(block.cards || block.items) }, errors: [] };
    case 'process':
      return { block: { ...common, variant: normalizeVariant(block.variant, SERVICE_DETAIL_PROCESS_VARIANTS, 'timeline'), ...normalizeStoryFields(block), steps: normalizeSteps(block.steps || block.items) }, errors: [] };
    case 'gallery':
      return {
        block: {
          ...common,
          variant: oneOf(block.variant, GALLERY_VARIANTS, 'grid_2'),
          frame_ratio: oneOf(block.frame_ratio, GALLERY_FRAME_RATIOS, 'first_image'),
          fit: oneOf(block.fit, MEDIA_FIT_MODES, 'contain'),
          images: normalizeGalleryMediaItems(block.images),
        },
        errors: [],
      };
    case 'mockup_showcase':
      return {
        block: {
          ...common,
          variant: oneOf(block.variant, MOCKUP_VARIANTS, 'desktop_browser'),
          images: normalizeImages(block.images),
          fit: oneOf(block.fit, ['cover', 'contain'], 'cover'),
        },
        errors: [],
      };
    case 'youtube_embed': {
      const parsed = parseYouTubeUrl(block.url);
      return {
        block: {
          ...common,
          url: text(block.url),
          video_id: parsed.ok ? parsed.videoId : text(block.video_id),
          title: text(block.title),
          title_style: normalizeTextStyle(block.title_style, { role: 'h3', color: 'default' }),
          description: text(block.description),
          description_style: normalizeTextStyle(block.description_style, { role: 'body', color: 'muted' }),
          aspect_ratio: oneOf(block.aspect_ratio, VIDEO_RATIOS, '16:9'),
        },
        errors: block.url && !parsed.ok ? [parsed.error] : [],
      };
    }
    case 'video': {
      const media = normalizeMedia({ ...block, type: 'video' }, common.id);
      return {
        block: {
          ...common,
          url: media?.url || text(block.url),
          poster_url: text(block.poster_url),
          title: media?.title || text(block.title),
          title_style: normalizeTextStyle(block.title_style, { role: 'h3', color: 'default' }),
          aspect_ratio: media?.aspect_ratio || oneOf(block.aspect_ratio, VIDEO_RATIOS, '16:9'),
          fit: media?.fit || oneOf(block.fit, MEDIA_FIT_MODES, 'contain'),
          object_position: media?.object_position || normalizeObjectPosition(block.object_position),
          object_scale: media?.object_scale || normalizeImageScale(block.object_scale),
          autoplay: media?.autoplay ?? bool(block.autoplay, true),
          ...(media?.natural_width && media?.natural_height ? {
            natural_width: media.natural_width,
            natural_height: media.natural_height,
          } : {}),
        },
        errors: [],
      };
    }
    case 'sub_products':
      return { block: { ...common, items: normalizeCards(block.items) }, errors: [] };
    case 'case_proof':
      return {
        block: {
          ...common,
          ...normalizeStoryFields(block),
          metrics: normalizeProofCards(block.metrics),
          testimonials: normalizeTestimonials(block.testimonials, text(block.quote)),
          quote: text(block.quote),
          image_url: text(block.image_url),
          link_url: text(block.link_url),
          media_frame_ratio: oneOf(block.media_frame_ratio, GALLERY_FRAME_RATIOS, '16:9'),
          media_fit: oneOf(block.media_fit, MEDIA_FIT_MODES, 'contain'),
        },
        errors: [],
      };
    case 'related_magazine':
      return {
        block: {
          ...common,
          magazine_slug: text(block.magazine_slug, text(block.slug)),
          header: text(block.header),
          header_style: normalizeTextStyle(block.header_style, { role: 'caption', color: 'muted' }),
        },
        errors: [],
      };
    case 'landing_section':
      return {
        block: {
          ...common,
          section_type: text(block.section_type, 'services'),
          title: text(block.title),
          title_style: normalizeTextStyle(block.title_style, { role: 'h2', color: 'default' }),
          subtitle: text(block.subtitle),
          subtitle_style: normalizeTextStyle(block.subtitle_style, { role: 'body', color: 'muted' }),
          content: isObject(block.content) ? block.content : {},
          source_label: text(block.source_label),
        },
        errors: [],
      };
    case 'cta':
      return {
        block: {
          ...common,
          copy: text(block.copy),
          copy_style: normalizeTextStyle(block.copy_style, { role: 'body', color: 'inverse' }),
          button_label: text(block.button_label, '상담 문의하기'),
          button_href: text(block.button_href, '/contact'),
        },
        errors: [],
      };
    default:
      return { block: null, errors: ['알 수 없는 블록 타입입니다.'] };
  }
}

export function normalizeServiceDetailBlocks(details) {
  const rawBlocks = isObject(details) ? details.blocks : [];
  const results = list(rawBlocks).map((block, index) => normalizeServiceDetailBlock(block, index));
  return {
    blocks: results.map((result) => result.block).filter(Boolean),
    errors: results.flatMap((result, index) => result.errors.map((message) => ({ index, message }))),
  };
}

export function getVisibleServiceDetailBlocks(details) {
  const { blocks } = normalizeServiceDetailBlocks(details);
  return blocks
    .filter((block) => block.is_visible !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function hasValidServiceDetailBlocks(details) {
  return getVisibleServiceDetailBlocks(details).length > 0;
}

export function legacyDetailsToServiceDetailBlocks(details = {}) {
  const blocks = [];
  const effects = normalizeCards(details.effects);
  const process = normalizeSteps(details.process);
  const subProducts = normalizeCards(details.sub_items);

  if (details.operation) {
    blocks.push(createServiceDetailBlock('rich_text', {
      id: 'legacy-operation',
      sort_order: blocks.length,
      body: details.operation,
    }));
  }
  if (effects.length > 0) {
    blocks.push(createServiceDetailBlock('effects', {
      id: 'legacy-effects',
      sort_order: blocks.length,
      cards: effects,
    }));
  }
  if (process.length > 0) {
    blocks.push(createServiceDetailBlock('process', {
      id: 'legacy-process',
      sort_order: blocks.length,
      steps: process,
    }));
  }
  if (subProducts.length > 0) {
    blocks.push(createServiceDetailBlock('sub_products', {
      id: 'legacy-sub-products',
      sort_order: blocks.length,
      items: subProducts,
    }));
  }
  if (details.reference_img) {
    blocks.push(createServiceDetailBlock('gallery', {
      id: 'legacy-reference-image',
      sort_order: blocks.length,
      variant: 'stacked',
      images: [{ id: 'legacy-reference-image-1', url: details.reference_img, alt: '참고 이미지', caption: '' }],
    }));
  }
  if (details.duration) {
    blocks.push(createServiceDetailBlock('rich_text', {
      id: 'legacy-duration',
      sort_order: blocks.length,
      body: details.duration,
    }));
  }
  if (details.related_magazine_slug) {
    blocks.push(createServiceDetailBlock('related_magazine', {
      id: 'legacy-related-magazine',
      sort_order: blocks.length,
      magazine_slug: details.related_magazine_slug,
      header: details.related_magazine_header || '',
    }));
  }

  return blocks;
}

export function mergeServiceDetailsForSave(existingDetails = {}, incomingDetails = {}) {
  const existing = isObject(existingDetails) ? existingDetails : {};
  const incoming = isObject(incomingDetails) ? incomingDetails : {};
  const merged = { ...existing, ...incoming };

  if (Object.prototype.hasOwnProperty.call(incoming, 'blocks')) {
    const normalized = normalizeServiceDetailBlocks(incoming);
    if (normalized.errors.length > 0) {
      return { details: existing, errors: normalized.errors };
    }
    merged.blocks_schema_version = SERVICE_DETAIL_BLOCKS_SCHEMA_VERSION;
    merged.blocks = normalized.blocks;
  }

  return { details: merged, errors: [] };
}
