'use client';

import { useState, useEffect, use } from 'react';
import {
  ArrowLeft, Clock, CheckCircle2, Sparkles, Settings, ListOrdered, Package
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ServiceDetailPage({ params }) {
  const { slug } = use(params);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/services?all=true`);
        const data = await res.json();
        const found = Array.isArray(data) ? data.find(s => s.slug === slug) : null;
        if (found) setService(found);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-white" />;
  if (!service) return <div className="min-h-screen flex items-center justify-center">Service not found.</div>;

  const details = service.details || {};
  const isComingSoon = details.status === 'coming_soon';

  // 준비중 상품: 상세 페이지 진입 시 안내 후 목록으로
  if (isComingSoon) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-[2.5rem] p-12 md:p-16 max-w-xl w-full text-center shadow-xl border border-zinc-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white mb-8">
            <Sparkles size={28} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Coming Soon</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 uppercase italic">
            {service.title}
          </h1>
          <p className="text-zinc-500 font-medium leading-relaxed mb-10">
            현재 상품 안내 페이지를 정성껏 준비하고 있습니다.<br />
            빠른 시일 내에 정식 오픈 예정이며, 먼저 상담을 원하시면 언제든 문의 주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/service"
              className="px-8 py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-200 transition-all"
            >
              목록으로
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-zinc-900 text-white rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-800 transition-all"
            >
              먼저 상담하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const effects = Array.isArray(details.effects) ? details.effects : [];
  const operation = details.operation || '';
  const process = Array.isArray(details.process) ? details.process : [];
  const subItems = Array.isArray(details.sub_items) ? details.sub_items : [];
  const duration = details.duration || '';
  const referenceImg = details.reference_img || '';

  // Inline markdown renderer (**bold**, strip other md symbols)
  const renderInline = (text) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-zinc-900">{part.slice(2, -2)}</strong>;
      }
      return part.replace(/[*_`~]/g, '');
    });
  };

  // Multi-line text renderer with bullet support
  const renderMultiline = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <div key={i} className="flex gap-3 mb-2">
            <span className="text-zinc-300 mt-1.5 flex-shrink-0">•</span>
            <span className="text-zinc-600 font-medium leading-relaxed">{renderInline(trimmed.substring(2))}</span>
          </div>
        );
      }
      return (
        <p key={i} className="mb-3 text-zinc-600 font-medium leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    });
  };

  let blockIndex = 0;
  const nextNum = () => String(++blockIndex).padStart(2, '0');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-32 pb-40">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Navigation */}
        <Link
          href="/service"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12 font-bold text-sm uppercase tracking-widest group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to list
        </Link>

        {/* Hero Block */}
        <header className="mb-12 bg-white p-10 md:p-16 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <span
              className="px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest"
              style={{ backgroundColor: service.color || '#18181B' }}
            >
              {service.category}
            </span>
            {service.is_active === false && (
              <span className="px-3 py-1 bg-red-50 text-red-500 rounded text-[10px] font-black uppercase tracking-widest">
                Admin Hidden
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase italic leading-[1.1]">
            {service.title}
          </h1>
          {service.subtitle && (
            <p className="text-xl md:text-2xl font-bold text-zinc-400 max-w-3xl leading-snug">
              {service.subtitle}
            </p>
          )}
          {service.description && (
            <p className="mt-6 text-base text-zinc-500 max-w-3xl leading-relaxed font-medium border-t border-zinc-100 pt-6">
              {service.description}
            </p>
          )}
        </header>

        {/* Structured Blocks */}
        <div className="space-y-8">
          {/* 01. 상품 효과 */}
          {effects.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-zinc-100 shadow-sm"
            >
              <BlockHeader num={nextNum()} icon={Sparkles} label="상품 효과" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
                {effects.map((eff, i) => (
                  <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-zinc-900 flex-shrink-0 mt-0.5" />
                      <div>
                        {eff.title && (
                          <h4 className="font-black text-zinc-900 text-base mb-2 leading-tight">
                            {renderInline(eff.title)}
                          </h4>
                        )}
                        <div className="text-sm text-zinc-600 font-medium leading-relaxed">
                          {renderMultiline(eff.desc)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* 02. 운영 방식 */}
          {operation && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-zinc-100 shadow-sm"
            >
              <BlockHeader num={nextNum()} icon={Settings} label="운영 방식" />
              <div className="mt-10 prose prose-zinc max-w-none">
                {renderMultiline(operation)}
              </div>
            </motion.section>
          )}

          {/* 03. 진행 절차 */}
          {process.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-zinc-100 shadow-sm"
            >
              <BlockHeader num={nextNum()} icon={ListOrdered} label="진행 절차" />
              <ol className="mt-10 space-y-4">
                {process.map((p, i) => (
                  <li key={i} className="flex gap-5 items-start p-5 rounded-2xl hover:bg-zinc-50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                      {p.step || String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-black text-zinc-900 text-base mb-1.5">{renderInline(p.name)}</h4>
                      {p.desc && (
                        <div className="text-sm text-zinc-500 font-medium leading-relaxed">
                          {renderMultiline(p.desc)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>
          )}

          {/* 04. 세부 상품 */}
          {subItems.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-zinc-100 shadow-sm"
            >
              <BlockHeader num={nextNum()} icon={Package} label="세부 상품 안내" />
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                {subItems.map((sub, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-zinc-200 hover:border-zinc-900 transition-colors">
                    <h4 className="font-black text-zinc-900 text-base mb-3">{renderInline(sub.title)}</h4>
                    <div className="text-sm text-zinc-500 font-medium leading-relaxed">
                      {renderMultiline(sub.desc)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* 05. 기간 / 레퍼런스 */}
          {(duration || referenceImg) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-zinc-900 text-white p-10 md:p-14 rounded-[2.5rem] shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black">
                  {nextNum()}
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-3">
                  <Clock size={18} /> 기간 소요
                </h2>
              </div>
              {duration && (
                <div className="text-base md:text-lg font-medium leading-relaxed text-zinc-200 [&_p]:text-zinc-200 [&_strong]:text-white">
                  {renderMultiline(duration)}
                </div>
              )}
              {referenceImg && (
                <div className="mt-8 rounded-2xl overflow-hidden">
                  <img src={referenceImg} alt={service.title} className="w-full" />
                </div>
              )}
            </motion.section>
          )}

          {/* Empty fallback */}
          {effects.length === 0 && !operation && process.length === 0 && subItems.length === 0 && !duration && (
            <section className="bg-white p-16 rounded-[2.5rem] border border-zinc-100 text-center">
              <p className="text-zinc-400 font-bold">상세 데이터를 준비 중입니다.</p>
            </section>
          )}

          {/* CTA */}
          <div className="mt-16 flex justify-center">
            <Link
              href="/contact"
              className="px-14 py-5 bg-zinc-900 text-white rounded-full font-black text-lg uppercase tracking-tight hover:bg-zinc-800 transition-all shadow-xl flex items-center gap-3"
            >
              상담하기
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockHeader({ num, icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-black">
        {num}
      </div>
      <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-3">
        <Icon size={18} /> {label}
      </h2>
    </div>
  );
}
