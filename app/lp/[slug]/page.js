'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SectionRenderer from '@/components/landing/SectionRenderer';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

import LeadForm from '@/components/ui/LeadForm';

export default function CampaignLandingPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        let campaignData;
        
        if (isDummyMode) {
          campaignData = DUMMY_CAMPAIGNS.find(c => c.slug === slug);
        } else {
          const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('slug', slug)
            .single();
          if (error) throw error;
          campaignData = data;
        }

        if (!campaignData) {
          setError('캠페인을 찾을 수 없습니다.');
          return;
        }

        // 🚨 승인 상태 체크 (Admin이 아닐 경우 published만 허용)
        // 실제로는 세션 체크 로직이 필요하지만, 여기서는 기본적인 가드만 구현
        if (campaignData.status !== 'published' && !isDummyMode) {
          setError('이 캠페인은 아직 준비 중이거나 비공개 상태입니다.');
          return;
        }

        setCampaign(campaignData);

        // 선택된 글로벌 섹션들 로드 및 정렬
        if (isDummyMode) {
          const selected = campaignData.selected_sections
            .map(id => DUMMY_SECTIONS.find(s => s.id === id))
            .filter(Boolean);
          setSections(selected);
        } else {
          const { data: sectionData, error: secError } = await supabase
            .from('global_sections')
            .select('*')
            .in('id', campaignData.selected_sections);
          if (secError) throw secError;
          
          // 🚨 Supabase .in()은 순서를 보장하지 않으므로 수동 정렬
          const sorted = campaignData.selected_sections
            .map(id => sectionData.find(s => s.id === id))
            .filter(Boolean);
          setSections(sorted);
        }

      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchCampaign();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  if (error || !campaign) return <div className="flex items-center justify-center min-h-screen">{error || '404'}</div>;

  return (
    <main className="lp-container">
      {/* Dynamic SEO (Simplified head) */}
      <title>{campaign.seo_config.title}</title>
      <meta name="description" content={campaign.seo_config.description} />

      {/* 1. Hero Module (Type A or B) */}
      <section className="lp-hero relative overflow-hidden">
        {campaign.hero_type === 'B' ? (
          <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen text-center lg:text-left px-4 md:px-8 max-w-7xl mx-auto gap-12 py-20">
            <div className="flex-1">
              <span className="text-xs font-bold tracking-[0.3em] text-primary uppercase mb-4 block">EXCLUSIVELY FOR GROWTH</span>
              <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 whitespace-pre-line tracking-tighter">
                {campaign.hero_content.headline}
              </h1>
              <p className="text-xl md:text-2xl text-zinc-500 mb-12 max-w-2xl font-medium leading-relaxed">
                {campaign.hero_content.description}
              </p>
            </div>
            
            <div className="flex-1 w-full max-w-md">
              <LeadForm 
                title={campaign.hero_content.file_name}
                ctaLabel={campaign.hero_content.cta_label}
                campaignId={campaign.id}
              />
            </div>
          </div>
        ) : (
          <div className="relative h-screen w-full">
            <ParticleTextEffect words={[campaign.hero_content.headline]} />
          </div>
        )}
      </section>

      {/* 2. Selected Sections */}
      <div className="space-y-32 py-32">
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

      {/* Tracking Scripts Execution */}
      {campaign.tracking_scripts?.pixel_id && (
        <script dangerouslySetInnerHTML={{ __html: `console.log('Pixel ${campaign.tracking_scripts.pixel_id} Active')` }} />
      )}
    </main>
  );
}
