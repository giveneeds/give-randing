'use client';
import { useState } from 'react';
import { X, Rocket, BarChart3, CheckCircle2, Save, Send, Eye, Sparkles, ClipboardList, Zap } from 'lucide-react';
import AdminLPBuilder from './AdminLPBuilder';
import AiCoachingPanel from './AiCoachingPanel';
import { clsx } from 'clsx';
import SectionRenderer from '@/components/landing/SectionRenderer';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import LeadForm from '@/components/ui/LeadForm';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';
import MagazineList from '@/components/landing/MagazineList';

// ── 재사용 가능한 토글 버튼 컴포넌트
function ToggleBlock({ enabled, onToggle, icon, title, description, color = 'zinc' }) {
  const colorMap = {
    zinc: {
      on: 'bg-zinc-900 border-zinc-900 text-white shadow-lg',
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400',
      badge: 'bg-zinc-100 text-zinc-900',
    },
    violet: {
      on: 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200',
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-violet-300',
      badge: 'bg-violet-100 text-violet-700',
    },
    blue: {
      on: 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200',
      off: 'bg-white border-zinc-200 text-zinc-500 hover:border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
    },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.01] text-left',
        enabled ? c.on : c.off
      )}
    >
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', enabled ? 'bg-white/20' : 'bg-zinc-100')}>
        <span className={enabled ? 'text-white' : 'text-zinc-400'}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-xs font-black uppercase tracking-widest', enabled ? 'opacity-100' : 'opacity-70')}>{title}</p>
        <p className={clsx('text-[10px] mt-0.5 leading-snug', enabled ? 'opacity-70' : 'opacity-50')}>{description}</p>
      </div>
      <div className={clsx('shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
        enabled ? 'border-white bg-white/30' : 'border-zinc-300'
      )}>
        {enabled && <CheckCircle2 size={14} className="text-white" />}
      </div>
    </button>
  );
}

export default function CampaignEditor({ campaign, sections, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('build');
  // hero_content 내부에 particle_text, headline, description, file_name, cta_label 등이 들어있음
  // 새 필드: show_particle (bool), show_lead_form (bool) - 기존 hero_type과 하위 호환 유지
  const [current, setCurrent] = useState(() => {
    const c = { ...campaign };
    // 기존 hero_type → 새 플래그로 마이그레이션
    if (c.show_particle === undefined) c.show_particle = c.hero_type !== 'B';
    if (c.show_lead_form === undefined) c.show_lead_form = c.hero_type === 'B';
    return c;
  });

  const handleStatusChange = (newStatus) => setCurrent({ ...current, status: newStatus });
  const updateHeroContent = (key, value) =>
    setCurrent({ ...current, hero_content: { ...current.hero_content, [key]: value } });

  // 프리뷰용: 선택된 섹션 데이터
  const liveSections = (current.selected_sections || [])
    .map(id => sections.find(s => s.id === id))
    .filter(Boolean);

  // 파티클 words 배열
  const particleWords = (current.hero_content?.particle_text || current.hero_content?.headline || '기브니즈\n마케팅 파트너')
    .split('\n').filter(Boolean);

  const tabs = [
    { id: 'general', label: '기본 설정' },
    { id: 'build', label: '랜딩 빌더' },
    { id: 'preview', label: '라이브 프리뷰', icon: <Eye size={13} /> },
    { id: 'coaching', label: 'AI 코칭' },
  ];

  return (
    <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white w-full max-w-7xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden shadow-2xl ring-1 ring-zinc-200">

        {/* ── Header */}
        <div className="px-8 py-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <h2 className="text-lg font-black tracking-tighter uppercase text-zinc-900">Campaign Editor</h2>
              <span className={clsx('text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest',
                current.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
              )}>
                {current.status || 'draft'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              giveneeds.kr/landing/<span className="text-zinc-600">{current.slug || '—'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900">
            <X size={20} />
          </button>
        </div>

        {/* ── Tabs */}
        <div className="px-8 border-b border-zinc-100 flex gap-8 bg-white shrink-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5',
                activeTab === tab.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Body */}
        <div className={clsx('flex-1 overflow-y-auto', activeTab === 'preview' ? 'p-0' : 'p-8 lg:p-10')}>
          <div className={clsx('grid grid-cols-1 gap-10', activeTab === 'preview' ? '' : 'lg:grid-cols-12')}>

            {/* Left Content Area */}
            <div className={clsx('space-y-10', activeTab === 'preview' ? '' : 'lg:col-span-8')}>

              {/* ── 기본 설정 탭 */}
              {activeTab === 'general' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-400">

                  {/* 캠페인 기본 정보 */}
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 border-b border-zinc-100 pb-3">캠페인 기본 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">캠페인 이름</label>
                        <input
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                          value={current.title || ''}
                          onChange={e => setCurrent({ ...current, title: e.target.value })}
                          placeholder="예: 바이럴 마케팅 캠페인"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">URL Slug</label>
                        <input
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none font-mono focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                          value={current.slug || ''}
                          onChange={e => setCurrent({ ...current, slug: e.target.value })}
                          placeholder="viral-marketing"
                        />
                      </div>
                    </div>
                  </section>

                  {/* ── 히어로 블록 독립 설정 */}
                  <section className="space-y-5">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 border-b border-zinc-100 pb-3 mb-1">히어로 블록 구성</h3>
                      <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">아래 두 블록은 독립적으로 ON/OFF할 수 있습니다. 둘 다 켜면 파티클 위에 신청폼이 함께 표시됩니다.</p>
                    </div>

                    {/* 파티클 블록 토글 */}
                    <ToggleBlock
                      enabled={current.show_particle}
                      onToggle={() => setCurrent({ ...current, show_particle: !current.show_particle })}
                      icon={<Sparkles size={16} />}
                      title="파티클 텍스트 애니메이션"
                      description="화면 전체를 배경으로 텍스트가 입자로 변환되는 시네마틱 효과"
                      color="zinc"
                    />

                    {/* 파티클 설정 패널 */}
                    {current.show_particle && (
                      <div className="ml-4 pl-4 border-l-2 border-zinc-200 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                            파티클 장면 텍스트
                            <span className="text-[9px] font-normal text-zinc-400 normal-case tracking-normal">줄바꿈(Enter)으로 각 장면을 구분합니다</span>
                          </label>
                          <textarea
                            className="w-full p-4 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-mono min-h-[120px] leading-loose focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                            value={current.hero_content?.particle_text || ''}
                            placeholder={"안녕하세요.\n기브니즈입니다.\n무엇을 도와드릴까요?"}
                            onChange={e => updateHeroContent('particle_text', e.target.value)}
                          />
                          <p className="text-[10px] text-zinc-400 leading-relaxed">💡 한 줄에 하나의 장면 텍스트. 약 3초 간격으로 자동으로 다음 장면으로 넘어갑니다.</p>
                        </div>
                      </div>
                    )}

                    {/* 리드 마그넷 폼 토글 */}
                    <ToggleBlock
                      enabled={current.show_lead_form}
                      onToggle={() => setCurrent({ ...current, show_lead_form: !current.show_lead_form })}
                      icon={<ClipboardList size={16} />}
                      title="리드 마그넷 신청폼"
                      description="자료 신청 또는 상담 예약을 받을 수 있는 카드형 폼 블록"
                      color="blue"
                    />

                    {/* 리드 폼 설정 패널 */}
                    {current.show_lead_form && (
                      <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-5 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">헤드라인 (큰 타이틀)</label>
                          <textarea
                            className="w-full p-4 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-bold resize-none h-24 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            value={current.hero_content?.headline || ''}
                            onChange={e => updateHeroContent('headline', e.target.value)}
                            placeholder="예: 초기 스타트업을 위한&#10;전략 마케팅 가이드북"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">서브 설명문</label>
                          <textarea
                            className="w-full p-4 bg-white border border-zinc-200 rounded-lg text-sm outline-none text-zinc-600 resize-none h-20 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            value={current.hero_content?.description || ''}
                            onChange={e => updateHeroContent('description', e.target.value)}
                            placeholder="간단한 설명문을 입력하세요..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">제공 자료명 (폼 상단 표시)</label>
                            <input
                              className="w-full p-3.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                              value={current.hero_content?.file_name || ''}
                              onChange={e => updateHeroContent('file_name', e.target.value)}
                              placeholder="marketing-guide.pdf"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">CTA 버튼 텍스트</label>
                            <input
                              className="w-full p-3.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                              value={current.hero_content?.cta_label || ''}
                              onChange={e => updateHeroContent('cta_label', e.target.value)}
                              placeholder="무료자료 받기"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 둘 다 OFF 경고 */}
                    {!current.show_particle && !current.show_lead_form && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <span className="text-amber-500 text-sm shrink-0">⚠️</span>
                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                          히어로 블록이 모두 비활성화되어 있습니다. 최소 한 개 이상을 켜야 랜딩 페이지 상단이 보입니다.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── 랜딩 빌더 탭 */}
              {activeTab === 'build' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-400">
                  <AdminLPBuilder
                    selectedSectionIds={current.selected_sections}
                    allSections={sections}
                    onChange={ids => setCurrent({ ...current, selected_sections: ids })}
                  />
                </div>
              )}

              {/* ── 라이브 프리뷰 탭 */}
              {activeTab === 'preview' && (
                <div className="animate-in fade-in duration-500 w-full bg-zinc-100 relative" style={{ height: 'calc(90vh - 130px)' }}>
                  {/* 브라우저 바 */}
                  <div className="w-full h-9 bg-zinc-900 flex items-center px-4 gap-3 shrink-0 border-b border-black">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="flex-1 h-5 bg-zinc-800 rounded-md flex items-center px-3 gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-[10px] text-zinc-400 font-mono truncate">giveneeds.kr/landing/{current.slug || '...'}</span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em]">LIVE PREVIEW</span>
                  </div>

                  {/* 프리뷰 스크롤 컨테이너 */}
                  <div className="w-full overflow-y-auto bg-white" style={{ height: 'calc(100% - 36px)' }}>

                    {/* 1. 히어로: 파티클 */}
                    {current.show_particle && (
                      <section className="relative overflow-hidden" style={{ height: current.show_lead_form ? '60vh' : '80vh' }}>
                        <div className="absolute inset-0 pointer-events-none">
                          <ParticleTextEffect words={particleWords} compact={true} />
                        </div>
                        {/* 파티클 레이어 라벨 */}
                        <div className="absolute top-4 left-4 z-10 bg-zinc-900/70 text-white text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
                          <Sparkles size={10} /> 파티클 텍스트 블록
                        </div>
                      </section>
                    )}

                    {/* 2. 히어로: 리드 폼 */}
                    {current.show_lead_form && (
                      <section className="relative border-t border-zinc-100 bg-white">
                        <div className="absolute top-4 left-4 z-10 bg-blue-600/80 text-white text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
                          <ClipboardList size={10} /> 리드 마그넷 폼 블록
                        </div>
                        <div className="flex flex-col lg:flex-row items-center justify-center min-h-[70vh] gap-12 px-8 py-16 max-w-7xl mx-auto">
                          <div className="flex-1 pointer-events-none">
                            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">{current.category || 'CAMPAIGN'}</span>
                            <h1 className="text-4xl md:text-5xl font-black leading-tight mt-4 mb-6 whitespace-pre-line tracking-tighter">
                              {current.hero_content?.headline || '헤드라인을 작성해주세요'}
                            </h1>
                            <p className="text-lg text-zinc-500 max-w-xl font-medium leading-relaxed">
                              {current.hero_content?.description || '설명문구를 작성해주세요'}
                            </p>
                          </div>
                          <div className="flex-1 w-full max-w-md">
                            <LeadForm
                              title={current.hero_content?.file_name || 'GuideBook.pdf'}
                              ctaLabel={current.hero_content?.cta_label || '자료 받기'}
                              campaignId={current.id}
                            />
                          </div>
                        </div>
                      </section>
                    )}

                    {/* 둘 다 OFF */}
                    {!current.show_particle && !current.show_lead_form && (
                      <div className="flex flex-col items-center justify-center h-64 bg-amber-50 border-b border-amber-200">
                        <p className="text-amber-600 font-bold text-sm">⚠️ 히어로 블록이 비활성화 상태입니다</p>
                        <p className="text-amber-500 text-xs mt-1">기본 설정 탭에서 파티클 또는 리드폼을 활성화하세요.</p>
                      </div>
                    )}

                    {/* 3. 선택된 섹션들 */}
                    <div className="space-y-24 py-24">
                      {liveSections.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-zinc-200 rounded-xl mx-8 bg-zinc-50">
                          <p className="text-zinc-500 font-bold text-sm">조립된 섹션이 없습니다</p>
                          <p className="text-zinc-400 text-xs mt-1">랜딩 빌더 탭에서 섹션을 추가해주세요</p>
                        </div>
                      ) : (
                        liveSections.map(section => (
                          <div key={section.id} className="pointer-events-none relative">
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-300 bg-white px-3 border border-zinc-100 rounded-full z-10">
                              {section.title}
                            </span>
                            <SectionRenderer
                              type={section.type}
                              title={section.title}
                              subtitle={section.subtitle}
                              content={section.content}
                            />
                          </div>
                        ))
                      )}
                    </div>

                    {/* 4. 하단 글로벌 컴포넌트 */}
                    <section className="border-t border-zinc-100 pt-20 pb-32 px-8 max-w-7xl mx-auto space-y-20 relative">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.3em] uppercase text-violet-400 bg-white px-4 border border-violet-100 rounded-full">
                        Global Extension Zone
                      </span>
                      {current.show_ai_block && (
                        <div className="pointer-events-none relative ring-4 ring-violet-100 rounded-2xl overflow-hidden shadow-xl">
                          <AiSolutionBlock />
                          <div className="absolute inset-0 border-4 border-violet-400 rounded-2xl" />
                          <div className="absolute top-4 right-4 bg-violet-600 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                            ✓ AI Block ON
                          </div>
                        </div>
                      )}
                      <div className="pointer-events-none opacity-75">
                        <MagazineList title="관련 서비스 인사이트" subtitle="성공적인 비즈니스를 위한 데이터 마케팅 매거진" />
                      </div>
                    </section>

                  </div>
                </div>
              )}

              {/* ── AI 코칭 탭 */}
              {activeTab === 'coaching' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-400">
                  <AiCoachingPanel campaign={current} onApply={() => {}} />
                </div>
              )}
            </div>

            {/* ── 오른쪽 설정 패널 (프리뷰 탭에서 숨김) */}
            {activeTab !== 'preview' && (
              <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-right-8 duration-400">

                {/* 캐인 상태 */}
                <section className="p-6 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-5">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-900 uppercase flex items-center gap-2 border-b border-zinc-100 pb-3">
                    <CheckCircle2 size={14} /> 퍼블리싱 상태
                  </h4>
                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-lg border border-zinc-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">현재 상태</span>
                    <span className={clsx('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg',
                      current.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {current.status || 'draft'}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {current.status !== 'published' && (
                      <button
                        onClick={() => handleStatusChange('published')}
                        className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        Publish Now <Send size={13} />
                      </button>
                    )}
                    {current.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange('pending')}
                        className="w-full py-3 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-zinc-400 hover:text-zinc-900 transition-all"
                      >
                        Request Review
                      </button>
                    )}
                  </div>
                </section>

                {/* Conversion Boosters */}
                <section className="p-6 bg-violet-50 border border-violet-100 rounded-xl shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-violet-700 uppercase flex items-center gap-2 border-b border-violet-200/60 pb-3">
                    <Zap size={13} /> Conversion Boosters
                  </h4>
                  <p className="text-[10px] text-violet-600 font-medium leading-relaxed opacity-80">
                    랜딩 페이지 하단에 자동으로 부착되는 전환율 강화 컴포넌트입니다.
                  </p>
                  <ToggleBlock
                    enabled={current.show_ai_block}
                    onToggle={() => setCurrent({ ...current, show_ai_block: !current.show_ai_block })}
                    icon={<Sparkles size={14} />}
                    title="AI 맞춤 솔루션 블록"
                    description="하단에 AI 상담 유도 섹션 자동 삽입"
                    color="violet"
                  />
                </section>

                {/* 분석 */}
                <section className="p-6 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-900 uppercase flex items-center gap-2 border-b border-zinc-100 pb-3">
                    <BarChart3 size={13} /> Analytics
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Google Analytics 4 ID</label>
                    <input
                      className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                      placeholder="G-XXXXXXXX"
                      value={current.tracking_scripts?.ga_id || ''}
                      onChange={e => setCurrent({ ...current, tracking_scripts: { ...(current.tracking_scripts || {}), ga_id: e.target.value } })}
                    />
                  </div>
                </section>

              </div>
            )}
          </div>
        </div>

        {/* ── Footer */}
        <div className="px-8 py-5 border-t border-zinc-100 flex justify-between items-center bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
          >
            취소
          </button>
          <button
            onClick={() => onSave(current)}
            className="px-8 py-3 bg-zinc-900 hover:bg-black text-white rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Save size={14} /> 저장 & 라이브 반영
          </button>
        </div>

      </div>
    </div>
  );
}
