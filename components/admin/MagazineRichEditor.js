'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';

// 파일을 업로드하고 ProseMirror view의 특정 위치에 이미지 노드 삽입
async function uploadAndInsertImage(view, file, pos) {
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 크기는 5MB 이하여야 합니다.');
    return;
  }
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/magazine-image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '업로드 실패');
    const node = view.state.schema.nodes.image.create({ src: data.url, alt: file.name });
    const tr = view.state.tr.insert(pos, node);
    view.dispatch(tr);
  } catch (err) {
    alert('업로드 실패: ' + err.message);
  }
}

// 와이드 이미지 + 캡션 (figure)
const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,
  isolating: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.querySelector('img')?.getAttribute('src') || null,
        renderHTML: () => ({}),
      },
      alt: {
        default: '',
        parseHTML: (el) => el.querySelector('img')?.getAttribute('alt') || '',
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'figure[data-figure]',
        contentElement: (el) => el.querySelector('figcaption') || el,
      },
    ];
  },
  renderHTML({ node }) {
    return [
      'figure',
      {
        'data-figure': '',
        style: 'margin:2.5rem 0;text-align:center;',
      },
      [
        'img',
        {
          src: node.attrs.src,
          alt: node.attrs.alt,
          style: 'width:100%;border-radius:0.75rem;border:1px solid #e4e4e7;display:block;',
        },
      ],
      [
        'figcaption',
        {
          style: 'margin-top:0.75rem;font-size:0.875rem;color:#71717a;font-style:italic;',
        },
        0,
      ],
    ];
  },
});

// 풀쿼트 카드 — 자유 텍스트를 담는 strong-styled blockquote
const PullQuote = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-pull-quote]' }];
  },
  renderHTML() {
    return [
      'div',
      {
        'data-pull-quote': '',
        style:
          'border-left:4px solid #18181b;padding:0.5rem 0 0.5rem 1.5rem;margin:2.5rem 0;font-size:1.5rem;font-weight:900;letter-spacing:-0.02em;color:#18181b;line-height:1.4;',
      },
      0,
    ];
  },
});
import { useRef, useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Bold, Italic, List, ListOrdered, Quote, Minus, Image as ImageIcon,
  Highlighter, Undo2, Redo2, LayoutTemplate, Loader2, Sparkles, X, Paperclip, Link2,
} from 'lucide-react';

const HEADING_OPTIONS = [
  { label: '본문', value: 'p' },
  { label: '큰 제목 (H1)', value: 'h1' },
  { label: '중간 제목 (H2)', value: 'h2' },
  { label: '소제목 (H3)', value: 'h3' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', color: '#fef08a' },
  { label: 'Green', color: '#bbf7d0' },
  { label: 'Pink', color: '#fbcfe8' },
];

// 매거진 스타일 사전 정의 템플릿(블록) — 삽입 시 본문에 HTML로 들어가고
// 운영자가 텍스트만 클릭해서 수정. DB에는 그대로 HTML로 저장됨.
const TEMPLATES = [
  {
    key: 'wide-image',
    label: '와이드 이미지 + 캡션',
    html: `<figure data-figure data-src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1600"><img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1600" alt="이미지 설명" /><figcaption>캡션을 입력하세요</figcaption></figure><p></p>`,
  },
  {
    key: 'pull-quote',
    label: '풀쿼트 카드',
    html: `<div data-pull-quote>여기에 강조하고 싶은 인용문을 입력하세요.</div><p></p>`,
  },
];

function buildResourceBlockHTML(r) {
  const title = (r.title || '').replace(/"/g, '&quot;');
  const fname = (r.file_name || '').replace(/"/g, '&quot;');
  const size = r.file_size ? (r.file_size < 1024 * 1024 ? `${(r.file_size / 1024).toFixed(1)} KB` : `${(r.file_size / 1024 / 1024).toFixed(1)} MB`) : '';
  const ext = (r.file_name || '').split('.').pop()?.toUpperCase().slice(0, 5) || 'FILE';
  const resourceId = r.id || '';
  return `<div data-resource-block data-resource-id="${resourceId}" style="border:1px solid #e4e4e7;border-radius:0.875rem;padding:1.125rem 1.25rem;margin:2rem 0;display:flex;align-items:center;gap:1rem;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer;">
  <div style="flex-shrink:0;width:2.75rem;height:2.75rem;border-radius:0.625rem;background:#18181b;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:0.65rem;font-weight:900;letter-spacing:0.05em;">${ext}</div>
  <div style="flex:1;min-width:0;">
    <div style="font-size:0.625rem;font-weight:900;color:#a1a1aa;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.25rem;">Resource</div>
    <div style="font-size:0.9375rem;font-weight:800;color:#18181b;line-height:1.4;letter-spacing:-0.01em;">${title}</div>
    <div style="font-size:0.75rem;color:#71717a;margin-top:0.25rem;">${fname}${size ? ' · ' + size : ''}</div>
  </div>
  <div style="flex-shrink:0;display:inline-flex;align-items:center;gap:0.375rem;background:#18181b;color:#ffffff;font-size:0.7rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;padding:0.625rem 1rem;border-radius:0.5rem;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    다운로드
  </div>
</div><p></p>`;
}

export default function MagazineRichEditor({ value, onChange, magazineId, editorRef, onTitleSuggest, magazineCategory }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('realistic');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiImages, setAiImages] = useState([]); // 생성된 3장 그리드
  const [aiMode, setAiMode] = useState('whole'); // 'whole' | 'paragraph'
  const [aiParagraphContext, setAiParagraphContext] = useState('');
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: '본문을 작성하세요. 헤딩 드롭다운으로 제목 크기를, 형광펜 버튼으로 강조를, 이미지 버튼으로 사진을 업로드할 수 있습니다.',
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {
          class: 'text-blue-600 underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Figure,
      PullQuote,
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'focus:outline-none' },
      handleDoubleClickOn(view, pos, node) {
        if (node.type.name === 'image') {
          view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize));
          return true;
        }
        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const dropPos = coordinates?.pos ?? view.state.selection.from;
        files.forEach((file) => uploadAndInsertImage(view, file, dropPos));
        return true;
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.state.selection.from;
        files.forEach((file) => uploadAndInsertImage(view, file, pos));
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  // value prop이 외부에서 바뀌면(예: 글 로드 완료) 동기화
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const handleHeadingChange = useCallback(
    (val) => {
      if (!editor) return;
      if (val === 'p') {
        editor.chain().focus().setParagraph().run();
      } else {
        const level = parseInt(val.replace('h', ''), 10);
        editor.chain().focus().toggleHeading({ level }).run();
      }
    },
    [editor],
  );

  const handleImagePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload/magazine-image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '업로드 실패');
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } catch (err) {
        alert('업로드 실패: ' + err.message);
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

  const insertTemplate = useCallback(
    (tpl) => {
      if (!editor) return;
      editor.chain().focus().insertContent(tpl.html).run();
      setShowTemplates(false);
    },
    [editor],
  );

  const handleOpenResourcePicker = useCallback(async () => {
    setShowResourcePicker(true);
    if (!magazineId || resources.length > 0) return;
    setResourcesLoading(true);
    try {
      const res = await fetch(`/api/magazines/${magazineId}/resources?admin=true`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch {
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  }, [magazineId, resources.length]);

  const handleInsertResource = useCallback((r) => {
    if (!editor) return;
    editor.chain().focus().insertContent(buildResourceBlockHTML(r)).run();
    setShowResourcePicker(false);
  }, [editor]);

  // editor 인스턴스를 ref로 유지해 외부 콜백에서 항상 최신 editor 접근 가능
  const editorInstanceRef = useRef(null);
  const titleSuggestRef = useRef(null);
  useEffect(() => { editorInstanceRef.current = editor; }, [editor]);

  // 외부에서 ref.current.insertResource(r) 호출 시 자동 삽입
  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = {
      insertResource: (r) => {
        const ed = editorInstanceRef.current;
        if (!ed || !r) return;
        ed.chain().focus('end').insertContent(buildResourceBlockHTML(r)).run();
      },
      suggestTitles: () => {
        // 외부에서 다시 만들기 요청 시 호출
        titleSuggestRef.current?.();
      },
    };
  // editorRef는 stable ref이므로 의존성 불필요
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitleSuggest = useCallback(async () => {
    if (!editor) return;
    const content = editor.getHTML();
    const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length < 50) {
      alert('본문을 먼저 충분히 작성해주세요 (최소 50자).');
      return;
    }
    setTitleLoading(true);
    try {
      const res = await fetch('/api/ai-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '제목 추천 실패');
      onTitleSuggest?.(data.titles || []);
    } catch (e) {
      alert('제목 추천 실패: ' + e.message);
    } finally {
      setTitleLoading(false);
    }
  }, [editor, onTitleSuggest]);

  useEffect(() => { titleSuggestRef.current = handleTitleSuggest; }, [handleTitleSuggest]);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || !editor) return;
    setAiGenerating(true);
    setAiError('');
    setAiImages([]);
    try {
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          style: aiStyle,
          count: 3,
          category: magazineCategory || null,
          paragraph_context: aiMode === 'paragraph' ? aiParagraphContext : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 실패');
      // 신규 응답은 images 배열, 하위 호환으로 url 단일도 지원
      const imgs = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : data.url ? [{ url: data.url, path: data.path }] : [];
      if (imgs.length === 0) throw new Error('이미지를 생성하지 못했습니다');
      setAiImages(imgs);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiStyle, editor, magazineCategory, aiMode, aiParagraphContext]);

  const handleSelectAiImage = useCallback(async (img) => {
    if (!editor || !img?.url) return;
    // 문단 모드면 해당 문단 뒤에 삽입, 아니면 현재 커서 위치
    editor.chain().focus().setImage({ src: img.url, alt: aiPrompt }).run();
    // 선호도 저장 (비동기, 실패해도 UX엔 영향 없음)
    fetch('/api/ai-image-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: magazineCategory || null,
        prompt: aiPrompt,
        style: aiStyle,
        selected_image_url: img.url,
        paragraph_context: aiMode === 'paragraph' ? aiParagraphContext : null,
      }),
    }).catch(() => {});
    setShowAiModal(false);
    setAiPrompt('');
    setAiImages([]);
    setAiParagraphContext('');
  }, [editor, aiPrompt, aiStyle, magazineCategory, aiMode, aiParagraphContext]);

  // 문단 기반 이미지 생성 열기 — 현재 커서가 위치한 문단의 텍스트를 가져옴
  const handleOpenParagraphImage = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;
    let paragraphText = '';
    // 현재 선택된 텍스트가 있으면 그것을 우선
    if (!state.selection.empty) {
      paragraphText = state.doc.textBetween(state.selection.from, state.selection.to, ' ').trim();
    }
    // 없으면 커서가 위치한 블록(문단)의 텍스트
    if (!paragraphText) {
      for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node && node.type.name === 'paragraph') {
          paragraphText = node.textContent.trim();
          break;
        }
      }
    }
    if (!paragraphText || paragraphText.length < 10) {
      alert('문단에 커서를 두거나 문단을 드래그 선택한 뒤 다시 시도해주세요.');
      return;
    }
    setAiMode('paragraph');
    setAiParagraphContext(paragraphText);
    setAiPrompt(paragraphText.slice(0, 150));
    setAiImages([]);
    setAiError('');
    setShowAiModal(true);
  }, [editor]);

  if (!editor) {
    return (
      <div className="p-10 text-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
        Editor Loading...
      </div>
    );
  }

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p';

  return (
    <div className="magazine-editor flex flex-col h-full min-h-[700px] bg-white">
      {/* ─── AI 이미지 생성 모달 ─── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 p-6" style={{ colorScheme: 'light' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                <h3 className="text-sm font-black tracking-tight">
                  AI 이미지 생성 {aiMode === 'paragraph' ? '· 문단 기반' : '· 글 전체'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAiModal(false); setAiError(''); setAiImages([]); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* 문단 컨텍스트 미리보기 */}
            {aiMode === 'paragraph' && aiParagraphContext && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-700 mb-1">선택된 문단</div>
                <p className="text-xs text-zinc-700 leading-relaxed line-clamp-3">{aiParagraphContext}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  이미지 설명 {aiMode === 'paragraph' && <span className="text-violet-500 normal-case">(문단에서 자동 채움 · 수정 가능)</span>}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAiGenerate(); }}
                  placeholder="예: 현대적인 오피스에서 일하는 전문가, 노트북과 커피잔이 있는 깔끔한 책상"
                  rows={3}
                  className="w-full text-sm bg-white text-zinc-900 border border-zinc-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  스타일
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'realistic', label: '실사', desc: '자연스러운 사진' },
                    { value: 'minimal', label: '미니멀', desc: '깔끔한 배경' },
                    { value: 'editorial', label: '에디토리얼', desc: '매거진 스타일' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setAiStyle(s.value)}
                      className={clsx(
                        'p-3 rounded-xl border text-left transition-all',
                        aiStyle === s.value
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-zinc-200 hover:border-zinc-300 text-zinc-600',
                      )}
                    >
                      <div className="text-xs font-black">{s.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {aiError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
              )}

              {/* 생성된 3장 그리드 */}
              {aiImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">마음에 드는 이미지 선택</label>
                    <span className="text-[10px] text-zinc-400">클릭하면 본문에 삽입됩니다</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {aiImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectAiImage(img)}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 hover:border-violet-500 transition-all"
                      >
                        <img src={img.url} alt={`ai-${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/10 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                          <span className="text-[10px] font-black text-white bg-zinc-900 px-2 py-1 rounded">선택</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={!aiPrompt.trim() || aiGenerating}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-sm font-black tracking-tight hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      생성 중... (20~40초 소요)
                    </>
                  ) : aiImages.length > 0 ? (
                    <>
                      <Sparkles size={15} />
                      다시 3장 생성
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      이미지 3장 생성
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-center text-zinc-400">
                ⌘+Enter로도 생성 · Gemini 기반 · 선택 시 스타일이 학습되어 다음 생성에 반영됩니다
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ─── Toolbar ─── */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 px-6 py-3 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <select
          value={currentHeading}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => handleHeadingChange(e.target.value)}
          className="text-xs font-bold border border-zinc-200 rounded-md px-3 py-2 bg-white hover:bg-zinc-50 outline-none cursor-pointer"
        >
          {HEADING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="w-px h-6 bg-zinc-200 mx-1" />

        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
          <Italic size={15} />
        </ToolBtn>

        {/* 형광펜 */}
        <div className="relative">
          <ToolBtn active={editor.isActive('highlight')} onClick={() => setShowHighlight((v) => !v)} title="형광펜">
            <Highlighter size={15} />
          </ToolBtn>
          {showHighlight && (
            <div className="absolute top-full left-0 mt-1 flex bg-white border border-zinc-200 rounded-md shadow-lg p-1 gap-1 z-20">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: c.color }).run();
                    setShowHighlight(false);
                  }}
                  className="w-7 h-7 rounded border border-zinc-200 hover:scale-110 transition"
                  style={{ background: c.color }}
                  title={c.label}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlight(false);
                }}
                className="w-7 h-7 rounded border border-zinc-200 bg-white text-[10px] font-bold hover:bg-zinc-50"
                title="제거"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-zinc-200 mx-1" />

        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="글머리 기호">
          <List size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 매기기">
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용">
          <Quote size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus size={15} />
        </ToolBtn>
        <div className="w-px h-6 bg-zinc-200 mx-1" />

        <ToolBtn onClick={handleImagePick} title="이미지 업로드 (파일 선택 또는 드래그&드롭)">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        </ToolBtn>
        <ToolBtn onClick={() => { setAiMode('whole'); setAiParagraphContext(''); setAiPrompt(''); setAiImages([]); setAiError(''); setShowAiModal(true); }} title="글 전체 주제로 AI 이미지 3장 생성">
          <Sparkles size={15} />
        </ToolBtn>
        <ToolBtn onClick={handleOpenParagraphImage} title="현재 문단(또는 선택 텍스트)에 어울리는 AI 이미지 3장 생성">
          <span className="flex items-center gap-0.5 text-[10px] font-black">
            <Sparkles size={12} />P
          </span>
        </ToolBtn>

        {/* 자료 삽입 */}
        {magazineId && (
          <div className="relative">
            <ToolBtn onClick={handleOpenResourcePicker} title="업로드한 자료를 본문 중간에 삽입">
              <Paperclip size={15} />
            </ToolBtn>
            {showResourcePicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-20 min-w-[240px]">
                <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">자료 선택</span>
                  <button type="button" onClick={() => setShowResourcePicker(false)} className="text-zinc-400 hover:text-zinc-700">
                    <X size={12} />
                  </button>
                </div>
                {resourcesLoading ? (
                  <div className="flex items-center justify-center py-4 text-zinc-400">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : resources.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 text-center py-4 px-3">
                    먼저 사이드바에서 자료를 업로드하세요
                  </p>
                ) : (
                  resources.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleInsertResource(r)}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                    >
                      <div className="font-bold text-zinc-800 truncate">{r.title}</div>
                      <div className="text-zinc-400 text-[10px] truncate">{r.file_name}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 매거진 템플릿 */}
        <div className="relative">
          <ToolBtn onClick={() => setShowTemplates((v) => !v)} title="매거진 템플릿 삽입">
            <LayoutTemplate size={15} />
          </ToolBtn>
          {showTemplates && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-20 min-w-[200px]">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertTemplate(t)}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-zinc-200 mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="실행 취소">
          <Undo2 size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
          <Redo2 size={15} />
        </ToolBtn>

        {onTitleSuggest && (
          <>
            <div className="w-px h-6 bg-zinc-200 mx-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTitleSuggest}
              disabled={titleLoading}
              title="본문을 분석해 AI가 제목을 5개 추천합니다"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-violet-600 hover:bg-violet-50 disabled:opacity-40 transition-colors border border-violet-200 hover:border-violet-400"
            >
              {titleLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              AI 제목
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* ─── 도움말 배너 ─── */}
      <div className="px-6 py-2 bg-gradient-to-r from-violet-50 to-blue-50 border-b border-zinc-100 text-[11px] text-zinc-600 flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1"><Sparkles size={11} className="text-violet-500" /> AI로 이미지 생성</span>
        <span className="text-zinc-300">·</span>
        <span className="flex items-center gap-1"><Paperclip size={11} className="text-zinc-500" /> 자료 삽입</span>
        <span className="text-zinc-300">·</span>
        <span className="flex items-center gap-1"><Link2 size={11} className="text-blue-500" /> URL 붙여넣기로 링크 자동 생성</span>
        <span className="text-zinc-300">·</span>
        <span>이미지는 드래그&드롭으로도 업로드 가능</span>
      </div>

      {/* ─── Editor ─── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={clsx(
        'p-2 rounded-md transition-colors',
        active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100',
      )}
    >
      {children}
    </button>
  );
}
