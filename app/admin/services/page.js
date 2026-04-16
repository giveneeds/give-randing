'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Search,
  MessageSquare, Star, Cpu, MapPin,
  Layout, Target, Save, X, Image as ImageIcon,
  CheckCircle2, Zap, LayoutGrid, ListOrdered, Clock, HelpCircle, Loader2
} from 'lucide-react';
import { DUMMY_SERVICE_PRODUCTS } from '@/lib/supabase';
import MarkdownContent from '@/lib/markdownRender';
import ServiceCaseTabs from '@/components/admin/ServiceCaseTabs';

// 항목 옆에 ? 아이콘 + 마우스 호버 시 한국어 도움말 툴팁을 노출
function HelpTip({ text }) {
  return (
    <span className="relative inline-flex items-center group/tip align-middle">
      <HelpCircle
        size={14}
        className="ml-1.5 text-zinc-300 hover:text-zinc-700 cursor-help transition-colors"
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
  MessageSquare, Star, Cpu, MapPin, Layout, Target, CheckCircle2
};

// 마크다운 입력 + 실시간 프리뷰 토글 + 이미지 업로드 텍스트에어리어
function MdTextarea({ value, onChange, placeholder, rows = 4 }) {
  const [tab, setTab] = useState('write');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 현재 커서 위치에 텍스트 삽입
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
      const res = await fetch('/api/upload/magazine-image', { method: 'POST', body: fd });
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
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-900">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-100 bg-zinc-50">
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md transition-colors ${tab === 'write' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-200'}`}
          >Write</button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md transition-colors ${tab === 'preview' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-200'}`}
          >Preview</button>
          <span className="w-px h-4 bg-zinc-200 mx-1" />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            title="이미지 삽입 — 커서 위치에 마크다운 형식으로 삽입됩니다"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
            {uploading ? '업로드중' : 'Image'}
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('\n\n---\n\n')}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-md text-zinc-600 hover:bg-zinc-200 transition-colors"
            title="구분선 삽입 — 문단 사이에 얇은 가로선을 넣습니다"
          >
            — 구분선
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
        <div className="hidden sm:block text-[10px] text-zinc-400 font-medium tracking-tight">
          <span className="font-bold">**굵게**</span> · <span className="italic">*기울임*</span> · &gt; 인용 · - 불릿 · 1. 번호 · --- 구분선
        </div>
      </div>
      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-4 outline-none text-sm font-medium resize-y bg-white"
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
          {value ? (
            <MarkdownContent text={value} />
          ) : (
            <p className="text-xs text-zinc-300 font-bold">미리볼 내용이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null); // id of service being edited or 'new'
  const [editForm, setEditForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
    // 관련 매거진 드롭다운용 — 발행본만
    fetch('/api/magazines')
      .then(r => r.json())
      .then(d => setMagazines(Array.isArray(d?.magazines) ? d.magazines : []))
      .catch(() => setMagazines([]));
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services?all=true');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setServices(data);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setIsEditing(service.id);
    setEditForm({
      ...service,
      details: {
        effects: [],
        operation: '',
        process: [],
        sub_items: [],
        duration: '',
        reference_img: '',
        status: 'published',
        ...(service.details || {})
      }
    });
  };

  const handleCreateNew = () => {
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
      details: {
        effects: [{ title: '', desc: '' }],
        operation: '',
        process: [{ step: '01', name: '', desc: '' }],
        sub_items: [{ title: '', desc: '' }],
        duration: '',
        reference_img: '',
        related_magazine_slug: '',
        status: 'published'
      }
    });
  };

  const handleSave = async () => {
    try {
      const url = isEditing === 'new' ? '/api/services' : `/api/services/${isEditing}`;
      const method = isEditing === 'new' ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditing(null);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active })
      });
      if (res.ok) {
        fetchServices();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServices();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <ServiceCaseTabs />
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">서비스/솔루션 마스터 관리</h1>
          <p className="text-zinc-500 mt-1">DB 연동을 통해 16대 서비스 상품의 상세 내용을 관리합니다.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
        >
          <Plus size={18} />
          신규 서비스 추가
        </button>
      </div>

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text"
          placeholder="서비스명 또는 슬러그 검색..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 서비스 리스트 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          return (
            <div 
              key={service.id} 
              className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center gap-6 group hover:shadow-lg transition-all"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ backgroundColor: service.color }}
              >
                {index + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {service.category}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 rounded text-zinc-600">
                    {service.slug}
                  </span>
                  {!service.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 rounded text-red-500 uppercase">
                      비활성
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-zinc-900 leading-none mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-1 font-medium italic">
                  {service.description || service.subtitle || '설명 없음'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Active Toggle */}
                <button 
                  onClick={() => handleToggleActive(service)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
                    ${service.is_active ? 'bg-zinc-900' : 'bg-zinc-200'}
                  `}
                >
                  <div className={`
                    absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
                    ${service.is_active ? 'translate-x-6' : 'translate-x-0'}
                  `} />
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 편집 모달 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-200 flex justify-between items-center bg-white rounded-t-[2.5rem]">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase italic">
                  {isEditing === 'new' ? 'New Service' : 'Edit Service'}
                </h2>
                <p className="text-zinc-500 text-sm">{editForm.title || editForm.slug || '상품 정보를 입력하세요.'}</p>
              </div>
              <button 
                onClick={() => setIsEditing(null)}
                className="p-3 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {/* 기본 정보 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <LayoutGrid className="text-zinc-900" size={20} />
                  <h3 className="font-black text-lg uppercase italic underline decoration-zinc-200">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Title (국문 명칭)</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Slug (영문 URL용)</label>
                    <input 
                      disabled={isEditing !== 'new'}
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({...editForm, slug: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Subtitle (전문적 한줄평)</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.subtitle}
                      onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Category</label>
                    <select 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    >
                      <option value="ADS">ADS (VIRAL)</option>
                      <option value="GROWTH">GROWTH (REVIEW)</option>
                      <option value="LOCAL">LOCAL (SEO)</option>
                      <option value="TECH">TECH (CREATIVE)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-xs font-black uppercase text-zinc-400 block mb-2">Main Description (전체 설명)</label>
                  <MdTextarea
                    rows={6}
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>

              </section>

              {/* 상세 상세 정보 (JSON Details) */}
              <section className="space-y-10">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="text-zinc-900" size={20} />
                  <h3 className="font-black text-lg uppercase italic underline decoration-zinc-200 inline-flex items-center">
                    Execution Details (JSON)
                    <span className="ml-2 text-xs font-bold not-italic text-zinc-400 normal-case no-underline tracking-normal">— 실행 상세 정보</span>
                    <HelpTip text="서비스 상세 페이지에 노출될 콘텐츠를 구조화된 형식으로 입력합니다. 효과 / 운영 방식 / 진행 절차 / 예상 기간 / 참고 이미지 / 하위 상품 항목으로 구성됩니다." />
                  </h3>
                </div>

                {/* 상품 효과 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-zinc-500 inline-flex items-center">
                      01. Service Effects
                      <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 도입 효과</span>
                      <HelpTip text="이 서비스를 도입했을 때 고객이 얻을 수 있는 핵심 성과/베네핏을 항목별로 작성합니다. 예) '검색 노출 3배 증가', '체류 시간 2배 향상' 등 측정 가능하고 임팩트 있는 결과 위주로 적어주세요." />
                    </h4>
                    <button 
                      onClick={() => setEditForm({
                        ...editForm, 
                        details: { ...editForm.details, effects: [...(editForm.details.effects || []), { title: '', desc: '' }] }
                      })}
                      className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                    >+ Add Effect</button>
                  </div>
                  {(editForm.details.effects || []).map((effect, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <input
                          placeholder="효과 제목"
                          className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm"
                          value={effect.title}
                          onChange={(e) => {
                            const newEffects = [...editForm.details.effects];
                            newEffects[idx].title = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                          }}
                        />
                        <MdTextarea
                          rows={4}
                          placeholder="상세 설명"
                          value={effect.desc}
                          onChange={(e) => {
                            const newEffects = [...editForm.details.effects];
                            newEffects[idx].desc = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newEffects = editForm.details.effects.filter((_, i) => i !== idx);
                          setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                        }}
                        className="p-2 text-zinc-300 hover:text-red-500"
                      ><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                {/* 운영 방식 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase text-zinc-500 inline-flex items-center">
                    02. Operational Principle
                    <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 운영 방식 / 차별화 철학</span>
                    <HelpTip text="기브니즈가 이 서비스를 어떤 방식·철학으로 운영하는지 서술합니다. 경쟁사 대비 강점, 작업 프로세스의 디테일, 품질 관리 기준 등을 자유롭게 작성하세요. 마크다운 사용 가능." />
                  </h4>
                  <MdTextarea
                    rows={8}
                    placeholder="기브니즈만의 차별화된 운영 철학 및 방식을 입력하세요."
                    value={editForm.details.operation}
                    onChange={(e) => setEditForm({...editForm, details: {...editForm.details, operation: e.target.value}})}
                  />
                </div>

                {/* 진행 절차 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-zinc-500 inline-flex items-center">
                      03. Execution Process
                      <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 진행 절차</span>
                      <HelpTip text="프로젝트 진행 단계를 순서대로 입력합니다. 단계 번호(01, 02 …) + 절차명 + 설명으로 구성되며, 랜딩에서 타임라인 형태로 노출됩니다. 고객이 '뭐부터 어떻게 진행되는지'를 한눈에 볼 수 있도록 구체적으로 작성하세요." />
                    </h4>
                    <button 
                      onClick={() => setEditForm({
                        ...editForm, 
                        details: { ...editForm.details, process: [...(editForm.details.process || []), { step: `0${(editForm.details.process?.length || 0) + 1}`, name: '', desc: '' }] }
                      })}
                      className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                    >+ Add Step</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(editForm.details.process || []).map((proc, idx) => (
                      <div key={idx} className="p-4 bg-white border border-zinc-200 rounded-xl flex gap-3 relative group">
                        <input 
                          className="w-12 p-2 bg-zinc-100 rounded-lg text-center font-black text-xs h-fit"
                          value={proc.step}
                          onChange={(e) => {
                            const newProc = [...editForm.details.process];
                            newProc[idx].step = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                          }}
                        />
                        <div className="flex-1 space-y-2">
                          <input 
                            placeholder="절차명"
                            className="w-full p-2 border-b border-zinc-100 outline-none text-sm font-bold"
                            value={proc.name}
                            onChange={(e) => {
                              const newProc = [...editForm.details.process];
                              newProc[idx].name = e.target.value;
                              setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                            }}
                          />
                          <MdTextarea
                            rows={4}
                            placeholder="설명"
                            value={proc.desc}
                            onChange={(e) => {
                              const newProc = [...editForm.details.process];
                              newProc[idx].desc = e.target.value;
                              setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newProc = editForm.details.process.filter((_, i) => i !== idx);
                            setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 rounded-full text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        ><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 세부 항목 & 기타 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase text-zinc-500 inline-flex items-center">
                          04. Estimated Duration
                          <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 예상 소요 기간</span>
                          <HelpTip text="해당 서비스의 전체 작업 소요 기간을 입력합니다. 예) '7-14일', '약 3주', '상시 운영' 등 고객이 일정 계획을 세울 수 있도록 구체적으로 적어주세요." />
                        </h4>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-2xl">
                        <Clock size={20} className="text-zinc-400" />
                        <input 
                          placeholder="e.g. 7-14 Days"
                          className="flex-1 outline-none font-bold"
                          value={editForm.details.duration}
                          onChange={(e) => setEditForm({...editForm, details: {...editForm.details, duration: e.target.value}})}
                        />
                      </div>
                      
                      <div className="pt-4">
                        <h4 className="text-sm font-black uppercase text-zinc-500 mb-4 inline-flex items-center">
                          05. Reference Image Slot
                          <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 참고 이미지</span>
                          <HelpTip text="서비스 결과물·사례를 보여줄 대표 이미지의 URL을 입력합니다. 비워두면 이미지 영역이 노출되지 않습니다. (직접 업로드 기능은 추후 지원 예정)" />
                        </h4>
                        <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl text-white">
                          <ImageIcon size={20} className="opacity-50" />
                          <input 
                            placeholder="Image URL (Slot)"
                            className="flex-1 bg-transparent border-none outline-none text-sm italic opacity-80"
                            value={editForm.details.reference_img}
                            onChange={(e) => setEditForm({...editForm, details: {...editForm.details, reference_img: e.target.value}})}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 px-2">이미지 업로드 기능은 준비 중입니다. 현재는 URL을 직접 입력하거나 슬롯으로 활용하세요.</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase text-zinc-500 inline-flex items-center">
                          Sub Products
                          <span className="ml-2 text-[11px] font-bold normal-case text-zinc-400">— 하위 상품 / 옵션</span>
                          <HelpTip text="이 서비스에 포함된 하위 패키지·옵션 상품을 구성합니다. 예) '베이직 플랜', '프리미엄 플랜', '단건 제작 옵션' 등 고객이 선택할 수 있는 단위로 작성하세요." />
                        </h4>
                        <button 
                          onClick={() => setEditForm({
                            ...editForm, 
                            details: { ...editForm.details, sub_items: [...(editForm.details.sub_items || []), { title: '', desc: '' }] }
                          })}
                          className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                        >+ Add</button>
                      </div>
                      <div className="space-y-3">
                        {(editForm.details.sub_items || []).map((sub, idx) => (
                           <div key={idx} className="p-4 bg-white border border-zinc-200 rounded-xl relative">
                              <input 
                                placeholder="상품명"
                                className="w-full text-sm font-black mb-2 outline-none"
                                value={sub.title}
                                onChange={(e) => {
                                  const newSubs = [...editForm.details.sub_items];
                                  newSubs[idx].title = e.target.value;
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                              />
                              <MdTextarea
                                rows={4}
                                placeholder="설명"
                                value={sub.desc}
                                onChange={(e) => {
                                  const newSubs = [...editForm.details.sub_items];
                                  newSubs[idx].desc = e.target.value;
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newSubs = editForm.details.sub_items.filter((_, i) => i !== idx);
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                                className="absolute top-2 right-2 text-zinc-200 hover:text-red-500"
                              ><X size={14} /></button>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              </section>

              {/* 스타일 & 설정 */}
              <section className="bg-white p-8 rounded-3xl border border-zinc-200">
                 <h3 className="font-black text-sm uppercase italic mb-6">Visual & Logic Settings</h3>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-zinc-400">Brand Color</label>
                      <div className="flex gap-3 items-center">
                        <input type="color" className="w-10 h-10 rounded-lg cursor-pointer" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                        <input className="flex-1 text-xs font-mono p-2 bg-zinc-50 border rounded-lg" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase text-zinc-400">Order</label>
                       <input type="number" className="w-full p-2 bg-zinc-50 border rounded-lg" value={editForm.order_num} onChange={e => setEditForm({...editForm, order_num: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                       <input type="checkbox" id="is_active" className="w-5 h-5 rounded-md" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                       <label htmlFor="is_active" className="text-xs font-black uppercase text-zinc-900">Active Stage</label>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase text-zinc-400">Publish Status</label>
                       <select
                         className="w-full p-2 bg-zinc-50 border rounded-lg text-xs font-bold"
                         value={editForm.details.status || 'published'}
                         onChange={(e) => setEditForm({...editForm, details: {...editForm.details, status: e.target.value}})}
                       >
                         <option value="published">Published (정상 노출)</option>
                         <option value="coming_soon">Coming Soon (준비 중 팝업)</option>
                       </select>
                    </div>
                 </div>
              </section>

              {/* ─── 관련 매거진 연결 (최하단 배치) ─── */}
              <section className="bg-white p-8 rounded-3xl border border-zinc-200">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="text-zinc-900" size={20} />
                  <h3 className="font-black text-lg uppercase italic underline decoration-zinc-200">Related Magazine</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-5">
                  서비스 상세 페이지 하단(상담 CTA 위)에 매거진 카드 형태로 노출됩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">연결할 매거진</label>
                    <select
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.details.related_magazine_slug || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        details: { ...editForm.details, related_magazine_slug: e.target.value }
                      })}
                    >
                      <option value="">— 연결 없음 —</option>
                      {magazines.map(m => (
                        <option key={m.id} value={m.slug}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">블록 헤더 텍스트 (선택)</label>
                    <input
                      placeholder="예) 이 서비스가 더 궁금하다면 →"
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.details.related_magazine_header || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        details: { ...editForm.details, related_magazine_header: e.target.value }
                      })}
                    />
                    <p className="text-[10px] text-zinc-400 px-1">
                      비우면 기본값 “Related Magazine”
                    </p>
                  </div>
                </div>

                {/* 라이브 프리뷰 */}
                {editForm.details.related_magazine_slug && (() => {
                  const sel = magazines.find(m => m.slug === editForm.details.related_magazine_slug);
                  if (!sel) return null;
                  return (
                    <div className="mt-6">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">Preview</div>
                      <div className="flex bg-zinc-50 rounded-2xl border border-zinc-200 overflow-hidden">
                        {sel.thumbnail_url && (
                          <div className="w-32 h-24 shrink-0 bg-zinc-100 overflow-hidden">
                            <img src={sel.thumbnail_url} alt={sel.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">
                            {editForm.details.related_magazine_header || 'Related Magazine'}
                          </div>
                          <h4 className="text-sm font-black text-zinc-900 line-clamp-2 break-keep">{sel.title}</h4>
                          <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-700">
                            매거진에서 더 알아보기 ↗
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-zinc-200 flex justify-end gap-4 bg-white rounded-b-[2.5rem]">
              <button 
                onClick={() => setIsEditing(null)}
                className="px-8 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
              >취소</button>
              <button 
                onClick={handleSave}
                className="px-10 py-3 rounded-2xl font-black bg-zinc-900 text-white flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-zinc-900/10"
              >
                <Save size={18} />
                데이터 저장하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
