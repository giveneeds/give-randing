'use client';
import { useRef, useState } from 'react';
import { Upload, Loader2, X, Clipboard } from 'lucide-react';
import { clsx } from 'clsx';

export default function ThumbnailUploader({ value, onChange, endpoint = '/api/upload/magazine-image' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('이미지 파일만 업로드 가능합니다.');
    if (file.size > 5 * 1024 * 1024) return alert('5MB 이하만 업로드 가능합니다.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      onChange(data.url);
    } catch (err) {
      alert('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    await uploadFile(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadFile(file);
          return;
        }
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      className="space-y-2"
      tabIndex={0}
      onPaste={handlePaste}
      onDragEnter={() => setDragActive(true)}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onFocus={() => setPasteHint(true)}
      onBlur={() => setPasteHint(false)}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div className="relative group rounded-md overflow-hidden border border-zinc-200">
          <img src={value} alt="thumbnail" className="w-full aspect-[16/9] object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 bg-white/90 text-zinc-900 rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition"
          >
            교체
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={clsx(
            'w-full aspect-[16/9] border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 transition',
            dragActive
              ? 'border-blue-400 bg-blue-50 text-blue-600'
              : pasteHint
                ? 'border-zinc-400 bg-zinc-50 text-zinc-700'
                : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700'
          )}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : dragActive ? (
            <Upload size={20} />
          ) : (
            <Clipboard size={20} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {uploading
              ? '업로드 중...'
              : dragActive
                ? '놓아주세요'
                : '클릭 · 드래그 · 붙여넣기 (⌘V)'}
          </span>
          <span className="text-[9px] text-zinc-300">JPG / PNG / WEBP · 최대 5MB</span>
        </button>
      )}
      <input
        type="text"
        placeholder="또는 외부 URL 직접 입력"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 bg-white border border-zinc-200 rounded-md font-mono text-[10px] outline-none"
      />
    </div>
  );
}
