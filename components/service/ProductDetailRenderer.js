'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  MessageCircle,
  Package,
  Play,
  Quote,
  Sparkles,
} from 'lucide-react';
import MarkdownContent from '@/lib/markdownRender';
import { getServiceVideoPlaybackProps } from '@/lib/serviceVideoPlayback';
import {
  SERVICE_DETAIL_EFFECT_VARIANTS,
  SERVICE_DETAIL_PROCESS_VARIANTS,
  getVisibleServiceDetailBlocks,
  parseYouTubeUrl,
} from '@/lib/serviceDetailBlocks';
import SectionRenderer from '@/components/landing/SectionRenderer';

const iconMap = {
  intro: Sparkles,
  rich_text: Layers,
  effects: CheckCircle2,
  process: ListOrdered,
  gallery: ImageIcon,
  mockup_showcase: ImageIcon,
  youtube_embed: Play,
  video: Play,
  sub_products: Package,
  case_proof: BarChart3,
  related_magazine: ExternalLink,
  landing_section: Layers,
  cta: MessageCircle,
};

const labelMap = {
  intro: '핵심 소개',
  rich_text: '상세 설명',
  effects: '도입 효과',
  process: '진행 절차',
  gallery: '이미지',
  mockup_showcase: '목업',
  youtube_embed: '영상',
  video: '영상',
  sub_products: '세부 상품',
  case_proof: '사례/근거',
  related_magazine: '관련 매거진',
  landing_section: '랜딩 섹션',
  cta: '상담 문의',
};

function ratioClass(ratio = '16:9') {
  if (ratio === '1:1') return 'aspect-square';
  if (ratio === '4:3') return 'aspect-[4/3]';
  if (ratio === '9:16') return 'aspect-[9/16] max-h-[620px]';
  return 'aspect-video';
}

const FRAME_RATIO_MAP = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
};

function clampImageScale(value) {
  const rawScale = Number.parseInt(value, 10);
  if (!Number.isFinite(rawScale)) return 100;
  return Math.max(25, Math.min(250, rawScale));
}

function imageRatio(image, measured) {
  const width = Number.parseInt(image?.natural_width || measured?.width, 10);
  const height = Number.parseInt(image?.natural_height || measured?.height, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return width / height;
}

function ratioNumber(cssRatio) {
  const [width, height] = String(cssRatio || '4 / 3').split('/').map((part) => Number.parseFloat(part.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 4 / 3;
  return width / height;
}

function getGalleryFrameRatio(block, images) {
  if ((block.frame_ratio || 'first_image') === 'first_image') {
    const first = images[0];
    const width = Number.parseInt(first?.natural_width, 10);
    const height = Number.parseInt(first?.natural_height, 10);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return `${width} / ${height}`;
    }
    return '4 / 3';
  }
  return FRAME_RATIO_MAP[block.frame_ratio] || '4 / 3';
}

function getImageTransform(image, frameRatio, fitMode, measured) {
  const objectPosition = image.object_position || '50% 50%';
  const userScale = clampImageScale(image.object_scale) / 100;
  const naturalRatio = imageRatio(image, measured);
  const frameRatioValue = ratioNumber(frameRatio);
  const coverScale = fitMode === 'cover' && naturalRatio
    ? Math.max(frameRatioValue / naturalRatio, naturalRatio / frameRatioValue, 1)
    : 1;
  return {
    objectPosition,
    transform: `scale(${coverScale * userScale})`,
    transformOrigin: objectPosition,
  };
}

function FramedImage({ image, frameRatio = '4 / 3', fitMode = 'contain', className = '' }) {
  const [measured, setMeasured] = useState(null);
  return (
    <div className={`overflow-hidden bg-zinc-100 ${className}`} style={{ aspectRatio: frameRatio }}>
      <img
        src={image.url}
        alt={image.alt || image.caption || ''}
        className="h-full w-full object-contain"
        style={getImageTransform(image, frameRatio, fitMode, measured)}
        onLoad={(event) => {
          const width = event.currentTarget.naturalWidth;
          const height = event.currentTarget.naturalHeight;
          if (width > 0 && height > 0) setMeasured({ width, height });
        }}
      />
    </div>
  );
}

function FramedVideo({ media, frameRatio = '16 / 9', fitMode = 'contain', className = '' }) {
  const [measured, setMeasured] = useState(null);
  const playbackProps = getServiceVideoPlaybackProps(media);
  return (
    <div className={`overflow-hidden bg-zinc-950 ${className}`} style={{ aspectRatio: frameRatio }}>
      <video
        src={media.url}
        poster={media.thumbnail_url || undefined}
        className="h-full w-full"
        style={{
          objectFit: fitMode === 'cover' ? 'cover' : 'contain',
          ...getImageTransform(media, frameRatio, fitMode, measured),
        }}
        onLoadedMetadata={(event) => {
          const width = event.currentTarget.videoWidth;
          const height = event.currentTarget.videoHeight;
          if (width > 0 && height > 0) setMeasured({ width, height });
        }}
        {...playbackProps}
      />
    </div>
  );
}

function FramedMedia({ media, frameRatio = '4 / 3', fitMode = 'contain', className = '' }) {
  if (media?.type === 'video') {
    return <FramedVideo media={media} frameRatio={frameRatio} fitMode={fitMode} className={className} />;
  }
  return <FramedImage image={media} frameRatio={frameRatio} fitMode={fitMode} className={className} />;
}

function sectionId(block, index) {
  return `detail-${block.type}-${index + 1}`;
}

function blockDisplayTitle(block) {
  return block.display_title || (block.type === 'landing_section' ? block.title : '') || labelMap[block.type] || block.type;
}

function ManualLineText({ as: Tag = 'span', className = '', children }) {
  if (!children) return null;
  return <Tag className={`whitespace-pre-line break-keep ${className}`}>{children}</Tag>;
}

export function getProductDetailBlockToc(details) {
  return getVisibleServiceDetailBlocks(details).map((block, index) => ({
    id: sectionId(block, index),
    label: blockDisplayTitle(block),
    icon: iconMap[block.type] || Layers,
  }));
}

function BlockShell({ block, index, children, dark = false }) {
  const Icon = iconMap[block.type] || Layers;
  return (
    <section
      id={sectionId(block, index)}
      className={`scroll-mt-28 rounded-3xl border p-6 shadow-sm md:p-8 ${
        dark
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-100 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white'
      }`}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black ${
          dark ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
        }`}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <h2 className="flex items-center gap-2 text-base font-black uppercase tracking-tight md:text-lg">
          <Icon size={16} />
          <ManualLineText>{blockDisplayTitle(block)}</ManualLineText>
        </h2>
      </div>
      {children}
    </section>
  );
}

function GalleryBlock({ block }) {
  const images = Array.isArray(block.images) ? block.images : [];
  if (images.length === 0) return null;
  const frameRatio = getGalleryFrameRatio(block, images);
  const fitMode = block.fit === 'cover' ? 'cover' : 'contain';

  if (block.variant === 'carousel') {
    return (
      <div className="flex snap-x gap-4 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <figure key={image.id || index} className="min-w-[78%] snap-start overflow-hidden rounded-2xl bg-zinc-100 sm:min-w-[48%]">
            <FramedMedia media={image} frameRatio={frameRatio} fitMode={fitMode} />
            {image.caption && <figcaption className="px-4 py-3 text-xs font-bold text-zinc-600">{image.caption}</figcaption>}
          </figure>
        ))}
      </div>
    );
  }

  if (block.variant === 'comparison') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {images.slice(0, 2).map((image, index) => (
          <figure key={image.id || index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <FramedMedia media={image} frameRatio={frameRatio} fitMode={fitMode} />
            <figcaption className="px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-700">
              {image.caption || (index === 0 ? 'Before' : 'After')}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  const gridClass = block.variant === 'grid_3'
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : block.variant === 'stacked'
      ? 'grid-cols-1'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {images.map((image, index) => (
        <figure key={image.id || index} className="overflow-hidden rounded-2xl bg-zinc-100">
          <FramedMedia media={image} frameRatio={frameRatio} fitMode={fitMode} />
          {image.caption && <figcaption className="px-4 py-3 text-xs font-bold text-zinc-600">{image.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function MockupBlock({ block }) {
  const images = Array.isArray(block.images) ? block.images : [];
  if (images.length === 0) return null;
  const fitMode = block.fit === 'cover' ? 'cover' : 'contain';

  if (block.variant === 'phone_stack') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {images.slice(0, 4).map((image, index) => (
          <figure key={image.id || index} className="mx-auto w-full max-w-[260px] rounded-[2rem] border-[10px] border-zinc-900 bg-zinc-100 shadow-xl">
            <FramedImage image={image} frameRatio="9 / 16" fitMode={fitMode} className="rounded-[1.25rem] bg-white" />
          </figure>
        ))}
      </div>
    );
  }

  if (block.variant === 'dashboard_frame') {
    return (
      <div className="grid gap-5">
        {images.map((image, index) => (
          <figure key={image.id || index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex h-9 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 h-3 w-28 rounded-full bg-zinc-200" />
            </div>
            <div className="grid grid-cols-[72px_1fr] bg-zinc-100 sm:grid-cols-[120px_1fr]">
              <div className="space-y-3 border-r border-zinc-200 bg-zinc-900 p-4">
                <span className="block h-3 w-10 rounded-full bg-white/30" />
                <span className="block h-2 w-full rounded-full bg-white/15" />
                <span className="block h-2 w-4/5 rounded-full bg-white/15" />
                <span className="block h-2 w-2/3 rounded-full bg-white/15" />
              </div>
              <div className="p-3">
                <FramedImage image={image} frameRatio="16 / 9" fitMode={fitMode} className="rounded-xl bg-white" />
              </div>
            </div>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className={block.variant === 'split_mockup' ? 'grid gap-4 md:grid-cols-2' : 'grid gap-5'}>
      {images.map((image, index) => (
        <figure key={image.id || index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm">
          <div className="flex h-8 items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <FramedImage image={image} frameRatio="16 / 9" fitMode={fitMode} className="bg-white" />
        </figure>
      ))}
    </div>
  );
}

function CardsBlock({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
          {item.title && <h3 className="mb-2 text-sm font-black text-zinc-900 dark:text-white">{item.title}</h3>}
          {item.desc && <MarkdownContent text={item.desc} variant="compact" />}
        </div>
      ))}
    </div>
  );
}

function effectVariant(block) {
  return SERVICE_DETAIL_EFFECT_VARIANTS.includes(block.variant) ? block.variant : 'benefit_cards';
}

function processVariant(block) {
  return SERVICE_DETAIL_PROCESS_VARIANTS.includes(block.variant) ? block.variant : 'timeline';
}

function hasEffectContent(item = {}) {
  return Boolean(item.title || item.desc || item.metric || item.before || item.after);
}

function EffectLabel({ item, dark = false }) {
  if (!item.icon) return null;
  return (
    <span className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
      dark ? 'bg-white/10 text-zinc-200' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100'
    }`}>
      {item.icon}
    </span>
  );
}

function EffectTitle({ item, dark = false, large = false }) {
  if (!item.title && !item.metric) return null;
  return (
    <div>
      {item.metric && (
        <ManualLineText
          as="p"
          className={`${large ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'} font-black leading-none tracking-tight ${
            dark ? 'text-white' : 'text-zinc-950 dark:text-white'
          }`}
        >
          {item.metric}
        </ManualLineText>
      )}
      {item.title && (
        <ManualLineText
          as="h3"
          className={`${item.metric ? 'mt-2' : ''} ${large ? 'text-lg md:text-xl' : 'text-sm'} font-black leading-tight ${
            dark ? 'text-zinc-100' : 'text-zinc-900 dark:text-white'
          }`}
        >
          {item.title}
        </ManualLineText>
      )}
    </div>
  );
}

function EffectDescription({ item, dark = false }) {
  if (!item.desc) return null;
  return <div className="mt-3"><MarkdownContent text={item.desc} variant={dark ? 'dark' : 'compact'} /></div>;
}

function BenefitCards({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const dark = item.is_featured === true;
        return (
          <article
            key={index}
            className={`rounded-2xl border p-5 ${
              dark
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                : 'border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60'
            }`}
          >
            <EffectLabel item={item} dark={dark} />
            <EffectTitle item={item} dark={dark} />
            <EffectDescription item={item} dark={dark} />
          </article>
        );
      })}
    </div>
  );
}

function MetricFocusEffects({ items }) {
  const featured = items.find((item) => item.is_featured) || items[0];
  const secondary = items.filter((item) => item !== featured);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <article className="rounded-3xl bg-zinc-900 p-6 text-white md:p-8">
        <EffectLabel item={featured} dark />
        <EffectTitle item={featured} dark large />
        <EffectDescription item={featured} dark />
      </article>
      {secondary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {secondary.map((item, index) => (
            <article key={index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
              <EffectLabel item={item} />
              <EffectTitle item={item} />
              <EffectDescription item={item} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function BeforeAfterEffects({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <article key={index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <EffectLabel item={item} />
              <EffectTitle item={item} />
            </div>
            {item.metric && <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-zinc-900">{item.metric}</span>}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Before</p>
              <ManualLineText as="p" className="text-sm font-bold leading-relaxed text-zinc-700 dark:text-zinc-200">
                {item.before || item.title}
              </ManualLineText>
            </div>
            <div className="hidden items-center text-zinc-400 md:flex"><ArrowRight size={18} /></div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">After</p>
              <ManualLineText as="p" className="text-sm font-bold leading-relaxed">
                {item.after || item.desc}
              </ManualLineText>
            </div>
          </div>
          {(item.before || item.after) && <EffectDescription item={item} />}
        </article>
      ))}
    </div>
  );
}

function ProblemSolutionEffects({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <article key={index} className="grid gap-3 rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_1.15fr]">
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Problem</p>
            <ManualLineText as="h3" className="text-sm font-black leading-tight text-zinc-900 dark:text-white">
              {item.before || item.title}
            </ManualLineText>
          </div>
          <div className="rounded-2xl bg-zinc-900 p-4 text-white">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Solution</p>
              {item.metric && <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-black dark:bg-zinc-900/10">{item.metric}</span>}
            </div>
            <ManualLineText as="p" className="text-sm font-bold leading-relaxed">
              {item.after || item.desc}
            </ManualLineText>
          </div>
        </article>
      ))}
    </div>
  );
}

function EffectsBlock({ block }) {
  const items = (block.cards || []).filter(hasEffectContent);
  if (!items.length) return null;
  const variant = effectVariant(block);

  if (variant === 'metric_focus') return <MetricFocusEffects items={items} />;
  if (variant === 'before_after') return <BeforeAfterEffects items={items} />;
  if (variant === 'problem_solution') return <ProblemSolutionEffects items={items} />;
  return <BenefitCards items={items} />;
}

function hasStepContent(step = {}) {
  return Boolean(step.name || step.desc || step.image?.url || step.duration || step.deliverable);
}

function StepMeta({ step, dark = false }) {
  const meta = [step.duration, step.deliverable].filter(Boolean);
  if (meta.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {meta.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
          dark ? 'bg-white/10 text-zinc-100' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100'
        }`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function StepImage({ step, className = '' }) {
  if (!step.image?.url) return null;
  return (
    <figure className={`overflow-hidden rounded-2xl bg-zinc-100 ${className}`}>
      <FramedImage image={step.image} frameRatio={imageFrameRatio(step.image)} />
      {step.image.caption && <figcaption className="px-4 py-3 text-xs font-bold text-zinc-600">{step.image.caption}</figcaption>}
    </figure>
  );
}

function StepText({ step, headingClassName = 'text-sm', dark = false }) {
  return (
    <div>
      {step.name && (
        <ManualLineText as="h3" className={`mb-2 font-black leading-tight ${headingClassName}`}>
          {step.name}
        </ManualLineText>
      )}
      {step.desc && <MarkdownContent text={step.desc} variant={dark ? 'dark' : 'compact'} />}
      <StepMeta step={step} dark={dark} />
    </div>
  );
}

function TimelineProcess({ steps }) {
  return (
    <ol className="relative space-y-5 before:absolute before:left-5 before:top-5 before:h-[calc(100%-2.5rem)] before:w-px before:bg-zinc-200 dark:before:bg-zinc-700">
      {steps.map((step, index) => (
        <li key={index} className="relative grid grid-cols-[44px_1fr] gap-4">
          <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-black text-white ring-4 ring-white dark:bg-white dark:text-zinc-900 dark:ring-zinc-900">
            {step.step || String(index + 1).padStart(2, '0')}
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
            <StepText step={step} />
            <StepImage step={step} className="mt-4" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepCardsProcess({ steps }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {steps.map((step, index) => (
        <li key={index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-800/60">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-zinc-900">
              {step.step || String(index + 1).padStart(2, '0')}
            </span>
            {step.duration && <span className="text-xs font-black text-zinc-500">{step.duration}</span>}
          </div>
          <StepText step={step} headingClassName="text-base" />
          <StepImage step={step} className="mt-4" />
        </li>
      ))}
    </ol>
  );
}

function AlternatingProcess({ steps }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, index) => {
        const hasImage = Boolean(step.image?.url);
        return (
          <li key={index} className={`grid gap-4 ${hasImage ? 'md:grid-cols-2 md:items-center' : ''}`}>
            <div className={`rounded-3xl bg-zinc-900 p-5 text-white ${hasImage && index % 2 === 1 ? 'md:order-2' : ''}`}>
              <span className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black dark:bg-zinc-900/10">
                {step.step || String(index + 1).padStart(2, '0')}
              </span>
              <StepText step={step} headingClassName="text-lg" dark />
            </div>
            {hasImage && <StepImage step={step} className={index % 2 === 1 ? 'md:order-1' : ''} />}
          </li>
        );
      })}
    </ol>
  );
}

function ChecklistProcess({ steps }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <CheckCircle2 size={14} />
          </div>
          <div>
            <ManualLineText as="h3" className="text-sm font-black leading-tight">
              {step.name || step.deliverable || `Step ${index + 1}`}
            </ManualLineText>
            {step.desc && <MarkdownContent text={step.desc} variant="compact" />}
            <StepMeta step={step} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProcessBlock({ block }) {
  const steps = (block.steps || []).filter(hasStepContent);
  if (!steps.length) return null;
  const variant = processVariant(block);

  if (variant === 'step_cards') return <StepCardsProcess steps={steps} />;
  if (variant === 'alternating') return <AlternatingProcess steps={steps} />;
  if (variant === 'checklist') return <ChecklistProcess steps={steps} />;
  return <TimelineProcess steps={steps} />;
}

function PreviewSafeLink({ href, preview, className, children, ...props }) {
  if (preview) {
    return (
      <span className={className} aria-disabled="true" {...props}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}

function imageFrameRatio(image, fallback = '4 / 3') {
  const width = Number.parseInt(image?.natural_width, 10);
  const height = Number.parseInt(image?.natural_height, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return fallback;
  return `${width} / ${height}`;
}

function mediaImage(media) {
  if (media?.image) return media.image;
  if (media?.type === 'image' && media?.url) {
    return {
      url: media.url,
      alt: media.alt || media.title || '',
      caption: media.caption || '',
      object_position: media.object_position || '50% 50%',
      object_scale: media.object_scale || 100,
      natural_width: media.natural_width,
      natural_height: media.natural_height,
    };
  }
  return null;
}

function mediaThumbnail(media) {
  if (media?.thumbnail) return media.thumbnail;
  if (media?.thumbnail_url) {
    return {
      url: media.thumbnail_url,
      alt: media.title || '',
      caption: '',
      object_position: '50% 50%',
      object_scale: 100,
    };
  }
  return null;
}

function MediaDisplay({ media, frameRatio = '4 / 3', fitMode = 'contain', className = '', preview = false }) {
  if (!media) return null;

  if (media.type === 'image') {
    const image = mediaImage(media);
    if (!image?.url) return null;
    const ratio = frameRatio === 'first_image' ? imageFrameRatio(image) : (FRAME_RATIO_MAP[frameRatio] || frameRatio);
    return <FramedImage image={image} frameRatio={ratio} fitMode={fitMode} className={className || 'rounded-2xl'} />;
  }

  const parsed = media.type === 'youtube' ? parseYouTubeUrl(media.url) : { ok: false };
  const thumbnail = mediaThumbnail(media);
  const ratio = FRAME_RATIO_MAP[media.aspect_ratio] || FRAME_RATIO_MAP[frameRatio] || '16 / 9';

  if (preview && media.type === 'youtube' && thumbnail?.url) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-zinc-950 ${className}`} style={{ aspectRatio: ratio }}>
        <FramedImage image={thumbnail} frameRatio={ratio} fitMode="cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-lg">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
      </div>
    );
  }

  if (media.type === 'youtube' && parsed.ok) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-zinc-950 ${className}`} style={{ aspectRatio: ratio }}>
        <iframe
          src={parsed.embedUrl}
          title={media.title || 'YouTube video'}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (media.type === 'video' && media.url) {
    return <FramedVideo media={{ ...media, thumbnail_url: thumbnail?.url || media.thumbnail_url }} frameRatio={ratio} fitMode={media.fit || fitMode} className={className || 'rounded-2xl'} />;
  }

  if (thumbnail?.url) {
    return <FramedImage image={thumbnail} frameRatio={ratio} fitMode="cover" className={className || 'rounded-2xl'} />;
  }

  return null;
}

function storyVideoMedia(item) {
  if (item.media) return item.media;
  return {
    type: item.media_type || (item.provider === 'youtube' ? 'youtube' : 'video'),
    url: item.url || '',
    title: item.title || '',
    thumbnail_url: item.thumbnail_url || '',
    thumbnail: item.thumbnail || null,
    aspect_ratio: item.aspect_ratio || '16:9',
    fit: item.fit || 'contain',
    object_position: item.object_position || '50% 50%',
    object_scale: item.object_scale || 100,
    natural_width: item.natural_width,
    natural_height: item.natural_height,
    autoplay: item.autoplay !== false,
  };
}

function StoryRenderer({ items = [], preview }) {
  if (!items.length) return null;

  return (
    <div className="space-y-6">
      {items.map((item, index) => {
        if (item.type === 'text') {
          return (
            <MarkdownContent
              key={item.id || index}
              text={item.body}
              textSize={item.text_size || 'md'}
              textWeight={item.text_weight || 'medium'}
            />
          );
        }
        if (item.type === 'image' && item.image?.url) {
          return (
            <figure key={item.id || index} className="overflow-hidden rounded-2xl bg-zinc-100">
              <FramedImage image={item.image} frameRatio={imageFrameRatio(item.image)} />
              {item.image.caption && <figcaption className="px-4 py-3 text-xs font-bold text-zinc-600">{item.image.caption}</figcaption>}
            </figure>
          );
        }
        if (item.type === 'image_group') {
          return <GalleryBlock key={item.id || index} block={{ ...item, type: 'gallery' }} />;
        }
        if (item.type === 'video') {
          return <MediaDisplay key={item.id || index} media={storyVideoMedia(item)} preview={preview} />;
        }
        if (item.type === 'quote') {
          return (
            <blockquote key={item.id || index} className="rounded-2xl border-l-4 border-zinc-900 bg-zinc-50 p-5 text-sm font-bold leading-relaxed text-zinc-700 dark:border-white dark:bg-zinc-800 dark:text-zinc-200">
              {item.media && <MediaDisplay media={item.media} frameRatio={item.media.frame_ratio || '16:9'} fitMode={item.media.fit || 'contain'} className="mb-4" preview={preview} />}
              <Quote size={16} className="mb-2" />
              <ManualLineText>{item.quote}</ManualLineText>
              {(item.author || item.role) && (
                <footer className="mt-4 text-xs font-black text-zinc-500">
                  {item.author}{item.author && item.role ? ' · ' : ''}{item.role}
                </footer>
              )}
            </blockquote>
          );
        }
        if (item.type === 'metric') {
          return (
            <div key={item.id || index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
              {item.media && <MediaDisplay media={item.media} frameRatio={item.media.frame_ratio || '16:9'} fitMode={item.media.fit || 'contain'} className="mb-4" preview={preview} />}
              {item.title && <h3 className="mb-2 text-lg font-black text-zinc-900 dark:text-white">{item.title}</h3>}
              {item.desc && <MarkdownContent text={item.desc} variant="compact" />}
            </div>
          );
        }
        if (item.type === 'cta') {
          return (
            <div key={item.id || index} className="rounded-2xl border border-zinc-900 bg-zinc-900 p-5 text-white">
              <ManualLineText as="p" className="text-sm font-semibold leading-relaxed text-zinc-100">{item.copy}</ManualLineText>
              <PreviewSafeLink
                href={item.button_href || '/contact'}
                preview={preview}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-zinc-900"
              >
                {item.button_label || '상담 문의하기'}
                <ArrowRight size={14} />
              </PreviewSafeLink>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function ProofMetricsBlock({ metrics = [], frameRatio = '16:9', fitMode = 'contain', preview = false }) {
  if (!metrics.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {metrics.map((item, index) => (
        <div key={item.id || index} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
          {item.media && <MediaDisplay media={item.media} frameRatio={frameRatio} fitMode={fitMode} className="mb-4" preview={preview} />}
          {item.title && <h3 className="mb-2 text-sm font-black text-zinc-900 dark:text-white">{item.title}</h3>}
          {item.desc && <MarkdownContent text={item.desc} variant="compact" />}
        </div>
      ))}
    </div>
  );
}

function TestimonialsBlock({ testimonials = [], frameRatio = '16:9', fitMode = 'contain', preview = false }) {
  if (!testimonials.length) return null;
  return (
    <div className="mt-5 grid gap-3">
      {testimonials.map((item, index) => (
        <blockquote key={item.id || index} className="rounded-2xl border-l-4 border-zinc-900 bg-zinc-50 p-5 text-sm font-bold leading-relaxed text-zinc-700 dark:border-white dark:bg-zinc-800 dark:text-zinc-200">
          {item.media && <MediaDisplay media={item.media} frameRatio={frameRatio} fitMode={fitMode} className="mb-4" preview={preview} />}
          <Quote size={16} className="mb-2" />
          <ManualLineText>{item.quote}</ManualLineText>
          {(item.author || item.role) && (
            <footer className="mt-4 text-xs font-black text-zinc-500">
              {item.author}{item.author && item.role ? ' · ' : ''}{item.role}
            </footer>
          )}
        </blockquote>
      ))}
    </div>
  );
}

function findContextMagazine(slug, context = {}) {
  if (!slug) return null;
  if (context.relatedMagazine?.slug === slug) return context.relatedMagazine;
  const magazines = Array.isArray(context.previewData?.magazines) ? context.previewData.magazines : [];
  return magazines.find((magazine) => magazine.slug === slug) || null;
}

function renderBlock(block, index, context = {}) {
  const preview = !!context.preview;
  if (block.editor_mode === 'story' && Array.isArray(block.story_items) && block.story_items.length > 0) {
    return (
      <BlockShell block={block} index={index}>
        <StoryRenderer items={block.story_items} preview={preview} />
      </BlockShell>
    );
  }

  switch (block.type) {
    case 'intro':
      return (
        <BlockShell block={block} index={index}>
          <ManualLineText
            as="h2"
            className="text-2xl font-black leading-tight tracking-tight md:text-3xl"
          >
            {block.headline}
          </ManualLineText>
          <ManualLineText
            as="p"
            className="mt-4 text-base font-semibold leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            {block.summary}
          </ManualLineText>
          {Array.isArray(block.badges) && block.badges.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {block.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{badge}</span>
              ))}
            </div>
          )}
        </BlockShell>
      );
    case 'rich_text':
      return (
        <BlockShell block={block} index={index}>
          <MarkdownContent text={block.body} />
        </BlockShell>
      );
    case 'effects':
      return (
        <BlockShell block={block} index={index}>
          <EffectsBlock block={block} />
        </BlockShell>
      );
    case 'process':
      return (
        <BlockShell block={block} index={index}>
          <ProcessBlock block={block} />
        </BlockShell>
      );
    case 'gallery':
      return (
        <BlockShell block={block} index={index}>
          <GalleryBlock block={block} />
        </BlockShell>
      );
    case 'mockup_showcase':
      return (
        <BlockShell block={block} index={index}>
          <MockupBlock block={block} />
        </BlockShell>
      );
    case 'youtube_embed': {
      const parsed = parseYouTubeUrl(block.url);
      if (!parsed.ok) return null;
      return (
        <BlockShell block={block} index={index}>
          <ManualLineText as="h3" className="mb-3 text-lg font-black leading-tight">
            {block.title}
          </ManualLineText>
          <div className={`overflow-hidden rounded-2xl bg-zinc-950 ${ratioClass(block.aspect_ratio)}`}>
            <iframe
              src={parsed.embedUrl}
              title={block.title || 'YouTube video'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <ManualLineText
            as="p"
            className="mt-4 text-sm font-semibold leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            {block.description}
          </ManualLineText>
        </BlockShell>
      );
    }
    case 'video':
      if (!block.url) return null;
      return (
        <BlockShell block={block} index={index}>
          <ManualLineText as="h3" className="mb-3 text-lg font-black leading-tight">
            {block.title}
          </ManualLineText>
          <MediaDisplay
            media={{
              type: 'video',
              url: block.url,
              title: block.title,
              thumbnail_url: block.poster_url || '',
              aspect_ratio: block.aspect_ratio || '16:9',
              fit: block.fit || 'contain',
              object_position: block.object_position || '50% 50%',
              object_scale: block.object_scale || 100,
              natural_width: block.natural_width,
              natural_height: block.natural_height,
              autoplay: block.autoplay !== false,
            }}
            preview={preview}
          />
        </BlockShell>
      );
    case 'sub_products':
      return (
        <BlockShell block={block} index={index}>
          <CardsBlock items={block.items} />
        </BlockShell>
      );
    case 'case_proof': {
      const testimonials = Array.isArray(block.testimonials) && block.testimonials.length > 0
        ? block.testimonials
        : (block.quote ? [{ id: 'legacy-quote', quote: block.quote, author: '', role: '', media: null }] : []);
      return (
        <BlockShell block={block} index={index}>
          <ProofMetricsBlock
            metrics={block.metrics}
            frameRatio={block.media_frame_ratio || '16:9'}
            fitMode={block.media_fit || 'contain'}
            preview={preview}
          />
          <TestimonialsBlock
            testimonials={testimonials}
            frameRatio={block.media_frame_ratio || '16:9'}
            fitMode={block.media_fit || 'contain'}
            preview={preview}
          />
        </BlockShell>
      );
    }
    case 'related_magazine': {
      if (!block.magazine_slug) return null;
      const magazine = findContextMagazine(block.magazine_slug, context);
      return (
        <BlockShell block={block} index={index}>
          <PreviewSafeLink
            href={`/magazine/${block.magazine_slug}`}
            preview={preview}
            className="group flex overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 hover:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/60"
          >
            {magazine?.thumbnail_url && (
              <div className="hidden w-40 shrink-0 overflow-hidden bg-zinc-100 sm:block">
                <img src={magazine.thumbnail_url} alt={magazine.title || block.magazine_slug} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{block.header || 'Related Magazine'}</p>
                <p className="mt-2 text-sm font-black text-zinc-900 dark:text-white">
                  {magazine?.title || block.title || block.magazine_slug}
                </p>
                {magazine?.excerpt && (
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-zinc-500">{magazine.excerpt}</p>
                )}
              </div>
              <ArrowRight size={18} className="shrink-0 transition group-hover:translate-x-1" />
            </div>
          </PreviewSafeLink>
        </BlockShell>
      );
    }
    case 'landing_section':
      if (!block.section_type) return null;
      return (
        <section
          id={sectionId(block, index)}
          className="scroll-mt-28 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <SectionRenderer
            type={block.section_type}
            title={block.title}
            subtitle={block.subtitle}
            content={block.content || {}}
            settings={context.settings}
            preview={preview}
            previewData={context.previewData}
          />
        </section>
      );
    case 'cta':
      return (
        <BlockShell block={block} index={index} dark>
          <ManualLineText as="p" className="text-base font-semibold leading-relaxed text-zinc-100">
            {block.copy}
          </ManualLineText>
          <PreviewSafeLink
            href={block.button_href || '/contact'}
            preview={preview}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-zinc-900"
          >
            {block.button_label || '상담 문의하기'}
            <ArrowRight size={16} />
          </PreviewSafeLink>
        </BlockShell>
      );
    default:
      return null;
  }
}

export default function ProductDetailRenderer({ details, relatedMagazine = null, settings = null, preview = false, previewData = {} }) {
  const blocks = getVisibleServiceDetailBlocks(details);
  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, index) => (
        <div key={block.id || `${block.type}-${index}`}>
          {renderBlock(block, index, { relatedMagazine, settings, preview, previewData })}
        </div>
      ))}
    </>
  );
}
