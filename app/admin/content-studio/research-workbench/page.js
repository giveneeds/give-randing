'use client';
// 리서치 워크벤치 — 트렌드 기반 기획 트랙의 첫 페이지.
// 첫 단계 (이번 버전): [0] 내부 문서 + 우리 관심 주제만 시각화 + 단계 1~4 빈 골격.
// 다음 단계에서 [1]~[4] 각 박스를 mock → 실제 LLM 호출 순으로 채운다.
//
// 정욱님 룰: 프론트 골격 → 백 연결 순서. 클릭하며 단계마다 검수.

import { useState } from 'react';
import {
  FileText,
  Users,
  GitBranch,
  Target,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search as SearchIcon,
  ShieldCheck,
  ArrowRightCircle,
} from 'lucide-react';

const INTERNAL_DOCS = [
  {
    key: 'persona',
    icon: Users,
    title: '타겟 페르소나',
    path: 'docs/content-personas.md',
    summary: 'restaurant_owner · clinic_owner · general — 작은 사업자/브랜드 운영자',
    preview_note: '에이전트가 항상 이 결을 향해 추론. 이번 단계에선 경로만 표시.',
  },
  {
    key: 'pillars',
    icon: GitBranch,
    title: '콘텐츠 기둥 · 의도',
    path: 'config/content-pillars.json',
    summary: '기둥 5종(cost_before_spend·do_today·current_observation·trend_plain·content_showcase) × 의도 5종(reach·trust·convert·relate·recycle)',
    preview_note: 'SSOT. 에이전트가 큰 방향 결정 시 이 매트릭스 안에서 선택.',
  },
  {
    key: 'tone',
    icon: FileText,
    title: '발행 톤 · 구조 가이드',
    path: 'docs/content-logic/threads/*.md',
    summary: 'Threads 형식 · hook 5종 · 구조 패턴 · 금지어',
    preview_note: '본문 작성 단계의 강제 규약. 기획 단계에선 형식 선택지의 풀.',
  },
  {
    key: 'realbody',
    icon: Sparkles,
    title: '실제 톤 샘플 (realbody)',
    path: 'docs/reference-data/threads-realbody-*.json',
    summary: '손수 큐레이션 8개 — tone_meta(hook/intent/rhythm/register) 라벨 포함',
    preview_note: 'Writer 단계 per-variant 톤 매칭 풀. 기획에서 형식 가늠할 때도 참고.',
  },
];

const INTEREST_TOPICS = [
  '마케팅 GEO (지역 마케팅)',
  '네이버 플레이스',
  'AI 활용 판촉 이미지',
  '비즈니스 일반',
  'AI',
  '자영업자 정보 (대출 · 배달비 · 혜택 · 마케팅 사례 · 개선 사례)',
];

const STAGES = [
  {
    n: 1,
    icon: Sparkles,
    label: '무엇을 찾을지 추론',
    description: '트렌드 가설 + 관심 주제 → 에이전트가 필요한 자료 목록 생성',
  },
  {
    n: 2,
    icon: SearchIcon,
    label: '검색 프롬프트 자동 작성',
    description: '각 자료마다 LLM 이 검색 프롬프트 생성 — 사용자가 편집 가능',
  },
  {
    n: 3,
    icon: ShieldCheck,
    label: '결과 + 점수 + 사용자 검증 게이트',
    description: 'Perplexity·Tavily 결과 표시 + 전술점수 + 통과/재시도/중단',
  },
  {
    n: 4,
    icon: ArrowRightCircle,
    label: '채택 자료 → 기존 기획 · Writer 흐름으로 핸드오프',
    description: 'finishPlanningSession 어댑터를 통해 기존 파이프라인과 연결',
  },
];

export default function ResearchWorkbenchPage() {
  const [expandedDoc, setExpandedDoc] = useState(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 페이지 헤더 */}
      <div>
        <h2 className="text-xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">
          리서치 워크벤치
        </h2>
        <p className="text-[var(--admin-text-muted)] text-sm mt-1 leading-relaxed">
          내부 문서·맥락을 바탕으로 트렌드를 추론하고, 기획·자료 수집을 단계마다 직접 검수하는 작업대.
          <br />
          각 단계는 *수정 → 재실행* 사이클이 가능하고, 사용자 통과 게이트 미통과 시 다음 단계는 실행되지 않음 (토큰 절약).
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          <Sparkles size={12} />
          새 트랙 — 기존 검토함 흐름과 별도. USE_TREND_PIPELINE 분기.
        </div>
      </div>

      {/* [0] 내부 문서 + 관심 주제 */}
      <section className="border border-[var(--admin-border)] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sub)]">
          <div className="flex items-center gap-2">
            <Target size={16} />
            <h3 className="text-sm font-black uppercase tracking-wider">
              [0] 기준 — 내부 문서 + 우리 관심 주제
            </h3>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)] mt-1">
            이 자료가 이후 모든 단계의 판단 기준이 된다. 에이전트는 항상 이걸 먼저 읽고 추론.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* 내부 문서 4종 */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)] mb-2">
              내부 문서 (자동 로드 예정)
            </div>
            <div className="grid gap-2">
              {INTERNAL_DOCS.map((doc) => {
                const Icon = doc.icon;
                const isOpen = expandedDoc === doc.key;
                return (
                  <div key={doc.key}>
                    <button
                      onClick={() => setExpandedDoc(isOpen ? null : doc.key)}
                      className="w-full flex items-start gap-3 px-4 py-3 border border-[var(--admin-border)] rounded text-left hover:bg-[var(--admin-bg-sub)] transition-colors"
                    >
                      <Icon size={16} className="mt-0.5 shrink-0 text-[var(--admin-text-muted)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[var(--admin-text-main)]">
                          {doc.title}
                        </div>
                        <div className="text-xs text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                          {doc.summary}
                        </div>
                        <div className="text-[10px] text-[var(--admin-text-muted)] font-mono mt-1">
                          {doc.path}
                        </div>
                      </div>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {isOpen && (
                      <div className="mt-2 ml-4 px-4 py-3 border-l-2 border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] leading-relaxed">
                        <div className="italic mb-2">{doc.preview_note}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)] mt-3">
                          실제 내용 미리보기는 다음 단계에서 API 연결 후 로드.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우리 관심 주제 */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)] mb-2">
              우리 관심 주제 (트렌드와 연결할 영역)
            </div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TOPICS.map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-3 py-1.5 border border-[var(--admin-border)] bg-[var(--admin-bg-sub)] rounded-full text-[var(--admin-text-main)]"
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[var(--admin-text-muted)] mt-3 italic">
              ※ 이 목록은 정욱님이 직접 명시한 6개 영역. 추후 편집 가능하게 만들 자리.
            </p>
          </div>
        </div>
      </section>

      {/* 단계 1~4 — 빈 골격 */}
      <div className="space-y-4">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          return (
            <section
              key={stage.n}
              className="border border-dashed border-[var(--admin-border)] rounded-lg p-6 opacity-60"
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-[var(--admin-text-muted)]" />
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">
                    [{stage.n}]
                  </div>
                  <div className="text-sm font-bold text-[var(--admin-text-main)] mt-0.5">
                    {stage.label}
                  </div>
                  <div className="text-xs text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                    {stage.description}
                  </div>
                  <div className="text-[10px] text-[var(--admin-text-muted)] mt-3 italic">
                    다음 단계에서 만들 자리.
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* 진행 상태 안내 */}
      <div className="text-[10px] text-[var(--admin-text-muted)] border-t border-[var(--admin-border)] pt-4 leading-relaxed">
        <div className="font-bold uppercase tracking-widest mb-2">현재 진행 단계</div>
        <div>
          ✓ [0] 내부 문서 · 관심 주제 시각화 (이번 버전) <br />
          ☐ [1] LLM 에이전트 추론 (다음) <br />
          ☐ [2] 검색 프롬프트 자동 작성 <br />
          ☐ [3] 결과 + 검증 게이트 <br />
          ☐ [4] 기존 흐름 핸드오프 <br />
        </div>
        <div className="mt-3 italic">
          관련 문서: <code className="font-mono">docs/threads-pipeline-overview.md</code> ·{' '}
          <code className="font-mono">docs/handoffs/2026-06-01-trend-pivot-codex.md</code>
        </div>
      </div>
    </div>
  );
}
