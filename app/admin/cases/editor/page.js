'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Monitor, Smartphone, CheckCircle2,
  Archive, Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import ThumbnailUploader from '@/components/admin/ThumbnailUploader';

const CASE_SECTIONS = [
  { key: 'background', label: '배경', isList: false },
  { key: 'approach', label: '접근 방식', isList: false },
  { key: 'operations', label: '운영 포인트', isList: true },
  { key: 'results', label: '성과', isList: false },
];

function sectionsToHtml(sections) {
  return CASE_SECTIONS
    .filter((s) => sections[s.key]?.trim())
    .map((s) => {
      const text = sections[s.key].trim();
      if (s.isList) {
        const items = text.split('\n').filter(Boolean);
        return `<h2>${s.label}</h2>\n<ul>\n${items.map((li) => `  <li>${li}</li>`).join('\n')}\n</ul>`;
      }
      return `<h2>${s.label}</h2>\n<p>${text}</p>`;
    })
    .join('\n\n');
}

function htmlToSections(html) {
  const sections = { background: '', approach: '', operations: '', results: '' };
  if (!html) return sections;

  const parts = html.split(/<h2>/i).filter(Boolean);
  for (const part of parts) {
    const headingEnd = part.indexOf('</h2>');
    if (headingEnd === -1) continue;
    const heading = part.slice(0, headingEnd).trim();
    const body = part.slice(headingEnd + 5).trim();

    const match = CASE_SECTIONS.find((s) => heading.includes(s.label));
    if (!match) continue;

    if (match.isList) {
      const items = [...body.matchAll(/<li>(.*?)<\/li>/gi)].map((m) => m[1].trim());
      sections[match.key] = items.join('\n');
    } else {
      const pMatch = body.match(/<p>([\s\S]*?)<\/p>/i);
      sections[match.key] = pMatch ? pMatch[1].trim() : body.replace(/<[^>]+>/g, '').trim();
    }
  }
  return sections;
}

export default function CaseEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [caseData, setCaseData] = useState({
    title: '',
    slug: '',
    client_name: '',
    category: '',
    thumbnail_url: '',
    cover_url: '',
    excerpt: '',
    content_html: '',
    services: [],
    tags: [],
    result_summary: '',
    is_featured: false,
    status: 'draft',
    sort_order: 0,
  });

  const [sections, setSections] = useState({
    background: '', approach: '', operations: '', results: '',
  });

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [loading, setLoading] = useState(!!id);
  const [tagInput, setTagInput] = useState('');
  const [serviceInput, setServiceInput] = useState('');

  useEffect(() => { if (id) loadCase(); }, [id]);

  async function loadCase() {
    try {
      const res = await fetch(`/api/cases?id=${id}&admin=true`);
      const data = await res.json();
      if (data.case) {
        setCaseData(data.case);
        setSections(htmlToSections(data.case.content_html));
        setTagInput((data.case.tags || []).join(', '));
        setServiceInput((data.case.services || []).join(', '));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handleTitleChange(title) {
    const autoSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
    setCaseData({ ...caseData, title, slug: caseData.slug || autoSlug });
  }

  function handleTagChange(value) {
    setTagInput(value);
    const parsed = value.split(',').map((t) => t.trim()).filter(Boolean);
    setCaseData({ ...caseData, tags: parsed });
  }

  function handleServiceChange(value) {
    setServiceInput(value);
    const parsed = value.split(',').map((s) => s.trim()).filter(Boolean);
    setCaseData({ ...caseData, services: parsed });
  }

  async function handleSave(status) {
    if (!caseData.title || !caseData.slug) {
      alert('제목과 slug 는 필수입니다.');
      return;
    }
    setSaving(true);
    const updatedData = {
      ...caseData,
      content_html: sectionsToHtml(sections),
      status: status || caseData.status || 'draft',
    };
    try {
      const res = await fetch('/api/cases', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { ...updatedData, id } : updatedData),
      });
      const result = await res.json();
      if (res.ok) {
        router.push('/admin/cases');
      } else {
        alert(`저장 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    } finally { setSaving(false); }
  }

  const previewHtml = sectionsToHtml(sections);

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Editor Loading...</div>;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[100] animate-in fade-in duration-500 overflow-hidden">
      <header className="h-16 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-50 rounded-lg group transition-all">
            <ArrowLeft size={18} className="text-zinc-400 group-hover:text-zinc-900 group-hover:-translate-x-1" />
          </button>
          <h1 className="text-xs font-black uppercase tracking-widest text-zinc-900">Case Editor</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-md font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <Archive size={14} /> {saving ? 'Syncing...' : '임시 저장'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-md font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 disabled:bg-zinc-100"
          >
            <Send size={14} /> {saving ? 'Syncing...' : '라이브 발행'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-full max-w-[450px] border-r border-zinc-100 bg-zinc-50/50 flex flex-col overflow-y-auto p-8 space-y-8 shrink-0 custom-scrollbar">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Case Data</label>
            <input
              className="w-full p-4 bg-white border border-zinc-200 rounded-md font-bold text-base outline-none shadow-sm focus:ring-2 focus:ring-zinc-900/10"
              placeholder="사례 제목을 입력하세요"
              value={caseData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm"
                placeholder="카테고리 (예: 검색노출)"
                value={caseData.category}
                onChange={(e) => setCaseData({ ...caseData, category: e.target.value })}
              />
              <input
                className="w-full p-3 bg-white border border-zinc-200 rounded-md font-mono text-[11px] outline-none shadow-sm"
                placeholder="slug (auto)"
                value={caseData.slug}
                onChange={(e) => setCaseData({ ...caseData, slug: e.target.value })}
              />
            </div>

            <input
              className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm"
              placeholder="고객사명 (Client Name)"
              value={caseData.client_name || ''}
              onChange={(e) => setCaseData({ ...caseData, client_name: e.target.value })}
            />

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Thumbnail (리스트 카드)</label>
              <ThumbnailUploader
                value={caseData.thumbnail_url}
                onChange={(url) => setCaseData({ ...caseData, thumbnail_url: url })}
                endpoint="/api/upload/case-image"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cover (상세 페이지 상단)</label>
              <ThumbnailUploader
                value={caseData.cover_url}
                onChange={(url) => setCaseData({ ...caseData, cover_url: url })}
                endpoint="/api/upload/case-image"
              />
            </div>
          </div>

          {/* 요약 & 성과 */}
          <div className="space-y-4 pt-6 border-t border-zinc-200">
            <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Summary & Result</label>
            <textarea
              className="w-full min-h-[80px] bg-white border border-zinc-200 rounded-md p-4 text-sm leading-relaxed outline-none shadow-sm"
              placeholder="카드 노출용 요약문"
              value={caseData.excerpt || ''}
              onChange={(e) => setCaseData({ ...caseData, excerpt: e.target.value })}
            />
            <textarea
              className="w-full min-h-[60px] bg-white border border-amber-200 bg-amber-50/40 rounded-md p-4 text-sm leading-relaxed outline-none shadow-sm"
              placeholder="성과 요약 (예: 검색 노출 확장)"
              value={caseData.result_summary || ''}
              onChange={(e) => setCaseData({ ...caseData, result_summary: e.target.value })}
            />
          </div>

          {/* 본문 내용 — 항목별 입력 */}
          <div className="space-y-4 pt-6 border-t border-zinc-200">
            <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Content Sections</label>
            <p className="text-[9px] text-zinc-400 ml-1 -mt-2">빈 항목은 공개 페이지에서 자동 숨김 처리됩니다.</p>
            {CASE_SECTIONS.map((sec) => (
              <div key={sec.key} className="space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                  {sec.label}
                  {sec.isList && (
                    <span className="text-zinc-300 normal-case tracking-normal font-medium ml-2">
                      한 줄에 항목 하나씩
                    </span>
                  )}
                </label>
                <textarea
                  className="w-full min-h-[80px] bg-white border border-zinc-200 rounded-md p-4 text-sm leading-relaxed outline-none shadow-sm focus:ring-2 focus:ring-zinc-900/10 resize-y"
                  placeholder={`${sec.label} 내용을 입력하세요${sec.isList ? ' (한 줄에 하나씩)' : ''}`}
                  value={sections[sec.key]}
                  onChange={(e) => setSections((s) => ({ ...s, [sec.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {/* 서비스 & 태그 */}
          <div className="space-y-4 pt-6 border-t border-zinc-200">
            <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Services & Tags</label>
            <input
              className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm"
              placeholder="제공 서비스 (쉼표 구분: 퍼포먼스, 크리에이티브)"
              value={serviceInput}
              onChange={(e) => handleServiceChange(e.target.value)}
            />
            {caseData.services && caseData.services.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {caseData.services.map((s, i) => (
                  <span key={i} className="text-[10px] font-bold bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            )}
            <input
              className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm"
              placeholder="태그 (쉼표 구분)"
              value={tagInput}
              onChange={(e) => handleTagChange(e.target.value)}
            />
            {caseData.tags && caseData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {caseData.tags.map((t, i) => (
                  <span key={i} className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full">#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* 토글 옵션 */}
          <div className="pt-6 border-t border-zinc-200 space-y-3">
            <input
              type="number"
              className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm"
              placeholder="정렬 순서 (숫자, 낮을수록 앞)"
              value={caseData.sort_order || 0}
              onChange={(e) => setCaseData({ ...caseData, sort_order: parseInt(e.target.value) || 0 })}
            />
            <button
              onClick={() => setCaseData({ ...caseData, is_featured: !caseData.is_featured })}
              className={clsx(
                'w-full p-4 rounded-xl border flex items-center justify-between transition-all',
                caseData.is_featured ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-zinc-200 text-zinc-500'
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Featured (대형 카드)</span>
              {caseData.is_featured && <CheckCircle2 size={16} />}
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-zinc-100 overflow-hidden flex flex-col">
          <div className="h-14 flex items-center justify-between px-6 bg-white border-b border-zinc-100 shrink-0">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Live Preview</label>
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase',
                  previewMode === 'desktop' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                <Monitor size={14} /> Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase',
                  previewMode === 'mobile' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                <Smartphone size={14} /> Mobile
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col items-center py-6 custom-scrollbar">
            <div
              className={clsx(
                'bg-white shadow-xl transition-all duration-500 ease-in-out border border-zinc-200 overflow-hidden',
                previewMode === 'mobile'
                  ? 'w-[393px] h-[780px] rounded-[2.5rem] border-[10px] border-zinc-900 shrink-0'
                  : 'w-full max-w-4xl mx-4 rounded-xl'
              )}
            >
              <div className="h-full overflow-y-auto scroll-smooth custom-scrollbar">
                <PreviewContent item={caseData} contentHtml={previewHtml} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function PreviewContent({ item, contentHtml }) {
  if (!item.title)
    return (
      <div className="h-full flex items-center justify-center p-20 text-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-loose">
        좌측에서 제목을 작성하면<br />
        이곳에 실시간으로 렌더링됩니다.
      </div>
    );
  return (
    <div className="bg-white min-h-full pb-32 animate-in fade-in duration-700">
      <div className="pt-20 px-8 max-w-screen-md mx-auto mb-12">
        <div className="flex items-center gap-4 mb-6">
          {item.category && (
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">{item.category}</span>
          )}
          {item.is_featured && (
            <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">FEATURED</span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-black leading-[1.1] tracking-tighter text-zinc-900 mb-4 break-keep">
          {item.title}
        </h1>
        {item.excerpt && <p className="text-sm text-zinc-500 leading-relaxed mb-4">{item.excerpt}</p>}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 text-[10px] text-zinc-400">
          {item.client_name && <span className="font-bold uppercase">CLIENT: {item.client_name}</span>}
        </div>
      </div>
      {(item.cover_url || item.thumbnail_url) && (
        <div className="px-8 max-w-screen-md mx-auto mb-12">
          <div className="aspect-[16/9] bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden">
            <img src={item.cover_url || item.thumbnail_url} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      <article
        className="px-8 max-w-screen-md mx-auto prose prose-zinc prose-lg max-w-none magazine-prose
                   prose-p:text-zinc-600 prose-headings:font-black prose-headings:tracking-tighter"
        dangerouslySetInnerHTML={{ __html: contentHtml || '' }}
      />
      {item.result_summary && (
        <div className="px-8 max-w-screen-md mx-auto mt-12">
          <div className="p-6 rounded-xl border border-amber-200 bg-amber-50/60">
            <span className="text-[10px] font-bold tracking-[0.3em] text-amber-700 uppercase block mb-2">Result</span>
            <p className="text-lg font-black text-zinc-900">{item.result_summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
