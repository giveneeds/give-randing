'use client';

export default function GlobalFooter() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-900 dark:bg-white rounded-sm flex items-center justify-center text-white dark:text-black font-black text-xs">G</div>
              <span className="font-bold tracking-tight text-zinc-900 dark:text-white">GIVENEEDS</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              성장을 위한 최고의 마케팅 파트너, 기브니즈
            </p>
          </div>

          {/* Business Info */}
          <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 space-y-2 md:text-right">
            <p className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Business Information</p>
            <div className="space-y-1">
              <p>© 2026 giveneds 기브니즈</p>
              <p>대표전화: 0507-1339-0553 | 이메일: <a href="mailto:giveneeds1@naver.com" className="hover:text-zinc-900 dark:hover:text-white transition-colors">giveneeds1@naver.com</a></p>
              <p>사업자등록번호: 855-13-02688 | 통신판매업번호: 2024-부산해운대-1060</p>
              <p>주소: (48059) 부산광역시 해운대구 센텀중앙로 48, 1801호</p>
              <p>대표자: 채정욱,박성빈 | 개인정보보호책임자: 채정욱,박성빈</p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
            Strategic Marketing Partner
          </p>
          <div className="flex gap-6">
            <a href="/service" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">Services</a>
            <a href="/magazine" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">Magazine</a>
            <a href="/contact" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
