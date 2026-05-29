'use client';

import { useState, useEffect, use } from 'react';
import {
  ArrowLeft, Clock, CheckCircle2, Sparkles, Settings, ListOrdered, Package, BookOpen, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MarkdownContent from '@/lib/markdownRender';
import { appendService } from '@/lib/userTrail';
import { trackEvent } from '@/lib/tracker';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import ServiceLeadForm from '@/components/landing/ServiceLeadForm';

export default function ServiceDetailPage({ params }) {
  const { slug } = use(params);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedMagazine, setRelatedMagazine] = useState(null);
  const [settings, setSettings] = useState(DUMMY_SETTINGS);

  // landing_settings 로드 (Navbar/Footer 브랜드 일관성)
  useEffect(() => {
    if (isDummyMode) return;
    (async () => {
      try {
        const { data } = await supabase.from('landing_settings').select('*').single();
        if (data) setSettings(data);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/services?all=true`);
        const data = await res.json();
        const found = Array.isArray(data) ? data.find(s => s.slug === slug) : null;
        if (found) {
          setService(found);
          if (!found?.details?.related_magazine_slug) setRelatedMagazine(null);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [slug]);

  // 행동 추적 — 내부 전용, UI 노출 금지
  useEffect(() => {
    if (service?.slug) {
      appendService({ slug: service.slug, title: service.title, category: service.category });
      trackEvent('service_view', { slug: service.slug, title: service.title, category: service.category });
    }
  }, [service]);

  // 연결된 매거진 메타(제목/썸네일) 조회 — 서비스 로드 후 1회
  useEffect(() => {
    const relSlug = service?.details?.related_magazine_slug;
    if (!relSlug) return;
    fetch('/api/magazines')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.magazines) ? d.magazines : [];
        const found = list.find(m => m.slug === relSlug);
        if (found) setRelatedMagazine(found);
      })
      .catch(() => setRelatedMagazine(null));
  }, [service]);

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

  // 짧은 타이틀용 — 마크다운 기호만 제거
  const stripMd = (s) => typeof s === 'string' ? s.replace(/\*\*|[*_`~]/g, '') : s;

  // 데스크탑 우측 TOC용 — 활성 블록만 모아서 ID 생성
  const toc = [
    effects.length > 0 && { id: 'effects', label: '상품 효과', icon: Sparkles },
    operation && { id: 'operation', label: '운영 방식', icon: Settings },
    process.length > 0 && { id: 'process', label: '진행 절차', icon: ListOrdered },
    subItems.length > 0 && { id: 'sub-items', label: '세부 상품', icon: Package },
    (duration || referenceImg) && { id: 'duration', label: '기간 소요', icon: Clock },
  ].filter(Boolean);

  let blockIndex = 0;
  const nextNum = () => String(++blockIndex).padStart(2, '0');

  return (
    <>
      <LandingNavbar settings={settings} />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pt-28 pb-32 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Navigation */}
        <Link
          href="/service"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8 font-bold text-xs uppercase tracking-widest group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to list
        </Link>

        {/* 2-col grid: 메인 + 우측 TOC (md↑) */}
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_180px] md:gap-10 lg:gap-14">
          {/* ─── 메인 컬럼 ─── */}
          <div className="min-w-0 max-w-2xl">
            {/* Hero Block */}
            <header className="mb-6 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest"
                  style={{ backgroundColor: service.color || '#18181B' }}
                >
                  {service.category}
                </span>
                {service.is_active === false && (
                  <span className="px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-500 rounded text-[10px] font-black uppercase tracking-widest">
                    Admin Hidden
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-3 uppercase italic leading-[1.1] text-zinc-900 dark:text-white">
                {service.title}
              </h1>
              {service.subtitle && (
                <p className="text-base md:text-lg font-bold text-zinc-500 dark:text-zinc-400 leading-snug">
                  {service.subtitle}
                </p>
              )}
            </header>

            {/* Structured Blocks */}
            <div className="space-y-5">
              {/* 01. 상품 효과 */}
              {effects.length > 0 && (
                <motion.section
                  id="effects"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-28 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
                >
                  <BlockHeader num={nextNum()} icon={Sparkles} label="상품 효과" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {effects.map((eff, i) => (
                      <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-zinc-900 dark:text-white flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            {eff.title && (
                              <h4 className="font-black text-zinc-900 dark:text-white text-sm mb-2 leading-tight">
                                {stripMd(eff.title)}
                              </h4>
                            )}
                            <MarkdownContent text={eff.desc} variant="compact" />
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
                  id="operation"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-28 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
                >
                  <BlockHeader num={nextNum()} icon={Settings} label="운영 방식" />
                  <div className="mt-6">
                    <MarkdownContent text={operation} />
                  </div>
                </motion.section>
              )}

              {/* 03. 진행 절차 */}
              {process.length > 0 && (
                <motion.section
                  id="process"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-28 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
                >
                  <BlockHeader num={nextNum()} icon={ListOrdered} label="진행 절차" />
                  <ol className="mt-6 space-y-2">
                    {process.map((p, i) => (
                      <li key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-[11px] flex-shrink-0">
                          {p.step || String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="font-black text-zinc-900 dark:text-white text-sm mb-1.5">{stripMd(p.name)}</h4>
                          {p.desc && <MarkdownContent text={p.desc} variant="compact" />}
                        </div>
                      </li>
                    ))}
                  </ol>
                </motion.section>
              )}

              {/* 04. 세부 상품 */}
              {subItems.length > 0 && (
                <motion.section
                  id="sub-items"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-28 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
                >
                  <BlockHeader num={nextNum()} icon={Package} label="세부 상품 안내" />
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subItems.map((sub, i) => (
                      <div key={i} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-colors">
                        <h4 className="font-black text-zinc-900 dark:text-white text-sm mb-2">{stripMd(sub.title)}</h4>
                        <MarkdownContent text={sub.desc} variant="compact" />
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* 05. 기간 / 레퍼런스 */}
              {(duration || referenceImg) && (
                <motion.section
                  id="duration"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-28 bg-zinc-900 text-white p-6 md:p-8 rounded-3xl shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-black">
                      {nextNum()}
                    </div>
                    <h2 className="text-base font-black uppercase tracking-tight italic flex items-center gap-2">
                      <Clock size={15} /> 기간 소요
                    </h2>
                  </div>
                  {duration && <MarkdownContent text={duration} variant="dark" />}
                  {referenceImg && (
                    <div className="mt-5 rounded-xl overflow-hidden">
                      <img src={referenceImg} alt={service.title} className="w-full" />
                    </div>
                  )}
                </motion.section>
              )}

              {/* Empty fallback */}
              {effects.length === 0 && !operation && process.length === 0 && subItems.length === 0 && !duration && (
                <section className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
                  <p className="text-zinc-400 dark:text-zinc-500 font-bold">상세 데이터를 준비 중입니다.</p>
                </section>
              )}

          {/* 관련 매거진 — 어드민에서 선택된 경우만 노출 */}
          {relatedMagazine && (
            <Link
              href={`/magazine/${relatedMagazine.slug}`}
              id="related-magazine"
              className="scroll-mt-28 mt-8 group block bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden hover:shadow-xl transition-all"
            >
              <div className="flex flex-col sm:flex-row items-stretch">
                {relatedMagazine.thumbnail_url && (
                  <div className="sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={relatedMagazine.thumbnail_url}
                      alt={relatedMagazine.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="flex-1 p-6 md:p-7 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 text-zinc-400 dark:text-zinc-500">
                    <BookOpen size={13} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                      {service.details?.related_magazine_header || 'Related Magazine'}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-snug break-keep mb-3">
                    {relatedMagazine.title}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white group-hover:gap-3 transition-all">
                    매거진에서 더 알아보기
                    <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            </Link>
          )}

              <ServiceLeadForm service={service} />
            </div>
          </div>

          {/* ─── 우측 TOC (md↑ only) ─── */}
          <aside className="hidden md:block">
            <div className="sticky top-28">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 mb-4 pl-3">
                Contents
              </div>
              <nav className="space-y-1">
                {toc.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors group"
                    >
                      <Icon size={13} className="opacity-50 group-hover:opacity-100" />
                      <span className="break-keep">{item.label}</span>
                    </a>
                  );
                })}
                {relatedMagazine && (
                  <a
                    href="#related-magazine"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors group"
                  >
                    <BookOpen size={13} className="opacity-50 group-hover:opacity-100" />
                    <span className="break-keep">관련 매거진</span>
                  </a>
                )}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
      <LandingFooter settings={settings} />
    </>
  );
}

function BlockHeader({ num, icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-900 dark:text-white">
        {num}
      </div>
      <h2 className="text-base md:text-lg font-black uppercase tracking-tight italic flex items-center gap-2 text-zinc-900 dark:text-white">
        <Icon size={15} /> {label}
      </h2>
    </div>
  );
}
