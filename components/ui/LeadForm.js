import { useState } from 'react';
import { CheckCircle2, MessageCircle, Download } from 'lucide-react';
import { isDummyMode } from '@/lib/supabase';

export default function LeadForm({ title, subtitle, ctaLabel, campaignId, magazineId, category = 'organic' }) {
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

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
    if (!validatePhone(formData.phone)) {
      setPhoneError('올바른 전화번호 형식으로 입력해주세요. (예: 010-1234-5678)');
      return;
    }
    setPhoneError('');
    
    try {
      const payload = {
        ...formData,
        campaign_id: campaignId,
        magazine_id: magazineId,
        lead_type: category, // 'campaign' or 'magazine' is typically passed here
        source_page: typeof window !== 'undefined' ? window.location.pathname : '',
        source_referrer: typeof document !== 'undefined' ? document.referrer : '',
        click_element: 'lead_form_cta',
      };

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

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-bold mb-2">신청이 완료되었습니다!</h3>
        <p className="text-gray-500 mb-8">영업일 기준 2일 이내에 마케팅 전략 자료를 보내드립니다.</p>
        <button onClick={() => window.location.reload()} className="text-primary font-bold hover:underline">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg bg-zinc-50 dark:bg-zinc-900/50 p-8 md:p-12 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-3xl font-bold mb-3 tracking-tight">{title || 'Premium Resource'}</h2>
        <p className="text-zinc-500 mb-10 text-lg leading-relaxed">{subtitle || '전략 리포트를 받기 위해 정보를 입력해 주세요.'}</p>
        
        {/* Kakao Login Option */}
        <button className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#191919] py-4 rounded-2xl font-bold mb-8 hover:opacity-90 transition-opacity">
          <MessageCircle size={20} fill="currentColor" /> 카카오로 3초 만에 시작하기
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200 dark:border-zinc-800" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-50 dark:bg-zinc-900 px-4 text-zinc-400 font-bold tracking-widest">혹은 직접 입력</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="성함" 
            required 
            className="w-full p-4 bg-white dark:bg-zinc-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary shadow-sm"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <input 
            type="email" 
            placeholder="이메일 주소" 
            required 
            className="w-full p-4 bg-white dark:bg-zinc-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary shadow-sm"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <div>
            <input 
              type="tel" 
              placeholder="연락처 (가이드 수령용)" 
              required 
              className={`w-full p-4 bg-white dark:bg-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all
                ${phoneError ? 'border-2 border-rose-300' : 'border-none'}`}
              value={formData.phone}
              onChange={e => {
                const formatted = formatPhone(e.target.value);
                setFormData({...formData, phone: formatted});
                if (phoneError) setPhoneError('');
              }}
              maxLength={13}
            />
            {phoneError && (
              <p className="text-[11px] text-rose-500 mt-1 ml-2 font-medium">{phoneError}</p>
            )}
          </div>
          
          <div className="flex items-start gap-3 py-4">
            <input type="checkbox" required className="mt-1 w-4 h-4 rounded text-primary" />
            <p className="text-[11px] text-zinc-400 leading-tight">
              개인정보 수집 및 마케팅 활용 동의(선택)에 동의하며,<br/>
              기브니즈의 마케팅 전략 콘텐츠 수신에 동의합니다.
            </p>
          </div>

          <button type="submit" className="w-full py-5 bg-zinc-900 dark:bg-primary text-white rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3">
            {ctaLabel || '자료 지금 받기'} <Download size={20} />
          </button>
        </form>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
    </div>
  );
}
