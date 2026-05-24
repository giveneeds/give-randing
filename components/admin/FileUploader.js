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

  /**
   * 응답이 JSON 이 아닐 수 있는 경우(예: Vercel reverse proxy 의 413 평문) 대비.
   * JSON 파싱 실패 시 본문 텍스트를 가공해 사용자에게 친절한 메시지 반환.
   */
  async function readErrorResponse(res) {
    const status = res.status;
    let raw = '';
    try {
      raw = await res.text();
    } catch {
      raw = '';
    }
    // JSON 시도
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) return parsed.error;
    } catch {
      // not JSON — 평문
    }
    if (status === 413 || /request entity too large/i.test(raw)) {
      return '파일이 서버 요청 한도를 초과했습니다. 더 작은 파일로 시도해 주세요.';
    }
    if (status >= 500) return `서버 오류 (${status}) — 잠시 후 다시 시도해 주세요.`;
    return raw?.slice(0, 200) || `요청 실패 (${status})`;
  }

  async function uploadFile(file) {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`파일 크기는 ${maxMB}MB 이하여야 합니다.`);
      return;
    }
    setUploading(true);
    try {
      // 인증 헤더 — sign 라우트 호출 시 Authorization 만 사용. Content-Type 은 fetch 가 알아서.
      let signHeaders = { 'Content-Type': 'application/json' };
      if (getHeaders) {
        const raw = await getHeaders();
        for (const [k, v] of Object.entries(raw || {})) {
          if (k.toLowerCase() !== 'content-type') signHeaders[k] = v;
        }
      }

      // (1) 서명 URL 발급 — Vercel 한도 안에서 처리 (본문은 메타데이터만)
      const signEndpoint =
        typeof endpoint === 'string' && endpoint.endsWith('/sign')
          ? endpoint
          : `${endpoint}/sign`;
      const signRes = await fetch(signEndpoint, {
        method: 'POST',
        headers: signHeaders,
        body: JSON.stringify({
          ...(extraBody || {}),
          file_name: file.name,
        }),
      });
      if (!signRes.ok) {
        const msg = await readErrorResponse(signRes);
        throw new Error(msg);
      }
      const signData = await signRes.json();
      if (!signData?.signedUrl) {
        throw new Error('서명 URL 응답이 비어 있습니다.');
      }

      // (2) Supabase Storage 도메인으로 직접 PUT — Vercel 우회 (50MB까지 OK)
      const putRes = await fetch(signData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Cache-Control': '31536000',
          'x-upsert': 'false',
        },
        body: file,
      });
      if (!putRes.ok) {
        const msg = await readErrorResponse(putRes);
        throw new Error('Storage 업로드 실패: ' + msg);
      }

      // ResourcesManager 의 handleUploaded 인터페이스 ({ path, file_name, file_size, file_type })
      onUploaded?.({
        path: signData.path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null,
      });
    } catch (err) {
      alert('업로드 실패: ' + (err?.message || '알 수 없는 오류'));
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
