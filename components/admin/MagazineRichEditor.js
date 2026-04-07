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
  Bold, Italic, List, ListOrdered, Quote, Minus, Link2, Image as ImageIcon,
  Highlighter, Undo2, Redo2, LayoutTemplate, Loader2,
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

export default function MagazineRichEditor({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

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
      Link.configure({ openOnClick: false, autolink: true }),
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

  const insertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('링크 URL을 입력하세요', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
    <div className="magazine-editor flex flex-col h-full bg-white">
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
        <ToolBtn active={editor.isActive('link')} onClick={insertLink} title="링크">
          <Link2 size={15} />
        </ToolBtn>

        <div className="w-px h-6 bg-zinc-200 mx-1" />

        <ToolBtn onClick={handleImagePick} title="이미지 업로드">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        </ToolBtn>

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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* ─── Editor ─── */}
      <div className="flex-1 overflow-y-auto bg-white">
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
