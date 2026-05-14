'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Send, ToggleLeft, ToggleRight, Copy, Trash2 } from 'lucide-react';

export default function ContentStudioTelegramPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content-studio/telegram-recipients', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      alert('수신자 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhook/telegram`);
    }
  }, []);

  async function toggleActive(id, active) {
    const res = await fetch(`/api/admin/content-studio/telegram-recipients/${id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ active }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert('업데이트 실패: ' + (data.error || ''));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.row } : r)));
  }

  async function remove(id) {
    if (!confirm('이 수신자를 삭제하시겠어요? 다시 봇과 대화하면 자동 재등록됩니다.')) return;
    const res = await fetch(`/api/admin/content-studio/telegram-recipients/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('삭제 실패: ' + (data.error || ''));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    alert('복사 완료');
  }

  const setupCmd = webhookUrl
    ? `curl -F "url=${webhookUrl}" -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"`
    : '';

  return (
    <div className="space-y-5">
      <div className="bg-zinc-50 border border-[var(--admin-border)] rounded-md p-5 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">봇 셋업 가이드</div>
        <ol className="text-[12px] text-zinc-700 leading-relaxed list-decimal pl-5 space-y-1">
          <li>텔레그램에서 <code className="px-1 bg-white border rounded text-[11px]">@BotFather</code>와 대화 → <code className="px-1 bg-white border rounded text-[11px]">/newbot</code>으로 봇 생성, 토큰 발급</li>
          <li><code className="px-1 bg-white border rounded text-[11px]">.env.local</code>에 <code className="px-1 bg-white border rounded text-[11px]">TELEGRAM_BOT_TOKEN</code>·<code className="px-1 bg-white border rounded text-[11px]">TELEGRAM_WEBHOOK_SECRET</code> 추가 후 서버 재시작</li>
          <li>아래 명령으로 webhook 등록 (배포 환경에서):</li>
        </ol>
        <div className="bg-white border border-zinc-200 rounded p-3 text-[11px] text-zinc-700 font-mono break-all">
          {setupCmd || 'URL 로드 중…'}
        </div>
        <button
          onClick={() => copy(setupCmd)}
          disabled={!setupCmd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-white transition disabled:opacity-50"
        >
          <Copy size={12} /> 명령 복사
        </button>
        <p className="text-[11px] text-zinc-500">
          로컬 테스트는 ngrok / cloudflared 터널로 임시 https URL을 만들어 사용.
          봇을 만들었다면 본인 텔레그램에서 <strong>봇과 대화 시작 → 아무 메시지나 전송</strong>하면 아래 목록에 자동 등록됩니다.
        </p>
      </div>

      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <Send size={32} strokeWidth={1} className="mx-auto mb-3" />
            <p className="text-sm">등록된 수신자가 없습니다.</p>
            <p className="text-xs mt-1 text-zinc-300">봇과 대화를 시작하면 자동으로 여기에 추가됩니다.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['chat_id', '핸들', '표시명', '활성', '첫 접속', '활성화', '액션'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/80 transition">
                  <td className="px-4 py-3 text-[11px] text-zinc-700 font-mono">{r.chat_id}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-600">{r.username ? `@${r.username}` : '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-800">{r.display_name || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(r.id, !r.active)}
                      className={'inline-flex items-center gap-1 text-[11px] font-bold ' + (r.active ? 'text-emerald-600' : 'text-zinc-400')}
                    >
                      {r.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      {r.active ? '수신' : '대기'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-zinc-500">
                    {r.first_seen_at ? new Date(r.first_seen_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-zinc-500">
                    {r.activated_at ? new Date(r.activated_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700 transition" title="삭제">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
