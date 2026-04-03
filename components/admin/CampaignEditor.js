'use client';
import { useState } from 'react';
import { X, Layout, Rocket, BarChart3, CheckCircle2, AlertCircle, Save, Send } from 'lucide-react';
import AdminLPBuilder from './AdminLPBuilder';
import AiCoachingPanel from './AiCoachingPanel';

export default function CampaignEditor({ campaign, sections, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('build');
  const [current, setCurrent] = useState({ ...campaign });

  const handleStatusChange = (newStatus) => {
    setCurrent({ ...current, status: newStatus });
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] flex flex-col rounded-md overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-black tracking-tighter uppercase text-zinc-900">Campaign Editor</h2>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${current.status === 'published' ? 'bg-zinc-900 text-white' : 'bg-yellow-50 text-yellow-600'}`}>
                {current.status || 'draft'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Editing: /lp/{current.slug}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-md transition-colors"><X size={20} /></button>
        </div>

        {/* Tab Navigation */}
        <div className="px-10 border-b border-zinc-50 flex gap-10">
          {['general', 'build', 'coaching'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-300 hover:text-zinc-500'}`}>
               {tab === 'general' ? 'Basic Settings' : tab === 'build' ? 'LP Builder' : 'AI Coaching'}
            </button>
          ))}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-12">
            {activeTab === 'general' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                <section className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Title</label>
                    <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none font-bold" value={current.title} onChange={e => setCurrent({...current, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">URL Slug</label>
                    <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none font-mono" value={current.slug} onChange={e => setCurrent({...current, slug: e.target.value})} />
                  </div>
                </section>
                <section className="space-y-6">
                  <h3 className="text-xs font-black tracking-widest uppercase">Hero Module Type</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'A', label: 'Particle (애니메이션)', icon: <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> },
                      { id: 'B', label: 'Lead Magnet (신청폼)', icon: <Rocket size={16} /> }
                    ].map(t => (
                      <button key={t.id} onClick={() => setCurrent({...current, hero_type: t.id})} className={`p-6 border-2 text-left rounded-md transition-all ${current.hero_type === t.id ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100'}`}>
                        <div className={`w-8 h-8 rounded-full mb-4 flex items-center justify-center ${current.hero_type === t.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>{t.icon}</div>
                        <p className="text-xs font-black uppercase tracking-widest">{t.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* 🎭 Particle Text Editor (Type A 전용) */}
                  {current.hero_type === 'A' && (
                    <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-md space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Particle Words (줄바꿈으로 구분)</label>
                        <span className="text-[9px] text-zinc-300 uppercase font-bold tracking-tight">Newline (\n) = Sequence</span>
                      </div>
                      <textarea 
                        className="w-full p-4 bg-white border border-zinc-200 rounded-md text-sm outline-none font-bold min-h-[120px] leading-relaxed" 
                        value={current.hero_content.particle_text || ''} 
                        placeholder={"안녕하세요.\n기브니즈입니다.\n무엇을 도와드릴까요?"}
                        onChange={e => setCurrent({
                          ...current, 
                          hero_content: { ...current.hero_content, particle_text: e.target.value } 
                        })} 
                      />
                      <p className="text-[11px] text-zinc-400 font-medium">줄바꿈을 하면 화면에 순차적으로 나타나는 자막이 됩니다.</p>
                    </div>
                  )}

                  {/* 폼 설정 (Type B 전용 또는 공통) */}
                  {current.hero_type === 'B' && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Headline</label>
                      <input className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none font-bold" value={current.hero_content.headline} onChange={e => setCurrent({...current, hero_content: {...current.hero_content, headline: e.target.value}})} />
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'build' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <AdminLPBuilder selectedSectionIds={current.selected_sections} allSections={sections} onChange={(ids) => setCurrent({...current, selected_sections: ids})} />
              </div>
            )}

            {activeTab === 'coaching' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                 <AiCoachingPanel campaign={current} onApply={() => {}} />
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-12">
            <section className="p-8 bg-zinc-900 text-white rounded-md space-y-8">
              <h4 className="text-xs font-black tracking-widest uppercase flex items-center gap-2">
                <CheckCircle2 size={16} /> Status & Launch
              </h4>
              <div className="space-y-4">
                 <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-loose">
                    현재 상태: <span className="text-white bg-zinc-800 px-2 py-1 rounded inline-block ml-2">{current.status || 'draft'}</span>
                 </p>
                 {current.status !== 'published' && (
                   <button onClick={() => handleStatusChange('published')} className="w-full py-4 bg-white text-zinc-900 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-3">
                      Approve & Publish <Send size={14} />
                   </button>
                 )}
                 {current.status === 'draft' && (
                   <button onClick={() => handleStatusChange('pending')} className="w-full py-4 bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest border border-zinc-700 hover:text-white transition-all">
                      Request Review
                   </button>
                 )}
              </div>
            </section>
            
            <section className="space-y-4 p-8 border border-zinc-100 rounded-md">
               <h4 className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                  <BarChart3 size={14} /> Tracking Pixel
               </h4>
               <input className="w-full p-4 bg-zinc-50 border border-zinc-100 text-xs font-mono rounded" placeholder="G-XXXXXXXX" value={current.tracking_scripts.ga_id} onChange={e => setCurrent({...current, tracking_scripts: {...current.tracking_scripts, ga_id: e.target.value}})} />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-zinc-100 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-6 py-3 border border-zinc-200 text-zinc-400 rounded-md font-bold text-xs uppercase tracking-widest">Discard</button>
          <button onClick={() => onSave(current)} className="px-10 py-3 bg-zinc-900 text-white rounded-md font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-lg">Save Changes <Save size={14}/></button>
        </div>
      </div>
    </div>
  );
}
