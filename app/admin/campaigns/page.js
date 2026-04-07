'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';
import CampaignList from '@/components/admin/CampaignList';
import CampaignEditorUnified from '@/components/admin/CampaignEditorUnified';

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
        const [cRes, sRes] = await Promise.all([
          fetch('/api/campaigns?admin=true').then(res => res.json()),
          fetch('/api/sections?all=true').then(res => res.json())
        ]);
        setCampaigns(cRes.campaigns || []);
        // Sections API returns sections
        setSections(sRes.sections || []);
      } catch (e) {
        console.error(e);
        setCampaigns(isDummyMode ? DUMMY_CAMPAIGNS : []);
        setSections(isDummyMode ? DUMMY_SECTIONS : []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (updated) => {
    try {
      const isNew = !campaigns.find(c => c.id === updated.id);
      
      const res = await fetch('/api/campaigns', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to save via API (${res.status})`);
      }
      
      const { campaign } = await res.json();
      
      setCampaigns(prev => {
        if (isNew) return [campaign, ...prev];
        return prev.map(c => c.id === campaign.id || c.slug === campaign.slug ? campaign : c);
      });
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save campaign:', e);
      alert('저장 도중 오류가 발생했습니다: ' + e.message);
    }
  };

  const handleCreate = () => {
    setCurrentCampaign({
      id: `cp-${Date.now()}`,
      slug: '',
      title: '새 캠페인',
      is_active: true,
      status: 'draft',
      hero_type: 'B',
      show_particle: true,
      show_lead_form: true,
      show_ai_block: false,
      show_magazine_block: false,
      hero_content: {
        headline: '',
        description: '',
        particle_text: 'GIVENEEDS\nSTRATEGIC\nMARKETING\nPARTNER',
        cta_label: '지금 신청하기',
        file_name: ''
      },
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
        <CampaignEditorUnified 
          campaign={currentCampaign} 
          sections={sections} 
          onSave={handleSave} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}
