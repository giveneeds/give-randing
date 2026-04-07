'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Search, 
  MessageSquare, Star, Cpu, MapPin, 
  Layout, Target, Save, X, Image as ImageIcon,
  CheckCircle2, Zap, LayoutGrid, ListOrdered, Clock
} from 'lucide-react';
import { DUMMY_SERVICE_PRODUCTS } from '@/lib/supabase';

const iconMap = {
  MessageSquare, Star, Cpu, MapPin, Layout, Target, CheckCircle2
};

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null); // id of service being edited or 'new'
  const [editForm, setEditForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services?all=true');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setServices(data);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setIsEditing(service.id);
    setEditForm({
      ...service,
      details: service.details || {
        effects: [],
        operation: '',
        process: [],
        sub_items: [],
        duration: '',
        reference_img: ''
      }
    });
  };

  const handleCreateNew = () => {
    setIsEditing('new');
    setEditForm({
      title: '',
      slug: '',
      subtitle: '',
      description: '',
      category: 'ADS',
      color: '#1E4181',
      icon: 'Target',
      order_num: services.length,
      is_active: true,
      details: {
        effects: [{ title: '', desc: '' }],
        operation: '',
        process: [{ step: '01', name: '', desc: '' }],
        sub_items: [{ title: '', desc: '' }],
        duration: '',
        reference_img: ''
      }
    });
  };

  const handleSave = async () => {
    try {
      const url = isEditing === 'new' ? '/api/services' : `/api/services/${isEditing}`;
      const method = isEditing === 'new' ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditing(null);
        fetchServices();
        alert('저장되었습니다.');
      } else {
        const err = await res.json();
        alert(`저장 실패: ${err.error}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active })
      });
      if (res.ok) {
        fetchServices();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServices();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">서비스/솔루션 마스터 관리</h1>
          <p className="text-zinc-500 mt-1">DB 연동을 통해 16대 서비스 상품의 상세 내용을 관리합니다.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
        >
          <Plus size={18} />
          신규 서비스 추가
        </button>
      </div>

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text"
          placeholder="서비스명 또는 슬러그 검색..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 서비스 리스트 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          return (
            <div 
              key={service.id} 
              className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center gap-6 group hover:shadow-lg transition-all"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ backgroundColor: service.color }}
              >
                {index + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {service.category}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 rounded text-zinc-600">
                    {service.slug}
                  </span>
                  {!service.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 rounded text-red-500 uppercase">
                      비활성
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-zinc-900 leading-none mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-1 font-medium italic">
                  {service.description || service.subtitle || '설명 없음'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Active Toggle */}
                <button 
                  onClick={() => handleToggleActive(service)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
                    ${service.is_active ? 'bg-zinc-900' : 'bg-zinc-200'}
                  `}
                >
                  <div className={`
                    absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
                    ${service.is_active ? 'translate-x-6' : 'translate-x-0'}
                  `} />
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 편집 모달 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-200 flex justify-between items-center bg-white rounded-t-[2.5rem]">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase italic">
                  {isEditing === 'new' ? 'New Service' : 'Edit Service'}
                </h2>
                <p className="text-zinc-500 text-sm">{editForm.title || editForm.slug || '상품 정보를 입력하세요.'}</p>
              </div>
              <button 
                onClick={() => setIsEditing(null)}
                className="p-3 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {/* 기본 정보 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <LayoutGrid className="text-zinc-900" size={20} />
                  <h3 className="font-black text-lg uppercase italic underline decoration-zinc-200">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Title (국문 명칭)</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Slug (영문 URL용)</label>
                    <input 
                      disabled={isEditing !== 'new'}
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({...editForm, slug: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Subtitle (전문적 한줄평)</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.subtitle}
                      onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-400">Category</label>
                    <select 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900"
                      value={editForm.category}
                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    >
                      <option value="ADS">ADS (VIRAL)</option>
                      <option value="GROWTH">GROWTH (REVIEW)</option>
                      <option value="LOCAL">LOCAL (SEO)</option>
                      <option value="TECH">TECH (CREATIVE)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-xs font-black uppercase text-zinc-400">Main Description (전체 설명)</label>
                  <textarea 
                    className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 h-24 mt-2"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>
              </section>

              {/* 상세 상세 정보 (JSON Details) */}
              <section className="space-y-10">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="text-zinc-900" size={20} />
                  <h3 className="font-black text-lg uppercase italic underline decoration-zinc-200">Execution Details (JSON)</h3>
                </div>

                {/* 상품 효과 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-zinc-500">01. Service Effects (효과)</h4>
                    <button 
                      onClick={() => setEditForm({
                        ...editForm, 
                        details: { ...editForm.details, effects: [...(editForm.details.effects || []), { title: '', desc: '' }] }
                      })}
                      className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                    >+ Add Effect</button>
                  </div>
                  {(editForm.details.effects || []).map((effect, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <input 
                          placeholder="효과 제목"
                          className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm"
                          value={effect.title}
                          onChange={(e) => {
                            const newEffects = [...editForm.details.effects];
                            newEffects[idx].title = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                          }}
                        />
                        <textarea 
                          placeholder="상세 설명"
                          className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs h-16"
                          value={effect.desc}
                          onChange={(e) => {
                            const newEffects = [...editForm.details.effects];
                            newEffects[idx].desc = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newEffects = editForm.details.effects.filter((_, i) => i !== idx);
                          setEditForm({...editForm, details: {...editForm.details, effects: newEffects }});
                        }}
                        className="p-2 text-zinc-300 hover:text-red-500"
                      ><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                {/* 운영 방식 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase text-zinc-500">02. Operational Principle (운영 방식)</h4>
                  <textarea 
                    className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 h-32"
                    placeholder="기브니즈만의 차별화된 운영 철학 및 방식을 입력하세요."
                    value={editForm.details.operation}
                    onChange={(e) => setEditForm({...editForm, details: {...editForm.details, operation: e.target.value}})}
                  />
                </div>

                {/* 진행 절차 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-zinc-500">03. Execution Process (진행 절차)</h4>
                    <button 
                      onClick={() => setEditForm({
                        ...editForm, 
                        details: { ...editForm.details, process: [...(editForm.details.process || []), { step: `0${(editForm.details.process?.length || 0) + 1}`, name: '', desc: '' }] }
                      })}
                      className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                    >+ Add Step</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(editForm.details.process || []).map((proc, idx) => (
                      <div key={idx} className="p-4 bg-white border border-zinc-200 rounded-xl flex gap-3 relative group">
                        <input 
                          className="w-12 p-2 bg-zinc-100 rounded-lg text-center font-black text-xs h-fit"
                          value={proc.step}
                          onChange={(e) => {
                            const newProc = [...editForm.details.process];
                            newProc[idx].step = e.target.value;
                            setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                          }}
                        />
                        <div className="flex-1 space-y-2">
                          <input 
                            placeholder="절차명"
                            className="w-full p-2 border-b border-zinc-100 outline-none text-sm font-bold"
                            value={proc.name}
                            onChange={(e) => {
                              const newProc = [...editForm.details.process];
                              newProc[idx].name = e.target.value;
                              setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                            }}
                          />
                          <textarea 
                            placeholder="설명"
                            className="w-full p-2 text-xs outline-none h-12"
                            value={proc.desc}
                            onChange={(e) => {
                              const newProc = [...editForm.details.process];
                              newProc[idx].desc = e.target.value;
                              setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newProc = editForm.details.process.filter((_, i) => i !== idx);
                            setEditForm({...editForm, details: {...editForm.details, process: newProc }});
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-zinc-200 rounded-full text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        ><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 세부 항목 & 기타 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase text-zinc-500">04. Estimated Duration</h4>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-2xl">
                        <Clock size={20} className="text-zinc-400" />
                        <input 
                          placeholder="e.g. 7-14 Days"
                          className="flex-1 outline-none font-bold"
                          value={editForm.details.duration}
                          onChange={(e) => setEditForm({...editForm, details: {...editForm.details, duration: e.target.value}})}
                        />
                      </div>
                      
                      <div className="pt-4">
                        <h4 className="text-sm font-black uppercase text-zinc-500 mb-4">05. Reference Image Slot</h4>
                        <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl text-white">
                          <ImageIcon size={20} className="opacity-50" />
                          <input 
                            placeholder="Image URL (Slot)"
                            className="flex-1 bg-transparent border-none outline-none text-sm italic opacity-80"
                            value={editForm.details.reference_img}
                            onChange={(e) => setEditForm({...editForm, details: {...editForm.details, reference_img: e.target.value}})}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 px-2">이미지 업로드 기능은 준비 중입니다. 현재는 URL을 직접 입력하거나 슬롯으로 활용하세요.</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase text-zinc-500">Sub Products</h4>
                        <button 
                          onClick={() => setEditForm({
                            ...editForm, 
                            details: { ...editForm.details, sub_items: [...(editForm.details.sub_items || []), { title: '', desc: '' }] }
                          })}
                          className="text-xs font-bold text-zinc-900 px-3 py-1 bg-zinc-200 rounded-full hover:bg-zinc-300"
                        >+ Add</button>
                      </div>
                      <div className="space-y-3">
                        {(editForm.details.sub_items || []).map((sub, idx) => (
                           <div key={idx} className="p-4 bg-white border border-zinc-200 rounded-xl relative">
                              <input 
                                placeholder="상품명"
                                className="w-full text-sm font-black mb-2 outline-none"
                                value={sub.title}
                                onChange={(e) => {
                                  const newSubs = [...editForm.details.sub_items];
                                  newSubs[idx].title = e.target.value;
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                              />
                              <input 
                                placeholder="설명"
                                className="w-full text-xs text-zinc-500 outline-none"
                                value={sub.desc}
                                onChange={(e) => {
                                  const newSubs = [...editForm.details.sub_items];
                                  newSubs[idx].desc = e.target.value;
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newSubs = editForm.details.sub_items.filter((_, i) => i !== idx);
                                  setEditForm({...editForm, details: {...editForm.details, sub_items: newSubs }});
                                }}
                                className="absolute top-2 right-2 text-zinc-200 hover:text-red-500"
                              ><X size={14} /></button>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              </section>

              {/* 스타일 & 설정 */}
              <section className="bg-white p-8 rounded-3xl border border-zinc-200">
                 <h3 className="font-black text-sm uppercase italic mb-6">Visual & Logic Settings</h3>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-zinc-400">Brand Color</label>
                      <div className="flex gap-3 items-center">
                        <input type="color" className="w-10 h-10 rounded-lg cursor-pointer" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                        <input className="flex-1 text-xs font-mono p-2 bg-zinc-50 border rounded-lg" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase text-zinc-400">Order</label>
                       <input type="number" className="w-full p-2 bg-zinc-50 border rounded-lg" value={editForm.order_num} onChange={e => setEditForm({...editForm, order_num: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                       <input type="checkbox" id="is_active" className="w-5 h-5 rounded-md" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                       <label htmlFor="is_active" className="text-xs font-black uppercase text-zinc-900">Active Stage</label>
                    </div>
                 </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-zinc-200 flex justify-end gap-4 bg-white rounded-b-[2.5rem]">
              <button 
                onClick={() => setIsEditing(null)}
                className="px-8 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
              >취소</button>
              <button 
                onClick={handleSave}
                className="px-10 py-3 rounded-2xl font-black bg-zinc-900 text-white flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-zinc-900/10"
              >
                <Save size={18} />
                데이터 저장하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
