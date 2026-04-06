'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isDummyMode } from '@/lib/supabase';
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
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  useEffect(() => {
    // '정하고 선택할래요' 선택 시 메시지 입력 필수 처리
    setIsMessageRequired(formData.budget === 'undecided');
  }, [formData.budget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!isDummyMode) {
        const { error } = await supabase
          .from('leads')
          .insert([{
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            company_name: formData.company_name,
            website_url: formData.website_url,
            budget: formData.budget,
            message: formData.message,
            inquiry_type: formData.inquiry_type,
            category: 'consultation',
            source_url: typeof window !== 'undefined' ? window.location.href : ''
          }]);
        if (error) throw error;
      } else {
        console.log('Dummy Lead Captured (Inquiry Page):', formData);
        await new Promise(resolve => setTimeout(resolve, 1500)); // 시뮬레이션
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Inquiry submission failed:', err);
      alert('문의 제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 md:p-24 bg-white dark:bg-zinc-900 rounded-[3rem] text-center border border-zinc-100 dark:border-white/5 shadow-2xl"
      >
        <div className="w-24 h-24 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <CheckCircle2 size={48} strokeWidth={1.5} />
        </div>
        <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter">소중한 문의가 접수되었습니다.</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-12 text-lg max-w-md leading-relaxed">
          마케팅 전문가가 비즈니스를 정밀 분석한 후,<br/>
          영업일 기준 24시간 이내에 연락드리겠습니다.
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
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center text-xs font-black">01</div>
            <h3 className="text-xl font-black tracking-tight uppercase">기본 정보</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">성함</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="홍길동"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">연락처</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="tel" 
                  required
                  placeholder="010-0000-0000"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">회사명 / 브랜드명</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="기브니즈코리아"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium"
                  value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">이메일</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="hello@giveneeds.com"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: 분석 정보 */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center text-xs font-black">02</div>
            <h3 className="text-xl font-black tracking-tight uppercase">분석 및 예산</h3>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">홈페이지 (또는 분석할 상품 링크)</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="url" 
                  required
                  placeholder="https://www.your-brand.com"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium"
                  value={formData.website_url}
                  onChange={e => setFormData({...formData, website_url: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest flex items-center gap-2">
                <Coins size={14} /> 월 예상 마케팅 예산
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({...formData, budget: opt.id})}
                    className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border
                      ${formData.budget === opt.id 
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg' 
                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-white/5 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-white/20'
                      } ${opt.special ? 'border-dashed border-zinc-300' : ''}`}
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
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center text-xs font-black">03</div>
            <h3 className="text-xl font-black tracking-tight uppercase">상세 문의</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-zinc-400 ml-2 uppercase tracking-widest">현재 상황 및 구체적으로 원하는 성과</label>
              {isMessageRequired && (
                <span className="text-[10px] font-black text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded">
                  ⚠️ 예산 상담을 위해 구체적인 상황을 반드시 입력해주세요
                </span>
              )}
            </div>
            <div className="relative group">
              <MessageSquare className="absolute left-4 top-6 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
              <textarea 
                required={isMessageRequired}
                rows={6}
                placeholder={isMessageRequired ? "구체적인 운영 상황, 타겟, 목표하시는 성과를 상세히 적어주시면 정확한 예산 설계가 가능합니다." : "문의하실 내용을 자유롭게 적어주세요."}
                className={`w-full pl-12 pr-6 py-5 bg-zinc-50 dark:bg-zinc-900 border rounded-[2rem] focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all font-medium resize-none
                  ${isMessageRequired ? 'border-rose-200 dark:border-rose-900/50 ring-1 ring-rose-100 dark:ring-rose-900/20' : 'border-zinc-100 dark:border-white/5'}
                `}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* AI CTA */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">항목 작성이 어려우신가요? AI에게 먼저 비즈니스를 진단받아보세요.</p>
          </div>
          <button 
            type="button" 
            onClick={() => window.location.href = '/chat'}
            className="whitespace-nowrap px-6 py-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-xs font-black shadow-sm hover:translate-y-[-2px] transition-transform"
          >
            기브니즈 AI 상담 시작 <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[2rem] font-black text-xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              무료 마케팅 진단 신청하기 <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
