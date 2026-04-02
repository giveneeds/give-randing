'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';
import CampaignList from '@/components/admin/CampaignList';
import CampaignEditor from '@/components/admin/CampaignEditor';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setCampaigns(DUMMY_CAMPAIGNS);
          setSections(DUMMY_SECTIONS);
          return;
        }
        const [cRes, sRes] = await Promise.all([
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
          supabase.from('global_sections').select('*').eq('is_active', true)
        ]);
        setCampaigns(cRes.data || []);
        setSections(sRes.data || []);
      } catch (e) {
        console.error(e);
        setCampaigns(DUMMY_CAMPAIGNS);
        setSections(DUMMY_SECTIONS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (updated) => {
    // 실서버 저장 로직 생략 (Update supabase.from('campaigns').upsert(updated))
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setIsEditing(false);
  };

  const handleCreate = () => {
    setCurrentCampaign({
      id: `cp-${Date.now()}`,
      slug: '',
      title: '새 캠페인',
      is_active: true,
      status: 'draft',
      hero_type: 'B',
      hero_content: { headline: '', description: '', cta_label: '지금 신청하기' },
      tracking_scripts: { pixel_id: '', ga_id: '' },
      selected_sections: []
    });
    setIsEditing(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-[10px] font-bold text-zinc-400 tracking-[0.3em] uppercase animate-pulse">Initializing Dashboard...</div>
    </div>
  );

  return (
    <div className="pb-20">
      <CampaignList 
        campaigns={campaigns} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onEdit={(c) => { setCurrentCampaign(c); setIsEditing(true); }} 
        onCreate={handleCreate} 
      />

      {isEditing && (
        <CampaignEditor 
          campaign={currentCampaign} 
          sections={sections} 
          onSave={handleSave} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}
