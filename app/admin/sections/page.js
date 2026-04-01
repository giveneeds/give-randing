'use client';
import { useState, useEffect } from 'react';
import { SECTION_TYPES, SECTION_TEMPLATES, CTA_TYPES } from '@/lib/constants';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  X,
  Layout,
  Layers,
  Settings,
  MoreVertical,
  GripVertical,
  Monitor,
  Smartphone,
  Eye,
  Type,
  ImageIcon,
  Video,
  List,
  MessageSquare,
  HelpCircle,
  FileBox,
  MousePointer2
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSections(); }, []);

  async function loadSections() {
    try {
      const res = await fetch('/api/sections?all=true');
      const data = await res.json();
      setSections((data.sections || []).sort((a, b) => a.order_index - b.order_index));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'hero': return <Layout size={20} />;
      case 'services': return <List size={20} />;
      case 'resources': return <FileBox size={20} />;
      case 'testimonials': return <MessageSquare size={20} />;
      case 'faq': return <HelpCircle size={20} />;
      case 'cta': return <MousePointer2 size={20} />;
      case 'gallery': return <ImageIcon size={20} />;
      case 'video': return <Video size={20} />;
      case 'text': return <Type size={20} />;
      case 'products': return <Layers size={20} />;
      default: return <Settings size={20} />;
    }
  };

  async function handleAddSection(type) {
    setSaving(true);
    const template = SECTION_TEMPLATES[type];
    const newSection = {
      type,
      title: SECTION_TYPES[type]?.label || '새 섹션',
      subtitle: '',
      content: template,
      order_index: sections.length,
      is_active: true,
    };
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      });
      const data = await res.json();
      setSections([...sections, data.section]);
      setShowAddModal(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleUpdateSection(section) {
    setSaving(true);
    try {
      await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section),
      });
      setSections(sections.map(s => s.id === section.id ? section : s));
      setEditingSection(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDeleteSection(id) {
    if (!confirm('이 섹션을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
      setSections(sections.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  }

  async function handleToggleActive(section) {
    const updated = { ...section, is_active: !section.is_active };
    await handleUpdateSection(updated);
  }

  async function handleMoveSection(index, direction) {
    const newSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    newSections.forEach((s, i) => { s.order_index = i; });
    setSections(newSections);

    await Promise.all([
      fetch('/api/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSections[index]) }),
      fetch('/api/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSections[targetIndex]) }),
    ]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">섹션 데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">글로벌 섹션 관리</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">모든 캠페인(LP)에서 공통으로 재사용할 수 있는 핵심 블록들을 관리하세요.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="flex items-center justify-center gap-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white px-5 py-2.5 rounded-md font-bold text-sm transition-all shadow-sm tracking-widest uppercase"
        >
          <Plus size={18} /> 새 섹션 추가
        </button>
      </div>

      {/* Section List */}
      <div className="space-y-4">
        {sections.length > 0 ? (
          sections.map((section, i) => (
            <div key={section.id} className={clsx(
              "group bg-white rounded-md border transition-all duration-300 flex items-center p-4 gap-6 shadow-sm",
              section.is_active ? "border-[var(--admin-border)] hover:border-zinc-400" : "border-zinc-200 opacity-60"
            )}>
              {/* Reordering */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleMoveSection(i, -1)} 
                  disabled={i === 0}
                  className="p-1 hover:bg-indigo-50 rounded-md text-indigo-400 disabled:opacity-20"
                >
                  <ChevronUp size={16} />
                </button>
                <div className="h-px bg-gray-100 w-full" />
                <button 
                  onClick={() => handleMoveSection(i, 1)} 
                  disabled={i === sections.length - 1}
                  className="p-1 hover:bg-indigo-50 rounded-md text-indigo-400 disabled:opacity-20"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Icon & Info */}
              <div className={clsx(
                "w-12 h-12 flex items-center justify-center rounded-md border",
                section.is_active ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-400 border-zinc-200"
              )}>
                {getIcon(section.type)}
              </div>

              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <h3 className="font-bold text-base text-[var(--admin-text-main)] transition-colors">
                      {section.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{section.type}</span>
                      <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                      <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">
                        {SECTION_TYPES[section.type]?.label}
                      </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <span className={clsx(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                        section.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                      )}>
                        {section.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-gray-100 pl-6">
                    <button 
                      onClick={() => handleToggleActive(section)}
                      className={clsx(
                        "p-2.5 rounded-xl transition-all",
                        section.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50"
                      )}
                      title={section.is_active ? "비활성화" : "활성화"}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button 
                      onClick={() => setEditingSection({ ...section })}
                      className="p-2.5 hover:bg-indigo-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-all font-bold text-xs flex items-center gap-1"
                    >
                      <Edit3 size={18} /> <span>편집</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-2.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-[32px] border border-dashed border-[var(--admin-border)]">
            <p className="text-[var(--admin-text-muted)] text-sm italic">추가된 글로벌 섹션이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
           <div className="bg-white w-full max-w-4xl max-h-[85vh] flex flex-col rounded-md overflow-hidden shadow-2xl border border-white/20">
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">새 섹션 추가</h2>
                  <p className="text-xs text-zinc-500 mt-1 tracking-tight">캠페인에서 자유롭게 사용할 섹션 템플릿을 선택하세요.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-200 rounded-md">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(SECTION_TYPES).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => handleAddSection(key)}
                    disabled={saving}
                    className="p-6 bg-zinc-50 rounded-md border border-zinc-200 text-left hover:border-zinc-500 hover:bg-white transition-all group shadow-sm"
                  >
                    <div className="w-10 h-10 bg-white rounded-md border border-zinc-200 mb-4 flex items-center justify-center text-zinc-900 shadow-sm group-hover:scale-110 transition-transform">
                      {getIcon(key)}
                    </div>
                    <div className="font-bold text-sm text-zinc-900 tracking-tight">{type.label}</div>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium leading-relaxed">{type.description}</p>
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal (Redesigned Slide-over or centered) */}
      {editingSection && (
        <div className="fixed inset-0 bg-zinc-900/80 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ease-out border-l border-zinc-200">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-md border border-black flex items-center justify-center text-white">
                  {getIcon(editingSection.type)}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-zinc-900 tracking-tighter">{SECTION_TYPES[editingSection.type]?.label} 편집</h2>
                  <p className="text-xs text-zinc-500 font-medium tracking-tight">전역 섹션의 내용을 수정합니다.</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSection(null)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-10">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">공통 헤더 타이틀</label>
                    <input 
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all" 
                      value={editingSection.title} 
                      onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">공통 헤더 서브타이틀</label>
                    <input 
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-medium text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-zinc-600" 
                      value={editingSection.subtitle || ''} 
                      onChange={e => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                    />
                  </div>
               </div>

               <div className="pt-10 border-t border-zinc-100">
                <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest ml-1 block mb-6">섹션 전용 데이터 설정</label>
                <SectionContentEditor
                  type={editingSection.type}
                  content={editingSection.content}
                  onChange={(content) => setEditingSection({ ...editingSection, content })}
                />
               </div>
            </div>

            <div className="p-8 border-t border-zinc-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setEditingSection(null)} 
                className="px-6 py-3 border border-zinc-200 text-zinc-500 rounded-md font-bold text-sm hover:bg-zinc-50 transition-colors uppercase tracking-widest"
              >
                취소
              </button>
              <button 
                onClick={() => handleUpdateSection(editingSection)}
                disabled={saving}
                className="px-10 py-3 bg-zinc-900 hover:bg-black text-white rounded-md font-bold text-sm shadow-sm transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-widest"
              >
                <CheckCircle2 size={18} /> {saving ? '저장 중...' : '섹션 정보 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Section Content Editor (redesigned) =====
function SectionContentEditor({ type, content, onChange }) {
  const updateContent = (key, value) => { onChange({ ...content, [key]: value }); };
  const updateItemField = (index, field, value) => {
    const items = [...(content.items || [])];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...content, items });
  };
  const addItem = (template) => { onChange({ ...content, items: [...(content.items || []), template] }); };
  const removeItem = (index) => { onChange({ ...content, items: (content.items || []).filter((_, i) => i !== index) }); };

  const renderCTAButtons = (buttons = [], key = 'cta_buttons') => (
    <div className="space-y-4">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CTA 버튼 구성</label>
      <div className="space-y-3">
        {buttons.map((btn, i) => (
          <div key={i} className="flex gap-3 bg-zinc-50 p-4 rounded-md items-center border border-zinc-200">
            <input
              className="bg-white border-none text-xs font-bold rounded-md px-3 py-2 w-32 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
              value={btn.label}
              onChange={e => {
                const newBtns = [...buttons];
                newBtns[i] = { ...newBtns[i], label: e.target.value };
                updateContent(key, newBtns);
              }}
              placeholder="버튼 텍스트"
            />
            <select
              className="bg-white border-none text-[10px] font-bold rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 uppercase tracking-widest text-zinc-900 shadow-sm"
              value={btn.type}
              onChange={e => {
                const newBtns = [...buttons];
                newBtns[i] = { ...newBtns[i], type: e.target.value };
                updateContent(key, newBtns);
              }}
            >
              {Object.entries(CTA_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              className="flex-1 bg-white border-none text-xs rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 font-mono shadow-sm"
              value={btn.url || btn.value || ''}
              onChange={e => {
                const newBtns = [...buttons];
                const field = btn.type === 'phone' ? 'value' : 'url';
                newBtns[i] = { ...newBtns[i], [field]: e.target.value };
                updateContent(key, newBtns);
              }}
              placeholder={btn.type === 'phone' ? '전화번호' : 'URL (공백이면 자동 스크롤)'}
            />
            <button onClick={() => updateContent(key, buttons.filter((_, idx) => idx !== i))} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateContent(key, [...buttons, { label: '상담 신청하기', type: 'kakao', url: '' }])}
          className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-md text-[10px] font-bold text-zinc-400 hover:border-zinc-500 hover:text-zinc-900 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Plus size={14} /> 버튼 추가
        </button>
      </div>
    </div>
  );

  switch (type) {
    case 'hero':
      return (
        <div className="space-y-8">
           <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">메인 헤드라인</label>
            <textarea 
              className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none h-32" 
              value={content.headline || ''} 
              onChange={e => updateContent('headline', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">상세 설명</label>
            <textarea 
              className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all h-24" 
              value={content.description || ''} 
              onChange={e => updateContent('description', e.target.value)} 
            />
          </div>
          {renderCTAButtons(content.cta_buttons)}
        </div>
      );

    case 'services':
      return (
        <div className="space-y-6">
          {(content.items || []).map((item, i) => (
            <div key={i} className="bg-zinc-50 p-6 rounded-md border border-zinc-200 space-y-4">
               <div className="flex gap-4 items-center">
                  <input className="bg-white text-lg w-16 p-2 rounded-md text-center border-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900" value={item.icon} onChange={e => updateItemField(i, 'icon', e.target.value)} placeholder="😀" />
                  <input className="bg-white flex-1 p-3 rounded-md font-bold text-zinc-900 border-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900" value={item.title} onChange={e => updateItemField(i, 'title', e.target.value)} placeholder="서비스 제목" />
                  <button onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-white rounded-md transition-all"><Trash2 size={18} /></button>
               </div>
               <textarea className="w-full bg-white p-4 rounded-md text-xs text-zinc-600 border-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 h-24" value={item.description} onChange={e => updateItemField(i, 'description', e.target.value)} placeholder="서비스 상세 설명을 입력하세요..." />
            </div>
          ))}
           <button onClick={() => addItem({ icon: '⚡', title: '새 솔루션', description: '' })} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-md text-[10px] font-bold text-zinc-400 hover:border-zinc-600 hover:text-zinc-900 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
            <Plus size={16} /> 서비스 항목 추가
          </button>
        </div>
      );

    case 'faq':
      return (
         <div className="space-y-4">
          {(content.items || []).map((item, i) => (
            <div key={i} className="bg-zinc-50 p-5 rounded-md border border-zinc-200 space-y-3">
               <div className="flex gap-3 items-center">
                  <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-white text-[10px] font-bold">Q</div>
                  <input className="bg-white flex-1 p-3 rounded-md font-bold text-sm text-zinc-900 border-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900" value={item.question} onChange={e => updateItemField(i, 'question', e.target.value)} placeholder="질문 내용" />
                  <button onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
               </div>
               <div className="flex gap-3 items-start pl-9">
                  <textarea className="w-full bg-white p-4 rounded-md text-xs text-zinc-500 border-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 h-20" value={item.answer} onChange={e => updateItemField(i, 'answer', e.target.value)} placeholder="답변 내용..." />
               </div>
            </div>
          ))}
           <button onClick={() => addItem({ question: '', answer: '' })} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-md text-[10px] font-bold text-zinc-400 hover:border-zinc-600 hover:text-zinc-900 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
            <Plus size={16} /> FAQ 추가
          </button>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-8">
           <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">마지막 설득 문구</label>
            <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-lg outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all" value={content.headline || ''} onChange={e => updateContent('headline', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">안내 서브 텍스트</label>
            <textarea className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-sm h-20 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all" value={content.description || ''} onChange={e => updateContent('description', e.target.value)} />
          </div>
          {renderCTAButtons(content.cta_buttons)}
        </div>
      );

    case 'text':
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">마크다운 본문</label>
          <textarea
            className="w-full min-h-[500px] bg-zinc-50 border border-zinc-200 rounded-md p-8 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 font-sans text-zinc-900"
            value={content.body || ''}
            onChange={e => updateContent('body', e.target.value)}
            placeholder="# 제목\n본문 내용을 자유롭게 작성하세요..."
          />
        </div>
      );

    default:
      return <div className="p-10 border border-dashed border-zinc-200 rounded-md text-center text-xs text-zinc-500">이 섹션 타입({type})은 현재 편집기 최적화 중입니다.</div>;
  }
}
