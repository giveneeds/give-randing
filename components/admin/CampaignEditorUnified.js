'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, BarChart3, CheckCircle2, Save, Eye, Sparkles,
  ClipboardList, Zap, Layout, Monitor, Smartphone, MessageSquare, MessageCircle,
  GripVertical, Trash2, ChevronUp, ChevronDown, Plus, Image as ImageIcon,
  BookOpen, ArrowUpDown, Link2, FileText, ChevronDown as CollapseIcon,
  Archive, Send
} from 'lucide-react';
import { clsx } from 'clsx';
import AiCoachingPanel from './AiCoachingPanel';
import ResourcesManager from './ResourcesManager';
import SectionRenderer from '@/components/landing/SectionRenderer';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import LeadForm from '@/components/ui/LeadForm';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';
import MagazineList from '@/components/landing/MagazineList';
import { AVAILABLE_FIELDS, FIELD_INPUT_TYPES, DEFAULT_BASIC_FORM_FIELDS, normalizeBasicFormFields } from '@/lib/leadFormFields';

// ─────────────────────────────────────────────
// 📦 UI Sub-components
// ─────────────────────────────────────────────

function ConfigCard({ title, icon, children, accent = false, rightSlot }) {
  return (
    <div className={clsx(
      'rounded-2xl border overflow-hidden shadow-sm transition-colors',
      accent 
        ? 'border-violet-200 bg-violet-50/30' 
        : 'bg-white border-zinc-200'
    )}>
      <div className={clsx(
        'px-6 py-4 border-b flex items-center justify-between transition-colors',
        accent 
          ? 'border-violet-100 bg-violet-50/50' 
          : 'border-zinc-100 bg-zinc-50/50'
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-colors',
            accent 
              ? 'bg-white text-violet-500 border border-violet-100' 
              : 'bg-white text-zinc-500 border border-zinc-200'
          )}>
            {icon}
          </div>
          <h3 className={clsx('text-[11px] font-black uppercase tracking-[0.25em] transition-colors',
            accent ? 'text-violet-700' : 'text-zinc-900'
          )}>{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ on, onToggle, icon, title, desc, color = 'zinc' }) {
  const styles = {
    zinc: { 
      on: 'bg-zinc-900 border-zinc-900 text-white shadow-md', 
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 shadow-sm' 
    },
    blue: { 
      on: 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100', 
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-blue-300 shadow-sm' 
    },
    violet: { 
      on: 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-100', 
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-violet-300 shadow-sm' 
    },
    teal: { 
      on: 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100', 
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-teal-300 shadow-sm' 
    },
  };
  const s = styles[color];
  return (
    <button onClick={onToggle} className={clsx('w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all text-left group', on ? s.on : s.off)}>
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-sm', on ? 'bg-white/20' : 'bg-zinc-100')}>
        <span className={on ? 'text-white' : 'text-zinc-400'}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-widest">{title}</p>
        {desc && <p className={clsx('text-[10px] mt-0.5 leading-snug font-bold', on ? 'opacity-75' : 'opacity-40')}>{desc}</p>}
      </div>
      <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
        on ? 'border-white bg-white/30' : 'border-zinc-300'
      )}>
        {on && <CheckCircle2 size={12} className="text-white" />}
      </div>
    </button>
  );
}

function DraggableItem({ index, type, dragState, onDragStart, onDragOver, onDrop, onDragEnd, children, className }) {
  const isDragging = dragState?.type === type && dragState?.index === index;
  const isDragOver = dragState?.overIndex === index && dragState?.type === type;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(type, index); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(type, index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(type, index); }}
      onDragEnd={onDragEnd}
      className={clsx(
        'transition-all',
        isDragging ? 'opacity-30 scale-95' : 'opacity-100',
        isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl' : '',
        className
      )}
    >
      {children}
    </div>
  );
}

function BasicFormFieldsEditor({ value, onChange }) {
  // value: 캠페인.hero_content.basic_form_fields 의 raw 배열
  const fields = Array.isArray(value) && value.length > 0
    ? value
    : DEFAULT_BASIC_FORM_FIELDS.map((f) => ({ ...f })); // 첫 진입 시 레거시 기본값 미러링

  const updateAt = (idx, patch) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };
  const removeAt = (idx) => {
    onChange(fields.filter((_, i) => i !== idx));
  };
  const moveAt = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const addField = (id) => {
    const meta = AVAILABLE_FIELDS[id];
    if (!meta) return;
    onChange([
      ...fields,
      {
        id,
        inputType: meta.inputTypes[0],
        required: meta.mandatoryRequired || false,
        options: meta.defaultOptions ? meta.defaultOptions.map((o) => ({ ...o })) : [],
      },
    ]);
  };

  const usedIds = new Set(fields.map((f) => f.id));
  const availableToAdd = Object.entries(AVAILABLE_FIELDS).filter(([id]) => !usedIds.has(id));

  return (
    <div className="space-y-3 pt-3 border-t border-blue-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">기본 폼 필드 설정</span>
        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{fields.length}개 활성</span>
      </div>

      <div className="space-y-2">
        {fields.map((field, idx) => {
          const meta = AVAILABLE_FIELDS[field.id];
          if (!meta) return null;
          const allowedTypes = meta.inputTypes;
          const isButton = field.inputType === 'button_select';
          const requiredLocked = !!meta.mandatoryRequired;
          return (
            <div key={`${field.id}-${idx}`} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveAt(idx, -1)} disabled={idx === 0} className="p-0.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20">
                    <ChevronUp size={12} />
                  </button>
                  <button type="button" onClick={() => moveAt(idx, 1)} disabled={idx === fields.length - 1} className="p-0.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20">
                    <ChevronDown size={12} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-black text-zinc-900">{meta.label}</div>
                  <div className="text-[9px] text-zinc-400 font-mono">id: {field.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="p-1.5 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50"
                  title="필드 제거"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">입력 방식</label>
                  <div className="flex gap-1">
                    {allowedTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateAt(idx, { inputType: t })}
                        className={clsx(
                          'flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all border',
                          field.inputType === t
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        {FIELD_INPUT_TYPES[t].icon} {FIELD_INPUT_TYPES[t].label}
                      </button>
                    ))}
                    {allowedTypes.length === 1 && (
                      <span className="text-[9px] text-zinc-400 self-center px-1">고정</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">필수 여부</label>
                  <button
                    type="button"
                    disabled={requiredLocked}
                    onClick={() => updateAt(idx, { required: !field.required })}
                    className={clsx(
                      'w-full px-2 py-1.5 rounded-md text-[10px] font-bold transition-all border',
                      field.required
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400',
                      requiredLocked && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {field.required ? '필수' : '선택'}{requiredLocked && ' · 고정'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">라벨 (선택 — 비우면 기본값)</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
                  value={field.label || ''}
                  placeholder={meta.label}
                  onChange={(e) => updateAt(idx, { label: e.target.value })}
                />
              </div>

              {!isButton && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">플레이스홀더</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={field.placeholder || ''}
                    placeholder={meta.placeholder}
                    onChange={(e) => updateAt(idx, { placeholder: e.target.value })}
                  />
                </div>
              )}

              {isButton && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">버튼 옵션</label>
                    <button
                      type="button"
                      onClick={() => updateAt(idx, { options: [...(field.options || []), { value: `opt_${Date.now()}`, label: '새 옵션' }] })}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      + 옵션 추가
                    </button>
                  </div>
                  {(field.options || []).length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic">옵션이 없습니다. 추가하세요.</p>
                  ) : (
                    <div className="space-y-1">
                      {(field.options || []).map((opt, oi) => (
                        <div key={oi} className="flex gap-1.5">
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] outline-none"
                            placeholder="버튼 라벨"
                            value={opt.label}
                            onChange={(e) => {
                              const opts = [...field.options];
                              opts[oi] = { ...opts[oi], label: e.target.value };
                              updateAt(idx, { options: opts });
                            }}
                          />
                          <input
                            type="text"
                            className="w-24 px-2 py-1 bg-white border border-zinc-200 rounded-md text-[10px] font-mono outline-none"
                            placeholder="value"
                            value={opt.value}
                            onChange={(e) => {
                              const opts = [...field.options];
                              opts[oi] = { ...opts[oi], value: e.target.value };
                              updateAt(idx, { options: opts });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateAt(idx, { options: field.options.filter((_, i) => i !== oi) })}
                            className="p-1 rounded-md text-zinc-300 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">필드 추가</label>
          <div className="flex flex-wrap gap-1.5">
            {availableToAdd.map(([id, meta]) => (
              <button
                key={id}
                type="button"
                onClick={() => addField(id)}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 hover:border-zinc-500"
              >
                + {meta.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-zinc-400 leading-relaxed bg-zinc-50 p-2 rounded-md border border-zinc-100">
        💡 이름·전화번호 중 하나는 반드시 포함하는 것을 권장합니다. 어드민 리드 화면에서는 매핑된 컬럼(예: 예산·문의 유형)으로 자동 저장됩니다.
      </p>
    </div>
  );
}

function SectionEditor({ section, overrides = {}, onChange }) {
  const merged = { ...section, ...overrides };
  const [imgPreview, setImgPreview] = useState(merged.image_url || '');

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImgPreview(reader.result); onChange('image_url', reader.result); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-3 pt-4 border-t border-zinc-100 space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] px-1">섹션 타이틀</label>
          <input
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 placeholder:text-zinc-300"
            value={merged.title || ''}
            onChange={e => onChange('title', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] px-1">서브타이틀</label>
          <input
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 placeholder:text-zinc-300"
            value={merged.subtitle || ''}
            onChange={e => onChange('subtitle', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] px-1">섹션 이미지</label>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 placeholder:text-zinc-300"
            placeholder="https://... 이미지 URL 붙여넣기"
            value={typeof imgPreview === 'string' && !imgPreview.startsWith('data:') ? imgPreview : ''}
            onChange={e => { setImgPreview(e.target.value); onChange('image_url', e.target.value); }}
          />
          <label className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 cursor-pointer transition-all shrink-0">
            <ImageIcon size={14} /> 업로드
            <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </label>
        </div>
        {imgPreview && (
          <div className="relative h-24 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
            <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
            <button onClick={() => { setImgPreview(''); onChange('image_url', ''); }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md hover:bg-red-600">
              <X size={10} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
          본문 내용 <span className="text-zinc-300 font-normal normal-case tracking-normal">JSON 구조 직접 편집 (고급)</span>
        </label>
        <textarea
          className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[80px] leading-relaxed resize-none text-zinc-900 placeholder:text-zinc-300"
          value={typeof merged.content === 'string' ? merged.content : JSON.stringify(merged.content || {}, null, 2)}
          onChange={e => {
            try { onChange('content', JSON.parse(e.target.value)); }
            catch { onChange('content', e.target.value); }
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 🏠 Main Component
// ─────────────────────────────────────────────
export default function CampaignEditorUnified({ campaign, sections, onSave, onClose }) {
  const [current, setCurrent] = useState({
    ...campaign,
    show_particle: campaign.show_particle ?? true,
    show_lead_form: campaign.show_lead_form ?? false,
    show_ai_block: campaign.show_ai_block ?? true,
    show_magazine_block: campaign.show_magazine_block ?? true,
    hero_block_order: campaign.hero_block_order ?? ['particle', 'lead_form'],
    booster_order: campaign.booster_order ?? ['ai_block', 'magazine'],
    section_overrides: campaign.section_overrides ?? {},
  });

  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewPhase, setPreviewPhase] = useState('idle'); // 'idle' | 'resource_list'
  const [activeInsight, setActiveInsight] = useState('preview');
  const [expandedSectionId, setExpandedSectionId] = useState(null);
  const [dragState, setDragState] = useState({ type: null, index: null, overIndex: null });
  const [library, setLibrary] = useState({ blocks: [] });
  const [localSections, setLocalSections] = useState(sections);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  // iframe 모바일 미리보기 — viewport 격리
  const previewIframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings?.section_library) setLibrary(data.settings.section_library);
      } catch (e) { console.error('Library load failed:', e); }
    }
    loadLibrary();
  }, []);

  // Sync localSections if parent sections change
  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  // iframe ready 시그널 수신
  useEffect(() => {
    function onMessage(event) {
      const data = event?.data;
      if (data?.type === 'campaign:preview:ready') {
        setIframeReady(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // 모바일 iframe 으로 state 동기화 (디바운스)
  const liveSectionsForPreview = useMemo(() => {
    return (current.selected_sections || []).map((id) => {
      const base = localSections.find((s) => s.id === id);
      if (!base) return null;
      return { ...base, ...(current.section_overrides?.[id] || {}) };
    }).filter(Boolean);
  }, [current.selected_sections, current.section_overrides, localSections]);

  useEffect(() => {
    if (previewMode !== 'mobile') return;
    if (!iframeReady) return;
    const target = previewIframeRef.current?.contentWindow;
    if (!target) return;
    const handle = setTimeout(() => {
      try {
        target.postMessage({
          type: 'campaign:preview',
          payload: {
            campaign: current,
            sections: liveSectionsForPreview,
            forcePhase: previewPhase === 'idle' ? undefined : previewPhase,
          },
        }, '*');
      } catch (e) {
        console.warn('preview postMessage failed:', e);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [previewMode, iframeReady, current, liveSectionsForPreview, previewPhase]);

  // ── helpers (Using functional updates for stability)
  const set = (patch) => setCurrent(p => ({ ...p, ...patch }));
  const setHero = (patch) => setCurrent(p => ({ 
    ...p, 
    hero_content: { ...(p.hero_content || {}), ...patch } 
  }));

  // ── DnD handlers
  const onDragStart = (type, index) => setDragState({ type, index, overIndex: null });
  const onDragOver = (type, index) => setDragState(p => ({ ...p, overIndex: index }));
  const onDragEnd = () => setDragState({ type: null, index: null, overIndex: null });

  const reorder = (arr, from, to) => {
    const next = [...arr];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return next;
  };

  const onDrop = (type, targetIndex) => {
    const { index: fromIndex } = dragState;
    if (fromIndex === null || fromIndex === targetIndex) { onDragEnd(); return; }
    if (type === 'section') set({ selected_sections: reorder(current.selected_sections || [], fromIndex, targetIndex) });
    if (type === 'hero') set({ hero_block_order: reorder(current.hero_block_order, fromIndex, targetIndex) });
    if (type === 'booster') set({ booster_order: reorder(current.booster_order, fromIndex, targetIndex) });
    onDragEnd();
  };

  const moveItem = (arr, idx, dir) => reorder(arr, idx, Math.max(0, Math.min(arr.length - 1, idx + dir)));

  const updateSectionOverride = (id, key, val) =>
    setCurrent(p => ({ 
      ...p, 
      section_overrides: { 
        ...p.section_overrides, 
        [id]: { ...(p.section_overrides?.[id] || {}), [key]: val } 
      } 
    }));


  const handleCreateFromLibrary = async (master) => {
    setIsLibraryLoading(true);
    try {
      const newSection = {
        type: master.type,
        title: master.name,
        subtitle: master.subtitle || '',
        content: master.content,
        order_index: localSections.length,
        is_active: true,
      };
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      });
      const { section } = await res.json();
      
      // Update local state to show it immediately
      setLocalSections([...localSections, section]);
      set({ selected_sections: [...(current.selected_sections || []), section.id] });
      setExpandedSectionId(section.id);
    } catch (e) {
      console.error('Failed to create section from library:', e);
      alert('라이브러리 블록 생성에 실패했습니다.');
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const liveSections = (current.selected_sections || []).map(id => {
    const base = localSections.find(s => s.id === id);
    if (!base) return null;
    return { ...base, ...(current.section_overrides?.[id] || {}) };
  }).filter(Boolean);

  const particleWords = (current.hero_content?.particle_text || 'GIVENEEDS\nMARKETING').split('\n').filter(Boolean);

  const heroCfg = {
    particle: {
      key: 'show_particle',
      color: 'zinc',
      icon: <Sparkles size={16} />,
      title: 'Particle Text Backdrop',
      desc: '텍스트가 입자로 분해되는 배경 시네마틱 효과',
    },
    lead_form: {
      key: 'show_lead_form',
      color: 'blue',
      icon: <ClipboardList size={16} />,
      title: 'Lead Magnet Form',
      desc: '신청폼 카드 노출 — 리드 캡처 특화',
    },
  };

  const boosterCfg = {
    ai_block: {
      key: 'show_ai_block',
      color: 'violet',
      icon: <Sparkles size={16} />,
      title: 'AI Solution Block',
      desc: '맞춤형 AI 솔루션 섹션 삽입',
    },
    magazine: {
      key: 'show_magazine_block',
      color: 'teal',
      icon: <BookOpen size={16} />,
      title: 'Magazine Insights',
      desc: '관련 아티클 & 인사이트 매거진 섹션',
    },
  };

  return (
    <div className="fixed inset-0 bg-zinc-100 z-50 flex flex-col overflow-hidden transition-colors duration-300" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <style jsx global>{`
        .lbl { display:block; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.2em; color:#a1a1aa; margin-bottom:6px; }
        .inp { width:100%; padding:12px 14px; background:#fafafa; border:1px solid #e4e4e7; border-radius:12px; font-size:14px; outline:none; transition:box-shadow .15s; color: #09090b; }
        .inp:focus { box-shadow: 0 0 0 2px rgba(0,0,0,0.08); border-color:#71717a; }
        .scr::-webkit-scrollbar{width:4px} .scr::-webkit-scrollbar-track{background:transparent} .scr::-webkit-scrollbar-thumb{background:#e4e4e7;border-radius:10px}
      `}</style>

      <header className="h-14 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0 z-30 transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"><X size={18} /></button>
          <div className="h-4 w-px bg-zinc-200" />
          <div>
            <p className="text-sm font-black tracking-tighter uppercase text-zinc-900 flex items-center gap-2">Campaign Editor</p>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
              giveneeds.kr/landing/<span className="text-zinc-700">{current.slug || '—'}</span>
              <span className="mx-2">·</span>
              <span className={clsx(current.status === 'published' ? 'text-emerald-500' : 'text-yellow-500')}>{current.status || 'draft'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSave({ ...current, status: 'draft' })} 
            className="px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Archive size={13} /> 임시 저장
          </button>
          <button 
            onClick={() => onSave({ ...current, status: 'published' })} 
            className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Send size={13} /> 라이브 발행
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[60%] bg-zinc-50 overflow-y-auto scr border-r border-zinc-200 transition-colors">
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-8 pb-40">

            <ConfigCard title="기본 정보" icon={<Layout size={14} />}>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="lbl">캠페인 타이틀</label>
                  <input className="inp font-bold" value={current.title || ''} onChange={e => set({ title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="lbl">URL Slug</label>
                  <div className="flex items-stretch bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-500 transition-all">
                    <span className="px-3 py-3 bg-zinc-100 border-r border-zinc-200 text-[11px] font-mono font-bold text-zinc-400 flex items-center shrink-0 whitespace-nowrap">/landing/</span>
                    <input
                      className="flex-1 px-3 py-3 bg-transparent outline-none text-sm font-mono text-zinc-800"
                      value={current.slug || ''}
                      onChange={e => set({ slug: e.target.value })}
                      placeholder="slug-url"
                    />
                  </div>
                </div>
              </div>
            </ConfigCard>

            <ConfigCard title="히어로 모듈" icon={<Sparkles size={14} />}
              rightSlot={<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1"><ArrowUpDown size={10} /> 드래그로 순서 변경</span>}
            >
              <div className="space-y-3">
                {current.hero_block_order.map((blockId, idx) => {
                  const cfg = heroCfg[blockId];
                  const isOn = current[cfg.key];
                  return (
                    <DraggableItem key={blockId} index={idx} type="hero" dragState={dragState}
                      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
                    >
                      <div className={clsx('rounded-xl border-2 transition-all', isOn ? 'border-zinc-900' : 'border-zinc-200 bg-white')}>
                        <div className="flex items-center gap-2 p-1.5">
                          <div className="p-2 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing">
                            <GripVertical size={14} />
                          </div>
                          <div className="flex-1 text-sm font-bold">
                            <Toggle on={isOn} onToggle={() => set({ [cfg.key]: !current[cfg.key] })}
                              icon={cfg.icon} title={`${idx + 1}. ${cfg.title}`} desc={cfg.desc} color={cfg.color}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0 pr-1">
                            <button onClick={() => set({ hero_block_order: moveItem(current.hero_block_order, idx, -1) })} disabled={idx === 0} className="p-1 text-zinc-300 hover:text-zinc-700 disabled:opacity-20 transition-all"><ChevronUp size={14} /></button>
                            <button onClick={() => set({ hero_block_order: moveItem(current.hero_block_order, idx, 1) })} disabled={idx === current.hero_block_order.length - 1} className="p-1 text-zinc-300 hover:text-zinc-700 disabled:opacity-20 transition-all"><ChevronDown size={14} /></button>
                          </div>
                        </div>
                        {isOn && (
                          <div className="px-5 pb-4">
                            {blockId === 'particle' && (
                              <div className="ml-5 pl-5 border-l-2 border-zinc-200 hide-scrollbar space-y-3 py-1">
                                <textarea
                                  className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-zinc-900/10 outline-none leading-loose text-zinc-900 placeholder:text-zinc-300"
                                  value={current.hero_content?.particle_text || ''}
                                  placeholder={"장면 1\n장면 2\n장면 3"}
                                  onChange={e => setHero({ particle_text: e.target.value })}
                                />
                                <p className="text-[10px] text-zinc-400 leading-relaxed">💡 줄바꿈(Enter) = 한 장면. 약 3초 간격으로 전환됩니다.</p>
                              </div>
                            )}
                            {blockId === 'lead_form' && (() => {
                              const formMode = current.hero_content?.lead_form_mode || 'kakao';
                              return (
                              <div className="ml-5 pl-5 border-l-2 border-blue-100 space-y-4 py-1">
                                {/* 폼 모드 선택 */}
                                <div className="space-y-2">
                                  <label className="lbl">리드 수집 방식</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setHero({ lead_form_mode: 'kakao' })}
                                      className={clsx(
                                        'p-3 rounded-xl border-2 text-left transition-all',
                                        formMode === 'kakao'
                                          ? 'border-[#FEE500] bg-[#FFF9DB]'
                                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <MessageCircle size={13} className="text-[#191919]" />
                                        <span className="text-[11px] font-black text-zinc-900">카카오 로그인</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500 leading-snug">
                                        3초 만에 인증 → 이름·이메일·전화 자동 수집. PDF 즉시 다운로드.
                                      </p>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setHero({ lead_form_mode: 'basic' })}
                                      className={clsx(
                                        'p-3 rounded-xl border-2 text-left transition-all',
                                        formMode === 'basic'
                                          ? 'border-zinc-900 bg-zinc-50'
                                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <ClipboardList size={13} className="text-zinc-700" />
                                        <span className="text-[11px] font-black text-zinc-900">기본 폼</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500 leading-snug">
                                        이름·전화번호 직접 입력. 카카오 없이도 동작. 영업일 1일 내 연락 안내.
                                      </p>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1.5"><label className="lbl">헤드라인</label>
                                  <textarea className="inp h-20 resize-none font-bold" value={current.hero_content?.headline || ''} onChange={e => setHero({ headline: e.target.value })} />
                                </div>
                                <div className="space-y-1.5"><label className="lbl">세부 설명</label>
                                  <textarea className="inp h-24 resize-none" placeholder="선착순 100명에게만 공개되는..." value={current.hero_content?.description || ''} onChange={e => setHero({ description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5"><label className="lbl">CTA 버튼 텍스트</label><input className="inp font-bold" value={current.hero_content?.cta_label || ''} onChange={e => setHero({ cta_label: e.target.value })} /></div>
                                  <div className="space-y-1.5"><label className="lbl">폼 박스 제목</label><input className="inp font-mono text-xs" placeholder="폼 박스 안 작은 제목 (좌측 헤드라인과 별개)" value={current.hero_content?.file_name || ''} onChange={e => setHero({ file_name: e.target.value })} /></div>
                                </div>
                                {formMode === 'kakao' && (
                                  <div className="space-y-2 pt-2 border-t border-blue-100">
                                    <label className="lbl">리드 마그넷 첨부 파일 (PDF · DOCX · ZIP …)</label>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                      카카오 로그인 후 사용자에게 즉시 다운로드되는 자료입니다. 활성화된 첫 번째 항목이 자동 사용돼요.
                                    </p>
                                    <ResourcesManager parentType="campaign" parentId={current.id} />
                                  </div>
                                )}
                                {formMode === 'basic' && (
                                  <div className="pt-2 border-t border-zinc-100 space-y-3">
                                    <p className="text-[10px] text-zinc-500 leading-relaxed bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                                      💡 기본 폼은 첨부 파일을 제공하지 않습니다. 신청 데이터는 <code className="bg-white px-1 py-0.5 rounded text-zinc-700 text-[10px]">/admin/leads</code> 에서 확인하세요.
                                    </p>
                                    <BasicFormFieldsEditor
                                      value={current.hero_content?.basic_form_fields}
                                      onChange={(next) => setHero({ basic_form_fields: next })}
                                    />
                                  </div>
                                )}
                              </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </DraggableItem>
                  );
                })}
              </div>
            </ConfigCard>

            <ConfigCard title="페이지 빌더" icon={<Layout size={14} />}
              rightSlot={<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1"><ArrowUpDown size={10} /> 드래그로 순서 변경</span>}
            >
              <div className="space-y-2">
                {liveSections.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                    <p className="text-xs text-zinc-400 font-bold">아래 라이브러리에서 섹션을 추가하세요</p>
                  </div>
                ) : (
                  liveSections.map((sec, idx) => {
                    const isExpanded = expandedSectionId === sec.id;
                    return (
                      <DraggableItem key={sec.id} index={idx} type="section" dragState={dragState}
                        onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
                      >
                        <div className={clsx(
                          'border rounded-xl transition-all',
                          isExpanded ? 'border-zinc-400 bg-white shadow-md' : 'border-zinc-200 bg-white hover:border-zinc-300'
                        )}>
                          <div className="flex items-center gap-2 px-3 py-3">
                            <span className="p-1.5 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing shrink-0">
                              <GripVertical size={14} />
                            </span>
                            <div className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-black text-zinc-500">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{sec.type}</span>
                              <p className="text-sm font-bold text-zinc-800 truncate">{sec.title}</p>
                            </div>
                            <button onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                              className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                                isExpanded ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                              )}>
                              <FileText size={11} />편집
                            </button>
                            <div className="flex gap-0.5 shrink-0">
                              <button onClick={() => set({ selected_sections: moveItem(current.selected_sections || [], idx, -1) })} disabled={idx === 0} className="p-1.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20"><ChevronUp size={13} /></button>
                              <button onClick={() => set({ selected_sections: moveItem(current.selected_sections || [], idx, 1) })} disabled={idx === liveSections.length - 1} className="p-1.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20"><ChevronDown size={13} /></button>
                              <button onClick={() => set({ selected_sections: (current.selected_sections || []).filter(id => id !== sec.id) })} className="p-1.5 text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5">
                              <SectionEditor
                                section={sections.find(s => s.id === sec.id) || sec}
                                overrides={current.section_overrides?.[sec.id] || {}}
                                onChange={(key, val) => updateSectionOverride(sec.id, key, val)}
                              />
                            </div>
                          )}
                        </div>
                      </DraggableItem>
                    );
                  })
                )}
              </div>

              <div>
              <div className="space-y-8">
                {/* 1. Master Library (New) */}
                {library.blocks?.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.25em] flex items-center gap-2">
                       <Sparkles size={10} className="animate-pulse" /> 마스터 블록 라이브러리 — 즉시 복제 및 추가
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {library.blocks.map((master, idx) => (
                        <button 
                          key={`lib-${idx}`}
                          onClick={() => handleCreateFromLibrary(master)}
                          disabled={isLibraryLoading}
                          className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-left hover:border-indigo-400 hover:bg-white transition-all group shadow-sm disabled:opacity-50"
                        >
                          <div className="flex justify-between items-start mb-1.5 px-0.5">
                            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">{master.category}</span>
                            <Plus size={8} className="text-indigo-300" />
                          </div>
                          <span className="font-extrabold text-[11px] text-indigo-950 truncate block tracking-tighter leading-none">{master.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Existing Sections List */}
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <Layout size={10} /> 기존 섹션 선택
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {localSections.map(sec => {
                      const isSelected = (current.selected_sections || []).includes(sec.id);
                      return (
                        <button key={sec.id} onClick={() => {
                          if (isSelected) set({ selected_sections: (current.selected_sections || []).filter(id => id !== sec.id) });
                          else set({ selected_sections: [...(current.selected_sections || []), sec.id] });
                        }}
                          className={clsx('p-3 rounded-xl border text-left transition-all text-xs',
                            isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:shadow-sm'
                          )}>
                          <span className={clsx('text-[8px] font-black uppercase tracking-widest block mb-1', isSelected ? 'opacity-60' : 'text-zinc-400')}>{sec.type}</span>
                          <span className="font-bold truncate block">{sec.title}</span>
                          {isSelected && <CheckCircle2 size={12} className="mt-1.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              </div>
            </ConfigCard>

            <ConfigCard title="Growth Boosters" icon={<Zap size={14} />} accent
              rightSlot={<span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1"><ArrowUpDown size={10} /> 드래그로 순서 변경</span>}
            >
              <div className="space-y-3">
                {current.booster_order.map((blockId, idx) => {
                  const cfg = boosterCfg[blockId];
                  if (!cfg) return null;
                  const isOn = current[cfg.key];
                  return (
                    <DraggableItem key={blockId} index={idx} type="booster" dragState={dragState}
                      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
                    >
                      <div className={clsx('rounded-xl border-2 transition-all', isOn ? 'border-violet-300 bg-white' : 'border-zinc-200 bg-white')}>
                        <div className="flex items-center gap-2 p-1.5">
                          <div className="p-2 cursor-grab text-zinc-300 hover:text-violet-400 active:cursor-grabbing">
                            <GripVertical size={14} />
                          </div>
                          <div className="flex-1">
                            <Toggle on={isOn} onToggle={() => set({ [cfg.key]: !current[cfg.key] })}
                              icon={cfg.icon} title={`${idx + 1}. ${cfg.title}`} desc={cfg.desc} color={cfg.color}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0 pr-1">
                            <button onClick={() => set({ booster_order: moveItem(current.booster_order, idx, -1) })} disabled={idx === 0} className="p-1 text-zinc-300 hover:text-zinc-700 disabled:opacity-20"><ChevronUp size={14} /></button>
                            <button onClick={() => set({ booster_order: moveItem(current.booster_order, idx, 1) })} disabled={idx === current.booster_order.length - 1} className="p-1 text-zinc-300 hover:text-zinc-700 disabled:opacity-20"><ChevronDown size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </DraggableItem>
                  );
                })}
              </div>
            </ConfigCard>

            <ConfigCard title="첨부 자료 (다운로드)" icon={<FileText size={14} />}
              rightSlot={<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">로그인 유저에게 바로 다운로드</span>}
            >
              <ResourcesManager
                parentType="campaign"
                parentId={current.id}
                onResourceAdded={(r) => {
                  alert(`자료 "${r.title}"이(가) 추가되었습니다. 랜딩페이지 하단 "첨부 자료" 섹션에 자동 노출됩니다.`);
                }}
              />
            </ConfigCard>

            <ConfigCard title="Analytics" icon={<BarChart3 size={14} />}>
              <div>
                <label className="lbl">Google Analytics 4 ID</label>
                <input className="inp font-mono text-sm" placeholder="G-XXXXXXXX"
                  value={current.tracking_scripts?.ga_id || ''}
                  onChange={e => set({ tracking_scripts: { ...(current.tracking_scripts || {}), ga_id: e.target.value } })}
                />
              </div>
            </ConfigCard>

          </div>
        </aside>

        <section className="w-[40%] bg-white border-l border-zinc-100 flex flex-col shrink-0 overflow-hidden">
          <div className="h-12 border-b border-zinc-100 flex bg-zinc-50/50 p-1.5 gap-1 shrink-0">
            <button onClick={() => setActiveInsight('preview')}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all',
                activeInsight === 'preview' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-400 hover:text-zinc-600'
              )}>
              <Eye size={13} /> Preview
            </button>
            <button onClick={() => setActiveInsight('coaching')}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all',
                activeInsight === 'coaching' ? 'bg-white text-violet-600 shadow-sm border border-violet-100' : 'text-zinc-400 hover:text-zinc-600'
              )}>
              <MessageSquare size={13} /> AI Coaching
            </button>
          </div>

          {activeInsight === 'preview' && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
              <div className="h-10 bg-white border-b border-zinc-100 flex items-center justify-between px-4 shrink-0">
                <div className="flex gap-1.5">
                  <button onClick={() => setPreviewMode('desktop')} className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all',
                    previewMode === 'desktop' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-100'
                  )}><Monitor size={12} /> Desktop</button>
                  <button onClick={() => setPreviewMode('mobile')} className={clsx('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all',
                    previewMode === 'mobile' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-100'
                  )}><Smartphone size={12} /> Mobile</button>
                </div>
                <div className="flex items-center gap-2">
                  {previewMode === 'mobile' && (
                    <div className="flex gap-1 p-0.5 bg-zinc-100 rounded-md">
                      <button
                        onClick={() => setPreviewPhase('idle')}
                        className={clsx('px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all',
                          previewPhase === 'idle' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-700'
                        )}
                        title="폼 입력 화면"
                      >
                        폼 보기
                      </button>
                      <button
                        onClick={() => setPreviewPhase('resource_list')}
                        className={clsx('px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all',
                          previewPhase === 'resource_list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-700'
                        )}
                        title="제출 후 자료 카드 리스트 화면"
                      >
                        다운로드 화면
                      </button>
                    </div>
                  )}
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Real-time</div>
                </div>
              </div>

              <div className={clsx('flex-1 overflow-y-auto scr p-4', previewMode === 'mobile' ? 'bg-zinc-200 flex justify-center' : 'bg-zinc-100')}>
                {previewMode === 'desktop' && (
                  <div style={{ zoom: 0.45, width: '222%', minHeight: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
                    <PreviewContent current={current} liveSections={liveSections} particleWords={particleWords} />
                  </div>
                )}

                {previewMode === 'mobile' && (
                  <div
                    className="relative"
                    style={{
                      width: '390px',
                      height: '760px',
                      background: '#000',
                      borderRadius: '40px',
                      overflow: 'hidden',
                      border: '8px solid #18181b',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 80,
                        height: 20,
                        background: '#18181b',
                        borderRadius: 20,
                        zIndex: 10,
                      }}
                    />
                    {/* iframe 격리 — viewport 가 실제로 모바일 폭이 되어 md:/lg: 클래스가 모바일 분기로 빠진다 */}
                    <iframe
                      ref={previewIframeRef}
                      title="Campaign Mobile Preview"
                      src="/admin/campaigns/preview"
                      onLoad={() => setIframeReady(false)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                        background: '#fff',
                        paddingTop: 32,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeInsight === 'coaching' && (
            <div className="flex-1 overflow-y-auto scr p-6">
              <AiCoachingPanel campaign={current} onApply={() => {}} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PreviewContent({ current, liveSections, particleWords, isMobile }) {
  const heroOrder = current.hero_block_order || ['particle', 'lead_form'];

  const renderHeroBlock = (blockId) => {
    if (blockId === 'particle' && current.show_particle) {
      return (
        <section key="particle" className="relative" style={{ height: current.show_lead_form ? '55vh' : '90vh', minHeight: 320 }}>
          <ParticleTextEffect words={particleWords} compact={true} />
        </section>
      );
    }
    if (blockId === 'lead_form' && current.show_lead_form) {
      const previewFormMode = current.hero_content?.lead_form_mode || 'kakao';
      // 모바일 프리뷰: 반응형 클래스 없이 고정 레이아웃
      if (isMobile) {
        const ctaText = current.hero_content?.cta_label
          || (previewFormMode === 'kakao' ? '카카오로 3초 만에 시작하기' : '무료 상담 신청하기');
        return (
          <section key="lead_form" style={{ borderTop: '1px solid #f4f4f5', background: '#fff', padding: '2rem 1.25rem', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                {current.hero_content?.file_name || '폼 박스 제목'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#71717a', lineHeight: 1.6 }}>
                {current.hero_content?.description || (previewFormMode === 'kakao' ? '전략 리포트를 받기 위해 정보를 입력하세요.' : '정보를 남기시면 영업일 1일 내 연락드립니다.')}
              </p>
            </div>
            {previewFormMode === 'basic' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <input readOnly placeholder="이름" style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e4e4e7', borderRadius: '0.625rem', fontSize: '0.875rem', background: '#fafafa', boxSizing: 'border-box' }} />
                <input readOnly placeholder="010-1234-5678" style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e4e4e7', borderRadius: '0.625rem', fontSize: '0.875rem', background: '#fafafa', boxSizing: 'border-box' }} />
                <input readOnly placeholder="이메일 (선택)" style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e4e4e7', borderRadius: '0.625rem', fontSize: '0.875rem', background: '#fafafa', boxSizing: 'border-box' }} />
                <button style={{ width: '100%', padding: '0.875rem', background: '#18181b', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 900, fontSize: '0.875rem', cursor: 'default' }}>
                  {ctaText}
                </button>
              </div>
            ) : (
              <button style={{ width: '100%', padding: '0.875rem', background: '#FEE500', border: 'none', borderRadius: '0.625rem', fontWeight: 900, fontSize: '0.875rem', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                💬 {ctaText}
              </button>
            )}
          </section>
        );
      }
      return (
        <section key="lead_form" className="border-t border-zinc-100 bg-white overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-6 px-8 py-16 max-w-5xl mx-auto w-full">
            <div className="flex-1">
              <h1 className="text-3xl font-black tracking-tighter leading-tight mb-3 whitespace-pre-line">{current.hero_content?.headline || '헤드라인'}</h1>
              <p className="text-base text-zinc-500">{current.hero_content?.description || ''}</p>
            </div>
            <div className="flex-1 w-full max-w-sm">
              <LeadForm title={current.hero_content?.file_name} ctaLabel={current.hero_content?.cta_label} campaignId="preview" formMode={previewFormMode} basicFormFields={current.hero_content?.basic_form_fields} />
            </div>
          </div>
        </section>
      );
    }
    return null;
  };

  const boosterOrder = current.booster_order || ['ai_block', 'magazine'];
  const renderBooster = (blockId) => {
    if (blockId === 'ai_block' && current.show_ai_block) {
      return <div key="ai" className="py-12 px-6"><AiSolutionBlock /></div>;
    }
    if (blockId === 'magazine' && current.show_magazine_block) {
      return <div key="magazine" className="py-16 px-6 border-t border-zinc-100"><MagazineList title="관련 서비스 인사이트" subtitle="성공적인 비즈니스를 위한 데이터 마케팅 매거진" /></div>;
    }
    return null;
  };

  return (
    <div className="lp-container">
      {heroOrder.map(renderHeroBlock)}

      <div className="py-16 space-y-20 px-2">
        {liveSections.map(sec => (
          <div key={sec.id} className="relative">
            <SectionRenderer {...sec} />
          </div>
        ))}
        {liveSections.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50">
            <p className="text-sm text-zinc-400">조립된 섹션이 없습니다</p>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100">
        {boosterOrder.map(renderBooster)}
      </div>
    </div>
  );
}
