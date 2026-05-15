// 단계별 prefix가 붙은 한국어 로거. console.* 를 얇게 감쌌다.
// 모든 로그가 한국어로 일관되어야 사람이 빠르게 단계 추적 가능.

type Stage = 'init' | 'crawl' | 'extract' | 'summarize' | 'classify' | 'save' | 'done';

const PREFIX: Record<Stage, string> = {
  init: '[준비]',
  crawl: '[수집]',
  extract: '[추출]',
  summarize: '[요약]',
  classify: '[분류]',
  save: '[저장]',
  done: '[완료]',
};

export function log(stage: Stage, message: string): void {
  console.log(`${PREFIX[stage]} ${message}`);
}

export function warn(stage: Stage, message: string): void {
  console.warn(`${PREFIX[stage]} ⚠ ${message}`);
}

export function error(stage: Stage, message: string): void {
  console.error(`${PREFIX[stage]} ✗ ${message}`);
}
