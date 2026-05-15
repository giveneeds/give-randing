import { runCrawlAndClassify } from './workflows/runCrawlAndClassify.js';
import { error } from './lib/logger.js';

// 엔트리포인트. `npm run dev` → tsx로 직접 실행.
// 시드는 기본적으로 data/input/seed-urls.json에서 읽는다.
// 인자로 시드를 직접 전달하고 싶으면 runCrawlAndClassify({ seeds: [...] })로 호출.

runCrawlAndClassify().catch((err) => {
  const reason = err instanceof Error ? err.stack ?? err.message : String(err);
  error('init', `파이프라인이 예기치 않게 종료되었습니다: ${reason}`);
  process.exit(1);
});
