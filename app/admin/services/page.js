'use client';

import { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Search, 
  MessageSquare, Star, Cpu, Instagram, MapPin, 
  Layout, Target, Save, X
} from 'lucide-react';
import { DUMMY_SECTIONS } from '@/lib/supabase';

const iconMap = {
  MessageSquare: MessageSquare,
  Star: Star,
  Cpu: Cpu,
  Instagram: Instagram,
  MapPin: MapPin,
  Layout: Layout,
  Target: Target,
};

export default function AdminServicesPage() {
  const serviceSection = DUMMY_SECTIONS.find(s => s.id === 'sec-product-detail');
  const [services, setServices] = useState(serviceSection?.content?.items || []);
  const [isEditing, setIsEditing] = useState(null);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">상품/솔루션 관리</h1>
          <p className="text-zinc-500 mt-1">7대 핵심 마케팅 카테고리 및 상세 서비스를 구성합니다.</p>
        </div>
        <button className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:scale-[1.02] transition-transform">
          <Plus size={18} />
          새 서비스 추가
        </button>
      </div>

      {/* 서비스 리스트 */}
      <div className="grid grid-cols-1 gap-4">
        {services.map((service, index) => {
          const Icon = iconMap[service.icon] || Target;
          
          return (
            <div 
              key={service.id} 
              className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center gap-6 group hover:shadow-lg transition-all"
            >
              {/* Index & Color Indicator */}
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
                style={{ backgroundColor: service.color }}
              >
                {index + 1}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {service.detail_title}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 rounded text-zinc-600">
                    {service.slug}
                  </span>
                </div>
                <h3 className="text-lg font-black text-zinc-900 leading-none mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-1 font-medium italic">
                  {service.desc}
                </p>
              </div>

              {/* Icon Visual */}
              <div className="hidden md:flex items-center gap-4 px-6 border-l border-zinc-100 text-zinc-300">
                <Icon size={24} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                  <Edit2 size={18} />
                </button>
                <button className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip Box */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 flex gap-4">
        <div className="w-10 h-10 bg-white rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 flex-shrink-0">
          <Target size={20} />
        </div>
        <div>
          <h4 className="font-bold text-zinc-900 text-sm">시스템 안내</h4>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            여기서 수정한 상품/솔루션 정보는 홈페이지 상단의 <strong>'서비스'</strong> 메뉴와 
            메인 하단의 <strong>'OUR SOLUTION'</strong> 섹션에 실시간으로 반영됩니다.<br />
            AI 서비스의 경우 <strong>CpuArchitecture</strong> 애니메이션이 자동으로 활성화됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
