'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isDummyMode } from '@/lib/supabase';
import { appendCTA } from '@/lib/userTrail';
import { 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Coins, 
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';

const BUDGET_OPTIONS = [
  { id: 'under_100', label: '100만원 이하' },
  { id: '100_500', label: '100~500만원' },
  { id: '500_1000', label: '500~1000만원' },
  { id: 'over_1000', label: '1000만원 이상' },
  { id: 'undecided', label: '정하고 선택할래요', special: true },
];

export default function ContactForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company_name: '',
    website_url: '',
    budget: '',
    message: '',
    inquiry_type: 'general'
  });

  const [isMessageRequired, setIsMessageRequired] = useState(false);

  // 전화번호 자동 하이픈 포맷터
  const formatPhone = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 전화번호 유효성 검사 (010-XXXX-XXXX 형식)
  const validatePhone = (phone) => {
    return /^01[016789]-\d{3,4}-\d{4}$/.test(phone);
  };

  useEffect(() => {
    // '정하고 선택할래요' 선택 시 메시지 입력 필수 처리
    setIsMessageRequired(formData.budget === 'undecided');
  }, [formData.budget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePhone(formData.phone)) {
      setPhoneError('올바른 전화번호 형식으로 입력해주세요. (예: 010-1234-5678)');
      return;
    }
    setPhoneError('');
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        lead_type: 'consultation',
        source_page: typeof window !== 'undefined' ? window.location.pathname : '/contact',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: 'contact_form_cta',
      };

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '제출 실패');

      setSubmitted(true);
      setTimeout(() => { router.back(); }, 1500);
    } catch (err) {
      console.error('Inquiry submission failed:', err);
      alert(`문의 제출 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 md:p-24 bg-white/5 backdrop-blur-3xl rounded-[3rem] text-center border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* 상단 장식 요소 */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] -z-10" />

        <div className="w-24 h-24 bg-white text-zinc-900 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
          <CheckCircle2 size={48} strokeWidth={1.5} />
        </div>
        <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter">소중한 문의가 접수되었습니다.</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-12 text-lg max-w-md leading-relaxed">
          마케팅 전문가가 비즈니스를 정밀 분석한 후,<br/>
          영업일 기준 2일 이내에 연락드리겠습니다.
        </p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="px-10 py-4 bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white rounded-full font-bold hover:bg-zinc-200 dark:hover:bg-white/20 transition-all active:scale-95"
        >
          홈으로 돌아가기
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* STEP 1: 기본 정보 */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">01</div>
            <h3 className="text-lg font-black tracking-tight uppercase text-zinc-900 dark:text-white">기본 정보</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">성함</label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="홍길동"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-zinc-200 dark:border-white/10 focus:border-primary outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">연락처</label>
              <div className="relative">
                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="tel" 
                  required
                  placeholder="010-0000-0000"
                  className={`w-full pl-8 pr-4 py-3 bg-transparent border-b outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600
                    ${phoneError ? 'border-rose-500' : 'border-zinc-200 dark:border-white/10 focus:border-primary'}`}
                  value={formData.phone}
                  onChange={e => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({...formData, phone: formatted});
                    if (phoneError) setPhoneError('');
                  }}
                  maxLength={13}
                />
              </div>
              {phoneError && (
                <p className="text-[10px] text-rose-500 ml-1 font-bold animate-pulse absolute -bottom-5">{phoneError}</p>
              )}
            </div>

            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">회사명 / 브랜드명</label>
              <div className="relative">
                <Building2 className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="기브니즈코리아"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-zinc-200 dark:border-white/10 focus:border-primary outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">이메일</label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="hello@giveneeds.com"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-zinc-200 dark:border-white/10 focus:border-primary outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: 분석 정보 */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">02</div>
            <h3 className="text-lg font-black tracking-tight uppercase text-zinc-900 dark:text-white">분석 및 예산</h3>
          </div>

          <div className="space-y-10">
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">홈페이지 (또는 분석할 상품 링크)</label>
              <div className="relative">
                <Globe className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="www.your-brand.com (또는 상품 링크)"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-zinc-200 dark:border-white/10 focus:border-primary outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  value={formData.website_url}
                  onChange={e => setFormData({...formData, website_url: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-[10px] font-black text-zinc-400 ml-1 uppercase tracking-[0.2em] flex items-center gap-2">
                <Coins size={14} className="text-primary" /> 월 예상 마케팅 예산
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({...formData, budget: opt.id})}
                    className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border
                      ${formData.budget === opt.id 
                        ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-[1.02]' 
                        : 'bg-white/5 dark:bg-zinc-900/50 border-zinc-100 dark:border-white/5 text-zinc-500 hover:border-primary/50'
                      } ${opt.special ? 'border-dashed' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STEP 3: 상세 문의 */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">03</div>
            <h3 className="text-lg font-black tracking-tight uppercase text-zinc-900 dark:text-white">상세 문의</h3>
          </div>

          <div className="space-y-4 relative group">
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase tracking-[0.2em] group-focus-within:text-primary transition-colors">현재 상황 및 구체적으로 원하는 성과</label>
              {isMessageRequired && (
                <span className="text-[9px] font-black text-rose-500 animate-pulse bg-rose-500/10 px-2 py-1 rounded">
                  ⚠️ 예산 상담을 위해 구체적인 상황을 반드시 입력해주세요
                </span>
              )}
            </div>
            <div className="relative">
              <MessageSquare className="absolute left-0 top-4 text-zinc-300 group-focus-within:text-primary transition-colors" size={18} />
              <textarea 
                required={isMessageRequired}
                rows={4}
                placeholder={isMessageRequired ? "구체적인 운영 상황, 타겟, 목표하시는 성과를 상세히 적어주시면 정확한 예산 설계가 가능합니다." : "문의하실 내용을 자유롭게 적어주세요."}
                className={`w-full pl-8 pr-4 py-3 bg-transparent border-b outline-none transition-all font-medium text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 resize-none
                  ${isMessageRequired ? 'border-rose-300 focus:border-rose-500' : 'border-zinc-200 dark:border-white/10 focus:border-primary'}
                `}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* AI CTA */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.2)]">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1">AI Diagnostic Assistant</p>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">항목 작성이 어려우신가요? AI에게 비즈니스를 진단받고 추천 전략을 확인하세요.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => { appendCTA({ label: 'ContactForm — AI 상담 시작', page: typeof window !== 'undefined' ? window.location.pathname : '' }); window.location.href = '/chat'; }}
            className="w-full md:w-auto px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:translate-y-[-2px] hover:shadow-primary/20 transition-all relative overflow-hidden"
          >
            기브니즈 AI 상담 시작 <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-7 bg-primary text-white rounded-3xl font-black text-xl hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group relative overflow-hidden"
        >
          {/* 버튼 내부 안개 효과 */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
          
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              상담 및 솔루션 진단 신청 <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
