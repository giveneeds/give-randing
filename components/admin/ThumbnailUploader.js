'use client';
import { useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';

export default function ThumbnailUploader({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('이미지 파일만 업로드 가능합니다.');
    if (file.size > 5 * 1024 * 1024) return alert('5MB 이하만 업로드 가능합니다.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/magazine-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      onChange(data.url);
    } catch (err) {
      alert('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
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
          className="w-full aspect-[16/9] border-2 border-dashed border-zinc-200 rounded-md flex flex-col items-center justify-center gap-2 hover:border-zinc-400 hover:bg-zinc-50 transition text-zinc-400 hover:text-zinc-700"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {uploading ? '업로드 중...' : '썸네일 이미지 업로드'}
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
