'use client';
import { useState, useEffect, useRef } from 'react';
import SectionRenderer from '@/components/landing/SectionRenderer';
import { SECTION_TYPES, SECTION_TEMPLATES } from '@/lib/constants';
import { Plus, Trash2, Edit3, ChevronUp, ChevronDown, X, ImageIcon, Save, Eye, CheckCircle2, Clipboard } from 'lucide-react';

// 서비스 페이지에서 사용 가능한 섹션 타입
const SERVICE_SECTION_TYPES = ['case_studies', 'client_logos'];

export default function ServiceAdminPage() {
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pasteTargetIdx, setPasteTargetIdx] = useState(null);

  // ref로 최신 값 유지 (클로저 stale 방지)
  const pasteTargetIdxRef = useRef(null);
  const updateItemFieldRef = useRef(null);

  function selectPasteTarget(idx) {
    pasteTargetIdxRef.current = idx;
    setPasteTargetIdx(idx);
  }

  useEffect(() => { loadSections(); }, []);

  // 전역 paste 이벤트 등록 (한 번만)
  useEffect(() => {
    async function handleGlobalPaste(e) {
      const idx = pasteTargetIdxRef.current;
      if (idx === null) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) break;
          const fd = new FormData();
          fd.append('file', file);
          fd.append('folder', 'logos');
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.url && updateItemFieldRef.current) {
            updateItemFieldRef.current(idx, 'image_url', data.url);
          }
          pasteTargetIdxRef.current = null;
          setPasteTargetIdx(null);
          break;
        }
      }
    }
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, []);

  async function loadSections() {
    try {
      const res = await fetch('/api/sections?all=true&page=service');
      const data = await res.json();
      setSections((data.sections || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAdd(type) {
    setSaving(true);
    const template = SECTION_TEMPLATES[type] || {};
    const newSection = {
      type,
      title: SECTION_TYPES[type]?.label || '새 섹션',
      subtitle: '',
      content: { ...template, _page: 'service' },
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
      setSections(prev => [...prev, data.section]);
      setShowAddModal(false);
    } catch (e) { alert('추가 실패: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleSave() {
    if (!editingSection) return;
    setSaving(true);
    try {
      await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingSection, content: { ...editingSection.content, _page: 'service' } }),
      });
      setSections(prev => prev.map(s => s.id === editingSection.id ? editingSection : s));
      setEditingSection(null);
    } catch (e) { alert('저장 실패: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('이 섹션을 삭제할까요?')) return;
    await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
    setSections(prev => prev.filter(s => s.id !== id));
  }

  async function handleToggle(section) {
    const updated = { ...section, is_active: !section.is_active };
    await fetch('/api/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  function updateContent(key, val) {
    setEditingSection(prev => ({ ...prev, content: { ...prev.content, [key]: val } }));
  }

  function updateItemField(i, field, val) {
    const items = [...(editingSection.content.items || [])];
    items[i] = { ...items[i], [field]: val };
    updateContent('items', items);
  }

  // ref를 항상 최신 함수로 유지
  updateItemFieldRef.current = updateItemField;

  function addItem(defaults) {
    updateContent('items', [...(editingSection.content.items || []), defaults]);
  }

  function removeItem(i) {
    updateContent('items', (editingSection.content.items || []).filter((_, idx) => idx !== i));
  }

  async function uploadImage(i, file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'service-sections');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) updateItemField(i, 'image_url', data.url);
    else alert('업로드 실패: ' + data.error);
  }

  function renderEditor(section) {
    const { type, content } = section;

    if (type === 'case_studies') return (
      <div className="space-y-6">
        <p className="text-[10px] text-blue-600 bg-blue-50 p-3 rounded font-bold">
          * 성과 스크린샷 이미지 + 수치 캡션 카드 섹션입니다.
        </p>

        {/* 이미지 높이 조절 */}
        <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">이미지 높이</label>
            <span className="text-sm font-black text-zinc-900">{content.image_height || 480}px</span>
          </div>
          <input
            type="range"
            min={200}
            max={800}
            step={20}
            value={content.image_height || 480}
            onChange={e => updateContent('image_height', Number(e.target.value))}
            className="w-full accent-zinc-900"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
            <span>200px (작게)</span>
            <span>800px (크게)</span>
          </div>
        </div>
        {(content.items || []).map((item, i) => (
          <div key={i} className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">사례 #{i + 1}</span>
              <button onClick={() => removeItem(i)} className="p-1.5 text-zinc-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <div className="bg-zinc-900 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
              {item.image_url
                ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-zinc-600 text-xs">이미지 없음</span>}
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-900 text-white text-[10px] font-black rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors uppercase tracking-widest">
              <ImageIcon size={12} /> {item.image_url ? '이미지 교체' : '이미지 업로드'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(i, e.target.files[0])} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400">도입 문구</label>
                <input className="w-full bg-white p-2 rounded text-xs border border-zinc-100" value={item.metric_label || ''} onChange={e => updateItemField(i, 'metric_label', e.target.value)} placeholder="마케팅 4개월 만에" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400">성과 결과</label>
                <input className="w-full bg-white p-2 rounded text-xs font-bold border border-zinc-100" value={item.metric_result || ''} onChange={e => updateItemField(i, 'metric_result', e.target.value)} placeholder="병원 매출 2배 상승한" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400">업종</label>
                <input className="w-full bg-white p-2 rounded text-xs border border-zinc-100" value={item.client_type || ''} onChange={e => updateItemField(i, 'client_type', e.target.value)} placeholder="피부과" />
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => addItem({ image_url: '', metric_label: '', metric_result: '', client_type: '' })} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-400 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
          <Plus size={14} /> 성공사례 추가
        </button>
      </div>
    );

    if (type === 'client_logos') {
      const uploadLogo = async (i, file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'logos');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.url) updateItemField(i, 'image_url', data.url);
      };
      return (
        <div className="space-y-4">
          <p className="text-[10px] text-zinc-500 bg-zinc-50 p-3 rounded font-bold">
            * PNG/SVG 권장. 투명 배경 이미지가 가장 잘 보입니다.
          </p>
          {pasteTargetIdx !== null && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-[11px] font-black text-blue-600">
                #{pasteTargetIdx + 1} 카드 선택됨 — 이제 <kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">Ctrl+V</kbd> 로 붙여넣기
              </span>
              <button onClick={() => selectPasteTarget(null)} className="text-[10px] text-blue-400 hover:text-blue-600 font-bold">취소</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {(content.items || []).map((item, i) => {
              const isPasteTarget = pasteTargetIdx === i;
              return (
                <div
                  key={i}
                  className={`bg-zinc-50 rounded-xl border overflow-hidden relative transition-all ${
                    isPasteTarget ? 'border-blue-400 ring-2 ring-blue-200' : 'border-zinc-200'
                  }`}
                >
                  <div className="bg-zinc-900 aspect-[3/2] flex items-center justify-center p-4 relative">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain" />
                      : <span className="text-zinc-600 text-xs">이미지 없음</span>}
                    {isPasteTarget && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <span className="bg-blue-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full animate-pulse">
                          Ctrl+V 로 붙여넣기
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <input className="w-full bg-white p-2 rounded text-xs border border-zinc-200 text-zinc-500" value={item.name || ''} onChange={e => updateItemField(i, 'name', e.target.value)} placeholder="브랜드명 (선택)" />
                    {/* 로고 높이 슬라이더 */}
                    <div className="bg-white rounded-lg border border-zinc-200 p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">로고 높이</label>
                        <span className="text-[10px] font-black text-zinc-700">{item.logo_height || 40}px</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={4}
                        value={item.logo_height || 40}
                        onChange={e => updateItemField(i, 'logo_height', Number(e.target.value))}
                        className="w-full accent-zinc-900 h-1"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-300 font-medium">
                        <span>20px</span>
                        <span>100px</span>
                      </div>
                    </div>
                    {/* 업로드 / 붙여넣기 버튼 2열 */}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-900 text-white text-[10px] font-black rounded cursor-pointer hover:bg-zinc-700 transition-colors uppercase tracking-widest">
                        <ImageIcon size={11} /> 파일
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(i, e.target.files[0])} />
                      </label>
                      <button
                        onClick={() => selectPasteTarget(isPasteTarget ? null : i)}
                        className={`flex items-center justify-center gap-1.5 w-full py-2 text-[10px] font-black rounded transition-colors uppercase tracking-widest ${
                          isPasteTarget
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        <Clipboard size={11} /> {isPasteTarget ? '대기 중' : '붙여넣기'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeItem(i)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500">
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            <button onClick={() => addItem({ image_url: '', name: '', logo_height: 40 })} className="aspect-[3/2] border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-500 hover:text-zinc-700 transition-all">
              <Plus size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">로고 추가</span>
            </button>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-zinc-400">지원되지 않는 섹션 타입입니다.</p>;
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-zinc-400">로딩 중...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">서비스 페이지 수정</h1>
          <p className="text-sm text-zinc-500 mt-1">
            여기서 관리하는 섹션은 <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">/service</code> 페이지 상단에 표시됩니다.
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/service" target="_blank" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
            <Eye size={16} /> 서비스 페이지 보기
          </a>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition-all">
            <Plus size={16} /> 섹션 추가
          </button>
        </div>
      </div>

      {/* 섹션 목록 */}
      {sections.length === 0 ? (
        <div className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 p-16 text-center">
          <p className="text-zinc-400 font-bold mb-4">아직 추가된 섹션이 없습니다.</p>
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-700 transition-all">
            첫 섹션 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div key={section.id} className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded uppercase tracking-widest">
                    {SECTION_TYPES[section.type]?.label || section.type}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${section.is_active ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                  <span className="text-[10px] text-zinc-400 font-medium">{section.is_active ? '활성' : '비활성'}</span>
                </div>
                <p className="font-black text-zinc-900 text-sm truncate">{section.title}</p>
                {section.subtitle && <p className="text-xs text-zinc-400 truncate">{section.subtitle}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(section)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${section.is_active ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  {section.is_active ? '비활성화' : '활성화'}
                </button>
                <button onClick={() => setEditingSection(JSON.parse(JSON.stringify(section)))} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-all">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(section.id)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 섹션 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-tight">섹션 추가</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {SERVICE_SECTION_TYPES.map(key => (
                <button
                  key={key}
                  onClick={() => handleAdd(key)}
                  disabled={saving}
                  className="w-full p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-left hover:border-zinc-500 hover:bg-white transition-all"
                >
                  <div className="font-black text-sm text-zinc-900">{SECTION_TYPES[key]?.label}</div>
                  <p className="text-xs text-zinc-400 mt-1">{SECTION_TYPES[key]?.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 섹션 편집 모달 */}
      {editingSection && (
        <div className="fixed inset-0 bg-zinc-900/95 flex z-50">
          {/* 좌측: 라이브 프리뷰 */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="sticky top-0 z-10 bg-zinc-100 border-b border-zinc-200 px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              라이브 프리뷰 — /service
            </div>
            <SectionRenderer
              type={editingSection.type}
              title={editingSection.title}
              subtitle={editingSection.subtitle}
              content={editingSection.content}
            />
          </div>

          {/* 우측: 에디터 */}
          <div className="w-[460px] bg-white border-l border-zinc-200 flex flex-col">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
                  {SECTION_TYPES[editingSection.type]?.label}
                </p>
                <h2 className="text-base font-black text-zinc-900">섹션 편집</h2>
              </div>
              <button onClick={() => setEditingSection(null)} className="p-2 hover:bg-zinc-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 공통 필드 */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">섹션 제목 (큰 텍스트)</label>
                  <input className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-sm" value={editingSection.title || ''} onChange={e => setEditingSection(p => ({ ...p, title: e.target.value }))} placeholder="두 눈으로 직접 그 결과를 확인하세요." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">서브 텍스트 (작은 텍스트)</label>
                  <input className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm" value={editingSection.subtitle || ''} onChange={e => setEditingSection(p => ({ ...p, subtitle: e.target.value }))} placeholder="믿기지 않는다고요?" />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6">
                {renderEditor(editingSection)}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100">
              <button onClick={handleSave} disabled={saving} className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black text-sm hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">
                {saving ? '저장 중...' : <><Save size={16} /> 저장하기</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
