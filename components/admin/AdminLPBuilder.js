'use client';
import { Layout, GripVertical, CheckCircle2, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

export default function AdminLPBuilder({ selectedSectionIds, allSections, onChange }) {
  const selectedSections = selectedSectionIds
    .map(id => allSections.find(s => s.id === id))
    .filter(Boolean);

  const moveSection = (idx, direction) => {
    const newIds = [...selectedSectionIds];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newIds.length) return;
    const [moved] = newIds.splice(idx, 1);
    newIds.splice(targetIdx, 0, moved);
    onChange(newIds);
  };

  const removeSection = (id) => {
    onChange(selectedSectionIds.filter(sid => sid !== id));
  };

  const toggleSection = (id) => {
    const isSelected = selectedSectionIds.includes(id);
    if (isSelected) {
      removeSection(id);
    } else {
      onChange([...selectedSectionIds, id]);
    }
  };

  return (
    <div className="space-y-12">
      {/* Current Flow Viewer */}
      <section className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
           <Layout size={14} /> 현재 페이지 구성 (상단부터 하단 순서)
        </h3>
        <div className="space-y-3">
          {selectedSections.length > 0 ? selectedSections.map((sec, idx) => (
            <div key={sec.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-md flex items-center gap-4 group">
              <GripVertical size={16} className="text-zinc-300 group-hover:text-zinc-500 cursor-grab" />
              <div className="flex-1">
                 <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sec.type}</span>
                 <p className="text-sm font-bold text-zinc-900">{sec.title}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => moveSection(idx, -1)} className="p-1.5 hover:bg-zinc-200 rounded text-zinc-400"><ChevronUp size={16} /></button>
                 <button onClick={() => moveSection(idx, 1)} className="p-1.5 hover:bg-zinc-200 rounded text-zinc-400"><ChevronDown size={16} /></button>
                 <button onClick={() => removeSection(sec.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          )) : (
            <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-md">
               <p className="text-xs text-zinc-400 italic">추가된 섹션이 없습니다. 아래 라이브러리에서 선택해 주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* Section Library */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Section Library (Global)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allSections.map(sec => {
            const isSelected = selectedSectionIds.includes(sec.id);
            return (
              <div 
                key={sec.id} 
                onClick={() => toggleSection(sec.id)}
                className={`p-4 rounded-md border cursor-pointer transition-all ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' : 'bg-white border-zinc-100 hover:border-zinc-400 text-zinc-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[9px] font-bold tracking-[0.2em] opacity-50 uppercase">{sec.type}</span>
                   {isSelected && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <h4 className="text-xs font-bold truncate">{sec.title}</h4>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
