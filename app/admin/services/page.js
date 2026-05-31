'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Cpu,
  Edit2,
  HelpCircle,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  Loader2,
  MapPin,
  MessageSquare,
  Monitor,
  Plus,
  Save,
  Search,
  Smartphone,
  Star,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import MarkdownContent from '@/lib/markdownRender';
import { DUMMY_SETTINGS } from '@/lib/supabase';
import { getSupabaseAuthHeaders } from '@/lib/clientAuthHeaders';
import ServiceCaseTabs from '@/components/admin/ServiceCaseTabs';
import ProductDetailBlockBuilder from '@/components/admin/ProductDetailBlockBuilder';
import ServicePreviewSurface from '@/components/service/ServicePreviewSurface';

function HelpTip({ text }) {
  return (
    <span className="relative inline-flex items-center group/tip align-middle">
      <HelpCircle
        size={14}
        className="ml-1.5 text-zinc-500 hover:text-zinc-800 cursor-help transition-colors"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[11px] font-medium leading-relaxed normal-case tracking-normal not-italic opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-xl"
      >
        {text}
      </span>
    </span>
  );
}

const iconMap = {
  MessageSquare,
  Star,
  Cpu,
  MapPin,
  Layout,
  Target,
  CheckCircle2,
};

const FIELD = 'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-500 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 disabled:text-zinc-600 disabled:opacity-100';
const LABEL = 'block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-700 mb-2';

function newDraftKey() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDetails(details = {}) {
  return {
    effects: [],
    operation: '',
    process: [],
    sub_items: [],
    duration: '',
    reference_img: '',
    related_magazine_slug: '',
    related_magazine_header: '',
    status: 'published',
    ...details,
  };
}

function findRelatedMagazine(service, magazines = []) {
  const details = service?.details || {};
  const blockRelSlug = Array.isArray(details.blocks)
    ? details.blocks.find((block) => block?.type === 'related_magazine' && block.is_visible !== false)?.magazine_slug
    : '';
  const relSlug = details.related_magazine_slug || blockRelSlug;
  if (!relSlug) return null;
  return magazines.find((magazine) => magazine.slug === relSlug) || null;
}

function MdTextarea({ value, onChange, placeholder, rows = 4, uploadFolder = 'services/drafts' }) {
  const [tab, setTab] = useState('write');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const insertAtCursor = (insertText) => {
    const ta = textareaRef.current;
    const current = value || '';
    if (!ta) {
      onChange({ target: { value: current + insertText } });
      return;
    }
    const start = ta.selectionStart ?? current.length;
    const end = ta.selectionEnd ?? current.length;
    const next = current.slice(0, start) + insertText + current.slice(end);
    onChange({ target: { value: next } });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insertText.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', uploadFolder);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: await getSupabaseAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || '업로드 실패');
      const alt = file.name.replace(/\.[^.]+$/, '');
      insertAtCursor(`\n\n![${alt}](${data.url})\n\n`);
    } catch (err) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-300 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-900/10">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 bg-zinc-50">
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md transition-colors ${tab === 'write' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200'}`}
          >Write</button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md transition-colors ${tab === 'preview' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200'}`}
          >Preview</button>
          <span className="w-px h-4 bg-zinc-200 mx-1" />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
            {uploading ? '업로드중' : 'Image'}
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n\n---\n\n')}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            구분선
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="hidden sm:block text-[10px] text-zinc-600 font-semibold tracking-tight">
          <span className="font-bold">**굵게**</span> · <span className="italic">*기울임*</span> · &gt; 인용 · - 불릿 · 1. 번호
        </div>
      </div>
      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-4 outline-none text-sm font-semibold resize-y bg-white text-zinc-900 placeholder:text-zinc-500"
          value={value || ''}
          onChange={onChange}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData?.files || [])[0];
            if (file && file.type.startsWith('image/')) {
              e.preventDefault();
              handleImageFile(file);
            }
          }}
          onDrop={(e) => {
            const file = Array.from(e.dataTransfer?.files || [])[0];
            if (file && file.type.startsWith('image/')) {
              e.preventDefault();
              handleImageFile(file);
            }
          }}
        />
      ) : (
        <div className="p-4 min-h-[120px] bg-white">
          {value ? <MarkdownContent text={value} /> : <p className="text-xs text-zinc-600 font-bold">미리볼 내용이 없습니다.</p>}
        </div>
      )}
    </div>
  );
}

const DESKTOP_PREVIEW_WIDTH = 1440;

function ServiceEditorPreview({ service, settings, relatedMagazine, magazines, previewMode, setPreviewMode }) {
  const iframeRef = useRef(null);
  const desktopFrameRef = useRef(null);
  const desktopContentRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [desktopScale, setDesktopScale] = useState(0.55);
  const [desktopContentHeight, setDesktopContentHeight] = useState(900);
  const payload = useMemo(() => ({
    service,
    settings,
    relatedMagazine,
    previewData: { magazines },
  }), [service, settings, relatedMagazine, magazines]);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'service:preview:ready') setIframeReady(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (previewMode !== 'mobile') return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const send = () => {
      target.postMessage({ type: 'service:preview', payload }, window.location.origin);
    };
    const handles = [0, 120, 360].map((delay) => setTimeout(send, delay));
    return () => handles.forEach((handle) => clearTimeout(handle));
  }, [iframeReady, payload, previewMode]);

  useEffect(() => {
    if (previewMode !== 'desktop') return undefined;
    const frame = desktopFrameRef.current;
    if (!frame) return undefined;

    const updateScale = () => {
      const availableWidth = Math.max(320, frame.clientWidth - 24);
      const nextScale = Math.min(1, Math.max(0.34, availableWidth / DESKTOP_PREVIEW_WIDTH));
      setDesktopScale(Number(nextScale.toFixed(3)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [previewMode]);

  useEffect(() => {
    if (previewMode !== 'desktop') return undefined;
    const content = desktopContentRef.current;
    if (!content) return undefined;

    const updateHeight = () => {
      setDesktopContentHeight(Math.max(900, content.scrollHeight || content.getBoundingClientRect().height || 900));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [payload, previewMode]);

  return (
    <aside className="flex min-h-0 flex-col border-l border-zinc-200 bg-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-600">Live Preview</p>
          <h3 className="text-sm font-black text-zinc-900">상품 상세 페이지</h3>
        </div>
        <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setPreviewMode('desktop')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black ${previewMode === 'desktop' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200'}`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('mobile')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black ${previewMode === 'mobile' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200'}`}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {previewMode === 'mobile' ? (
          <div className="mx-auto h-[760px] w-[390px] max-w-full overflow-hidden rounded-[2.4rem] border-[10px] border-zinc-900 bg-white shadow-2xl">
            <iframe
              ref={iframeRef}
              title="Service Mobile Preview"
              src="/admin-service-preview"
              onLoad={() => setIframeReady(true)}
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div ref={desktopFrameRef} className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Desktop Canvas</p>
                <p className="text-xs font-black text-zinc-900">{DESKTOP_PREVIEW_WIDTH}px 실제 데스크톱 축소보기</p>
              </div>
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-black text-white">
                {Math.round(desktopScale * 100)}%
              </span>
            </div>
            <div className="overflow-auto rounded-[1.5rem] border border-zinc-200 bg-zinc-200 p-3 shadow-inner">
              <div
                className="relative bg-white shadow-sm"
                style={{
                  width: DESKTOP_PREVIEW_WIDTH * desktopScale,
                  height: desktopContentHeight * desktopScale,
                  minHeight: 900 * desktopScale,
                }}
              >
                <div
                  ref={desktopContentRef}
                  className="absolute left-0 top-0 overflow-hidden bg-white"
                  style={{
                    width: DESKTOP_PREVIEW_WIDTH,
                    minHeight: 900,
                    transform: `scale(${desktopScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <ServicePreviewSurface
                    service={service}
                    settings={settings}
                    relatedMagazine={relatedMagazine}
                    preview
                    previewData={{ magazines }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ServiceFullScreenEditor({
  mode,
  editForm,
  setEditForm,
  onClose,
  onSave,
  landingSections,
  sectionLibrary,
  magazines,
  landingSettings,
  uploadFolder,
}) {
  const [previewMode, setPreviewMode] = useState('desktop');
  const relatedMagazine = findRelatedMagazine(editForm, magazines);
  const existing = mode !== 'new';

  const setDetails = (patch) => setEditForm((prev) => ({ ...prev, details: { ...prev.details, ...patch } }));

  const editor = (
    <div className="fixed inset-0 z-[9999] isolate bg-zinc-950/70 text-zinc-900">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-screen w-screen flex-col bg-zinc-50"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-zinc-600">
              Product Detail Builder
            </p>
            <h2 className="truncate text-xl font-black tracking-tight text-zinc-900">
              {existing ? editForm.title || editForm.slug : '새 상품/솔루션 만들기'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-black text-zinc-700 hover:bg-zinc-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-black text-white hover:bg-black"
            >
              <Save size={17} />
              저장
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-xl p-2.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,60%)_minmax(420px,40%)]">
          <main className="min-h-0 overflow-y-auto bg-zinc-50 px-5 py-6">
            <div className="mx-auto max-w-5xl space-y-8 pb-20">
              <nav className="sticky top-0 z-20 -mx-5 border-b border-zinc-200 bg-zinc-50/95 px-5 py-3 backdrop-blur">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['#basic', '기본 정보'],
                    ['#builder', '상세 페이지 빌더'],
                    ['#settings', '설정'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 hover:border-zinc-900 hover:text-zinc-900">
                      {label}
                    </a>
                  ))}
                </div>
              </nav>

              <section id="basic" className="scroll-mt-24 rounded-3xl border border-zinc-200 bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <LayoutGrid className="text-zinc-900" size={20} />
                  <h3 className="text-lg font-black uppercase italic text-zinc-900 underline decoration-zinc-200">
                    Basic Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label>
                    <span className={LABEL}>Title (국문 명칭)</span>
                    <input className={FIELD} value={editForm.title || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} />
                  </label>
                  <label>
                    <span className={LABEL}>Slug (영문 URL용)</span>
                    <input
                      disabled={existing}
                      className={FIELD}
                      value={editForm.slug || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                    {existing && <p className="mt-2 text-[11px] font-semibold text-zinc-600">기존 상품의 URL은 공개 링크 보호를 위해 여기서 바꾸지 않습니다.</p>}
                  </label>
                  <label>
                    <span className={LABEL}>Subtitle (전문적 한줄평)</span>
                    <textarea
                      className={`${FIELD} min-h-24 resize-y leading-relaxed`}
                      value={editForm.subtitle || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                    />
                    <p className="mt-2 text-[11px] font-semibold leading-relaxed text-zinc-600">
                      모바일에서 원하는 의미 단위로 줄을 나누고 싶다면 여기서 엔터를 넣으세요. 미리보기와 공개 화면에 같은 줄바꿈이 반영됩니다.
                    </p>
                  </label>
                  <label>
                    <span className={LABEL}>Category</span>
                    <select className={FIELD} value={editForm.category || 'ADS'} onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}>
                      <option value="ADS">ADS (VIRAL)</option>
                      <option value="GROWTH">GROWTH (REVIEW)</option>
                      <option value="LOCAL">LOCAL (SEO)</option>
                      <option value="TECH">TECH (CREATIVE)</option>
                    </select>
                  </label>
                </div>
                <div className="mt-6">
                  <span className={LABEL}>Main Description (전체 설명)</span>
                  <MdTextarea
                    rows={6}
                    value={editForm.description || ''}
                    uploadFolder={uploadFolder}
                    placeholder="서비스 개요를 입력하세요."
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </section>

              <section id="builder" className="scroll-mt-24">
                <ProductDetailBlockBuilder
                  details={editForm.details}
                  uploadFolder={uploadFolder}
                  landingSections={landingSections}
                  sectionLibrary={sectionLibrary}
                  magazines={magazines}
                  onChange={(details) => setEditForm((prev) => ({ ...prev, details }))}
                />
              </section>

              <section id="settings" className="scroll-mt-24 space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <Star className="text-zinc-900" size={20} />
                    <h3 className="text-lg font-black uppercase italic text-zinc-900 underline decoration-zinc-200">
                      Visual & Logic Settings
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <label>
                      <span className={LABEL}>Brand Color</span>
                      <div className="flex gap-3 items-center">
                        <input type="color" className="h-11 w-12 rounded-lg cursor-pointer border border-zinc-300" value={editForm.color || '#18181B'} onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))} />
                        <input className={`${FIELD} font-mono`} value={editForm.color || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))} />
                      </div>
                    </label>
                    <label>
                      <span className={LABEL}>Order</span>
                      <input type="number" className={FIELD} value={editForm.order_num ?? 0} onChange={(e) => setEditForm((prev) => ({ ...prev, order_num: Number.parseInt(e.target.value || '0', 10) }))} />
                    </label>
                    <label>
                      <span className={LABEL}>Publish Status</span>
                      <select className={FIELD} value={editForm.details.status || 'published'} onChange={(e) => setDetails({ status: e.target.value })}>
                        <option value="published">Published (정상 노출)</option>
                        <option value="coming_soon">Coming Soon (준비 중)</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3 pt-8">
                      <input type="checkbox" className="h-5 w-5 rounded-md border-zinc-300" checked={editForm.is_active !== false} onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                      <span className="text-xs font-black uppercase text-zinc-900">Active Stage</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <Star className="text-zinc-900" size={20} />
                    <h3 className="text-lg font-black uppercase italic text-zinc-900 underline decoration-zinc-200">
                      Related Magazine
                      <HelpTip text="서비스 상세 페이지의 관련 매거진 카드 또는 관련 매거진 블록에 표시할 글을 고릅니다." />
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label>
                      <span className={LABEL}>연결할 매거진</span>
                      <select className={FIELD} value={editForm.details.related_magazine_slug || ''} onChange={(e) => setDetails({ related_magazine_slug: e.target.value })}>
                        <option value="">연결 없음</option>
                        {magazines.map((magazine) => (
                          <option key={magazine.id || magazine.slug} value={magazine.slug}>{magazine.title}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={LABEL}>블록 헤더 텍스트</span>
                      <input
                        className={FIELD}
                        placeholder="예) 이 서비스가 더 궁금하다면"
                        value={editForm.details.related_magazine_header || ''}
                        onChange={(e) => setDetails({ related_magazine_header: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </main>

          <ServiceEditorPreview
            service={editForm}
            settings={landingSettings}
            relatedMagazine={relatedMagazine}
            magazines={magazines}
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
          />
        </div>
      </motion.div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(editor, document.body);
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [landingSections, setLandingSections] = useState([]);
  const [sectionLibrary, setSectionLibrary] = useState({ blocks: [] });
  const [landingSettings, setLandingSettings] = useState(DUMMY_SETTINGS);
  const [draftKey, setDraftKey] = useState(null);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services?all=true', {
        headers: await getSupabaseAuthHeaders(),
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadLandingBuilderSources() {
      try {
        const [sectionsRes, settingsRes] = await Promise.all([
          fetch('/api/sections?all=true', { headers: await getSupabaseAuthHeaders() }),
          fetch('/api/settings'),
        ]);
        const [sectionsData, settingsData] = await Promise.all([
          sectionsRes.json(),
          settingsRes.json(),
        ]);
        if (cancelled) return;
        setLandingSections(Array.isArray(sectionsData?.sections) ? sectionsData.sections : []);
        setSectionLibrary(settingsData?.settings?.section_library || { blocks: [] });
        setLandingSettings(settingsData?.settings || DUMMY_SETTINGS);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch landing builder sources:', err);
          setLandingSections([]);
          setSectionLibrary({ blocks: [] });
          setLandingSettings(DUMMY_SETTINGS);
        }
      }
    }

    const initTimer = setTimeout(() => {
      fetchServices();
      loadLandingBuilderSources();

      fetch('/api/magazines')
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setMagazines(Array.isArray(d?.magazines) ? d.magazines : []);
        })
        .catch(() => {
          if (!cancelled) setMagazines([]);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
    };
  }, []);

  const handleEdit = (service) => {
    setDraftKey(null);
    setIsEditing(service.id);
    setEditForm({
      ...service,
      details: normalizeDetails(service.details),
    });
  };

  const handleCreateNew = () => {
    const nextDraftKey = newDraftKey();
    setDraftKey(nextDraftKey);
    setIsEditing('new');
    setEditForm({
      title: '',
      slug: '',
      subtitle: '',
      description: '',
      category: 'ADS',
      color: '#1E4181',
      icon: 'Target',
      order_num: services.length,
      is_active: true,
      details: normalizeDetails({
        related_magazine_slug: '',
        status: 'published',
        blocks: [],
      }),
    });
  };

  const handleSave = async () => {
    try {
      const url = isEditing === 'new' ? '/api/services' : `/api/services/${isEditing}`;
      const method = isEditing === 'new' ? 'POST' : 'PATCH';
      const payload = { ...editForm };
      if (isEditing !== 'new') delete payload.slug;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(await getSupabaseAuthHeaders()),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsEditing(null);
        setEditForm(null);
        setDraftKey(null);
        fetchServices();
        alert('저장되었습니다.');
      } else {
        const err = await res.json();
        alert(`저장 실패: ${err.error}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(await getSupabaseAuthHeaders()),
        },
        body: JSON.stringify({ is_active: !service.is_active }),
      });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: await getSupabaseAuthHeaders(),
      });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredServices = services.filter((service) => {
    const q = searchTerm.toLowerCase();
    return (service.title || '').toLowerCase().includes(q) || (service.slug || '').toLowerCase().includes(q);
  });

  const serviceUploadFolder = isEditing && isEditing !== 'new'
    ? `services/${isEditing}`
    : `services/drafts/${draftKey || 'draft'}`;

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <ServiceCaseTabs />
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">서비스/솔루션 마스터 관리</h1>
          <p className="text-zinc-700 mt-1 font-medium">상품별 상세 페이지를 블록 조립 방식으로 구성하고 즉시 미리봅니다.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
        >
          <Plus size={18} />
          신규 서비스 추가
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
        <input
          type="text"
          placeholder="서비스명 또는 슬러그 검색..."
          className="w-full pl-12 pr-4 py-3 bg-white text-zinc-900 placeholder:text-zinc-500 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          return (
            <div
              key={service.id}
              className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col gap-5 md:flex-row md:items-center md:gap-6 group hover:shadow-lg transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ backgroundColor: service.color || '#18181B' }}
              >
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                    {service.category}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                    {service.slug}
                  </span>
                  {!service.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 rounded text-red-600 uppercase">
                      비활성
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-zinc-900 leading-tight mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-zinc-700 line-clamp-1 font-medium italic">
                  {service.description || service.subtitle || '설명 없음'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 md:justify-end">
                <Icon size={18} className="hidden text-zinc-400 md:block" />
                <button
                  onClick={() => handleToggleActive(service)}
                  aria-label={`${service.title} 노출 상태 전환`}
                  className={`relative h-6 w-12 rounded-full transition-colors duration-200 focus:outline-none ${service.is_active ? 'bg-zinc-900' : 'bg-zinc-300'}`}
                >
                  <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${service.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(service)}
                    aria-label={`${service.title} 편집`}
                    className="p-2 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    aria-label={`${service.title} 삭제`}
                    className="p-2 text-zinc-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isEditing && editForm && (
        <ServiceFullScreenEditor
          mode={isEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={() => {
            setIsEditing(null);
            setEditForm(null);
          }}
          onSave={handleSave}
          landingSections={landingSections}
          sectionLibrary={sectionLibrary}
          magazines={magazines}
          landingSettings={landingSettings}
          uploadFolder={serviceUploadFolder}
        />
      )}
    </div>
  );
}
