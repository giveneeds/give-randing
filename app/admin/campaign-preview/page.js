'use client';
import { useState, useEffect } from 'react';
import CampaignEditorUnified from '@/components/admin/CampaignEditorUnified';
import { DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';

export default function CampaignPreviewPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    // ── 테스트를 위한 더미 데이터 로드
    async function loadTestContext() {
      try {
        // 실제 API가 아닌 로컬 더미 데이터 사용
        setSections(DUMMY_SECTIONS || []);
        
        // 첫 번째 캠페인을 초기값으로 설정
        const testCampaign = DUMMY_CAMPAIGNS && DUMMY_CAMPAIGNS.length > 0 
          ? { ...DUMMY_CAMPAIGNS[0], title: "[Test] Unified Editor Preview", slug: "test-preview" }
          : {
              id: 'test-id',
              title: '통합 에디터 테스트 캠페인',
              slug: 'test-preview',
              status: 'draft',
              hero_type: 'A',
              show_particle: true,
              show_lead_form: true,
              show_ai_block: true,
              hero_content: {
                headline: '더 강력해진 통합 에디터\n실시간으로 확인하세요',
                description: '변경사항이 즉시 우측 프리뷰에 반영됩니다.',
                particle_text: 'GIVENEEDS\nSTRATEGIC\nMARKETING\nPARTNER',
                cta_label: '지금 시작하기',
                file_name: 'strategy-guide.pdf'
              },
              selected_sections: []
            };
        
        setCampaign(testCampaign);
      } catch (err) {
        console.error('Failed to load test data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTestContext();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
      <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Unified Workspace...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 실제 DB 저장 없이 상태만 변경 확인 */}
      <CampaignEditorUnified 
        campaign={campaign} 
        sections={sections} 
        onSave={(updated) => {
          console.log('Saved Data (Local):', updated);
          alert('데이터가 로컬 콘솔에 기록되었습니다. (실제 DB에는 반영되지 않은 테스트 모드입니다)');
          setCampaign(updated);
        }} 
        onClose={() => window.location.href = '/admin/campaigns'} 
      />
      
      {/* 헬퍼 안내 */}
      <div className="fixed bottom-6 left-6 z-[60] bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
         <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
         <p className="text-[10px] font-black uppercase tracking-widest">Single Page Unified Editor Test Mode</p>
      </div>
    </div>
  );
}
