'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Download, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ResourceDownloads({
  parentType = 'magazine',
  parentId,
  magazineId,         // 하위 호환
  slug,
  redirectPath,       // 로그인 후 돌아갈 경로 (미지정 시 parent 유형에 따라 기본값)
  resources,
}) {
  const { user, loading: authLoading } = useAuth();
  const [downloading, setDownloading] = useState(null);

  const effectiveParentId = parentId ?? magazineId;
  const effectiveParentType = parentId ? parentType : (magazineId ? 'magazine' : parentType);

  if (!resources || resources.length === 0) return null;

  const defaultRedirect = effectiveParentType === 'campaign'
    ? `/landing/${slug}`
    : `/magazine/${slug}`;
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath || defaultRedirect)}`;

  async function handleDownload(resource) {
    if (!user) return;
    setDownloading(resource.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `/api/${effectiveParentType}s/${effectiveParentId}/resources/${resource.id}/download`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '다운로드 실패');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert('다운로드 실패: ' + e.message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="mt-16 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] font-black tracking-[0.3em] text-zinc-500 dark:text-zinc-400 uppercase">
          이 글의 자료
        </span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <ul className="space-y-3">
        {resources.map((r) => {
          const isBusy = downloading === r.id;
          const ext = (r.file_name || '').split('.').pop()?.toUpperCase().slice(0, 5) || 'FILE';
          return (
            <li
              key={r.id}
              className="flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md hover:border-zinc-900 dark:hover:border-white transition-all hover:-translate-y-0.5"
            >
              <div className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 text-[10px] font-black tracking-widest">
                {ext}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
                  Resource
                </div>
                <p className="text-sm md:text-base font-black text-zinc-900 dark:text-white truncate leading-tight tracking-tight">
                  {r.title}
                </p>
                {r.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {r.description}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium truncate">
                  {r.file_name}
                  {r.file_size ? ` · ${formatSize(r.file_size)}` : ''}
                </p>
              </div>

              <div className="shrink-0">
                {authLoading ? (
                  <div className="w-28 h-10 flex items-center justify-center text-zinc-300">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : user ? (
                  <button
                    type="button"
                    onClick={() => handleDownload(r)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    {isBusy ? '준비중' : '다운로드'}
                  </button>
                ) : (
                  <Link
                    href={loginHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FEE500] text-zinc-900 text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition"
                  >
                    <Lock size={12} />
                    카카오 로그인 후
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
