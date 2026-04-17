import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  MessageCircle, 
  Download, 
  User, 
  Mail, 
  Phone,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { isDummyMode } from '@/lib/supabase';
import { getTrackingSnapshot, trackEvent } from '@/lib/tracker';

export default function LeadForm({ title, subtitle, ctaLabel, campaignId, magazineId, category = 'organic' }) {
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);

  const formatPhone = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const validatePhone = (phone) => {
    return /^01[016789]-\d{3,4}-\d{4}$/.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAgreed) {
      alert('개인정보 수집 및 마케팅 활용에 동의해 주세요.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setPhoneError('올바른 전화번호 형식으로 입력해주세요. (예: 010-1234-5678)');
      return;
    }
    setPhoneError('');
    
    try {
      const tracking = getTrackingSnapshot();
      const payload = {
        ...formData,
        campaign_id: campaignId,
        magazine_id: magazineId,
        lead_type: category,
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: 'lead_form_cta',
        ...tracking,
      };
      trackEvent('form_submit', { form: 'lead_form', category, page: payload.source_page });

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('제출 실패');
      setSubmitted(true);
    } catch (err) {
      console.error('Lead submission failed:', err);
      alert('신청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="relative w-full max-w-[320px] sm:max-w-lg md:max-w-3xl mx-auto group">
      {/* 🔮 Background Blur Orbs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-[40px] border border-white/20 dark:border-white/5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-12 sm:py-20"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary text-white rounded-full flex items-center justify-center mb-5 sm:mb-8 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <CheckCircle2 size={32} className="sm:hidden" />
              <CheckCircle2 size={48} className="hidden sm:block" />
            </div>
            <h3 className="text-xl sm:text-3xl font-black mb-2 sm:mb-4 tracking-tighter">신청이 완료되었습니다!</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-12 text-sm sm:text-lg leading-relaxed max-w-[280px] mx-auto">
              영업일 기준 2일 이내에 전용 마케팅 전략 자료를 보내드립니다.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 sm:px-10 py-3 sm:py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm sm:text-base hover:scale-105 transition-transform"
            >
              다시 확인하기
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full bg-white/5 dark:bg-zinc-900/60 backdrop-blur-3xl p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[40px] border border-white/20 dark:border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.2)] overflow-hidden md:grid md:grid-cols-[1fr_1.1fr] md:gap-10 md:items-center"
          >
            <div className="mb-4 sm:mb-6 md:mb-0">
              <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] sm:tracking-[0.3em] text-primary uppercase mb-1.5 sm:mb-3 block">
                Lead Magnet
              </span>
              <h2 className="text-base sm:text-3xl md:text-4xl font-black mb-1.5 sm:mb-3 tracking-tighter leading-tight dark:text-white break-keep">
                {title || 'Premium Resource'}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-base md:text-lg font-medium leading-relaxed break-keep">
                {subtitle || '전략 리포트를 받기 위해 정보를 입력해주세요.'}
              </p>

              {/* 💛 Kakao — 데스크탑 전용 (모바일은 공간 절약) */}
              <button className="hidden md:flex w-full items-center justify-center gap-3 bg-[#FEE500] text-[#191919] py-4 rounded-2xl font-black text-base mt-8 hover:translate-y-[-2px] hover:shadow-xl transition-all active:scale-[0.98]">
                <MessageCircle size={20} fill="currentColor" />
                카카오로 3초 만에 시작하기
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
              {/* Name Field */}
              <div className="relative group border-b border-zinc-200 dark:border-white/10 focus-within:border-primary transition-colors pb-1">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="성함" 
                  required 
                  className="w-full pl-7 pr-2 py-2 sm:py-3 bg-transparent border-none text-sm sm:text-base font-bold outline-none dark:text-white placeholder:text-zinc-500 placeholder:font-normal"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Email Field */}
              <div className="relative group border-b border-zinc-200 dark:border-white/10 focus-within:border-primary transition-colors pb-1">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="이메일 주소" 
                  required 
                  className="w-full pl-7 pr-2 py-2 sm:py-3 bg-transparent border-none text-sm sm:text-base font-bold outline-none dark:text-white placeholder:text-zinc-500 placeholder:font-normal"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {/* Phone Field */}
              <div className="relative group border-b border-zinc-200 dark:border-white/10 focus-within:border-primary transition-colors pb-1">
                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="tel" 
                  placeholder="연락처 (가이드 수령용)" 
                  required 
                  className={`w-full pl-8 pr-4 py-3 bg-transparent border-none text-base font-bold outline-none dark:text-white placeholder:text-zinc-500 placeholder:font-normal
                    ${phoneError ? 'text-rose-500' : ''}`}
                  value={formData.phone}
                  onChange={e => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({...formData, phone: formatted});
                    if (phoneError) setPhoneError('');
                  }}
                  maxLength={13}
                />
                {phoneError && (
                  <p className="absolute -bottom-6 left-0 text-[10px] text-rose-500 font-bold tracking-tight">{phoneError}</p>
                )}
              </div>
              
              {/* Privacy Consent */}
              <div className="flex items-start gap-2.5 sm:gap-3 pt-2 pb-1 group cursor-pointer" onClick={() => setIsAgreed(!isAgreed)}>
                <div className={`mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center transition-all border-2 shrink-0
                  ${isAgreed ? 'bg-primary border-primary' : 'bg-transparent border-zinc-300 dark:border-white/10 group-hover:border-primary'}`}
                >
                  {isAgreed && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug font-medium break-keep">
                  <span className="text-zinc-900 dark:text-zinc-300">개인정보 수집 및 마케팅 활용(선택)</span>에 동의하며 마케팅 리포트 수신을 수락합니다.
                </p>
              </div>

              <button
                type="submit"
                className="w-full group/btn relative overflow-hidden py-3 sm:py-5 bg-zinc-900 dark:bg-primary text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_15px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10">{ctaLabel || '지금 신청하기'}</span>
                <ArrowRight size={16} className="relative z-10 group-hover/btn:translate-x-1 transition-transform sm:hidden" />
                <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform hidden sm:block" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-zinc-400 tracking-widest uppercase break-keep text-center pt-1">
                <ShieldCheck size={11} /> SSL Secure
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
