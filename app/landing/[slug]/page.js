'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SectionRenderer from '@/components/landing/SectionRenderer';
import MagazineList from '@/components/landing/MagazineList';
import LandingFooter from '@/components/landing/LandingFooter';
import ResourceDownloads from '@/components/content/ResourceDownloads';
import { supabase, isDummyMode } from '@/lib/supabase';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import LeadForm from '@/components/ui/LeadForm';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';

export default function CampaignLandingPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState({});
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        let campaignData;
        
        const [cRes, sRes, stRes] = await Promise.all([
          fetch(`/api/campaigns?slug=${slug}`).then(r => r.json()),
          fetch(`/api/sections?all=true`).then(r => r.json()),
          fetch(`/api/settings`).then(r => r.json())
        ]);

        if (cRes.error) throw new Error(cRes.error);
        if (!cRes.campaign) throw new Error('Not found');

        campaignData = cRes.campaign;

        // Sections API returns an array or object
        const availableSections = sRes.sections || [];

        if (!campaignData) {
          setError('캠페인을 찾을 수 없습니다.');
          return;
        }

        if (campaignData.status !== 'published' && !isDummyMode) {
          setError('이 캠페인은 아직 준비 중이거나 비공개 상태입니다.');
          return;
        }

        setCampaign(campaignData);

        // Get selected sections
        const selected = (campaignData.selected_sections || [])
          .map(id => availableSections.find(s => s.id === id))
          .filter(Boolean);
        setSections(selected);


        if (stRes.settings) {
          setSettings(stRes.settings);
        }

        // 첨부 자료 로드 (공개 GET — is_enabled 만)
        try {
          const rRes = await fetch(`/api/campaigns/${campaignData.id}/resources`);
          const rData = await rRes.json();
          if (rRes.ok) setResources(rData.resources || []);
        } catch (rErr) {
          console.error('resources fetch failed', rErr);
        }

      } catch (err) {
        console.error('API fetch failed:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다. (슬러그 확인 요망)');
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchCampaign();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  if (error || !campaign) return <div className="flex items-center justify-center min-h-screen">{error || '404'}</div>;

  return (
    <>
      <main className="lp-container">
        {/* 1. Hero Module */}
        <section className="lp-hero relative overflow-hidden">
          {/* 하위 호환: hero_type이 있으면 그걸로, 없으면 새 플래그 사용 */}
          {(() => {
            const showParticle = campaign.show_particle !== undefined
              ? campaign.show_particle
              : campaign.hero_type !== 'B';
            const showLeadForm = campaign.show_lead_form !== undefined
              ? campaign.show_lead_form
              : campaign.hero_type === 'B';

            return (
              <>
                {/* 파티클 블록 */}
                {showParticle && (
                  <div className={`relative w-full ${showLeadForm ? 'h-[40vh] md:h-[60vh]' : 'h-[70vh] md:h-screen'}`}>
                    <ParticleTextEffect
                      words={(campaign.hero_content.particle_text || campaign.hero_content.headline || '').split('\n').filter(Boolean)}
                    />
                  </div>
                )}

                {/* 리드 마그넷 폼 블록 */}
                {showLeadForm && (
                  <div className="flex flex-col lg:flex-row items-center justify-center min-h-[80vh] lg:min-h-screen text-center lg:text-left px-4 md:px-8 max-w-7xl mx-auto gap-8 md:gap-12 py-12 md:py-20 overflow-hidden">
                    <div className="flex-1">
                      <div className="flex items-center justify-center lg:justify-start gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
                        <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                          {campaign.category || 'CAMPAIGN'}
                        </span>
                        <div className="h-px w-8 bg-zinc-200" />
                        <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-primary uppercase">EXCLUSIVELY FOR GROWTH</span>
                      </div>
                      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight md:leading-snug mb-5 md:mb-8 whitespace-pre-line tracking-tighter">
                        {campaign.hero_content.headline}
                      </h1>
                      <p className="text-base sm:text-lg md:text-2xl text-zinc-500 mb-8 md:mb-12 max-w-2xl font-medium leading-relaxed">
                        {campaign.hero_content.description}
                      </p>
                    </div>
                    <div className="flex-1 w-full max-w-md mx-auto lg:mx-0">
                      <LeadForm
                        title={campaign.hero_content.file_name}
                        ctaLabel={campaign.hero_content.cta_label}
                        campaignId={campaign.id}
                        category="campaign"
                        formMode={campaign.hero_content.lead_form_mode || 'kakao'}
                      />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* 2. Selected Sections */}
        <div className="space-y-16 md:space-y-32">
          {sections.map(section => (
            <SectionRenderer
              key={section.id}
              type={section.type}
              title={section.title}
              subtitle={section.subtitle}
              content={section.content}
            />
          ))}
        </div>

        {/* 2-1. 캠페인 첨부 자료 */}
        {resources.length > 0 && (
          <section className="px-4 md:px-12 max-w-screen-md mx-auto mt-16 md:mt-24">
            <ResourceDownloads
              parentType="campaign"
              parentId={campaign.id}
              slug={campaign.slug}
              resources={resources}
            />
          </section>
        )}

        {/* 3. 🛡️ 롤백 요청 사항: 아티클(매거진) 강제 노출 */}
        <section className={`${campaign.show_ai_block ? 'pt-16 md:pt-32' : 'py-16 md:py-32'} border-t border-zinc-100 mt-16 md:mt-32 px-4 md:px-12 max-w-7xl mx-auto`}>
          {campaign.show_ai_block && (
            <div className="mb-16 md:mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
               <AiSolutionBlock />
            </div>
          )}
          <MagazineList title="관련 서비스 인사이트" subtitle="성공적인 비즈니스를 위한 데이터 마케팅 매거진" />
        </section>

        {/* Tracking Scripts */}
        {campaign.tracking_scripts?.pixel_id && (
          <script dangerouslySetInnerHTML={{ __html: `console.log('Pixel ${campaign.tracking_scripts.pixel_id} Active')` }} />
        )}
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
