'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';
import { Settings, Globe, Plus, Trash2, Edit3, Power, MousePointer2 } from 'lucide-react';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      let campData, secData;
      if (isDummyMode) {
        campData = DUMMY_CAMPAIGNS;
        secData = DUMMY_SECTIONS;
      } else {
        const [cRes, sRes] = await Promise.all([
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
          supabase.from('global_sections').select('*').eq('is_active', true)
        ]);
        campData = cRes.data || [];
        secData = sRes.data || [];
      }
      setCampaigns(campData);
      setSections(secData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (campaign) => {
    setCurrentCampaign({ ...campaign });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentCampaign({
      slug: '',
      title: '새 캠페인',
      is_active: true,
      hero_type: 'B',
      hero_content: { headline: '', description: '', cta_label: '지금 신청하기' },
      seo_config: { title: '', description: '', og_image: '' },
      tracking_scripts: { pixel_id: '', ga_id: '' },
      selected_sections: []
    });
    setIsEditing(true);
  };

  if (loading) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">캠페인(LP) 관리</h1>
          <p className="text-gray-500">광고 소재별 전용 랜딩 페이지를 생성하고 성과를 추적하세요.</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold">
          <Plus size={18} /> 새 캠페인 생성
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {campaigns.map(camp => (
          <div key={camp.id} className="bg-white border rounded-xl p-6 flex justify-between items-center hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${camp.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{camp.title}</h3>
                <code className="text-xs text-blue-500">/lp/{camp.slug}</code>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right mr-4 hidden md:block">
                <span className={`px-2 py-1 rounded text-[10px] font-bold ${camp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {camp.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Hero: {camp.hero_type}</p>
              </div>
              <button onClick={() => handleEdit(camp)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <Edit3 size={20} />
              </button>
              <button className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal (Simulated for now) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-8">캠페인 설정 수정</h2>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">캠페인 이름</label>
                  <input className="w-full p-3 border rounded-lg" value={currentCampaign.title} onChange={e => setCurrentCampaign({...currentCampaign, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">URL 슬러그 (lp/[slug])</label>
                  <input className="w-full p-3 border rounded-lg" value={currentCampaign.slug} onChange={e => setCurrentCampaign({...currentCampaign, slug: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">히어로 모듈 타입</label>
                  <select className="w-full p-3 border rounded-lg" value={currentCampaign.hero_type} onChange={e => setCurrentCampaign({...currentCampaign, hero_type: e.target.value})}>
                    <option value="A">타입 A: 매거진/파티클형</option>
                    <option value="B">타입 B: 가이드북/리드폼형</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">트래킹 픽셀 (Meta Pixel ID)</label>
                  <input className="w-full p-3 border rounded-lg" value={currentCampaign.tracking_scripts.pixel_id} onChange={e => setCurrentCampaign({...currentCampaign, tracking_scripts: {...currentCampaign.tracking_scripts, pixel_id: e.target.value}})} />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-bold text-sm mb-3">글로벌 섹션 연동</h4>
                  {sections.map(sec => (
                    <label key={sec.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={currentCampaign.selected_sections.includes(sec.id)}
                        onChange={() => {
                          const ids = currentCampaign.selected_sections.includes(sec.id) 
                            ? currentCampaign.selected_sections.filter(id => id !== sec.id)
                            : [...currentCampaign.selected_sections, sec.id];
                          setCurrentCampaign({...currentCampaign, selected_sections: ids});
                        }}
                      />
                      <span className="text-sm">{sec.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-12">
              <button onClick={() => setIsEditing(false)} className="px-6 py-2 border rounded-lg font-bold">취소</button>
              <button onClick={() => { setIsEditing(false); /* Save logic */ }} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">캠페인 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
