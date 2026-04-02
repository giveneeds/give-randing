'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SectionRenderer from '@/components/landing/SectionRenderer';
import MagazineList from '@/components/landing/MagazineList';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS, DUMMY_SETTINGS } from '@/lib/supabase';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';
import LeadForm from '@/components/ui/LeadForm';

export default function CampaignLandingPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        let campaignData;
        
        if (isDummyMode) {
          campaignData = DUMMY_CAMPAIGNS.find(c => c.slug === slug);
          setSettings(DUMMY_SETTINGS);
        } else {
          const [cRes, sRes] = await Promise.all([
            supabase.from('campaigns').select('*').eq('slug', slug).single(),
            supabase.from('landing_settings').select('*').single()
          ]);
          if (cRes.error) throw cRes.error;
          campaignData = cRes.data;
          setSettings(sRes.data || DUMMY_SETTINGS);
        }

        if (!campaignData) {
          setError('캠페인을 찾을 수 없습니다.');
          return;
        }

        if (campaignData.status !== 'published' && !isDummyMode) {
          setError('이 캠페인은 아직 준비 중이거나 비공개 상태입니다.');
          return;
        }

        setCampaign(campaignData);

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
    <>
      <LandingNavbar settings={settings} />
      <main className="lp-container pt-20">
        {/* 1. Hero Module */}
        <section className="lp-hero relative overflow-hidden mb-24">
          {campaign.hero_type === 'B' ? (
            <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen text-center lg:text-left px-4 md:px-8 max-w-7xl mx-auto gap-12 py-20">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                    {campaign.category || 'CAMPAIGN'}
                  </span>
                  <div className="h-px w-8 bg-zinc-200" />
                  <span className="text-xs font-bold tracking-[0.3em] text-primary uppercase">EXCLUSIVELY FOR GROWTH</span>
                </div>
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
        <div className="space-y-32">
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

        {/* 3. 🛡️ 롤백 요청 사항: 아티클(매거진) 강제 노출 */}
        <section className="py-32 border-t border-zinc-100 mt-32">
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
