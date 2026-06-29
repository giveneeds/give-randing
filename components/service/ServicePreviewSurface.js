'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ListOrdered,
  Package,
  Settings,
  Sparkles,
} from 'lucide-react';
import MarkdownContent from '@/lib/markdownRender';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import ServiceLeadForm from '@/components/landing/ServiceLeadForm';
import ProductDetailRenderer, { getProductDetailBlockToc } from '@/components/service/ProductDetailRenderer';
import OptimizedImage from '@/components/ui/OptimizedImage';

function PreviewLink({ href, preview, className, children, ...props }) {
  if (preview) {
    return (
      <span className={className} aria-disabled="true" {...props}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}

function BlockHeader({ num, icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-900 dark:text-white">
        {num}
      </div>
      <h2 className="text-base font-black uppercase tracking-tight italic flex items-center gap-2 text-zinc-900 dark:text-white">
        <Icon size={15} /> {label}
      </h2>
    </div>
  );
}

export default function ServicePreviewSurface({
  service,
  settings,
  relatedMagazine = null,
  preview = false,
  previewData = {},
}) {
  if (!service) {
    return <div className="min-h-screen flex items-center justify-center">Service not found.</div>;
  }

  const details = service.details || {};
  const isComingSoon = details.status === 'coming_soon';

  if (isComingSoon) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-[2.5rem] p-12 md:p-16 max-w-xl w-full text-center shadow-xl border border-zinc-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white mb-8">
            <Sparkles size={28} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Coming Soon</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 uppercase italic">
            {service.title}
          </h1>
          <p className="text-zinc-600 font-medium leading-relaxed mb-10">
            현재 상품 안내 페이지를 정성껏 준비하고 있습니다.<br />
            빠른 시일 내에 정식 오픈 예정이며, 먼저 상담을 원하시면 언제든 문의 주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PreviewLink
              preview={preview}
              href="/service"
              className="px-8 py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-200 transition-all"
            >
              목록으로
            </PreviewLink>
            <PreviewLink
              preview={preview}
              href="/contact"
              className="px-8 py-4 bg-zinc-900 text-white rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-800 transition-all"
            >
              먼저 상담하기
            </PreviewLink>
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
  const detailBlockToc = getProductDetailBlockToc(details);
  const hasDetailBlocks = detailBlockToc.length > 0;
  const stripMd = (s) => typeof s === 'string' ? s.replace(/\*\*|[*_`~]/g, '') : s;
  const legacyToc = [
    effects.length > 0 && { id: 'effects', label: '상품 효과', icon: Sparkles },
    operation && { id: 'operation', label: '운영 방식', icon: Settings },
    process.length > 0 && { id: 'process', label: '진행 절차', icon: ListOrdered },
    subItems.length > 0 && { id: 'sub-items', label: '세부 상품', icon: Package },
    (duration || referenceImg) && { id: 'duration', label: '기간 소요', icon: Clock },
  ].filter(Boolean);
  const toc = hasDetailBlocks ? detailBlockToc : legacyToc;
  let blockIndex = 0;
  const nextNum = () => String(++blockIndex).padStart(2, '0');

  return (
    <>
      <LandingNavbar settings={settings} preview={preview} />
      <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-32 transition-colors ${preview ? 'pt-8' : 'pt-28'}`}>
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <PreviewLink
            preview={preview}
            href="/service"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8 font-bold text-xs uppercase tracking-widest group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to list
          </PreviewLink>

          <div className="md:grid md:grid-cols-[minmax(0,1fr)_180px] md:gap-10 lg:gap-14">
            <div className="min-w-0 max-w-2xl">
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
                <h1 className="whitespace-pre-line break-keep text-3xl md:text-4xl font-black tracking-tighter mb-3 uppercase italic leading-[1.1] text-zinc-900 dark:text-white">
                  {service.title}
                </h1>
                {service.subtitle && (
                  <p className="whitespace-pre-line break-keep text-base md:text-lg font-bold text-zinc-600 dark:text-zinc-400 leading-snug">
                    {service.subtitle}
                  </p>
                )}
              </header>

              <div className="space-y-5">
                {hasDetailBlocks ? (
                  <ProductDetailRenderer
                    details={details}
                    relatedMagazine={relatedMagazine}
                    settings={settings}
                    preview={preview}
                    previewData={previewData}
                  />
                ) : (
                  <>
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
                          <div className="relative mt-5 aspect-video rounded-xl overflow-hidden">
                            <OptimizedImage src={referenceImg} alt={service.title} className="object-contain" sizes="(max-width: 768px) 100vw, 640px" />
                          </div>
                        )}
                      </motion.section>
                    )}

                    {effects.length === 0 && !operation && process.length === 0 && subItems.length === 0 && !duration && (
                      <section className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
                        <p className="text-zinc-500 font-bold">상세 데이터를 준비 중입니다.</p>
                      </section>
                    )}
                  </>
                )}

                {!hasDetailBlocks && relatedMagazine && (
                  <PreviewLink
                    preview={preview}
                    href={`/magazine/${relatedMagazine.slug}`}
                    id="related-magazine"
                    className="scroll-mt-28 mt-8 group block bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch">
                      {relatedMagazine.thumbnail_url && (
                        <div className="relative sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                          <OptimizedImage
                            src={relatedMagazine.thumbnail_url}
                            alt={relatedMagazine.title}
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 100vw, 192px"
                          />
                        </div>
                      )}
                      <div className="flex-1 p-6 md:p-7 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2 text-zinc-500">
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
                  </PreviewLink>
                )}

                <ServiceLeadForm service={service} preview={preview} />
              </div>
            </div>

            <aside className="hidden md:block">
              <div className="sticky top-28">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 pl-3">
                  Contents
                </div>
                <nav className="space-y-1">
                  {toc.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={preview ? (e) => e.preventDefault() : undefined}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors group"
                      >
                        <Icon size={13} className="opacity-50 group-hover:opacity-100" />
                        <span className="break-keep">{item.label}</span>
                      </a>
                    );
                  })}
                  {!hasDetailBlocks && relatedMagazine && (
                    <a
                      href="#related-magazine"
                      onClick={preview ? (e) => e.preventDefault() : undefined}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors group"
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
      <LandingFooter settings={settings} preview={preview} />
    </>
  );
}
