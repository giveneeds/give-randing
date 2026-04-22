'use client';
import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.zip,.txt';
const DEFAULT_MAX_MB = 50;

export default function FileUploader({
  endpoint,
  extraBody,
  getHeaders,
  onUploaded,
  accept = DEFAULT_ACCEPT,
  maxMB = DEFAULT_MAX_MB,
  label = '파일 업로드',
  helper,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`파일 크기는 ${maxMB}MB 이하여야 합니다.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (extraBody && typeof extraBody === 'object') {
        for (const [k, v] of Object.entries(extraBody)) {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        }
      }
      // Authorization 등 헤더 필요 시 getHeaders 로 주입.
      // Content-Type 은 FormData 가 자동으로 multipart boundary 와 함께 설정하므로 제거.
      let headers;
      if (getHeaders) {
        const raw = await getHeaders();
        headers = {};
        for (const [k, v] of Object.entries(raw || {})) {
          if (k.toLowerCase() !== 'content-type') headers[k] = v;
        }
      }
      const res = await fetch(endpoint, { method: 'POST', body: fd, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      onUploaded?.(data);
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

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      onDragEnter={() => setDragActive(true)}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={clsx(
          'w-full py-4 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-1.5 transition',
          dragActive
            ? 'border-blue-400 bg-blue-50 text-blue-600'
            : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700',
          uploading && 'cursor-wait'
        )}
      >
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {uploading ? '업로드 중...' : dragActive ? '놓아주세요' : label}
        </span>
        <span className="text-[9px] text-zinc-400">
          {helper || `PDF · DOCX · XLSX 등 · 최대 ${maxMB}MB`}
        </span>
      </button>
    </div>
  );
}
