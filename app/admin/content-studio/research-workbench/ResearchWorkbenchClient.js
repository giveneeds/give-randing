'use client';
// 리서치 워크벤치 — 문서 원문 + 역할/영향 범위를 함께 검수하는 작업대.

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  ClipboardCheck,
  Database,
  Eye,
  FileText,
  GitBranch,
  GitCompare,
  Layers3,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const DOC_META = {
  persona: {
    icon: Users,
    title: '타겟 페르소나',
    group: 'planning',
    summary: '누가 왜 읽는지, 어떤 불안/질문을 가진 독자인지 정의',
    role: '독자 판단 필터',
    injection: '부분 주입',
    injectionScope: '`lib/knowledge/loader.js`가 `## 1. general` 섹션만 추출해 주입',
    warning: '상단 공통 원칙은 현재 실행 프롬프트에 안 들어갈 수 있음',
    impactStages: ['Topic Scout', 'Planner', 'Architect', 'Writer KB'],
    conflictTargets: ['config/content-pillars.json', 'docs/content-logic/threads/*.md', 'lib/knowledge/loader.js'],
    editQuestions: [
      '새 문장이 독자 정의인가, 콘텐츠 형식/기둥 정의인가?',
      '`## 1. general` 섹션 안에 있어 실제 주입되는가?',
      'content_pillar나 content_treatment가 맡아야 할 결정을 침범하지 않는가?',
      '수정 후 샘플 주제에서 선택 기준이 더 선명해지는가?',
    ],
    promptPreview:
      '[타겟 페르소나 프로필]\\n' +
      '실제 실행 시 전체 파일이 아니라 `## 1. general — ...` 섹션이 잘려 들어간다.\\n' +
      '따라서 공통 원칙을 반드시 보게 하려면 general 섹션 안으로 옮기거나 로더 정책을 바꿔야 한다.',
  },
  pillars: {
    icon: GitBranch,
    title: '콘텐츠 기둥 · 의도',
    group: 'planning',
    summary: 'content_pillar 5종과 engagement_intent 5종의 SSOT',
    role: '계정 운영 축 / 후보 다양성 축',
    injection: '직접 참조 + 프롬프트 규칙',
    injectionScope: '`contentPillarStrategy`, Architect, Writer가 pillar/intent enum과 역할을 사용',
    warning: '페르소나 문서가 저장 포맷/의도 역할을 과하게 정의하면 이 파일과 충돌',
    impactStages: ['Planner', 'Architect', 'Variant Generator', 'Writer', 'Quality Reviewer'],
    conflictTargets: ['docs/content-personas.md', 'docs/content-logic/threads/04-pillars-and-treatments.md', 'lib/agent/runContentArchitect.js'],
    editQuestions: [
      '이 변경은 계정의 콘텐츠 역할인가, 독자의 불안 정의인가?',
      'pillar와 engagement_intent를 섞어 쓰고 있지 않은가?',
      '기존 5개 기둥의 비중/회전 규칙에 영향을 주는가?',
      'Writer 출력 JSON enum과 호환되는가?',
    ],
    promptPreview:
      '[콘텐츠 기둥/의도]\\n' +
      'content_pillar는 글의 계정 내 역할, engagement_intent는 반응 목적이다.\\n' +
      'Writer/Architect는 이 enum을 출력 계약으로 사용한다.',
  },
  tone: {
    icon: FileText,
    title: '발행 톤 · 구조 가이드',
    group: 'planning',
    summary: 'Threads 형식, 길이, 구조, 리서치 레이어, 생성 규칙',
    role: '형식/전개/워크플로우 규칙',
    injection: '다중 문서 주입',
    injectionScope: '`getThreadsPatternHarnessBlocks()`가 threads 가이드 문서들을 knowledge block으로 주입',
    warning: '독자 정의나 기둥 역할을 이 문서에서 다시 정의하면 SSOT가 흐려짐',
    impactStages: ['Research Layers', 'Architect', 'Writer', 'Quality Reviewer'],
    conflictTargets: ['docs/content-personas.md', 'config/content-pillars.json', 'lib/agent/convertItemToThreadDraft.js'],
    editQuestions: [
      '이 규칙은 형식/길이/전개 방식에 관한 것인가?',
      '페르소나나 pillar 설명을 중복 정의하고 있지 않은가?',
      '기존 Writer 출력 계약(format_type, content_treatment)과 맞는가?',
      '후보 7개 비중복 생성에 도움이 되는가?',
    ],
    promptPreview:
      '[Threads 구조/생성 가이드]\\n' +
      '여러 md 문서가 잘려 knowledge block으로 들어간다.\\n' +
      'format_type, content_treatment, research layers, quality review 기준에 영향을 준다.',
  },
  realbody: {
    icon: Sparkles,
    title: '실제 톤 샘플 (realbody)',
    group: 'reference',
    summary: 'Writer가 호흡, register, hook 감각을 맞출 때 쓰는 샘플',
    role: 'Writer 톤 매칭 레퍼런스',
    injection: 'Writer 단계 per-variant 선택 주입',
    injectionScope: '`selectToneReferenceBlock()`이 variantHint에 맞는 샘플만 골라 Writer에 주입',
    warning: '기획 단계 기준 문서가 아님. 원문 전체를 Planner에 넣으면 판단이 흐려질 수 있음',
    impactStages: ['Writer', 'Tone Adapter', 'Quality Reviewer'],
    conflictTargets: ['docs/content-logic/threads/*.md', 'lib/knowledge/loader.js', 'lib/agent/convertItemToThreadDraft.js'],
    editQuestions: [
      '샘플에 tone_meta가 있어 variantHint 매칭이 가능한가?',
      '원문을 베끼는 용도가 아니라 호흡/구조 참고로 유지되는가?',
      '반말/존댓말/register가 실제 발행 톤과 맞는가?',
      '기획 문서에 넣을 원칙과 Writer 샘플을 섞고 있지 않은가?',
    ],
    promptPreview:
      '[GOOD — variant 전용 톤 샘플]\\n' +
      'realbody는 모든 단계에 통째로 들어가지 않는다.\\n' +
      'Writer가 hook_pattern / engagement_intent / structure_template에 맞춰 일부 샘플만 받는다.',
  },
  curated: {
    icon: ClipboardCheck,
    title: 'Threads 레퍼런스 노트',
    group: 'reference',
    summary: '잘 쓴 Threads 구조를 카드별로 분해한 참고 노트',
    role: '구조 벤치마크 / 작성 참고',
    injection: '조건부 참고',
    injectionScope: 'topic/pillar/treatment/fomo 매칭 점수로 일부 레퍼런스 노트만 선택',
    warning: '운영 기준의 SSOT가 아니라 좋은 글 구조를 빌리는 보조 자료',
    impactStages: ['Writer', 'Quality Reviewer'],
    conflictTargets: ['docs/content-logic/threads/*.md', 'lib/knowledge/loader.js'],
    editQuestions: [
      '이 노트는 구조 참고인가, 새 운영 규칙인가?',
      'pillar/treatment/fomo 태그가 검색 매칭에 충분한가?',
      'Writer가 문장을 베끼지 않고 구조만 참고할 수 있는가?',
    ],
    promptPreview:
      '[잘 쓴 Threads 발행 레퍼런스 노트]\\n' +
      '조건에 맞는 레퍼런스만 knowledge block에 들어간다.\\n' +
      '새 기준을 정의하는 문서가 아니라 구조 비교 자료다.',
  },
};

const HARNESS_ROLES = [
  {
    name: 'Doc Impact Reviewer',
    role: '문서별 영향 단계와 관련 파일을 보여준다.',
  },
  {
    name: 'SSOT Conflict Checker',
    role: '독자/기둥/의도/형식/톤 정의가 여러 파일에 중복되는지 확인한다.',
  },
  {
    name: 'Prompt Payload Previewer',
    role: '실제 에이전트가 보는 텍스트 범위와 누락 위험을 미리 보여준다.',
  },
  {
    name: 'Scenario Harness',
    role: '샘플 주제로 결정이 어떻게 바뀌는지 비교한다. 다음 단계에서 추가.',
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

export default function ResearchWorkbenchClient({ internalDocs }) {
  const [expandedDoc, setExpandedDoc] = useState('persona');
  const [activeFiles, setActiveFiles] = useState({});
  const [selectedImpactKey, setSelectedImpactKey] = useState('persona');

  const docs = useMemo(() => {
    return internalDocs.map((doc) => {
      const meta = DOC_META[doc.key] || {};
      return { ...doc, ...meta };
    });
  }, [internalDocs]);

  const planningDocs = docs.filter((doc) => doc.group === 'planning');
  const referenceDocs = docs.filter((doc) => doc.group === 'reference');
  const selectedImpactDoc = docs.find((doc) => doc.key === selectedImpactKey) || docs[0];

  function activeFileFor(doc) {
    const selectedPath = activeFiles[doc.key];
    return doc.files.find((file) => file.path === selectedPath) || doc.files[0];
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">
          리서치 워크벤치
        </h2>
        <p className="text-[var(--admin-text-muted)] text-sm mt-1 leading-relaxed">
          내부 문서·맥락을 바탕으로 트렌드를 추론하고, 기획·자료 수집을 단계마다 직접 검수하는 작업대.
          <br />
          이제 문서 원문뿐 아니라 역할, 실제 주입 범위, 충돌 가능성까지 같이 확인한다.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          <Sparkles size={12} />
          새 트랙 — 기존 검토함 흐름과 별도. USE_TREND_PIPELINE 분기.
        </div>
      </div>

      <section className="border border-[var(--admin-border)] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sub)]">
          <div className="flex items-center gap-2">
            <Target size={16} />
            <h3 className="text-sm font-black uppercase tracking-wider">
              [0] 기준 — 문서 원문 + 역할/영향 범위
            </h3>
          </div>
          <p className="text-xs text-[var(--admin-text-muted)] mt-1">
            하나를 수정할 때 결과에 영향을 줄 수 있는 파일과 단계까지 같이 본다.
          </p>
        </div>

        <div className="p-5 space-y-6">
          <HarnessOverview />
          <DocGroup
            title="기획 실행 기준"
            description="기획 에이전트가 주제, 필요 자료, 통과/중단 여부를 판단할 때 우선 보는 기준."
            docs={planningDocs}
            expandedDoc={expandedDoc}
            activeFileFor={activeFileFor}
            onToggle={setExpandedDoc}
            onSelectFile={(key, path) => setActiveFiles((prev) => ({ ...prev, [key]: path }))}
            onInspect={setSelectedImpactKey}
          />
          <DocGroup
            title="작성 참고 자료"
            description="Writer가 말투, 호흡, 구조 감각을 맞출 때 참고한다. 기획 기준과 섞지 않는다."
            docs={referenceDocs}
            expandedDoc={expandedDoc}
            activeFileFor={activeFileFor}
            onToggle={setExpandedDoc}
            onSelectFile={(key, path) => setActiveFiles((prev) => ({ ...prev, [key]: path }))}
            onInspect={setSelectedImpactKey}
          />
          <ImpactPanel
            docs={docs}
            selectedDoc={selectedImpactDoc}
            selectedKey={selectedImpactKey}
            onSelect={setSelectedImpactKey}
          />
          <PromptPreview selectedDoc={selectedImpactDoc} />
          <InterestTopics />
        </div>
      </section>

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

      <div className="text-[10px] text-[var(--admin-text-muted)] border-t border-[var(--admin-border)] pt-4 leading-relaxed">
        <div className="font-bold uppercase tracking-widest mb-2">현재 진행 단계</div>
        <div>
          ✓ [0] 내부 문서 원문 + 역할/영향 범위 확인 <br />
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

function HarnessOverview() {
  return (
    <div className="border border-zinc-200 rounded bg-white p-4">
      <div className="flex items-center gap-2">
        <Layers3 size={15} />
        <div className="text-xs font-black uppercase tracking-widest text-zinc-900">
          로컬 하네스 역할
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-2 mt-3">
        {HARNESS_ROLES.map((item) => (
          <div key={item.name} className="border border-zinc-200 rounded p-3 bg-zinc-50">
            <div className="text-[11px] font-bold text-zinc-900">{item.name}</div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{item.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocGroup({ title, description, docs, expandedDoc, activeFileFor, onToggle, onSelectFile, onInspect }) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">
          {title}
        </div>
        <p className="text-xs text-[var(--admin-text-muted)] mt-1">{description}</p>
      </div>
      <div className="grid gap-2">
        {docs.map((doc) => {
          const Icon = doc.icon || FileText;
          const isOpen = expandedDoc === doc.key;
          const activeFile = activeFileFor(doc);

          return (
            <div key={doc.key}>
              <button
                onClick={() => onToggle(isOpen ? null : doc.key)}
                className="w-full flex items-start gap-3 px-4 py-3 border border-[var(--admin-border)] rounded text-left hover:bg-[var(--admin-bg-sub)] transition-colors"
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-[var(--admin-text-muted)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-bold text-[var(--admin-text-main)]">
                      {doc.title}
                    </div>
                    <StatusPill label={doc.injection} tone={doc.key === 'persona' ? 'warn' : doc.group === 'reference' ? 'muted' : 'ok'} />
                  </div>
                  <div className="text-xs text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                    {doc.summary}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[var(--admin-text-muted)]">
                    <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--admin-border)] rounded bg-white">
                      <Database size={10} />
                      파일 {doc.files.length}개
                    </span>
                    <span className="px-2 py-1 border border-[var(--admin-border)] rounded bg-white">
                      총 {doc.totalLines.toLocaleString('ko-KR')}줄
                    </span>
                    <span className="px-2 py-1 border border-[var(--admin-border)] rounded bg-white">
                      {doc.totalChars.toLocaleString('ko-KR')}자
                    </span>
                    <span className="px-2 py-1 border border-[var(--admin-border)] rounded bg-white">
                      역할: {doc.role}
                    </span>
                  </div>
                  {doc.warning && (
                    <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-700">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                      <span>{doc.warning}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      onInspect(doc.key);
                    }}
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 bg-white text-[10px] font-bold text-zinc-600 hover:text-zinc-900"
                    role="button"
                    tabIndex={0}
                  >
                    <Eye size={11} />
                    영향 보기
                  </span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </button>

              {isOpen && (
                <div className="mt-2 ml-4 border-l-2 border-[var(--admin-border)] pl-4 space-y-3">
                  <DocImpactSummary doc={doc} />
                  <FileSelector
                    doc={doc}
                    activePath={activeFile?.path}
                    onSelect={(path) => onSelectFile(doc.key, path)}
                  />
                  {activeFile && <FilePreview file={activeFile} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocImpactSummary({ doc }) {
  return (
    <div className="grid md:grid-cols-3 gap-2">
      <InfoBox title="실제 주입 범위" icon={Eye}>
        {doc.injectionScope}
      </InfoBox>
      <InfoBox title="영향 단계" icon={ArrowRightCircle}>
        {doc.impactStages.join(' · ')}
      </InfoBox>
      <InfoBox title="충돌 확인 대상" icon={GitCompare}>
        {doc.conflictTargets.join(' · ')}
      </InfoBox>
    </div>
  );
}

function ImpactPanel({ docs, selectedDoc, selectedKey, onSelect }) {
  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
        <ClipboardCheck size={15} />
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-zinc-900">
            문서 수정 전 체크
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            하나를 고치기 전에 같이 봐야 할 파일과 질문을 먼저 확인한다.
          </p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {docs.map((doc) => (
            <button
              key={doc.key}
              type="button"
              onClick={() => onSelect(doc.key)}
              className={
                'px-3 py-1.5 rounded border text-xs font-bold transition-colors ' +
                (selectedKey === doc.key
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900')
              }
            >
              {doc.title}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-3">
          <div className="border border-zinc-200 rounded p-3 bg-zinc-50">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              영향 파일
            </div>
            <ul className="mt-2 space-y-1.5">
              {selectedDoc.conflictTargets.map((target) => (
                <li key={target} className="text-[11px] font-mono text-zinc-700">
                  {target}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-zinc-200 rounded p-3 bg-zinc-50">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              확인 질문
            </div>
            <ul className="mt-2 space-y-1.5">
              {selectedDoc.editQuestions.map((question) => (
                <li key={question} className="text-xs text-zinc-700 leading-relaxed">
                  - {question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptPreview({ selectedDoc }) {
  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
        <Eye size={15} />
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-zinc-900">
            실제 프롬프트 주입 미리보기
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            이번 버전은 static preview. 다음 단계에서 `lib/knowledge/loader.js` 결과를 API로 노출한다.
          </p>
        </div>
      </div>
      <pre className="p-4 text-[11px] leading-relaxed text-zinc-800 whitespace-pre-wrap break-words font-mono bg-white">
        {selectedDoc.promptPreview}
      </pre>
    </div>
  );
}

function InterestTopics() {
  return (
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
  );
}

function InfoBox({ title, icon: Icon, children }) {
  return (
    <div className="border border-zinc-200 rounded p-3 bg-zinc-50">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        <Icon size={11} />
        {title}
      </div>
      <div className="text-[11px] text-zinc-700 leading-relaxed mt-1.5">
        {children}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }) {
  const cls = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warn: 'bg-amber-50 border-amber-200 text-amber-700',
    muted: 'bg-zinc-50 border-zinc-200 text-zinc-600',
  }[tone || 'muted'];

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

function FileSelector({ doc, activePath, onSelect }) {
  if (doc.files.length === 1) {
    return (
      <div className="text-[10px] font-mono text-[var(--admin-text-muted)] px-3 py-2 bg-[var(--admin-bg-sub)] border border-[var(--admin-border)] rounded">
        {activePath}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {doc.files.map((file) => (
        <button
          key={file.path}
          type="button"
          onClick={() => onSelect(file.path)}
          className={
            'px-3 py-1.5 rounded border text-[10px] font-mono transition-colors ' +
            (activePath === file.path
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-[var(--admin-border)] bg-white text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]')
          }
        >
          {file.path.split('/').pop()}
        </button>
      ))}
    </div>
  );
}

function FilePreview({ file }) {
  return (
    <div className="border border-[var(--admin-border)] rounded bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sub)] flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[10px] text-[var(--admin-text-main)] break-all">
          {file.path}
        </div>
        <div className="text-[10px] text-[var(--admin-text-muted)]">
          {file.lineCount.toLocaleString('ko-KR')}줄 · {file.charCount.toLocaleString('ko-KR')}자
        </div>
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 text-[11px] leading-relaxed text-zinc-800 whitespace-pre-wrap break-words font-mono bg-white">
        {file.content}
      </pre>
    </div>
  );
}
