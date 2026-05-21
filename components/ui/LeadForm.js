'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  MessageCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { isDummyMode, supabase } from '@/lib/supabase';
import { signInWithKakao } from '@/lib/authKakao';
import { getTrackingSnapshot, trackEvent } from '@/lib/tracker';
import { ga } from '@/lib/analytics/ga4';
import { metaLead } from '@/lib/analytics/metaPixel';
import { AVAILABLE_FIELDS, DEFAULT_BASIC_FORM_FIELDS, normalizeBasicFormFields, validateFieldValue } from '@/lib/leadFormFields';

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_giveneeds';
const FIELD_ICONS = { name: User, phone: Phone, email: Mail };

/**
 * LeadForm — 리드 마그넷 / 캠페인 LP 의 리드 캡처 컴포넌트.
 *
 * @param {'kakao'|'basic'} formMode - 'kakao' (기본): 카카오 OAuth 로그인 흐름 / 'basic': 이름+전화번호 입력 폼.
 *                                     캠페인의 hero_content.lead_form_mode 로 결정됨.
 */
export default function LeadForm({ title, subtitle, ctaLabel, campaignId, magazineId, category = 'organic', formMode = 'kakao', basicFormFields }) {
  const searchParams = useSearchParams();
  const shouldAutoDownload = searchParams?.get('lead_dl') === '1';

  const [phase, setPhase] = useState(shouldAutoDownload ? 'processing' : 'idle');
  // 'idle' → 'processing' → 'downloaded' | 'submitted' | 'no-resource' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadInfo, setDownloadInfo] = useState(null);
  // { url, fileName }
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // Basic form: 어드민 설정 기반 동적 필드. 미설정이면 레거시 기본값.
  const fields = normalizeBasicFormFields(basicFormFields);
  const [basicValues, setBasicValues] = useState(() => {
    const init = { agree: false };
    fields.forEach((f) => { init[f.id] = ''; });
    return init;
  });
  const [basicSubmitting, setBasicSubmitting] = useState(false);

  function setFieldValue(id, value) {
    setBasicValues((prev) => ({ ...prev, [id]: value }));
  }

  // GA4: 폼 노출 1회 발화 (idle 상태일 때만)
  useEffect(() => {
    if (phase === 'idle') {
      ga.leadFormView({ formMode, campaignId });
    }
  }, [phase, formMode, campaignId]);

  const triggerBrowserDownload = useCallback((url, fileName) => {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    if (fileName) a.download = fileName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const fetchAndDownload = useCallback(async () => {
    if (!campaignId && !magazineId) {
      throw new Error('연결된 캠페인 또는 매거진이 없습니다.');
    }
    const parentType = campaignId ? 'campaigns' : 'magazines';
    const parentId = campaignId || magazineId;

    const listRes = await fetch(`/api/${parentType}/${parentId}/resources`);
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error || '자료 조회 실패');

    const resource = (listData.resources || [])[0];
    if (!resource) {
      const noRes = new Error('등록된 자료가 없습니다.');
      noRes.code = 'NO_RESOURCE';
      throw noRes;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const dlRes = await fetch(`/api/${parentType}/${parentId}/resources/${resource.id}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    });
    const dlData = await dlRes.json();
    if (!dlRes.ok) throw new Error(dlData.error || '다운로드 URL 발급 실패');

    triggerBrowserDownload(dlData.url, resource.file_name);
    return { url: dlData.url, fileName: resource.file_name };
  }, [campaignId, magazineId, triggerBrowserDownload]);

  const registerLead = useCallback(async (user) => {
    try {
      const tracking = getTrackingSnapshot();
      const meta = user.user_metadata || {};
      const payload = {
        name: meta.name || meta.full_name || meta.preferred_username || '카카오 사용자',
        email: user.email || meta.email || null,
        phone: meta.phone_number || null,
        campaign_id: campaignId || null,
        magazine_id: magazineId || null,
        lead_type: campaignId ? 'campaign_kakao_oauth' : 'magazine_kakao_oauth',
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: 'lead_magnet_kakao',
        agreements: { lead_magnet: true },
        ...tracking,
      };
      trackEvent('form_submit', { form: 'lead_magnet_oauth', category, page: payload.source_page });
      ga.leadFormSubmit({ formMode: 'kakao', campaignId, leadType: payload.lead_type });
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        metaLead({
          content_name: payload.lead_type,
          content_category: category,
          lead_type: payload.lead_type,
          form_mode: 'kakao',
          campaign_id: campaignId || null,
          magazine_id: magazineId || null,
        });
      }
    } catch (err) {
      console.warn('lead register failed (계속 진행):', err?.message);
    }
  }, [campaignId, magazineId, category]);

  // Kakao OAuth 콜백 후 자동 다운로드 흐름
  useEffect(() => {
    if (!shouldAutoDownload) return;
    if (isDummyMode) {
      setErrorMessage('현재 환경에서는 다운로드가 비활성화되어 있습니다.');
      setPhase('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) {
          setErrorMessage('로그인이 만료되었습니다. 다시 시도해 주세요.');
          setPhase('error');
          return;
        }
        await registerLead(user);
        const info = await fetchAndDownload();
        if (cancelled) return;
        setDownloadInfo(info);
        setPhase('downloaded');
      } catch (err) {
        if (cancelled) return;
        console.error('lead magnet auto-download failed:', err);
        if (err.code === 'NO_RESOURCE') {
          setPhase('no-resource');
        } else {
          setErrorMessage(err.message || '다운로드 처리 중 오류가 발생했습니다.');
          setPhase('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [shouldAutoDownload, fetchAndDownload, registerLead]);

  const handleKakaoClick = async () => {
    if (typeof window === 'undefined') return;
    ga.kakaoLoginStart({ campaignId, pagePath: window.location.pathname });
    setKakaoLoading(true);
    const next = `${window.location.pathname}?lead_dl=1`;
    const result = await signInWithKakao(next);
    if (!result.ok) {
      setErrorMessage(result.error || '카카오 로그인 시작에 실패했습니다.');
      setPhase('error');
      setKakaoLoading(false);
    }
  };

  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 동의 체크 + 필드 검증
    if (!basicValues.agree) { setErrorMessage('개인정보 수집 및 마케팅 활용에 동의해 주세요.'); return; }
    for (const field of fields) {
      const err = validateFieldValue(field, basicValues[field.id]);
      if (err) { setErrorMessage(err); return; }
    }
    // 연락 수단 최소 1개 확보 (전화 or 이메일)
    const phoneVal = (basicValues.phone || '').trim();
    const emailVal = (basicValues.email || '').trim();
    if (!phoneVal && !emailVal) {
      setErrorMessage('연락 가능한 전화번호 또는 이메일 중 하나는 반드시 입력해 주세요.');
      return;
    }

    setBasicSubmitting(true);
    try {
      const tracking = getTrackingSnapshot();
      const payload = {
        campaign_id: campaignId || null,
        magazine_id: magazineId || null,
        lead_type: campaignId ? 'campaign_basic_form' : 'magazine_basic_form',
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: 'lead_magnet_basic',
        agreements: { lead_magnet: true, marketing: true },
        ...tracking,
      };
      // 필드 값을 leads 컬럼 키로 매핑
      fields.forEach((f) => {
        const meta = AVAILABLE_FIELDS[f.id];
        if (!meta) return;
        const val = (basicValues[f.id] ?? '').toString().trim();
        payload[meta.columnKey] = val || null;
      });
      // 이름이 폼에 없으면 익명으로 — leads 테이블은 name 이 NOT NULL 이 아니지만 API validation 은 name 필요
      if (!payload.name) payload.name = '이름 미입력';

      trackEvent('form_submit', { form: 'lead_magnet_basic', category, page: payload.source_page });
      ga.leadFormSubmit({ formMode: 'basic', campaignId, leadType: payload.lead_type });
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '리드 등록에 실패했습니다.');
      }
      metaLead({
        content_name: payload.lead_type,
        content_category: category,
        lead_type: payload.lead_type,
        form_mode: 'basic',
        campaign_id: campaignId || null,
        magazine_id: magazineId || null,
      });
      const cleared = { agree: false };
      fields.forEach((f) => { cleared[f.id] = ''; });
      setBasicValues(cleared);
      setPhase('submitted');
    } catch (err) {
      setErrorMessage(err.message || '제출 중 오류가 발생했습니다.');
      setPhase('error');
    } finally {
      setBasicSubmitting(false);
    }
  };

  const handleRedownload = async () => {
    setKakaoLoading(true);
    try {
      const info = await fetchAndDownload();
      setDownloadInfo(info);
    } catch (err) {
      setErrorMessage(err.message || '다시 다운로드에 실패했습니다.');
      setPhase('error');
    } finally {
      setKakaoLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[320px] sm:max-w-lg md:max-w-3xl mx-auto group overflow-hidden">
      {/* 🔮 Background Blur Orbs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />

      <AnimatePresence mode="wait">
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center p-10 sm:p-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-[40px] border border-zinc-200/60 dark:border-white/10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-h-[360px]"
          >
            <Loader2 size={40} className="text-primary animate-spin mb-6" />
            <h3 className="text-lg sm:text-2xl font-black tracking-tighter mb-2 text-zinc-900 dark:text-white">
              자료를 준비하고 있어요
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
              잠시 후 자동으로 다운로드가 시작됩니다.
            </p>
          </motion.div>
        )}

        {(phase === 'downloaded' || phase === 'no-resource') && (
          <motion.div
            key="downloaded"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-[40px] border border-zinc-200/60 dark:border-white/5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-12 sm:py-20"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary text-white rounded-full flex items-center justify-center mb-5 sm:mb-8 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <CheckCircle2 size={32} className="sm:hidden" />
              <CheckCircle2 size={48} className="hidden sm:block" />
            </div>
            <h3 className="text-xl sm:text-3xl font-black mb-2 sm:mb-4 tracking-tighter text-zinc-900 dark:text-white">
              {phase === 'downloaded' ? '다운로드가 시작됐습니다!' : '자료가 곧 공개됩니다'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-10 text-sm sm:text-base leading-relaxed max-w-[300px] mx-auto">
              {phase === 'downloaded'
                ? '브라우저 다운로드 폴더에서 자료를 확인하세요. 새 인사이트가 업데이트되면 카카오 채널로 가장 먼저 알려드릴게요.'
                : '자료 등록이 완료되는 즉시 카카오 채널로 알려드릴게요. 채널을 추가하고 기다려주세요.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full max-w-sm">
              {phase === 'downloaded' && downloadInfo && (
                <button
                  onClick={handleRedownload}
                  disabled={kakaoLoading}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-xs sm:text-sm hover:scale-[1.02] transition-transform disabled:opacity-60"
                >
                  {kakaoLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  다시 다운로드
                </button>
              )}
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FEE500] text-[#191919] rounded-full font-bold text-xs sm:text-sm hover:scale-[1.02] transition-transform"
              >
                <MessageCircle size={14} fill="currentColor" />
                카카오 채널 친구추가
              </a>
            </div>
          </motion.div>
        )}

        {phase === 'submitted' && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-[40px] border border-zinc-200/60 dark:border-white/5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-12 sm:py-20"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary text-white rounded-full flex items-center justify-center mb-5 sm:mb-8 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <CheckCircle2 size={32} className="sm:hidden" />
              <CheckCircle2 size={48} className="hidden sm:block" />
            </div>
            <h3 className="text-xl sm:text-3xl font-black mb-2 sm:mb-4 tracking-tighter text-zinc-900 dark:text-white">
              신청이 완료됐어요!
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-10 text-sm sm:text-base leading-relaxed max-w-[320px] mx-auto">
              담당자가 영업일 기준 1일 이내에 연락드릴게요. 입력하신 연락처로 결과를 안내드립니다.
            </p>
            <a
              href={KAKAO_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FEE500] text-[#191919] rounded-full font-bold text-xs sm:text-sm hover:scale-[1.02] transition-transform"
            >
              <MessageCircle size={14} fill="currentColor" />
              카카오 채널 친구추가하고 빠른 응답 받기
            </a>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center justify-center p-8 sm:p-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-[40px] border border-rose-200/60 dark:border-rose-500/20 text-center min-h-[320px]"
          >
            <AlertCircle size={36} className="text-rose-500 mb-4" />
            <h3 className="text-lg sm:text-2xl font-black tracking-tighter mb-2 text-zinc-900 dark:text-white">
              자료를 받지 못했습니다
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-xs sm:text-sm leading-relaxed max-w-[300px]">
              {errorMessage || '잠시 후 다시 시도해 주세요.'}
            </p>
            <button
              onClick={() => { setErrorMessage(''); setPhase('idle'); }}
              className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-xs sm:text-sm"
            >
              다시 시도
            </button>
          </motion.div>
        )}

        {phase === 'idle' && formMode === 'kakao' && (
          <motion.div
            key="form-kakao"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-3xl p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[40px] border border-zinc-200/60 dark:border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] sm:tracking-[0.3em] text-primary uppercase mb-1.5 sm:mb-3 block">
              Lead Magnet
            </span>
            <h2 className="text-lg sm:text-3xl md:text-4xl font-black mb-1.5 sm:mb-3 tracking-tighter leading-tight text-zinc-900 dark:text-white break-keep">
              {title || 'Premium Resource'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-base md:text-lg font-medium leading-relaxed break-keep mb-5 sm:mb-7">
              {subtitle || '카카오로 3초 만에 로그인하시면 자료가 즉시 다운로드됩니다.'}
            </p>

            <button
              onClick={handleKakaoClick}
              disabled={kakaoLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#191919] py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base hover:translate-y-[-2px] hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {kakaoLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <MessageCircle size={20} fill="currentColor" />
              )}
              {ctaLabel || '카카오로 시작하고 자료 받기'}
              {!kakaoLoading && <ArrowRight size={18} />}
            </button>

            <div className="flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase pt-4 sm:pt-5">
              <ShieldCheck size={11} /> SSL Secure · 카카오 인증
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug mt-3 sm:mt-4 text-center break-keep">
              로그인 시 <span className="text-zinc-900 dark:text-zinc-200">개인정보 수집 및 마케팅 활용</span>에 동의하는 것으로 간주됩니다.
            </p>
          </motion.div>
        )}

        {phase === 'idle' && formMode === 'basic' && (
          <motion.form
            key="form-basic"
            onSubmit={handleBasicSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-3xl p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[40px] border border-zinc-200/60 dark:border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] sm:tracking-[0.3em] text-primary uppercase mb-1.5 sm:mb-3 block">
              Lead Magnet
            </span>
            <h2 className="text-lg sm:text-3xl md:text-4xl font-black mb-1.5 sm:mb-3 tracking-tighter leading-tight text-zinc-900 dark:text-white break-keep">
              {title || '상담 신청'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-base md:text-lg font-medium leading-relaxed break-keep mb-5 sm:mb-7">
              {subtitle || '아래 정보를 남겨주시면 영업일 기준 1일 이내에 연락드립니다.'}
            </p>

            <div className="space-y-3 mb-4">
              {fields.map((field) => {
                const meta = AVAILABLE_FIELDS[field.id];
                if (!meta) return null;
                const Icon = FIELD_ICONS[field.id];
                const labelText = field.label || meta.label;
                const placeholderText = field.placeholder || meta.placeholder;

                if (field.inputType === 'button_select') {
                  const opts = field.options && field.options.length > 0 ? field.options : (meta.defaultOptions || []);
                  return (
                    <div key={field.id} className="block">
                      <span className="block text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {labelText}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((opt) => {
                          const selected = basicValues[field.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFieldValue(field.id, selected ? '' : opt.value)}
                              className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                                selected
                                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                                  : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (meta.htmlType === 'textarea') {
                  return (
                    <label key={field.id} className="block">
                      <span className="block text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {labelText}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
                      </span>
                      <textarea
                        rows={3}
                        required={field.required}
                        placeholder={placeholderText}
                        value={basicValues[field.id] || ''}
                        onChange={(e) => setFieldValue(field.id, e.target.value)}
                        className="w-full px-4 py-3.5 sm:py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm sm:text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                      />
                    </label>
                  );
                }

                return (
                  <label key={field.id} className="block">
                    <span className="sr-only">{labelText}</span>
                    <div className="relative">
                      {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />}
                      <input
                        type={meta.htmlType || 'text'}
                        required={field.required}
                        autoComplete={meta.autoComplete}
                        placeholder={field.required ? placeholderText : `${placeholderText} (선택)`}
                        value={basicValues[field.id] || ''}
                        onChange={(e) => setFieldValue(field.id, e.target.value)}
                        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 sm:py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm sm:text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary`}
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={basicValues.agree}
                onChange={(e) => setFieldValue('agree', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary/40"
              />
              <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                <span className="text-zinc-900 dark:text-zinc-200 font-semibold">개인정보 수집 및 마케팅 활용</span>에 동의합니다. (필수)
              </span>
            </label>

            {errorMessage && (
              <p className="text-xs text-rose-500 mb-3 flex items-center gap-1.5">
                <AlertCircle size={12} /> {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={basicSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base hover:translate-y-[-2px] hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {basicSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {ctaLabel || '무료 상담 신청하기'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase pt-4 sm:pt-5">
              <ShieldCheck size={11} /> SSL Secure · 정보는 안전하게 보관됩니다
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
