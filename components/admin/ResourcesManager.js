'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FileText, ChevronUp, ChevronDown, Trash2, Loader2,
  CheckCircle2, Circle, Pencil, Check, X, CornerDownLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import FileUploader from './FileUploader';

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ResourcesManager({
  parentType = 'magazine',
  parentId,
  magazineId,
  onResourceAdded,
  onInsert,
}) {
  // 하위 호환: magazineId 만 넘어온 경우에도 동작
  const effectiveParentId = parentId ?? magazineId;
  const effectiveParentType = parentId ? parentType : (magazineId ? 'magazine' : parentType);
  const basePath = `/api/${effectiveParentType}s/${effectiveParentId}/resources`;

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    if (!effectiveParentId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${basePath}?admin=true`,
        { headers: await authHeaders() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      setResources(data.resources || []);
    } catch (e) {
      console.error(e);
      alert('리소스 불러오기 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveParentId, basePath, authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function handleUploaded(uploadRes) {
    try {
      const res = await fetch(basePath, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          title: uploadRes.file_name,
          file_url: uploadRes.path,
          file_name: uploadRes.file_name,
          file_size: uploadRes.file_size,
          file_type: uploadRes.file_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '메타데이터 저장 실패');
      setResources((prev) => [...prev, data.resource]);
      onResourceAdded?.(data.resource);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  }

  async function patchResource(id, patch) {
    const prev = resources;
    setResources((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      const res = await fetch(`${basePath}/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '수정 실패');
      }
    } catch (e) {
      setResources(prev);
      alert('수정 실패: ' + e.message);
    }
  }

  async function toggleEnabled(r) {
    await patchResource(r.id, { is_enabled: !r.is_enabled });
  }

  async function swapOrder(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= resources.length) return;
    const a = resources[index];
    const b = resources[next];
    // 낙관적 업데이트: 로컬 순서 먼저 바꿈
    const reordered = [...resources];
    reordered[index] = b;
    reordered[next] = a;
    setResources(reordered);
    // sort_order 스왑 PATCH
    try {
      await Promise.all([
        fetch(`${basePath}/${a.id}`, {
          method: 'PATCH',
          headers: await authHeaders(),
          body: JSON.stringify({ sort_order: b.sort_order }),
        }),
        fetch(`${basePath}/${b.id}`, {
          method: 'PATCH',
          headers: await authHeaders(),
          body: JSON.stringify({ sort_order: a.sort_order }),
        }),
      ]);
      // 로컬 sort_order 도 swap
      setResources((prev) => {
        const next = [...prev];
        const ai = next.findIndex((x) => x.id === a.id);
        const bi = next.findIndex((x) => x.id === b.id);
        if (ai !== -1 && bi !== -1) {
          const tmp = next[ai].sort_order;
          next[ai] = { ...next[ai], sort_order: next[bi].sort_order };
          next[bi] = { ...next[bi], sort_order: tmp };
        }
        return next;
      });
    } catch (e) {
      alert('정렬 실패: ' + e.message);
      load();
    }
  }

  async function deleteResource(id) {
    if (!confirm('이 자료를 삭제하시겠어요? (파일도 함께 삭제됩니다)')) return;
    try {
      const res = await fetch(`${basePath}/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '삭제 실패');
      }
      setResources((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }

  function beginEdit(r) {
    setEditingId(r.id);
    setEditTitle(r.title);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
  }
  async function saveEdit(r) {
    const trimmed = editTitle.trim();
    if (!trimmed) return cancelEdit();
    await patchResource(r.id, { title: trimmed });
    cancelEdit();
  }

  if (!effectiveParentId) {
    const label = effectiveParentType === 'campaign' ? '캠페인(랜딩페이지)' : '매거진';
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-center">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          자료를 첨부하려면 먼저 {label}을 <strong>임시 저장</strong>해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FileUploader
        endpoint="/api/upload/content-resource"
        extraBody={{ parent_type: effectiveParentType, parent_id: effectiveParentId }}
        getHeaders={authHeaders}
        onUploaded={handleUploaded}
        label="자료 파일 업로드 (PDF · DOCX · ZIP 등)"
        helper="최대 50MB · PDF · DOC · DOCX · XLS · XLSX · PPT · PPTX · HWP · ZIP · TXT · CSV"
      />

      {loading ? (
        <div className="flex items-center justify-center py-6 text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <p className="text-[11px] text-zinc-400 text-center py-4">
          첨부된 자료가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {resources.map((r, i) => (
            <li
              key={r.id}
              className={clsx(
                'border rounded-md p-3 bg-white transition',
                r.is_enabled ? 'border-zinc-200' : 'border-zinc-100 bg-zinc-50 opacity-60'
              )}
            >
              <div className="flex items-start gap-2">
                <div className="shrink-0 w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-500">
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs font-bold border border-zinc-300 rounded outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(r);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={() => saveEdit(r)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check size={14} />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-900 truncate" title={r.title}>
                          {r.title}
                        </p>
                        <button
                          onClick={() => beginEdit(r)}
                          className="shrink-0 p-0.5 text-zinc-300 hover:text-zinc-700"
                          title="제목 수정"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate" title={r.file_name}>
                        {r.file_name} · {formatSize(r.file_size)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => toggleEnabled(r)}
                  className={clsx(
                    'flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transition',
                    r.is_enabled
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-zinc-400 hover:bg-zinc-100'
                  )}
                >
                  {r.is_enabled ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  {r.is_enabled ? '공개' : '숨김'}
                </button>

                <div className="flex items-center gap-1">
                  {onInsert && (
                    <button
                      onClick={() => onInsert(r)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition"
                      title="본문 커서 위치에 자료 카드 삽입"
                    >
                      <CornerDownLeft size={12} /> 본문 삽입
                    </button>
                  )}
                  <button
                    onClick={() => swapOrder(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                    title="위로"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => swapOrder(i, 1)}
                    disabled={i === resources.length - 1}
                    className="p-1 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                    title="아래로"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => deleteResource(r.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
