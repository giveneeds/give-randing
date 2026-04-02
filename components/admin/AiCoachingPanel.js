'use client';
import { Sparkles, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultSuggestions = [
  {
    theory: '설득의 심리학 (희소성)',
    suggestion: '히어로 섹션에 "남은 가이드북 12개"와 같은 카운트다운을 추가하여 희소성을 강조해보세요.',
    rationale: '사용자는 제한된 자원에 대해 더 높은 가치를 느끼고 즉각적인 행동을 취할 확률이 높습니다.',
    status: 'pending'
  },
  {
    theory: 'AIDA 모델 (Desire)',
    suggestion: '중간 섹션에 고객 성공 사례(Testimonials)를 배치하여 욕구를 자극하세요.',
    rationale: '구체적인 성과 지표(숫자)가 포함된 후기는 신뢰도를 높여 잠재 고객의 전환 의지를 강화합니다.',
    status: 'applied'
  }
];

export default function AiCoachingPanel({ campaign, onApply }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-md overflow-hidden">
      <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">
            <Sparkles size={16} className="text-yellow-400" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-widest uppercase">Giveneeds AI Advisor</h4>
            <p className="text-[9px] text-zinc-500 font-bold">마케팅 이론 기반 코칭 활성화 중</p>
          </div>
        </div>
        <HelpCircle size={16} className="text-zinc-600 cursor-help" />
      </div>

      <div className="p-6 space-y-6">
        {defaultSuggestions.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-5 rounded-md border ${item.status === 'applied' ? 'bg-zinc-50 border-zinc-200 opacity-60' : 'bg-white border-zinc-200 shadow-sm'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">{item.theory}</span>
              {item.status === 'applied' && <CheckCircle2 size={14} className="text-zinc-400" />}
            </div>
            
            <h5 className="text-sm font-bold text-zinc-900 mb-2 leading-snug">"{item.suggestion}"</h5>
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-6">
              <span className="font-bold text-zinc-900">Why?</span> {item.rationale}
            </p>

            {item.status !== 'applied' && (
              <button 
                onClick={() => onApply(item)}
                className="w-full py-2.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                Apply Suggestion <ChevronRight size={12} />
              </button>
            )}
          </motion.div>
        ))}
      </div>
      
      <div className="p-4 bg-zinc-100/50 border-t border-zinc-200 text-center">
        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">Always confirm changes before publishing</p>
      </div>
    </div>
  );
}
