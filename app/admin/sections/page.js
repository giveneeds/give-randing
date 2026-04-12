'use client';
import { useState, useEffect } from 'react';
import SectionRenderer from '@/components/landing/SectionRenderer';
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
  MousePointer2,
  Save,
  BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop or mobile
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  const [library, setLibrary] = useState({ blocks: [] });

  useEffect(() => { 
    loadSections(); 
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings?.section_library) {
        setLibrary(data.settings.section_library);
      }
    } catch (e) { console.error('Library load failed:', e); }
  }

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
      case 'magazine': return <BookOpen size={20} />;
      default: return <Settings size={20} />;
    }
  };

  async function handleAddSection(type, masterData = null) {
    setSaving(true);
    const template = masterData?.content || SECTION_TEMPLATES[type] || {};
    const newSection = {
      type,
      title: masterData?.name || SECTION_TYPES[type]?.label || '새 섹션',
      subtitle: masterData?.subtitle || '',
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

  function handleMoveSection(index, direction) {
    const newSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    newSections.forEach((s, i) => { s.order_index = i; });
    setSections(newSections);
    setIsOrderDirty(true);
  }

  async function handleSaveOrder() {
    setSaving(true);
    try {
      // 순차 업데이트를 통해 Race Condition 이슈 방지
      for (const s of sections) {
        await fetch('/api/sections', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id: s.id, order_index: s.order_index }) 
        });
      }
      setIsOrderDirty(false);
      alert('섹션 순서 배치가 성공적으로 저장되었습니다!');
      
      // Iframe 프리뷰 새로고침 유도를 위해 강제 업데이트
      setSections([...sections]); 
    } catch (e) {
      console.error(e);
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">섹션 데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── 상단 헤더 바 ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">홈 섹션 관리</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">왼쪽에서 섹션 순서를 변경하고 저장하면, 오른쪽 프리뷰에서 실제 홈페이지 흐름을 확인하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          {isOrderDirty && (
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm tracking-widest uppercase"
            >
              <Save size={16} /> {saving ? '저장 중...' : '순서 저장 & 적용'}
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm tracking-widest uppercase"
          >
            <Plus size={16} /> 새 섹션 추가
          </button>
        </div>
      </div>

      {/* ── 좌우 분할 메인 뷰 ── */}
      <div className="flex gap-6" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>

        {/* ── 왼쪽: 섹션 순서 관리 리스트 ── */}
        <div className="w-[400px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">

          {/* 안내 메시지 */}
          {isOrderDirty && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              순서가 변경되었습니다. 상단 [순서 저장 & 적용] 버튼을 눌러야 홈페이지에 반영됩니다.
            </div>
          )}

          {/* 고정: 시네마틱 헤더 */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-3 px-3 py-3 opacity-60 cursor-not-allowed shrink-0">
            <div className="flex flex-col gap-0.5 opacity-30">
              <button disabled className="p-1 rounded"><ChevronUp size={14} /></button>
              <button disabled className="p-1 rounded"><ChevronDown size={14} /></button>
            </div>
            <div className="w-8 h-8 bg-zinc-900 text-white rounded-md flex items-center justify-center shrink-0">
              <Layout size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-zinc-700 truncate">시네마틱 헤더</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">FIXED · 수정 불가</div>
            </div>
            <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">고정</span>
          </div>

          {/* 동적 섹션 리스트 */}
          {sections.map((section, i) => (
            <div
              key={section.id}
              className={clsx(
                'rounded-lg border flex items-center gap-3 px-3 py-3 transition-all',
                section.is_active
                  ? 'bg-white border-zinc-200 hover:border-zinc-400 shadow-sm'
                  : 'bg-zinc-50 border-zinc-100 opacity-50'
              )}
            >
              {/* 순서 변경 버튼: 항상 보임 */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveSection(i, -1)}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-indigo-50 text-indigo-400 disabled:opacity-15 disabled:cursor-not-allowed transition-all"
                  title="위로 이동"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => handleMoveSection(i, 1)}
                  disabled={i === sections.length - 1}
                  className="p-1 rounded hover:bg-indigo-50 text-indigo-400 disabled:opacity-15 disabled:cursor-not-allowed transition-all"
                  title="아래로 이동"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* 순서 번호 */}
              <div className="w-5 text-center text-[10px] font-black text-zinc-300 shrink-0">
                {i + 1}
              </div>

              {/* 섹션 아이콘 */}
              <div className={clsx(
                'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                section.is_active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
              )}>
                {getIcon(section.type)}
              </div>

              {/* 섹션 정보 */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-900 truncate">{section.title}</div>
                <div className="text-[9px] text-zinc-400 uppercase tracking-widest">{section.type}</div>
              </div>

              {/* 활성/비활성 + 편집 버튼 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(section)}
                  className={clsx(
                    'p-1.5 rounded transition-all',
                    section.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-100'
                  )}
                  title={section.is_active ? '비활성화' : '활성화'}
                >
                  <CheckCircle2 size={14} />
                </button>
                <button
                  onClick={() => setEditingSection({ ...section })}
                  className="p-1.5 rounded text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title="내용 편집"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div className="py-16 text-center border border-dashed border-zinc-200 rounded-xl flex flex-col items-center gap-3">
              <p className="text-zinc-400 text-xs">섹션이 없습니다. 우측 상단에서 추가하세요.</p>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 전체 홈페이지 라이브 프리뷰 ── */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border-[10px] border-zinc-900 shadow-2xl bg-zinc-100">
          {/* 상단 브라우저 바 */}
          <div className="bg-zinc-900 px-4 py-2 flex items-center gap-3 shrink-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-zinc-800 rounded-md px-3 py-1 text-[10px] text-zinc-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              giveneeds.kr · 홈페이지 전체 흐름 미리보기
            </div>
            <button
              onClick={() => {
                const iframe = document.getElementById('home-preview-iframe');
                if (iframe) iframe.contentWindow.location.reload();
              }}
              className="text-zinc-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-zinc-700"
              title="프리뷰 새로고침"
            >
              ↺ 새로고침
            </button>
          </div>
          {/* iframe */}
          <iframe
            id="home-preview-iframe"
            src="/"
            className="w-full flex-1 border-none bg-white"
            key={saving ? 'refreshed' : 'static'}
          />
        </div>

      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
           <div className="bg-white w-full max-w-4xl max-h-[85vh] flex flex-col rounded-md overflow-hidden shadow-2xl border border-white/20">
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">새 섹션 추가</h2>
                  <p className="text-xs text-zinc-500 mt-1 tracking-tight">마스터 라이브러리에서 검증된 템플릿을 가져오거나 기본 섹션을 추가하세요.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-200 rounded-md">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* 1. Master Library Sections */}
                {library.blocks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-6 ml-2">
                      <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                      <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">마스터 라이브러리 (추천)</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {library.blocks.map((master, idx) => (
                        <button
                          key={`master-${idx}`}
                          onClick={() => handleAddSection(master.type, master)}
                          disabled={saving}
                          className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-left hover:border-indigo-400 hover:bg-white transition-all group shadow-sm flex flex-col justify-between h-full"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-9 h-9 bg-white rounded-lg border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                              {getIcon(master.type)}
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 bg-white px-2 py-0.5 rounded-full border border-indigo-50 uppercase">{master.category}</span>
                          </div>
                          <div>
                            <div className="font-black text-xs text-indigo-950 tracking-tight">{master.name}</div>
                            <p className="text-[10px] text-indigo-400 mt-1 font-medium leading-relaxed italic">원본 템플릿 복제</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Basic Sections */}
                <div>
                  <div className="flex items-center gap-2 mb-6 ml-2">
                    <div className="w-1.5 h-6 bg-zinc-300 rounded-full"></div>
                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">기본 섹션</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(SECTION_TYPES).map(([key, type]) => (
                      <button
                        key={key}
                        onClick={() => handleAddSection(key)}
                        disabled={saving}
                        className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-left hover:border-zinc-500 hover:bg-white transition-all group shadow-sm flex flex-col justify-between h-full"
                      >
                        <div className="w-9 h-9 bg-white rounded-lg border border-zinc-200 mb-4 flex items-center justify-center text-zinc-900 shadow-sm group-hover:scale-110 transition-transform">
                          {getIcon(key)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-zinc-900 tracking-tight">{type.label}</div>
                          <p className="text-[10px] text-zinc-400 mt-1 font-medium leading-relaxed">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal (Redesigned Split-Screen with Live Preview) */}
      {editingSection && (
        <div className="fixed inset-0 bg-zinc-900/95 flex z-50 animate-in fade-in duration-300 overflow-hidden">
          
          {/* Left Side: Live Preview (Hidden on small screens) */}
          <div className="flex-1 h-full overflow-y-auto hidden lg:flex flex-col relative bg-zinc-100 items-center">
             <div className="w-full p-3 bg-zinc-900 text-zinc-400 text-[10px] font-bold tracking-widest uppercase flex justify-between items-center z-10 shadow-md shrink-0">
                <span className="flex items-center gap-2"><Eye size={14} className="text-emerald-400"/> 실시간 라이브 프리뷰</span>
                <div className="flex bg-zinc-800 rounded-md p-1 border border-zinc-700">
                  <button 
                    onClick={() => setPreviewMode('desktop')}
                    className={clsx("p-1.5 rounded transition-all", previewMode === 'desktop' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    <Monitor size={14} />
                  </button>
                  <button 
                    onClick={() => setPreviewMode('mobile')}
                    className={clsx("p-1.5 rounded transition-all", previewMode === 'mobile' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
                <span className="text-zinc-500 font-mono bg-zinc-800 px-2 py-1 rounded-sm border border-zinc-700">/randing</span>
             </div>
             <div className={clsx(
               "flex-1 overflow-y-auto shadow-2xl bg-white transition-all duration-500 border-x border-zinc-200 mx-auto",
               previewMode === 'mobile' ? "max-w-[375px] my-8 rounded-[40px] border-[12px] border-zinc-900 h-[700px] shrink-0" : "w-full max-w-screen-xl"
             )}>
               <div className="pointer-events-none">
                 {/* Reusing the exact SectionRenderer used in Landing Page */}
                 <SectionRenderer 
                    type={editingSection.type}
                    title={editingSection.title}
                    subtitle={editingSection.subtitle}
                    content={editingSection.content}
                    settings={{}} 
                 />
               </div>
             </div>
          </div>

          {/* Right Side: Editor Panel */}
          <div className="bg-white w-full lg:w-[500px] xl:w-[600px] shrink-0 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ease-out border-l border-zinc-200 z-20">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-900 rounded-md shadow-sm border border-black flex items-center justify-center text-white shrink-0">
                  {getIcon(editingSection.type)}
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase text-zinc-900 tracking-tighter">{SECTION_TYPES[editingSection.type]?.label} 편집</h2>
                </div>
              </div>
              <button 
                onClick={() => setEditingSection(null)} 
                className="p-2 hover:bg-zinc-200 rounded-md transition-colors text-zinc-400 hover:text-zinc-900 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative">
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

            <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-white shrink-0">
              <button 
                onClick={() => setEditingSection(null)} 
                className="px-6 py-3 border border-zinc-200 text-zinc-500 rounded-md font-bold text-sm hover:bg-zinc-50 transition-colors uppercase tracking-widest"
              >
                취소
              </button>
              <button 
                onClick={() => handleUpdateSection(editingSection)}
                disabled={saving}
                className="px-8 py-3 bg-zinc-900 hover:bg-black text-white rounded-md font-bold text-sm shadow-sm transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-widest"
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
      const words = content.words || ["안녕하세요.", "당신을 위한", "모든 마케팅을", "제공\n하겠습니다.", "GIVENEEDS\n입니다."];
      return (
        <div className="space-y-8">
           <div className="space-y-4">
            <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest ml-1">파티클 애니메이션 텍스트 블록</label>
            <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed ml-1">
              * 각 인풋창은 화면에 한 번에 그려질 텍스트 한 장면을 의미합니다.<br/>
              * 입력한 텍스트가 파티클로 변환되어 화면 중앙에 역동적으로 나타납니다.
            </p>
            <div className="space-y-2">
              {words.map((word, i) => (
                <div key={i} className="flex gap-2 items-center bg-zinc-50 p-3 rounded-md border border-zinc-200">
                  <span className="text-zinc-400 font-bold text-xs w-6 text-center">{i + 1}</span>
                  <input 
                    className="flex-1 p-2 bg-white border border-zinc-200 rounded-md font-bold text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm" 
                    value={word.replace('\n', ' ')} // 어드민 창에서는 수정하기 편하게 한 줄로 보임
                    placeholder="파티클 텍스트 입력..."
                    onChange={e => {
                      const rawText = e.target.value.trimStart();
                      const newWords = [...words];
                      newWords[i] = rawText;
                      updateContent('words', newWords);
                    }} 
                  />
                  <button onClick={() => {
                    const newWords = [...words];
                    newWords.splice(i, 1);
                    updateContent('words', newWords);
                  }} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 rounded-md transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => updateContent('words', [...words, '새 문장'])}
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-md text-[10px] font-bold text-zinc-400 hover:border-zinc-500 hover:text-zinc-900 transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-2"
            >
              <Plus size={14} /> 텍스트 씬 추가
            </button>
          </div>

           <div className="space-y-2 pt-6 border-t border-zinc-100">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">하단 서브 헤드라인 (파티클 클릭 시 이동할 타겟용)</label>
            <textarea 
              className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none h-32" 
              value={content.headline || ''} 
              onChange={e => updateContent('headline', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">하단 상세 설명</label>
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
    
    case 'hook':
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">상단 도입 문구</label>
            <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-lg" value={content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">핵심 강조 단어 (파란색 포인트)</label>
            <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-black text-2xl text-indigo-600" value={content.highlight || ''} onChange={e => updateContent('highlight', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">강조 단어 뒤 접미 문구 (예: 이 아닙니다.)</label>
            <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-lg" value={content.suffix || ''} onChange={e => updateContent('suffix', e.target.value)} placeholder="이 아닙니다." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">하단 마무리 문구</label>
            <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-lg" value={content.footer || ''} onChange={e => updateContent('footer', e.target.value)} />
          </div>
        </div>
      );

    case 'stats':
      return (
        <div className="space-y-6">
          {(content.items || []).map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200 items-center">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 ml-1">지표 라벨</label>
                <input className="w-full p-2 bg-white rounded border border-zinc-100 text-xs font-bold" value={item.label} onChange={e => updateItemField(i, 'label', e.target.value)} />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 ml-1">지표 값 (예: 500+, 92%)</label>
                <input className="w-full p-2 bg-white rounded border border-zinc-100 text-xs font-black text-indigo-600" value={item.value} onChange={e => updateItemField(i, 'value', e.target.value)} />
              </div>
              <button onClick={() => removeItem(i)} className="mt-4 p-2 text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => addItem({ label: '지표명', value: '100%' })} className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-400">지표 추가</button>
        </div>
      );

    case 'identity':
      return (
        <div className="space-y-8">
          <p className="text-[10px] text-zinc-400 bg-zinc-50 p-3 rounded italic">* 브랜드의 핵심가치 3가지를 가로로 나열합니다.</p>
          {['left', 'middle', 'right'].map(pos => (
            <div key={pos} className="p-5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-3">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{pos === 'left' ? 'GIVE' : pos === 'middle' ? 'NEEDS' : 'GIVENEEDS'} 블록</div>
              <input className="w-full p-3 bg-white rounded border border-zinc-100 font-black" value={content[pos]?.title || ''} onChange={e => updateContent(pos, { ...content[pos], title: e.target.value })} placeholder="소제목" />
              <textarea className="w-full p-3 bg-white rounded border border-zinc-100 text-xs h-20" value={content[pos]?.desc || ''} onChange={e => updateContent(pos, { ...content[pos], desc: e.target.value })} placeholder="설명..." />
            </div>
          ))}
        </div>
      );

    case 'product_detail':
      return (
        <div className="space-y-6">
          <p className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded font-bold">* 4가지 핵심 솔루션(탭 형태)을 구성합니다.</p>
          {(content.items || []).map((item, i) => (
            <div key={i} className="bg-zinc-50 p-5 rounded-lg border border-zinc-200 space-y-4">
              <div className="flex gap-3">
                <input className="flex-1 p-3 bg-white rounded font-bold border-none shadow-sm" value={item.title} onChange={e => updateItemField(i, 'title', e.target.value)} placeholder="솔루션명" />
                <input className="w-24 p-3 bg-white rounded font-mono text-[10px] border-none shadow-sm" value={item.id} onChange={e => updateItemField(i, 'id', e.target.value)} placeholder="ID(영어)" />
                <button onClick={() => removeItem(i)} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              <textarea className="w-full p-3 bg-white rounded text-xs h-20 border-none shadow-sm" value={item.desc} onChange={e => updateItemField(i, 'desc', e.target.value)} placeholder="솔루션에 대한 핵심 설명을 입력하세요..." />
            </div>
          ))}
          <button onClick={() => addItem({ id: 'new', title: '새 솔루션', desc: '' })} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-400">솔루션 탭 추가</button>
        </div>
      );

    case 'resources':
      return (
        <div className="space-y-6">
          {(content.items || []).map((item, i) => (
            <div key={i} className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 space-y-4 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
               <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-white rounded-lg border border-zinc-100 flex items-center justify-center text-emerald-600 font-black text-xs shadow-sm">PDF</div>
                  <input className="bg-white flex-1 p-3 rounded-lg font-bold text-zinc-900 border-none shadow-sm focus:ring-2 focus:ring-emerald-500/20" value={item.title} onChange={e => updateItemField(i, 'title', e.target.value)} placeholder="자료 제목 (예: 2025 전략서)" />
                  <button onClick={() => removeItem(i)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-zinc-400 ml-1">파일 URL (Supabase/S3)</label>
                   <input className="w-full bg-white p-3 rounded-lg text-[10px] font-mono border-none shadow-sm" value={item.file_url} onChange={e => updateItemField(i, 'file_url', e.target.value)} placeholder="https://..." />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-zinc-400 ml-1">설명</label>
                   <input className="w-full bg-white p-3 rounded-lg text-xs border-none shadow-sm" value={item.description} onChange={e => updateItemField(i, 'description', e.target.value)} placeholder="자료에 대한 짧은 요약..." />
                 </div>
               </div>
            </div>
          ))}
          <button onClick={() => addItem({ title: '새 자료', description: '', file_url: '', file_type: 'pdf' })} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
            <Plus size={16} /> 다운로드 자료 추가
          </button>
        </div>
      );

    case 'brand_stats': {
      const stats = content.stats || [];
      const updateStat = (i, field, val) => {
        const next = [...stats];
        next[i] = { ...next[i], [field]: field === 'value' ? Number(val) || 0 : val };
        onChange({ ...content, stats: next });
      };
      const addStat = () => onChange({
        ...content,
        stats: [...stats, { value: 100, suffix: '+', label: '새 지표', description: '설명 문구' }],
      });
      const removeStat = (i) => onChange({ ...content, stats: stats.filter((_, idx) => idx !== i) });

      return (
        <div className="space-y-8">
          <p className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded font-bold leading-relaxed">
            * 검은 배경 + shimmer 타이틀 + 카운트업 숫자 섹션입니다.<br/>
            * 상단 "공통 헤더 타이틀/서브타이틀"은 무시되고 아래 필드가 사용됩니다.
          </p>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">헤드라인 - 메인 (흰색)</label>
              <input
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-md text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                value={content.title_main || ''}
                onChange={e => updateContent('title_main', e.target.value)}
                placeholder="We are"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">헤드라인 - 강조 (shimmer 적용)</label>
              <input
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-md text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                value={content.title_dim || ''}
                onChange={e => updateContent('title_dim', e.target.value)}
                placeholder="brand marketing agency"
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest ml-1 block">카운트업 지표 구성</label>
            {stats.map((s, i) => (
              <div key={i} className="p-5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-3 relative">
                <div className="grid grid-cols-[1fr_100px_auto] gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400">목표값 (숫자)</label>
                    <input
                      type="number"
                      className="w-full p-2 bg-white rounded border border-zinc-100 text-xs font-black text-amber-600"
                      value={s.value ?? 0}
                      onChange={e => updateStat(i, 'value', e.target.value)}
                      placeholder="1024"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400">접미사</label>
                    <input
                      className="w-full p-2 bg-white rounded border border-zinc-100 text-xs font-bold"
                      value={s.suffix ?? ''}
                      onChange={e => updateStat(i, 'suffix', e.target.value)}
                      placeholder="+"
                    />
                  </div>
                  <button
                    onClick={() => removeStat(i)}
                    className="self-end p-2 text-zinc-300 hover:text-red-500 transition-colors"
                    title="지표 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400">짧은 라벨</label>
                  <input
                    className="w-full p-2 bg-white rounded border border-zinc-100 text-xs font-bold"
                    value={s.label ?? ''}
                    onChange={e => updateStat(i, 'label', e.target.value)}
                    placeholder="누적 프로젝트"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400">설명 문구</label>
                  <textarea
                    className="w-full p-2 bg-white rounded border border-zinc-100 text-xs h-16"
                    value={s.description ?? ''}
                    onChange={e => updateStat(i, 'description', e.target.value)}
                    placeholder="1024+ 누적 프로젝트를 진행하였습니다."
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addStat}
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-400 hover:border-amber-500 hover:text-amber-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus size={14} /> 지표 추가
            </button>
          </div>
        </div>
      );
    }

    case 'magazine':

    default:
      return <div className="p-10 border border-dashed border-zinc-200 rounded-md text-center text-xs text-zinc-500">이 섹션 타입({type})은 현재 편집기 최적화 중입니다.</div>;
  }
}
