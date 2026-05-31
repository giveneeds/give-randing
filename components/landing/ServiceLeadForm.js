'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Coins,
  Loader2,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react';
import { getTrackingSnapshot, trackEvent } from '@/lib/tracker';
import { metaContact } from '@/lib/analytics/metaPixel';

const BUDGET_OPTIONS = [
  { id: 'under_100', label: '100만원 이하' },
  { id: '100_500', label: '100~500만원' },
  { id: '500_1000', label: '500~1000만원' },
  { id: 'over_1000', label: '1000만원 이상' },
  { id: 'undecided', label: '미정' },
];

function formatPhone(value) {
  const numbers = value.replace(/[^\d]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

function validatePhone(phone) {
  return /^01[016789]-\d{3,4}-\d{4}$/.test(phone);
}

export default function ServiceLeadForm({ service, preview = false }) {
  const [values, setValues] = useState({
    name: '',
    phone: '',
    company_name: '',
    budget: '',
    message: '',
    agree: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const setField = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (preview) {
      setErrorMessage('미리보기에서는 상담 요청이 전송되지 않습니다.');
      return;
    }

    const name = values.name.trim();
    const phone = values.phone.trim();
    const companyName = values.company_name.trim();
    const message = values.message.trim();

    if (!name) {
      setErrorMessage('이름을 입력해 주세요.');
      return;
    }
    if (!validatePhone(phone)) {
      setErrorMessage('올바른 전화번호 형식으로 입력해 주세요. (예: 010-1234-5678)');
      return;
    }
    if (!companyName) {
      setErrorMessage('회사명을 입력해 주세요.');
      return;
    }
    if (!values.budget) {
      setErrorMessage('월 예상 예산을 선택해 주세요.');
      return;
    }
    if (!values.agree) {
      setErrorMessage('개인정보 수집 및 마케팅 활용에 동의해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const tracking = getTrackingSnapshot();
      const payload = {
        name,
        phone,
        company_name: companyName,
        budget: values.budget,
        message: message || null,
        service_id: service?.id || null,
        service_slug: service?.slug || null,
        category: service?.category || 'service',
        lead_type: 'service_basic_form',
        inquiry_type: 'service_consultation',
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: `service_inpage_form:${service?.slug || 'unknown'}`,
        agreements: { service_inquiry: true, marketing: true },
        ...tracking,
      };

      trackEvent('form_submit', {
        form: 'service_inpage_form',
        service_slug: service?.slug || null,
        service_title: service?.title || null,
        page: payload.source_page,
      });

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '문의 등록에 실패했습니다.');

      metaContact({
        content_name: service?.title || 'service_consultation',
        content_category: 'service',
        lead_type: payload.lead_type,
        service_slug: service?.slug || null,
        page_path: payload.source_page,
      });

      setValues({
        name: '',
        phone: '',
        company_name: '',
        budget: '',
        message: '',
        agree: false,
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section
        id="service-inquiry"
        className="scroll-mt-28 mt-12 bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm text-center"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <CheckCircle2 size={30} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">
          Request Received
        </p>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-3">
          문의가 접수되었습니다
        </h2>
        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          담당자가 내용을 확인한 뒤 영업일 기준 1일 이내에 연락드리겠습니다.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 px-6 py-3 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-white/15 transition-colors"
        >
          추가 문의 작성
        </button>
      </section>
    );
  }

  return (
    <section
      id="service-inquiry"
      className="scroll-mt-28 mt-12 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
    >
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">
          {preview ? 'Preview Inquiry' : 'Service Inquiry'}
        </p>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-3">
          {service?.title || '서비스'} 상담 요청
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          {preview ? '관리자 미리보기 화면입니다. 실제 문의는 저장 후 공개 페이지에서만 전송됩니다.' : '필요한 정보를 남겨주시면 해당 상품 담당자가 확인 후 연락드립니다.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
              이름
            </span>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                autoComplete="name"
                value={values.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="홍길동"
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/20 focus:border-zinc-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
              전화번호
            </span>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                required
                autoComplete="tel"
                value={values.phone}
                onChange={(e) => setField('phone', formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                maxLength={13}
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/20 focus:border-zinc-400"
              />
            </div>
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
            회사명
          </span>
          <div className="relative">
            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              required
              autoComplete="organization"
              value={values.company_name}
              onChange={(e) => setField('company_name', e.target.value)}
              placeholder="회사명 또는 브랜드명"
              className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/20 focus:border-zinc-400"
            />
          </div>
        </label>

        <div>
          <span className="flex items-center gap-1.5 text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
            <Coins size={13} /> 월 예상 예산
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BUDGET_OPTIONS.map((option) => {
              const selected = values.budget === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setField('budget', option.id)}
                  className={`min-h-11 px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                    selected
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:border-zinc-400'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="block text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
            요청사항
          </span>
          <div className="relative">
            <MessageSquare size={16} className="absolute left-4 top-4 text-zinc-400" />
            <textarea
              rows={4}
              value={values.message}
              onChange={(e) => setField('message', e.target.value)}
              placeholder="현재 상황이나 궁금한 내용을 자유롭게 적어주세요. 선택 입력입니다."
              className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/20 focus:border-zinc-400 resize-none"
            />
          </div>
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.agree}
            onChange={(e) => setField('agree', e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
          />
          <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
            <span className="text-zinc-900 dark:text-zinc-200 font-semibold">개인정보 수집 및 마케팅 활용</span>에 동의합니다. (필수)
          </span>
        </label>

        {errorMessage && (
          <p className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
            <AlertCircle size={13} /> {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || preview}
          className="w-full min-h-14 flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          {preview ? '미리보기에서는 제출 비활성' : submitting ? '제출 중' : '상담 요청하기'}
        </button>
      </form>
    </section>
  );
}
