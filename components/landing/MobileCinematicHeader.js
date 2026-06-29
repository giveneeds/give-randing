const MOBILE_PRODUCTS = [
  { id: 'seo', title: 'SEO Strategy', subtitle: 'Search Engine Optimization', category: 'Growth' },
  { id: 'ai', title: 'AI Automation', subtitle: 'Smart Workflow Solutions', category: 'Efficiency' },
  { id: 'advisor', title: 'Search Advisor', subtitle: 'Professional Search Insight', category: 'Search' },
];

export default function MobileCinematicHeader() {
  return (
    <section className="md:hidden min-h-[100svh] bg-white dark:bg-zinc-950 px-4 pt-28 pb-12 flex flex-col justify-center overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.35em] text-blue-500 mb-4">
          Intelligence System v3
        </p>
        <div className="relative text-[18vw] leading-none font-black tracking-tighter text-zinc-900 dark:text-white uppercase whitespace-nowrap">
          GIVENEEDS
        </div>
        <p className="relative mt-5 max-w-xs text-sm font-bold leading-relaxed text-zinc-500 dark:text-zinc-400 break-keep">
          데이터와 검색 흐름을 읽고, 브랜드가 필요한 마케팅 액션만 선명하게 설계합니다.
        </p>
      </div>

      <div className="mt-12 rounded-[2rem] border border-zinc-200 bg-white/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-900/80">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-white/5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-light tracking-tight text-zinc-900 dark:text-white">Marketing Solutions</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">Ready for Analysis</div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {MOBILE_PRODUCTS.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 dark:border-white/5 dark:bg-white/5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-zinc-900 dark:text-white">{product.title}</span>
                  <span className="block truncate text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{product.subtitle}</span>
                </span>
              </div>
              <span className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:border-white/10 dark:bg-white/10">
                {product.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
