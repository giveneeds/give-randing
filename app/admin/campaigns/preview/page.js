'use client';

/**
 * /admin/campaigns/preview
 *
 * 어드민 캠페인 빌더의 모바일 미리보기 iframe 타깃.
 *
 * 동작 원리:
 *   1. 부모(CampaignEditorUnified)가 iframe 으로 이 페이지를 로드한다.
 *   2. iframe load 후 부모가 postMessage({ type: 'campaign:preview', payload }) 로
 *      현재 편집 중인 캠페인 state 를 보낸다.
 *   3. 이 페이지는 메시지를 수신하면 라이브 LP(/landing/[slug])와 동일한 컴포넌트 구조로
 *      렌더하되 데이터 fetch 는 하지 않는다 (payload 만 사용).
 *
 * 격리:
 *   - DB 조회 안 함
 *   - tracking_scripts / 픽셀 발화 차단 (이 페이지는 pixel/ga 코드를 import 하지 않음)
 *
 * viewport:
 *   - iframe 의 실제 viewport width 가 모바일 폭(390px 등)이므로
 *     Tailwind 의 md:/lg: 클래스가 자동으로 모바일 분기로 빠진다.
 *   - 라이브 모바일 화면과 픽셀 단위로 동일하게 보인다.
 */

import { useEffect, useState } from 'react';
import SectionRenderer from '@/components/landing/SectionRenderer';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import LeadForm from '@/components/ui/LeadForm';

export default function CampaignPreviewPage() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    function onMessage(event) {
      const data = event?.data;
      if (!data || data.type !== 'campaign:preview') return;
      setPayload(data.payload || null);
    }
    window.addEventListener('message', onMessage);
    // 부모에 ready 신호 전송 — 부모가 즉시 첫 payload 를 보낼 수 있게 함
    try {
      window.parent?.postMessage({ type: 'campaign:preview:ready' }, '*');
    } catch (_) {
      // cross-origin 등 — 무시
    }
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-[10px] font-bold text-zinc-400 tracking-[0.3em] uppercase animate-pulse">
          Loading preview…
        </p>
      </div>
    );
  }

  const { campaign, sections = [] } = payload;
  if (!campaign) return null;

  const showParticle = campaign.show_particle !== undefined
    ? campaign.show_particle
    : campaign.hero_type !== 'B';
  const showLeadForm = campaign.show_lead_form !== undefined
    ? campaign.show_lead_form
    : campaign.hero_type === 'B';

  const particleWords = (campaign.hero_content?.particle_text
    || campaign.hero_content?.headline
    || ''
  ).split('\n').filter(Boolean);

  // LeadForm 컴포넌트 키 — leadFields/모드 변경 시 강제 리마운트로 즉시 갱신
  const leadFormKey = JSON.stringify({
    mode: campaign.hero_content?.lead_form_mode || 'kakao',
    fields: campaign.hero_content?.basic_form_fields || null,
    cta: campaign.hero_content?.cta_label || '',
    file: campaign.hero_content?.file_name || '',
  });

  return (
    <main className="lp-container bg-white">
      {/* 1. Hero Module */}
      <section className="lp-hero relative overflow-hidden">
        {showParticle && (
          <div className={`relative w-full ${showLeadForm ? 'h-[40vh] md:h-[60vh]' : 'h-[70vh] md:h-screen'}`}>
            <ParticleTextEffect words={particleWords.length > 0 ? particleWords : ['GIVENEEDS']} compact />
          </div>
        )}

        {showLeadForm && (
          <div className="flex flex-col lg:flex-row items-center justify-center min-h-[80vh] lg:min-h-screen text-center lg:text-left px-4 md:px-8 max-w-7xl mx-auto gap-8 md:gap-12 py-12 md:py-20 overflow-hidden">
            <div className="flex-1">
              <div className="flex items-center justify-center lg:justify-start gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
                <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase break-keep">
                  {campaign.category || 'CAMPAIGN'}
                </span>
                <div className="h-px w-8 bg-zinc-200" />
                <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-primary uppercase">EXCLUSIVELY FOR GROWTH</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight md:leading-snug mb-5 md:mb-8 whitespace-pre-line tracking-tighter break-keep">
                {campaign.hero_content?.headline || ''}
              </h1>
              <p className="text-base sm:text-lg md:text-2xl text-zinc-500 mb-8 md:mb-12 max-w-2xl font-medium leading-relaxed break-keep">
                {campaign.hero_content?.description || ''}
              </p>
            </div>
            <div className="flex-1 w-full max-w-md mx-auto lg:mx-0">
              <LeadForm
                key={leadFormKey}
                title={campaign.hero_content?.file_name}
                ctaLabel={campaign.hero_content?.cta_label}
                campaignId={campaign.id}
                category="campaign"
                formMode={campaign.hero_content?.lead_form_mode || 'kakao'}
                basicFormFields={campaign.hero_content?.basic_form_fields}
              />
            </div>
          </div>
        )}
      </section>

      {/* 2. Selected Sections */}
      <div className="space-y-16 md:space-y-32">
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            type={section.type}
            title={section.title}
            subtitle={section.subtitle}
            content={section.content}
          />
        ))}
      </div>
    </main>
  );
}
