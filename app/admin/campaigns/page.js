'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS, DUMMY_SECTIONS } from '@/lib/supabase';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Layout,
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">캠페인 목록 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">캠페인(LP) 관리</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">유입 매체별 전용 랜딩 페이지를 자동화하고 생성하세요.</p>
        </div>
        <button 
          onClick={handleCreate} 
          className="flex items-center justify-center gap-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white px-5 py-2.5 rounded-md font-bold text-sm transition-all shadow-sm tracking-widest uppercase"
        >
          <Plus size={18} /> 새 캠페인 생성
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-md border border-[var(--admin-border)] shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="캠페인 제목 또는 슬러그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors">
          <Filter size={16} /> 필터
        </button>
      </div>

      {/* Campaign Grid/List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCampaigns.length > 0 ? filteredCampaigns.map(camp => (
          <div key={camp.id} className="group bg-white rounded-md border border-[var(--admin-border)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-400 transition-all duration-300 shadow-sm">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 flex items-center justify-center rounded-md border ${camp.is_active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-400 border-zinc-200'} group-hover:scale-105 transition-transform`}>
                <Globe size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[var(--admin-text-main)]">{camp.title}</h3>
                  {camp.is_active ? (
                    <span className="text-[10px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-600 px-2.5 py-0.5 rounded-sm flex items-center gap-1 uppercase tracking-widest">
                      <CheckCircle2 size={10} /> 정식 가동중
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-zinc-50 border border-zinc-100 text-zinc-400 px-2.5 py-0.5 rounded-sm uppercase tracking-widest">
                      중지됨
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[var(--admin-text-muted)] font-mono">/lp/{camp.slug}</p>
                  <a href={`/lp/${camp.slug}`} target="_blank" className="text-[var(--admin-primary)] p-1 hover:bg-zinc-100 rounded transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-50">
              <div className="flex gap-4 items-center pl-4 sm:border-l border-zinc-100">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">유입 리드</p>
                  <p className="text-sm font-black text-[var(--admin-text-main)]">2.4k</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">전환율</p>
                  <p className="text-sm font-black text-zinc-900">12.5%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(camp)} className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-all">
                  <Edit3 size={18} />
                </button>
                <button className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-red-500 transition-all">
                  <Trash2 size={18} />
                </button>
                <div className="pl-2">
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center bg-white rounded-md border border-dashed border-[var(--admin-border)]">
            <p className="text-[var(--admin-text-muted)] text-sm italic">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Redesigned Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-5xl max-h-[85vh] flex flex-col rounded-md overflow-hidden shadow-2xl border border-white/20">
            {/* Modal Header */}
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div>
                <h2 className="text-xl font-black tracking-tighter uppercase text-[var(--admin-text-main)]">캠페인 매니저</h2>
                <p className="text-xs text-[var(--admin-text-muted)] mt-1 tracking-tight">설정 값을 변경하여 랜딩 페이지를 최적화하세요.</p>
              </div>
              <button 
                onClick={() => setIsEditing(false)} 
                className="p-2 hover:bg-zinc-200 rounded-md transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 space-y-10">
                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                    <Layout size={14} /> 기본 식별 정보
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">캠페인 타이틀</label>
                      <input 
                        className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-md text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all font-medium" 
                        value={currentCampaign.title} 
                        onChange={e => setCurrentCampaign({...currentCampaign, title: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">URL SLUG (공백없이)</label>
                      <input 
                        className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-md text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all font-mono" 
                        value={currentCampaign.slug} 
                        onChange={e => setCurrentCampaign({...currentCampaign, slug: e.target.value})} 
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                    <Rocket size={14} /> 히어로 모듈 설정
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {['A', 'B'].map(type => (
                        <button 
                          key={type}
                          onClick={() => setCurrentCampaign({...currentCampaign, hero_type: type})}
                          className={`flex-1 p-5 rounded-md border-2 text-left transition-all ${currentCampaign.hero_type === type ? 'border-zinc-900 bg-zinc-50 shadow-inner' : 'border-zinc-100 bg-white hover:border-zinc-300'}`}
                        >
                          <div className={`w-10 h-10 rounded-md mb-3 flex items-center justify-center ${currentCampaign.hero_type === type ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                            {type === 'A' ? <BookOpen size={20} /> : <Rocket size={20} />}
                          </div>
                          <p className="font-bold text-sm mb-1 uppercase tracking-wider">{type === 'A' ? '에디토리얼(매거진)형' : '가이드북(리드폼)형'}</p>
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                            {type === 'A' ? '콘텐츠 전달과 브랜딩에 적합한 잡지 레이아웃' : '특정 파일 배포와 DB 수집에 최적화된 레이아웃'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 flex items-center gap-2">
                    <Plus size={14} /> 전역 섹션 연동 (빌더)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sections.map(sec => {
                      const isSelected = currentCampaign.selected_sections.includes(sec.id);
                      return (
                        <div 
                          key={sec.id} 
                          onClick={() => {
                            const ids = isSelected 
                              ? currentCampaign.selected_sections.filter(id => id !== sec.id)
                              : [...currentCampaign.selected_sections, sec.id];
                            setCurrentCampaign({...currentCampaign, selected_sections: ids});
                          }}
                          className={`p-4 rounded-md border flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-zinc-100 border-zinc-900 shadow-sm' : 'bg-white border-zinc-200 hover:border-zinc-400'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-zinc-900 shadow-sm' : 'bg-zinc-200'}`} />
                            <span className={`text-xs font-bold ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>{sec.title}</span>
                          </div>
                          {isSelected && <CheckCircle2 size={14} className="text-zinc-900" />}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-10">
                <section className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                    <BarChart3 size={14} /> 트래킹 및 메타 데이터
                  </h3>
                  <div className="p-6 bg-zinc-50 rounded-md border border-zinc-200 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Meta Pixel ID</label>
                      <input 
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-md text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all font-mono" 
                        value={currentCampaign.tracking_scripts.pixel_id} 
                        onChange={e => setCurrentCampaign({...currentCampaign, tracking_scripts: {...currentCampaign.tracking_scripts, pixel_id: e.target.value}})} 
                        placeholder="예: 1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Google Analytics ID</label>
                      <input 
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-md text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all font-mono" 
                        value={currentCampaign.tracking_scripts.ga_id} 
                        onChange={e => setCurrentCampaign({...currentCampaign, tracking_scripts: {...currentCampaign.tracking_scripts, ga_id: e.target.value}})} 
                        placeholder="예: G-XXXXXXXXXX"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-zinc-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-6 py-3 border border-zinc-200 text-zinc-500 rounded-md font-bold text-sm hover:bg-zinc-50 transition-colors uppercase tracking-widest"
              >
                변경사항 취소
              </button>
              <button 
                onClick={() => { setIsEditing(false); /* Save logic */ }} 
                className="px-8 py-3 bg-zinc-900 hover:bg-black text-white rounded-md font-bold text-sm shadow-sm transition-all hover:scale-105 uppercase tracking-widest"
              >
                캠페인 설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
