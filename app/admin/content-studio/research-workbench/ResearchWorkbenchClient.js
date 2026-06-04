'use client';
// 리서치 워크벤치 — 문서 원문 + 역할/영향 범위를 함께 검수하는 작업대.

import { useEffect, useMemo, useState } from 'react';
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
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Edit3,
  PauseCircle,
  RefreshCw,
  XCircle,
  Loader2,
} from 'lucide-react';

const DOC_META = {
  persona: {
    icon: Users,
    title: '타겟 페르소나',
    group: 'planning',
    issueWorkflow: true,
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
    issueWorkflow: true,
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
    issueWorkflow: true,
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
    issueWorkflow: true,
    summary: 'Writer가 호흡, register, hook 감각을 맞출 때 쓰는 샘플',
    role: 'Writer 톤 매칭 레퍼런스',
    injection: 'Writer 단계 per-variant 선택 주입',
    injectionScope: '`getThreadsRealBodySamples()`가 variantHint에 맞는 샘플만 골라 Writer에 주입',
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
    issueWorkflow: false,
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
    issueWorkflow: false,
  },
  {
    name: 'SSOT Conflict Checker',
    role: '독자/기둥/의도/형식/톤 정의가 여러 파일에 중복되는지 확인한다.',
    issueWorkflow: false,
  },
  {
    name: 'Prompt Payload Previewer',
    role: '실제 에이전트가 보는 텍스트 범위와 누락 위험을 미리 보여준다.',
    issueWorkflow: true,
  },
  {
    name: 'Scenario Harness',
    role: '샘플 주제로 결정이 어떻게 바뀌는지 비교한다. 다음 단계에서 추가.',
    issueWorkflow: false,
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

const ISSUE_CATEGORY_OPTIONS = [
  {
    value: 'ai_marketing_tools',
    label: 'AI 마케팅 도구',
    short: 'AI tools',
    description: '광고, CRM, 디자인, 콘텐츠, 자동화 툴 변화',
  },
  {
    value: 'platform_policy',
    label: '플랫폼 정책 변화',
    short: 'platform',
    description: '인스타, 유튜브, 틱톡, 구글, 아마존 정책 변화',
  },
  {
    value: 'consumer_behavior',
    label: '소비자 행동 변화',
    short: 'consumer',
    description: '리뷰, 검색, 쇼핑, 추천, 구매 경로 변화',
  },
  {
    value: 'brand_story',
    label: '브랜드 흥망성쇠',
    short: 'brand',
    description: '브랜드가 뜨거나 무너진 구조와 카테고리 전쟁',
  },
  {
    value: 'regulation_business',
    label: '규제와 비즈니스 충격',
    short: 'regulation',
    description: 'FTC, SEC, EU, 개인정보, 광고 제재, 독과점',
  },
  {
    value: 'capital_flow',
    label: '돈의 흐름',
    short: 'capital',
    description: '투자, M&A, 상장, 기업 가치, 카테고리 자금 이동',
  },
  {
    value: 'work_shift',
    label: '일의 방식 변화',
    short: 'work',
    description: '마케터, 디자이너, 영업, 창업자, 프리랜서 역할 변화',
  },
  {
    value: 'local_commerce',
    label: '로컬/커머스 실무',
    short: 'local',
    description: '리뷰, 예약, 배달, 결제, 지역 광고, 작은 사업자 운영',
  },
];

function issueCategoryLabel(value) {
  const legacy = {
    AI: 'AI tools',
    marketing: 'AI tools',
    tech: 'platform',
    business: 'capital',
  };
  return ISSUE_CATEGORY_OPTIONS.find((category) => category.value === value)?.short || legacy[value] || value || 'issue';
}

const ISSUE_HISTORY_STORAGE_KEY = 'giveneeds.researchWorkbench.issueHistory.v1';

function buildClientSonarPrompt(item, contentPlan) {
  if (contentPlan.content_pattern === 'issue_explainer') {
    const issuePlan = contentPlan.issue_plan || {};
    return [
      '이 글은 최근 이슈를 풀어주는 issue_explainer입니다.',
      '',
      'IssuePlan:',
      `- 대상 호출: ${issuePlan.audience_callout || ''}`,
      `- 사건 요약: ${issuePlan.issue_summary || ''}`,
      `- 핵심 반전: ${issuePlan.key_reversal || ''}`,
      `- 왜 중요한가: ${issuePlan.why_it_matters || ''}`,
      '',
      '이번에 확인할 질문:',
      `- 질문: ${item.item_title}`,
      `- 목적: ${item.research_purpose}`,
      `- 필요한 증거 유형: ${item.expected_evidence_type}`,
      '',
      '결과 조건:',
      '- 최근 7일~30일 자료와 원천 출처 우선',
      '- 원천 발언/공식 발표/주요 보도/커뮤니티 반응 구분',
      '- 검증 부족 내용은 단정하지 말고 표시',
    ].join('\n');
  }

  return [
    '이 글의 방향:',
    `- 핵심 각도: ${contentPlan.content_angle || ''}`,
    `- 독자가 얻어야 할 것: ${contentPlan.promised_takeaway || ''}`,
    `- 독자의 불안: ${contentPlan.reader_anxiety || ''}`,
    '',
    '지금 찾아야 할 자료:',
    `- 자료 제목: ${item.item_title}`,
    `- 이 자료가 필요한 이유: ${item.research_purpose}`,
    `- 필요한 증거 유형: ${item.expected_evidence_type}`,
    '',
    '결과 조건:',
    '- 2024년 이후 또는 현재 유효한 자료 우선',
    '- 공식 문서, 업계 리포트, 실제 사례, 확인 가능한 행동 항목 우선',
    '- 과장/추측 자료는 구분',
  ].join('\n');
}

function normalizeResearchFindings(results) {
  if (!Array.isArray(results) || !results.length) return [];

  return results.flatMap((result, resultIndex) => {
    const findings = Array.isArray(result.findings) ? result.findings : [];
    if (!findings.length) {
      return [{
        id: `${result.item_id || resultIndex}-empty`,
        item_id: result.item_id || `r${resultIndex + 1}`,
        finding_text: result.failure_reason || result.missing_evidence || '검색 결과 없음',
        source_domain: '',
        evidence_type: 'failure_example',
        recency_note: '',
        quality_signal: result.quality_signal || 'not_found',
        status: 'rejected',
        citations: result.citations || [],
      }];
    }

    return findings.map((finding, findingIndex) => {
      const quality = result.quality_signal || 'partial';
      return {
        id: `${result.item_id || resultIndex}-${findingIndex}`,
        item_id: result.item_id || `r${resultIndex + 1}`,
        finding_text: finding.finding_text || '',
        source_domain: finding.source_domain || '',
        evidence_type: finding.evidence_type || 'expert_quote',
        recency_note: finding.recency_note || '',
        quality_signal: quality,
        status: quality === 'strong' || quality === 'partial' ? 'accepted' : 'rejected',
        citations: result.citations || [],
      };
    });
  });
}

export default function ResearchWorkbenchClient({ internalDocs, writerModel }) {
  const [expandedDoc, setExpandedDoc] = useState('persona');
  const [activeFiles, setActiveFiles] = useState({});
  const [selectedImpactKey, setSelectedImpactKey] = useState('persona');
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [contentPlan, setContentPlan] = useState(null);
  const [issueCategories, setIssueCategories] = useState([
    'ai_marketing_tools',
    'platform_policy',
    'consumer_behavior',
    'regulation_business',
  ]);
  const [issueRecency, setIssueRecency] = useState('week');
  const [issueCandidates, setIssueCandidates] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueSearchIntent, setIssueSearchIntent] = useState('');
  const [issueSearchPrompt, setIssueSearchPrompt] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [sourceArticle, setSourceArticle] = useState(null);
  const [researchResults, setResearchResults] = useState(null);
  const [writerDrafts, setWriterDrafts] = useState(null);
  const [writerPolishedDraft, setWriterPolishedDraft] = useState(null);
  const [planStatus, setPlanStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  // 기획 단계 Claude 모델 — 사용자가 UI 드롭다운에서 선택. 환경변수 기본값 무시하고 명시 선택.
  // Sonnet 4.5 = 균형(빠름·저렴), Opus 4.8 = 더 깊은 추론·5배 비용. 같은 입력에 두 모델 비교용.
  const [planModel, setPlanModel] = useState('claude-sonnet-4-5-20250929');
  const [issueStatus, setIssueStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [issueNotifyStatus, setIssueNotifyStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [issuePromptStatus, setIssuePromptStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [articleStatus, setArticleStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [researchStatus, setResearchStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [writerStatus, setWriterStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [polishStatus, setPolishStatus] = useState({ loading: false, error: '', meta: null, startedAt: 0 });
  const [issueHistory, setIssueHistory] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ISSUE_HISTORY_STORAGE_KEY);
      const parsed = JSON.parse(raw || '[]');
      setIssueHistory(Array.isArray(parsed) ? parsed.slice(0, 30) : []);
    } catch {
      setIssueHistory([]);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('telegramIssue') !== '1') return;

    const issue = {
      issue_id: params.get('issueId') || 'telegram-issue',
      issue_title: params.get('issueTitle') || '텔레그램에서 선택한 이슈',
      one_line_hook: params.get('issueHook') || '',
      category: params.get('issueCategory') || 'business',
      why_interesting: params.get('issueWhy') || '',
      what_changed: params.get('issueChanged') || '',
      source_summary: params.get('issueSource') || '',
      recency_note: '텔레그램 후보에서 선택됨',
      novelty_note: '텔레그램 선택 이슈',
      needs_deeper_research: true,
    };
    setIssueCandidates([issue]);
    setSelectedIssue(issue);
    rememberIssueSelectionFromStorage({
      id: issue.issue_id,
      type: 'telegram_issue_candidate',
      title: issue.issue_title,
      url: '',
      source_domain: issue.source_summary || 'telegram',
      category: issue.category,
      selected_at: new Date().toISOString(),
    });
    setIssueStatus((prev) => ({
      ...prev,
      meta: { ...(prev.meta || {}), issuesCount: 1, promptSource: 'telegram' },
    }));
  }, []);

  function persistIssueHistory(nextHistory) {
    const clipped = nextHistory.slice(0, 30);
    setIssueHistory(clipped);
    try {
      window.localStorage.setItem(ISSUE_HISTORY_STORAGE_KEY, JSON.stringify(clipped));
    } catch {
      // localStorage unavailable — UI state still keeps the current session history.
    }
  }

  function rememberIssueSelectionFromStorage(entry) {
    if (!entry?.id && !entry?.title) return;
    try {
      const raw = window.localStorage.getItem(ISSUE_HISTORY_STORAGE_KEY);
      const parsed = JSON.parse(raw || '[]');
      const current = Array.isArray(parsed) ? parsed : [];
      const next = [
        entry,
        ...current.filter((item) => {
          if (entry.url && item.url) return item.url !== entry.url;
          return String(item.title || '').trim() !== String(entry.title || '').trim();
        }),
      ].slice(0, 30);
      persistIssueHistory(next);
    } catch {
      persistIssueHistory([entry]);
    }
  }

  function rememberIssueSelection({ issueCandidate, article }) {
    const entry = article
      ? {
          id: article.url || article.title,
          type: 'article',
          title: article.title || article.url,
          url: article.url || '',
          source_domain: article.source_domain || '',
          selected_at: new Date().toISOString(),
        }
      : {
          id: issueCandidate?.issue_id || issueCandidate?.issue_title,
          type: 'issue_candidate',
          title: issueCandidate?.issue_title || '',
          url: '',
          source_domain: '',
          category: issueCandidate?.category || '',
          selected_at: new Date().toISOString(),
        };
    if (!entry.id && !entry.title) return;
    persistIssueHistory([
      entry,
      ...issueHistory.filter((item) => {
        if (entry.url && item.url) return item.url !== entry.url;
        return String(item.title || '').trim() !== String(entry.title || '').trim();
      }),
    ]);
  }

  const docs = useMemo(() => {
    return internalDocs.map((doc) => {
      const meta = DOC_META[doc.key] || {};
      return { ...doc, ...meta };
    });
  }, [internalDocs]);

  const planningDocs = docs.filter((doc) => doc.group === 'planning');
  const referenceDocs = docs.filter((doc) => doc.group === 'reference');
  const selectedImpactDoc = docs.find((doc) => doc.key === selectedImpactKey) || docs[0];
  const researchItems = useMemo(() => {
    if (!contentPlan) return [];
    if (contentPlan.content_pattern === 'issue_explainer' && Array.isArray(contentPlan.deep_research_questions) && contentPlan.deep_research_questions.length) {
      return contentPlan.deep_research_questions.map((question, index) => ({
        item_id: question.question_id || `q${index + 1}`,
        item_title: question.question || '',
        research_purpose: question.purpose || '',
        expected_evidence_type: question.expected_evidence_type || 'source_origin',
        priority: question.priority || 'required',
        prompt: buildClientSonarPrompt({
          item_title: question.question || '',
          research_purpose: question.purpose || '',
          expected_evidence_type: question.expected_evidence_type || 'source_origin',
          priority: question.priority || 'required',
        }, contentPlan),
      }));
    }

    const items = Array.isArray(contentPlan.required_research_items) && contentPlan.required_research_items.length
      ? contentPlan.required_research_items
      : [];
    return items.map((item) => ({
      ...item,
      prompt: item.prompt || buildClientSonarPrompt(item, contentPlan),
    }));
  }, [contentPlan]);
  const findings = useMemo(() => normalizeResearchFindings(researchResults), [researchResults]);

  function activeFileFor(doc) {
    const selectedPath = activeFiles[doc.key];
    return doc.files.find((file) => file.path === selectedPath) || doc.files[0];
  }

  function toggleIssueCategory(category) {
    setIssueCategories((prev) => (
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    ));
  }

  async function generateIssueSearchPrompt() {
    setIssuePromptStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/issue-search-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchIntent: issueSearchIntent, excludeHistory: issueHistory }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Claude 검색 프롬프트 생성 실패');
      const prompt = json.searchPrompt?.sonar_user_prompt || '';
      setIssueSearchPrompt(prompt);
      if (Array.isArray(json.searchPrompt?.preferred_categories) && json.searchPrompt.preferred_categories.length) {
        setIssueCategories(json.searchPrompt.preferred_categories);
      }
      if (json.searchPrompt?.recency) {
        setIssueRecency(json.searchPrompt.recency);
      }
      setIssuePromptStatus({
        loading: false,
        error: '',
        meta: {
          model: json.model,
          usage: json.usage,
          searchPrompt: json.searchPrompt,
          sourceDirectoryCount: json.sourceDirectoryCount || 0,
        },
      });
    } catch (error) {
      setIssuePromptStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function fetchIssueCandidates(customPrompt = '') {
    setIssueStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: issueCategories,
          recency: issueRecency,
          excludeHistory: issueHistory,
          customPrompt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '최근 이슈 후보 수집 실패');
      const issues = Array.isArray(json.issues) ? json.issues : [];
      setIssueCandidates(issues);
      setSelectedIssue(issues[0] || null);
      setIssueStatus({
        loading: false,
        error: '',
        meta: {
          model: json.model,
          citations: json.citations || [],
          searchResults: json.search_results || [],
          excludedHistoryCount: json.excluded_history_count || 0,
          localExcludedHistoryCount: json.local_excluded_history_count || 0,
          sourceDirectoryCount: json.source_directory_count || 0,
          issuesCount: issues.length,
          promptSource: json.prompt_source || 'default',
        },
      });
    } catch (error) {
      setIssueStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function notifyIssueCandidates() {
    setIssueNotifyStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/issues/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: issueCategories,
          recency: issueRecency,
          excludeHistory: issueHistory,
          customPrompt: issueSearchPrompt.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '텔레그램 후보 발송 실패');
      setIssueNotifyStatus({ loading: false, error: '', meta: json });
    } catch (error) {
      setIssueNotifyStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function fetchSourceArticle() {
    setArticleStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '원문 기사 읽기 실패');
      setSourceArticle(json.sourceArticle);
      setArticleStatus({
        loading: false,
        error: '',
        meta: {
          sourceDomain: json.sourceArticle?.source_domain,
          charCount: json.sourceArticle?.char_count,
        },
      });
    } catch (error) {
      setArticleStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function generateContentPlan(issueCandidate) {
    setPlanStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    setResearchResults(null);
    setWriterDrafts(null);
    setWriterPolishedDraft(null);
    try {
      const targetIssue = issueCandidate === false || sourceArticle ? null : (issueCandidate || selectedIssue);
      const res = await fetch('/api/admin/content-studio/research-workbench/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(sourceArticle
            ? { sourceArticle }
            : targetIssue
              ? { issueCandidate: targetIssue }
              : {}),
          claudeModel: planModel,  // 사용자가 UI 에서 고른 모델로 호출.
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Claude 기획 생성 실패');
      if (sourceArticle) {
        rememberIssueSelection({ article: sourceArticle });
      } else if (targetIssue) {
        rememberIssueSelection({ issueCandidate: targetIssue });
      }
      setContentPlan(sourceArticle
        ? {
            ...json.contentPlan,
            source_article: {
              url: sourceArticle.url,
              source_domain: sourceArticle.source_domain,
              title: sourceArticle.title,
            },
          }
        : json.contentPlan);
      if (targetIssue) setSelectedIssue(targetIssue);
      setPlanStatus({ loading: false, error: '', meta: { model: json.model, usage: json.usage } });
    } catch (error) {
      setPlanStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function runResearch() {
    setResearchStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    setWriterDrafts(null);
    setWriterPolishedDraft(null);
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentPlan, researchItems }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sonar 리서치 실행 실패');
      setResearchResults(json.results);
      setResearchStatus({ loading: false, error: '', meta: { model: json.model } });
    } catch (error) {
      setResearchStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function generateWriterDrafts() {
    const evidenceSnapshot = findings
      .filter((finding) => finding.status === 'accepted')
      .map((finding) => ({
        item_id: finding.item_id,
        finding_text: finding.finding_text,
        source_domain: finding.source_domain,
        source_url: Array.isArray(finding.citations) ? finding.citations[0] : '',
        evidence_type: finding.evidence_type,
        recency_note: finding.recency_note,
        accepted_by_user: true,
      }));

    setWriterStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    setWriterPolishedDraft(null);
    setPolishStatus({ loading: false, error: '', meta: null, startedAt: 0 });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentPlan, evidenceSnapshot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Writer 초안 생성 실패');
      setWriterDrafts(json.drafts);
      setWriterStatus({ loading: false, error: '', meta: { model: json.model, usage: json.usage, referenceMeta: json.referenceMeta } });
    } catch (error) {
      setWriterStatus({ loading: false, error: error.message, meta: null });
    }
  }

  async function polishWriterDraft() {
    const draft = Array.isArray(writerDrafts) ? writerDrafts[0] : null;
    if (!draft) return;

    setPolishStatus({ loading: true, error: '', meta: null, startedAt: Date.now() });
    try {
      const res = await fetch('/api/admin/content-studio/research-workbench/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentPlan, draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'R2 한국어 보정 실패');
      setWriterPolishedDraft(json.draft);
      setPolishStatus({ loading: false, error: '', meta: { model: json.model, usage: json.usage } });
    } catch (error) {
      setPolishStatus({ loading: false, error: error.message, meta: null });
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">
            리서치 워크벤치
          </h2>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 leading-relaxed">
            기사 URL, 이슈 탐색 프롬프트, R1/R2 초안 확인에 집중하는 작업대.
          </p>
          {showAdvancedPanels && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
              <Sparkles size={12} />
              진단 패널 표시 중 — 문서/하네스/게이트/근거맵 포함
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAdvancedPanels((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:border-zinc-400"
        >
          {showAdvancedPanels ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {showAdvancedPanels ? '상세 박스 접기' : '상세 박스 펼치기'}
        </button>
      </div>

      {showAdvancedPanels && (
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
          <CurrentLogicPreview />
          <InterestTopics />
        </div>
      </section>
      )}

      {/* 기획 모델 선택 — 같은 입력으로 두 모델 비교 가능. fetch body 의 claudeModel 로 전달. */}
      <div className="border border-zinc-200 rounded-lg bg-white p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
            기획 모델
          </span>
          <select
            value={planModel}
            onChange={(e) => setPlanModel(e.target.value)}
            className="text-xs border border-zinc-300 rounded px-2 py-1 bg-white"
          >
            <option value="claude-sonnet-4-5-20250929">Sonnet 4.5 (균형 · 약 75원/회)</option>
            <option value="claude-sonnet-4-6">Sonnet 4.6 (최신 · 같은 가격)</option>
            <option value="claude-opus-4-8">Opus 4.8 (강력 · 약 375원/회)</option>
            <option value="claude-opus-4-7">Opus 4.7 (강력 · 같은 가격)</option>
          </select>
        </div>
        <span className="text-[10px] text-zinc-500 flex-1">
          같은 입력으로 모델 바꿔 호출하면 비교 가능. 응답 메타에 실제 사용된 모델이 표시됨.
        </span>
      </div>

      <PlanningFlowPreview
        showAdvancedPanels={showAdvancedPanels}
        issueCandidates={issueCandidates}
        selectedIssue={selectedIssue}
        issueSearchIntent={issueSearchIntent}
        issueSearchPrompt={issueSearchPrompt}
        articleUrl={articleUrl}
        sourceArticle={sourceArticle}
        articleStatus={articleStatus}
        issueCategories={issueCategories}
        issueRecency={issueRecency}
        issueStatus={issueStatus}
        issueNotifyStatus={issueNotifyStatus}
        issuePromptStatus={issuePromptStatus}
        issueHistory={issueHistory}
        contentPlan={contentPlan}
        researchItems={researchItems}
        findings={findings}
        planStatus={planStatus}
        researchStatus={researchStatus}
        writerModel={writerModel}
        writerDrafts={writerDrafts}
        writerPolishedDraft={writerPolishedDraft}
        writerStatus={writerStatus}
        polishStatus={polishStatus}
        onIssueSearchIntentChange={setIssueSearchIntent}
        onIssueSearchPromptChange={setIssueSearchPrompt}
        onArticleUrlChange={setArticleUrl}
        onFetchSourceArticle={fetchSourceArticle}
        onToggleIssueCategory={toggleIssueCategory}
        onIssueRecencyChange={setIssueRecency}
        onGenerateIssueSearchPrompt={generateIssueSearchPrompt}
        onFetchIssues={() => fetchIssueCandidates('')}
        onNotifyIssues={notifyIssueCandidates}
        onFetchIssuesWithPrompt={() => fetchIssueCandidates(issueSearchPrompt)}
        onSelectIssue={setSelectedIssue}
        onClearIssueHistory={() => persistIssueHistory([])}
        onGenerateContentPlan={generateContentPlan}
        onRunResearch={runResearch}
        onGenerateWriterDrafts={generateWriterDrafts}
        onPolishWriterDraft={polishWriterDraft}
      />

      {showAdvancedPanels && (
      <div className="text-[10px] text-[var(--admin-text-muted)] border-t border-[var(--admin-border)] pt-4 leading-relaxed">
        <div className="font-bold uppercase tracking-widest mb-2">현재 진행 단계</div>
        <div>
          ✓ [0] 내부 문서 원문 + 역할/영향 범위 확인 <br />
          ✓ [1] 최근 이슈 후보 수집 API + 선택 UI <br />
          ✓ [2] Claude IssuePlan + 연계 리서치 질문 생성 <br />
          ✓ [3] Sonar 질문별 연계 리서치 검수 <br />
          ✓ [4] Evidence Map / Writer handoff preview <br />
          ✓ [5] GPT-5 issue_explainer 초안 생성 <br />
        </div>
        <div className="mt-3 italic">
          관련 문서: <code className="font-mono">docs/threads-pipeline-overview.md</code> ·{' '}
          <code className="font-mono">docs/handoffs/2026-06-01-trend-pivot-codex.md</code>
        </div>
      </div>
      )}
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
          <div
            key={item.name}
            className={
              'border rounded p-3 ' +
              (item.issueWorkflow
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-zinc-200 bg-zinc-50')
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold text-zinc-900">{item.name}</div>
              {item.issueWorkflow && <StatusPill label="이슈 플래너 포함" tone="ok" />}
            </div>
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
                className={
                  'w-full flex items-start gap-3 px-4 py-3 border rounded text-left transition-colors ' +
                  (doc.issueWorkflow
                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70'
                    : 'border-[var(--admin-border)] hover:bg-[var(--admin-bg-sub)]')
                }
              >
                <Icon
                  size={16}
                  className={
                    'mt-0.5 shrink-0 ' +
                    (doc.issueWorkflow ? 'text-emerald-700' : 'text-[var(--admin-text-muted)]')
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-bold text-[var(--admin-text-main)]">
                      {doc.title}
                    </div>
                    {doc.issueWorkflow && <StatusPill label="이슈 플래너 포함" tone="ok" />}
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

const CURRENT_LOGIC_GROUPS = [
  {
    title: 'Source Article Mode',
    badge: 'article',
    items: [
      '기사 URL을 입력하면 /article API가 HTML에서 제목, 설명, 본문 텍스트를 추출한다.',
      '원문 전체를 그대로 발행하지 않고, Claude가 Article Slot Map으로 발행 재료를 분해한다.',
      '원문을 중심축으로 삼고, 여러 검색 결과를 섞어 중심이 흐려지는 것을 피한다.',
      '이슈 탐색은 8개 주제 축, AI 마케팅 도구, 플랫폼 정책, 소비자 행동, 브랜드, 규제, 돈의 흐름, 일의 방식, 로컬/커머스로 확장한다.',
      '주제 축마다 우선 볼 소스 타입과 원문 후보가 다르게 들어간다.',
    ],
  },
  {
    title: 'Claude IssuePlan',
    badge: 'claude',
    items: [
      'content_pattern은 v1에서 issue_explainer로 고정한다.',
      'Claude는 사실을 만들지 않고, 원문/이슈에서 확인된 장면과 추가 리서치 질문을 분리한다.',
      'Article Slot Map은 멈추게 하는 첫 장면, 오래된 질서, 새 신호, 숫자, 고유명사, 직접 인용, 불확실성을 강제로 보여준다.',
      'Psychological Arc는 독자가 낯섦, 신뢰, 궁금증, 확장감, 구조 이해, 확신, 미래감으로 이동하는 흐름을 설계한다.',
    ],
  },
  {
    title: 'Sonar Linked Research',
    badge: 'sonar',
    items: [
      'Claude가 만든 deep_research_questions를 질문별 카드로 바꿔 Sonar에 보낸다.',
      '이슈 후보 수집 단계에서는 선택한 주제 축에 따라 공식 릴리즈, 회사 블로그, 규제기관, 미디어 리서치, 뉴스레터 우선순위를 다르게 준다.',
      '원천, 구체 사례, 공식 입장, 반응, 불확실성을 따로 확인한다.',
      '기능 설명보다 첫 화면에서 멈추게 하는 구체 장면, 단발 사건이 아니라 흐름이라는 증거, 구조적 이동을 우선 확인한다.',
      '검색 결과가 약하면 not_found/weak로 남기고 Writer가 단정하지 않게 한다.',
    ],
  },
  {
    title: 'GPT-5 Writer',
    badge: 'writer',
    items: [
      '초안 포스트 개수는 7~8개로 고정한다. 이슈의 장면과 근거 밀도를 그 안에서 배치한다.',
      'posts 배열은 문장 단위가 아니라 실제 Threads 포스트 단위다.',
      '문장 하나씩 1~13개 카드로 쪼개면 실패다. 한 포스트 안에 4~9개 짧은 줄을 묶는다.',
      '포스트 1개는 독자가 한 화면에서 읽는 작은 장면이다.',
      '멈추게 하는 첫 장면, 구체 디테일, 출처 확인, 추가 장면, 구조 해석, 숫자/반응, 결론 순서를 따른다.',
      '정보 순서가 아니라 독자 심리 이동 순서로 쓴다.',
      '짧은 라벨형 전환은 쓸 수 있다. 단, 같은 라벨을 반복하지 않는다.',
      '빈 슬롯이나 약한 근거는 억지로 문장화하지 않는다.',
      '첫 post는 추상 훅이 아니라 장면이 보여야 한다. 감이 안 잡히는 표현은 바로 다음 줄에서 구체화한다.',
      '원문에 강한 숫자, 사람, 회사, 기관, 날짜가 있으면 대상 호출형 대신 사건 장면형 훅으로 시작할 수 있다.',
      '사건 장면형 예: “어제 GitHub에 코드 하나가 올라옴.”, “미국 규제기관이 AI 광고 하나를 잡았음.”',
      '첫 post 마지막에는 다음 post를 당기는 짧은 전환을 둘 수 있다. 고정 문구처럼 반복하지 않는다.',
    ],
  },
  {
    title: 'Tone Rules',
    badge: 'tone',
    items: [
      '뉴스체/보고서체/존댓말 설명체를 피하고, 사람이 원문을 읽고 짚어주는 호흡으로 쓴다.',
      '긴 문장은 두 문장으로 나눈다. 문맥이 끊기지 않게 연결 문장을 둔다.',
      '각 줄은 15~23자 안팎으로 오르내리게 쓴다. 너무 길면 두 줄로 나눈다.',
      '“선을 넘었음”, “큰일났음”은 쓸 수 있다. 다만 주어와 상황이 붙어야 한다.',
      '강한 문장 뒤에는 어떤 주장이나 약속이 문제인지 13~25자 안팎으로 바로 풀어준다.',
      '“너무 세게 약속했다”처럼 기준이 흐린 표현 대신, 어떤 주장이나 약속이 문제인지 구체적으로 쓴다.',
      '첫 문장은 대상 호출형이나 사건 장면형으로 시작할 수 있다. 예: “어제 GitHub에 코드 하나가 올라옴.”',
      '대상 호출형과 사건 장면형을 번갈아 쓴다. 한 글 안에서는 하나의 훅 방식을 선택해 밀고 간다.',
      '“광고를 맞춰준다”, “AI가 알아서 한다”처럼 작동 장면이 흐린 문장은 그대로 쓰지 않는다.',
      '추상 표현은 무엇을 보고, 누구에게, 어떤 행동이나 광고를 보여준다는 뜻인지 바로 풀어준다.',
      '끝판왕, 역대급, 미쳤다, 대박처럼 신뢰도를 깎는 과장 관용어는 쓰지 않는다.',
      '솔깃함은 “광고주 입장에선 꽤 솔깃한 기능”처럼 구체적으로 표현한다.',
      '거의 다, 대부분, 전부, 항상, 무조건처럼 근거 없는 넓은 단정은 쓰지 않는다.',
      '업계 분위기는 “요즘 자주 들리는 말”, “광고에서 자주 보이는 표현”처럼 낮춰 쓴다.',
      '반전은 라벨형/문장형/질문형을 번갈아 쓴다. 예: “여기 반전은?”, “근데 진짜 중요한 건 여기부터임.”',
      '같은 뉘앙스는 조금씩 변주한다. “문제는 여기서 시작됨.”, “그래서 이게 그냥 뉴스가 아님.”처럼 바꿔 쓴다.',
      '쉼표, 물음표, 느낌표를 조금만 섞어 사람 호흡을 만든다.',
      '단어 나열은 쉼표만 쓴다. 가운데점, 슬래시, 화살표, 작은따옴표는 발행문에서 쓰지 않는다.',
      '번호식/화살표식 설명을 남발하지 않는다. 프로세스는 가능하면 장면 묘사로 푼다.',
      'AI처럼 매끈한 요약을 피하고, 짧은 문장·설명 문장·질문형 전환을 섞는다.',
    ],
  },
  {
    title: 'Closing Rule',
    badge: 'final',
    items: [
      '마지막 post에는 한 줄 결론, 출처 표기, 출처 링크 또는 source_links를 포함한다.',
      '출처는 URL 본문 삽입이 아니라 “출처: Tom’s Hardware, Business Insider.”처럼 매체명/도메인으로 남긴다.',
      '규제기관/소송/합의 기사는 확정 판결처럼 쓰지 않고, 주장 기준, 혐의 합의, 제재 절차 같은 검증 레벨을 유지한다.',
      '팔로우 CTA나 다음 발행 예고는 사용자가 명시적으로 허락한 경우에만 넣는다.',
      '출처가 부족하면 본문에 억지 표기하지 않고 draft risk에 출처 부족을 남긴다.',
    ],
  },
];

const PROMPT_INTERNALS = [
  {
    title: 'Claude System Prompt 생성 방식',
    badge: 'claude-system',
    body: [
      'Claude는 글을 바로 쓰지 않는다. 역할은 콘텐츠 방향, Article Slot Map, 추가 리서치 질문을 설계하는 것이다.',
      'v1에서는 content_pattern=issue_explainer로 고정한다.',
      'sourceArticle이 있으면 원문을 중심축으로 삼는다. 여러 검색 결과를 섞어 중심이 흐려지지 않게 한다.',
      'Claude는 원문에서 확인된 사실과 추가 리서치가 필요한 질문을 분리한다.',
      '숫자, 고유명사, 직접 인용, 과거 맥락, 불확실성을 Article Slot Map으로 강제 추출한다.',
      'Psychological Arc로 독자의 첫 감정, 첫 질문, 신뢰 디테일, 흐름 확장, 구조적 의미, 마지막 깨달음을 강제 설계한다.',
    ].join('\n'),
  },
  {
    title: 'Claude User Message 조립 방식',
    badge: 'claude-user',
    body: [
      'source_article 모드: URL, 도메인, 제목, 설명, 추출된 본문 텍스트를 <source_article_text>로 감싸 Claude에 보낸다.',
      'issue_candidate 모드: 이슈 후보의 제목, 한 줄 훅, 카테고리, 흥미로운 이유, 변화 내용, 출처 요약을 보낸다.',
      '수동 기획 프롬프트 모드는 현재 비활성화했다.',
      '우선순위는 source_article > issue_candidate다.',
    ].join('\n'),
  },
  {
    title: 'JSON Schema가 영향을 주는 부분',
    badge: 'schema',
    body: [
      '스키마는 Claude가 아무 형식으로 답하지 못하게 막는 출력 계약이다.',
      'planning_title, content_pattern, issue_plan, psychological_arc, article_slot_map, deep_research_questions, evidence_map 같은 필드를 반드시 채우게 한다.',
      '프론트는 이 스키마 결과를 그대로 카드, 슬롯맵, 리서치 질문, Writer handoff payload로 보여준다.',
      'Sonar는 deep_research_questions를 질문별 검색 카드로 사용한다.',
      'Writer는 issue_plan, psychological_arc, article_slot_map, evidence_snapshot, do_not_claim을 보고 글을 쓴다.',
    ].join('\n'),
  },
  {
    title: 'Article Reader 텍스트 추출 방식',
    badge: 'article-reader',
    body: [
      '서버가 기사 URL을 fetch한다.',
      'script/style/noscript를 제거한다.',
      'article 태그가 있으면 그 영역을 우선 사용하고, 없으면 전체 body에서 추출한다.',
      'p, li, blockquote, h1, h2, h3 텍스트를 모은다.',
      '25자 미만의 짧은 조각은 버린다.',
      '최대 18,000자까지 자른 뒤 Claude에 넘긴다.',
      '이 방식은 HTML 파싱 기반이라, 사이트가 봇 차단/동적 렌더링을 쓰면 원문 추출이 약할 수 있다.',
    ].join('\n'),
  },
  {
    title: 'Writer 구조 프롬프트',
    badge: 'writer-structure',
    body: [
      '초안 포스트 개수는 7~8개로 고정한다.',
      '이슈의 장면, 근거, 반전 밀도를 7~8개 포스트 안에 배치한다.',
      'posts 배열은 문장 단위가 아니라 실제 Threads 포스트 단위다.',
      '문장 하나씩 1~13개 카드로 쪼개지 않는다.',
      '한 포스트 안에는 4~9개의 짧은 줄을 넣을 수 있다.',
      '포스트 경계는 독자의 질문이 바뀌는 순간에 둔다.',
      '기본 구성은 1 멈추는 장면, 2 원천 디테일, 3 누가/무엇을 했나, 4 왜 한 번짜리가 아닌가, 5 구조적 반전, 6 숫자/반응/시장 근거, 7 불확실성/주의점, 8 독자 결론/출처다.',
      '흐름은 멈추게 하는 첫 장면 → 구체 디테일 → 출처 확인 → 추가 장면 → 구조 해석 → 숫자/반응 → 과거 비유 또는 결론이다.',
      '실제 작성 순서는 정보 순서보다 psychological_arc의 심리 이동을 우선한다.',
      '각 post는 한 가지 중심 beat만 맡는다.',
      '빈 슬롯이나 약한 근거는 억지로 문장화하지 않는다.',
      'beat는 작성 순서를 잡기 위한 장치다. 본문에서는 라벨형/문장형/질문형 전환으로 자연스럽게 바꾼다.',
      '각 post 끝에는 다음을 읽게 만드는 작은 미해결감을 남긴다.',
      '마지막 post에는 한 줄 결론과 출처 표기를 남긴다.',
      '다음 발행 예정, 후속 글 예고, 임의 팔로우 CTA는 사용자가 허락한 경우에만 쓴다.',
    ].join('\n'),
  },
  {
    title: 'Writer 말투 규칙 전체',
    badge: 'tone-full',
    body: [
      '뉴스 기사체, 보고서체, 존댓말 설명체를 피한다.',
      '짧은 행갈이와 단정적인 구어체를 쓴다.',
      '“~입니다/합니다/볼 수 있습니다”를 기본 문체로 쓰지 않는다.',
      '과한 밈, ㅋㅋ, 이모지는 쓰지 않는다.',
      '했음/나옴/보임/거임/뜻임/자리 같은 어미를 섞되 반복하지 않는다.',
      '긴 문장은 두 문장으로 나눈다. 문맥이 끊기지 않게 연결한다.',
      '각 줄은 15~23자 안팎으로 오르내리게 쓴다. 정확히 맞추기보다 사람 호흡을 우선한다.',
      '26자 이상으로 길어지는 줄은 보통 두 줄로 나눈다.',
      '“선을 넘었음”, “큰일났음”은 쓸 수 있다. 다만 주어와 상황이 붙어야 한다.',
      '강한 문장 뒤에는 어떤 약속이나 주장이 문제인지 13~25자 안팎으로 바로 풀어준다.',
      '“너무 세게 약속했다”처럼 기준이 흐린 표현 대신, 어떤 약속이 문제인지 바로 쓰게 한다.',
      '첫 문장은 “OO 쓰는 사람 한 번 보셈” 같은 대상 호출형 또는 “어제 GitHub에 코드 하나가 올라옴” 같은 사건 장면형으로 시작할 수 있다.',
      '원문에 강한 숫자, 사람, 회사, 기관, 날짜가 있으면 사건 장면형 훅을 우선 검토한다.',
      '첫 post는 독자가 바로 장면을 떠올리게 해야 한다. 감이 안 잡히는 표현은 그대로 두지 않는다.',
      '첫 post 끝에는 다음 post를 당기는 짧은 전환을 둘 수 있다. 예: “그래서 뭐가 문제냐?”, “왜 이게 껄끄럽냐?”, “이게 핵심인 이유.”',
      '반전은 라벨형도 쓸 수 있다. 다만 “여기 반전은?”만 반복하지 말고 문장형/질문형으로 번갈아 쓴다.',
      '같은 연결 기능을 하는 문장은 변주한다. “그래서 이게 그냥 뉴스가 아님.”, “여기서 그림이 조금 바뀜.”, “문제는 여기서 시작됨.”',
      '쉼표, 물음표, 느낌표를 조금만 섞는다. 과하면 광고문 같아지므로 한 포스트에 0~1개 정도가 좋다.',
      '나열은 쉼표만 쓴다. 예: 검색, 비교, 요약, 추천.',
      '쓰지 않을 기호: 가운데점, 슬래시, 화살표, 작은따옴표.',
      '번호식 설명과 화살표식 설명은 꼭 필요할 때만 쓴다. 같은 문장틀이 반복되면 실패다.',
      '내부 검수어는 그대로 쓰지 않는다. 피할 표현: 출처 신호, 작동 방식, 불확실성.',
      'AI처럼 매끈하게 요약하지 않는다. 사람이 원문을 읽고 중간중간 짚어주는 호흡으로 쓴다.',
      '같은 길이/같은 리듬이 반복되면 실패다.',
      '오탈자는 고친다. 예: 됌 → 됨.',
    ].join('\n'),
  },
  {
    title: 'R2 한국어 보정 기준',
    badge: 'korean-localize',
    body: [
      'R2는 번역이 아니라 한국어 발행문 재배열이다.',
      '사실, 숫자, 고유명사, 출처 링크는 유지한다.',
      '영어식 배경 설명을 앞에 길게 쌓지 않는다.',
      '사건, 주체, 문제 행동을 먼저 보여주고 배경은 뒤에 붙인다.',
      'A에 대해 B를 하는 구조 같은 번역체를 줄인다.',
      'company that provides 같은 관계절은 두 문장으로 푼다.',
      'allegedly, according to 같은 검증 수준은 FTC 주장, 보도에 따르면처럼 한국어로 표시한다.',
      '규제기관/소송/합의 기사는 확정 판결처럼 쓰지 않고, 주장 기준, 혐의 합의, 제재 절차 같은 법적 상태를 유지한다.',
      '광고를 맞춰준다, AI가 알아서 한다처럼 흐린 표현은 무엇을 보고 누구에게 무엇을 보여주는지 구체 장면으로 푼다.',
      '끝판왕, 역대급, 미쳤다, 대박처럼 신뢰도를 깎는 과장 관용어는 낮춘다.',
      '거의 다, 대부분, 전부, 항상, 무조건처럼 근거 없는 넓은 단정은 낮춘다.',
      '넓은 일반화가 필요하면 이번 기사 기준, FTC 주장 기준처럼 범위를 붙인다.',
      '첫 post가 너무 넓은 대상 호출형이면 사건 장면형으로 바꿀 수 있다.',
      '한국 기사처럼 이미 자연스러운 문장은 과하게 바꾸지 않는다.',
    ].join('\n'),
  },
];

function CurrentLogicPreview() {
  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
        <GitCompare size={15} />
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-zinc-900">
            현재 구현 로직 미리보기
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            지금 실제 워크벤치 API와 Writer 규칙에 반영된 내용만 요약해서 보여준다.
          </p>
        </div>
      </div>
      <div className="p-4 grid lg:grid-cols-2 gap-3">
        {CURRENT_LOGIC_GROUPS.map((group) => (
          <div key={group.title} className="border border-zinc-200 rounded bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={group.badge} tone="muted" />
              <div className="text-xs font-black uppercase tracking-widest text-zinc-900">
                {group.title}
              </div>
            </div>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li key={item} className="text-xs text-zinc-700 leading-relaxed">
                  - {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
          프롬프트 / 스키마 / 추출 로직 상세
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          {PROMPT_INTERNALS.map((item) => (
            <details key={item.title} className="border border-zinc-200 rounded bg-zinc-50 p-3">
              <summary className="cursor-pointer">
                <span className="inline-flex items-center gap-2">
                  <StatusPill label={item.badge} tone="muted" />
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-900">
                    {item.title}
                  </span>
                </span>
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-[11px] leading-relaxed text-zinc-800 font-mono">
                {item.body}
              </pre>
            </details>
          ))}
        </div>
      </div>
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

function PlanningFlowPreview({
  showAdvancedPanels,
  contentPlan,
  researchItems,
  findings,
  planStatus,
  issueCandidates,
  selectedIssue,
  issueSearchIntent,
  issueSearchPrompt,
  articleUrl,
  sourceArticle,
  articleStatus,
  issueCategories,
  issueRecency,
  issueStatus,
  issueNotifyStatus,
  issuePromptStatus,
  issueHistory,
  researchStatus,
  writerModel,
  writerDrafts,
  writerPolishedDraft,
  writerStatus,
  polishStatus,
  onIssueSearchIntentChange,
  onIssueSearchPromptChange,
  onArticleUrlChange,
  onFetchSourceArticle,
  onToggleIssueCategory,
  onIssueRecencyChange,
  onGenerateIssueSearchPrompt,
  onFetchIssues,
  onNotifyIssues,
  onFetchIssuesWithPrompt,
  onSelectIssue,
  onClearIssueHistory,
  onGenerateContentPlan,
  onRunResearch,
  onGenerateWriterDrafts,
  onPolishWriterDraft,
}) {
  const acceptedFindings = findings.filter((finding) => finding.status === 'accepted');
  const rejectedFindings = findings.filter((finding) => finding.status === 'rejected');

  return (
    <section className="border border-[var(--admin-border)] rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg-sub)]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} />
          <h3 className="text-sm font-black uppercase tracking-wider">
            [1-5] 최근 이슈 → Claude 해석 → 연계 리서치 → Writer 초안
          </h3>
        </div>
        <p className="text-xs text-[var(--admin-text-muted)] mt-1">
          issue_explainer 형식으로 고정하고, 이슈 선택부터 근거 지도와 초안까지 한 화면에서 검수한다.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <IssueScoutPanel
          showAdvancedPanels={showAdvancedPanels}
          issues={issueCandidates}
          selectedIssue={selectedIssue}
          issueSearchIntent={issueSearchIntent}
          issueSearchPrompt={issueSearchPrompt}
          articleUrl={articleUrl}
          sourceArticle={sourceArticle}
          articleStatus={articleStatus}
          issueHistory={issueHistory}
          categories={issueCategories}
          recency={issueRecency}
          status={issueStatus}
          notifyStatus={issueNotifyStatus}
          promptStatus={issuePromptStatus}
          onArticleUrlChange={onArticleUrlChange}
          onFetchSourceArticle={onFetchSourceArticle}
          onIssueSearchIntentChange={onIssueSearchIntentChange}
          onIssueSearchPromptChange={onIssueSearchPromptChange}
          onToggleCategory={onToggleIssueCategory}
          onRecencyChange={onIssueRecencyChange}
          onGenerateIssueSearchPrompt={onGenerateIssueSearchPrompt}
          onFetchIssues={onFetchIssues}
          onNotifyIssues={onNotifyIssues}
          onFetchIssuesWithPrompt={onFetchIssuesWithPrompt}
          onSelectIssue={onSelectIssue}
          onClearIssueHistory={onClearIssueHistory}
          onGenerateIssuePlan={onGenerateContentPlan}
        />
        {planStatus.loading && <LoadingPing startedAt={planStatus.startedAt} phase="Claude 가 ContentPlan + 보강 리서치 질문 생성 중" />}
        {contentPlan ? (
          <>
            {/* 4개 핵심 카드 — 항상 보임. 각 카드 *내부* 가 요약 vs 상세 토글. */}
            <ContentPlanCard plan={contentPlan} status={planStatus} showDetail={showAdvancedPanels} />
            <ResearchReviewCards
              items={researchItems}
              findings={findings}
              onRunResearch={onRunResearch}
              status={researchStatus}
              disabled={contentPlan.stop_condition === 'stop'}
              showDetail={showAdvancedPanels}
            />
            <WriterHandoffPreview
              plan={contentPlan}
              acceptedFindings={acceptedFindings}
              rejectedFindings={rejectedFindings}
              showDetail={showAdvancedPanels}
            />
            {/* 검수 게이트 패널만 토글 — 사용자가 *상세 보기* 켰을 때 검토 체크리스트로 보임. */}
            {showAdvancedPanels && (
              <>
                <GatePanel
                  title="Gate 1 — 기획 방향 검토"
                  description="여기서 통과하지 않으면 Sonar 보강 리서치를 실행하지 않는다."
                  checks={[
                    'content_angle이 구체적인가?',
                    '독자의 불안이 실제로 느껴지는가?',
                    'required research item이 글 알맹이를 강화하는 자료인가?',
                    'do_not_claim이 과장 위험을 막을 만큼 선명한가?',
                  ]}
                  actions={[
                    { label: '통과', icon: CheckCircle2, tone: 'ok' },
                    { label: '수정', icon: Edit3, tone: 'warn' },
                    { label: '중단', icon: PauseCircle, tone: 'danger' },
                  ]}
                />
                <GatePanel
                  title="Gate 2 — 자료 채택 검토"
                  description="채택된 findings만 Writer handoff payload로 넘어간다."
                  checks={[
                    '출처가 추적 가능한가?',
                    '2024년 이후 자료이거나 현재 유효한 공식 문서인가?',
                    '작은 사업자에게 적용 가능한가?',
                    '추측/과장 표현이 섞이지 않았는가?',
                  ]}
                  actions={[
                    { label: '채택', icon: CheckCircle2, tone: 'ok' },
                    { label: '재검색', icon: RefreshCw, tone: 'warn' },
                    { label: '폐기', icon: XCircle, tone: 'danger' },
                  ]}
                />
              </>
            )}
            <WriterDraftPreview
              plan={contentPlan}
              acceptedFindings={acceptedFindings}
              writerModel={writerModel}
              drafts={writerDrafts}
              polishedDraft={writerPolishedDraft}
              status={writerStatus}
              polishStatus={polishStatus}
              onGenerate={onGenerateWriterDrafts}
              onPolish={onPolishWriterDraft}
            />
          </>
        ) : (
          <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 leading-relaxed">
            아직 Claude 기획 결과가 없다. 기사 URL을 읽어 `원문으로 Claude 해석`을 실행하거나,
            Sonar 이슈 후보를 선택해 `선택 이슈로 Claude 해석`을 실행하면 이후 단계가 열린다.
          </div>
        )}
      </div>
    </section>
  );
}

function IssueScoutPanel({
  showAdvancedPanels,
  issues,
  selectedIssue,
  issueSearchIntent,
  issueSearchPrompt,
  articleUrl,
  sourceArticle,
  articleStatus,
  issueHistory,
  categories,
  recency,
  status,
  notifyStatus,
  promptStatus,
  onArticleUrlChange,
  onFetchSourceArticle,
  onIssueSearchIntentChange,
  onIssueSearchPromptChange,
  onToggleCategory,
  onRecencyChange,
  onGenerateIssueSearchPrompt,
  onFetchIssues,
  onNotifyIssues,
  onFetchIssuesWithPrompt,
  onSelectIssue,
  onClearIssueHistory,
  onGenerateIssuePlan,
}) {
  const categoryOptions = ISSUE_CATEGORY_OPTIONS;
  const citations = Array.isArray(status.meta?.citations) ? status.meta.citations.slice(0, 5) : [];

  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            [1] 최근 이슈 찾기
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Perplexity/Sonar로 최근 AI·마케팅·테크·비즈니스 이슈 후보를 찾고, 하나를 골라 Claude 해석으로 넘긴다.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFetchIssues}
            disabled={status.loading || categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-900 text-white text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw size={14} />
            {status.loading ? '이슈 찾는 중' : '최근 이슈 가져오기'}
          </button>
          <button
            type="button"
            onClick={onNotifyIssues}
            disabled={notifyStatus.loading || categories.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-zinc-300 bg-white text-zinc-800 text-xs font-bold hover:border-zinc-500 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {notifyStatus.loading ? '전송 중' : '텔레그램으로 후보 보내기'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500" htmlFor="source-article-url">
                [1-a] 기사 URL로 시작
              </label>
              <input
                id="source-article-url"
                value={articleUrl}
                onChange={(event) => onArticleUrlChange(event.target.value)}
                placeholder="Tom's Hardware, Business Insider, The Verge, TechCrunch 기사 URL"
                className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-500"
              />
            </div>
            <button
              type="button"
              onClick={onFetchSourceArticle}
              disabled={articleStatus.loading || !articleUrl.trim()}
              className="inline-flex items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <FileText size={14} />
              {articleStatus.loading ? '원문 읽는 중' : '원문 읽기'}
            </button>
            <button
              type="button"
              onClick={() => onGenerateIssuePlan(null)}
              disabled={!sourceArticle || articleStatus.loading}
              className="inline-flex items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Sparkles size={14} />
              원문으로 Claude 해석
            </button>
          </div>
          {articleStatus.loading && <LoadingPing startedAt={articleStatus.startedAt} phase="원문 추출 중 (기사 본문 fetch + 정리)" />}
          {articleStatus.error && <ErrorBox message={articleStatus.error} />}
          {sourceArticle && showAdvancedPanels && (
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <div className="rounded border border-zinc-200 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  읽은 원문
                </div>
                <div className="mt-1 text-sm font-bold text-zinc-950">{sourceArticle.title || sourceArticle.url}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {sourceArticle.source_domain} · {sourceArticle.char_count?.toLocaleString?.() || sourceArticle.char_count}자
                </div>
              </div>
              <div className="rounded border border-zinc-200 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  원문 preview
                </div>
                <p className="mt-1 max-h-28 overflow-auto text-xs leading-relaxed text-zinc-700">
                  {sourceArticle.preview}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                [1-b] 찾고 싶은 이슈 방향 지정
              </div>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                사용자가 “이런 결의 뉴스기사를 찾고 싶다”고 쓰면 Claude가 Sonar 검색용 프롬프트로 바꾼다.
                이 단계는 글 기획이 아니라 이슈 탐색 질문 설계다.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateIssueSearchPrompt}
              disabled={promptStatus.loading || !issueSearchIntent.trim()}
              className="inline-flex items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Sparkles size={14} />
              {promptStatus.loading ? 'Claude 변환 중' : 'Claude가 Sonar 프롬프트 작성'}
            </button>
          </div>
          <textarea
            value={issueSearchIntent}
            onChange={(event) => onIssueSearchIntentChange(event.target.value)}
            placeholder={'예: 유료 보이스클론 도구를 오픈소스 모델이 대체하는 흐름의 최근 뉴스기사 찾아줘\\n예: 대형 마케팅 대행사가 AI 자동화 회사처럼 정체성을 바꾸는 이슈 찾아줘\\n예: NVIDIA처럼 30년 된 시장 질서가 깨지는 테크 뉴스 찾아줘'}
            className="mt-3 min-h-[92px] w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
          />
          {promptStatus.loading && <LoadingPing startedAt={promptStatus.startedAt} phase="Claude 가 Sonar 검색 프롬프트 작성 중" />}
          {promptStatus.error && <ErrorBox message={promptStatus.error} />}
          {promptStatus.meta?.model && (
            <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Claude 프롬프트 생성 완료 · model: <span className="font-mono">{promptStatus.meta.model}</span>
              {' '}· 소스 풀 {promptStatus.meta.sourceDirectoryCount || 0}개 반영
            </div>
          )}
          <details className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3" open={Boolean(issueSearchPrompt)}>
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Sonar에 보낼 이슈 검색 프롬프트
            </summary>
            <textarea
              value={issueSearchPrompt}
              onChange={(event) => onIssueSearchPromptChange(event.target.value)}
              placeholder="Claude가 만든 Sonar 검색 프롬프트가 여기에 표시된다. 필요하면 사용자가 직접 수정한 뒤 검색할 수 있다."
              className="mt-2 min-h-[180px] w-full rounded border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-500">
                이 프롬프트는 `/issues`의 기본 넓은 검색을 대체한다. 선택/발행 이력 제외 조건은 Claude 생성 단계에도 반영된다.
              </p>
              <button
                type="button"
                onClick={onFetchIssuesWithPrompt}
                disabled={status.loading || !issueSearchPrompt.trim()}
                className="inline-flex items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <RefreshCw size={14} />
                이 프롬프트로 이슈 찾기
              </button>
            </div>
          </details>
        </div>

        <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                주제 확장 맵
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                선택한 주제 축에 따라 Sonar가 우선 볼 소스 타입과 원문 후보가 달라진다.
              </p>
            </div>
            <StatusPill label={`${categories.length}개 선택`} tone={categories.length ? 'ok' : 'warn'} />
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {categoryOptions.map((category) => {
            const active = categories.includes(category.value);
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => onToggleCategory(category.value)}
                title={category.description}
                className={`rounded border px-3 py-2 text-left ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600'
                }`}
              >
                <span className="block text-xs font-black">{category.label}</span>
                <span className={`mt-1 block text-[10px] leading-snug ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {category.description}
                </span>
              </button>
            );
          })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={recency}
            onChange={(event) => onRecencyChange(event.target.value)}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700"
          >
            <option value="day">최근 24시간</option>
            <option value="week">최근 7일</option>
            <option value="month">최근 30일</option>
          </select>
          <span className="text-[11px] text-zinc-500">
            기본값은 AI 도구, 플랫폼 정책, 소비자 행동, 규제 충격이다.
          </span>
          </div>
        </div>

        {status.loading && <LoadingPing startedAt={status.startedAt} phase="Sonar 가 최근 이슈 후보 검색 중" />}
        {notifyStatus.loading && <LoadingPing startedAt={notifyStatus.startedAt} phase="Sonar 이슈 후보 검색 후 텔레그램 발송 중" />}
        {status.error && <ErrorBox message={status.error} />}
        {notifyStatus.error && <ErrorBox message={notifyStatus.error} />}
        {status.meta?.model && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            이슈 후보 수집 완료 · model: <span className="font-mono">{status.meta.model}</span>
            {' '}· 제외 이력 {status.meta.excludedHistoryCount || 0}개 반영
            {' '}· 로컬 저장 {status.meta.localExcludedHistoryCount || 0}개
            {' '}· 소스 풀 {status.meta.sourceDirectoryCount || 0}개
            {' '}· 후보 {status.meta.issuesCount || 0}개
          </div>
        )}
        {notifyStatus.meta?.ok && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            텔레그램 후보 발송 완료 · 후보 {notifyStatus.meta.issue_count || 0}개
            {' '}· 수신 {notifyStatus.meta.delivered_count || 0}/{notifyStatus.meta.recipient_count || 0}명
            {' '}· 이력 제외 {notifyStatus.meta.excluded_history_count || 0}개
          </div>
        )}

        {showAdvancedPanels && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                선택/발행 예정 뉴스기사 이력
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                `최근 이슈 가져오기` 때 이 목록과 같은 기사·사건·angle은 제외하도록 Sonar에 전달한다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearIssueHistory}
              disabled={!issueHistory.length}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-600 disabled:opacity-50"
            >
              이력 비우기
            </button>
          </div>
          {issueHistory.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {issueHistory.slice(0, 8).map((item) => (
                <span
                  key={`${item.id}-${item.selected_at}`}
                  className="max-w-full truncate rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800"
                  title={item.url || item.title}
                >
                  {item.title || item.url}
                </span>
              ))}
              {issueHistory.length > 8 && (
                <span className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500">
                  +{issueHistory.length - 8}개
                </span>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
              아직 제외할 선택 이력이 없다. `원문으로 Claude 해석` 또는 `선택 이슈로 Claude 해석`을 누르면 여기에 쌓인다.
            </div>
          )}
        </div>
        )}

        {issues.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 leading-relaxed">
            {status.meta?.model
              ? 'Sonar 검색은 완료됐지만 후보가 0개다. 검색 조건이 너무 좁거나, Sonar 응답이 issues 배열로 정리되지 않았을 가능성이 있다. 프롬프트를 조금 넓히거나 기간을 최근 30일로 바꿔 다시 검색해보면 된다.'
              : '아직 실제 이슈 후보가 없다. `최근 이슈 가져오기`를 누르거나, `[1-b] 찾고 싶은 이슈 방향 지정`에서 Claude가 만든 Sonar 프롬프트로 검색하면 뉴스기사 기준 후보가 여기에 표시된다.'}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {issues.map((issue) => {
            const active = selectedIssue?.issue_id === issue.issue_id;
            return (
              <button
                key={issue.issue_id}
                type="button"
                onClick={() => onSelectIssue(issue)}
                className={`text-left rounded border p-4 transition ${
                  active
                    ? 'border-zinc-900 bg-zinc-950 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-400'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={issueCategoryLabel(issue.category)} tone={active ? 'dark' : 'muted'} />
                  <StatusPill label={issue.needs_deeper_research ? 'deep research 필요' : '검증 낮음'} tone={issue.needs_deeper_research ? 'warn' : 'muted'} />
                </div>
                <div className="mt-3 text-sm font-black leading-snug">{issue.issue_title}</div>
                <div className={`mt-2 text-sm leading-relaxed ${active ? 'text-zinc-100' : 'text-zinc-700'}`}>
                  {issue.one_line_hook}
                </div>
                <div className={`mt-3 text-xs leading-relaxed ${active ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {issue.why_interesting}
                </div>
                <div className={`mt-2 text-[11px] leading-relaxed ${active ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {issue.recency_note || issue.source_summary}
                </div>
                {issue.novelty_note && (
                  <div className={`mt-2 text-[11px] leading-relaxed ${active ? 'text-emerald-200' : 'text-emerald-700'}`}>
                    중복 제외 근거: {issue.novelty_note}
                  </div>
                )}
              </button>
            );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-200 bg-zinc-50 p-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              선택된 이슈
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-950">
              {selectedIssue?.issue_title || '선택된 이슈 없음'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateIssuePlan(selectedIssue)}
            disabled={status.loading || !selectedIssue}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-900 text-white text-xs font-bold disabled:opacity-50"
          >
            <Sparkles size={14} />
            선택 이슈로 Claude 해석
          </button>
        </div>

        {showAdvancedPanels && citations.length > 0 && (
          <details className="rounded border border-zinc-200 bg-white p-3">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-zinc-500">
              이슈 수집 citations 보기
            </summary>
            <div className="mt-2 space-y-1.5">
              {citations.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[11px] font-mono text-blue-700 hover:underline"
                >
                  {url}
                </a>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ContentPlanCard({ plan, status, showDetail }) {
  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            [2] Claude ContentPlan
          </div>
          <div className="text-base font-black text-zinc-950 mt-1">{plan.planning_title}</div>
        </div>
        <StatusPill label={plan.stop_condition === 'proceed' ? '진행 가능' : '검토 필요'} tone="ok" />
      </div>

      <div className="p-4 space-y-4">
        {status.error && (
          <div className="text-xs text-zinc-500">
            API 호출 실패 시 아래에는 직전 결과가 유지된다.
          </div>
        )}
        <div className="border border-zinc-900 rounded bg-zinc-950 text-white p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
            content_angle
          </div>
          <div className="text-lg font-black leading-snug mt-2">{plan.content_angle}</div>
        </div>

        {/* 서술문 요약 — 항상 보임. issue_plan 의 핵심 필드를 *문장 단위* 로 보여줌. */}
        {plan.content_pattern === 'issue_explainer' && plan.issue_plan && (
          <div className="border border-zinc-200 rounded bg-zinc-50 p-4 leading-relaxed text-sm text-zinc-800 space-y-2">
            {plan.issue_plan.audience_callout && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">대상</span>{plan.issue_plan.audience_callout}</p>
            )}
            {plan.issue_plan.issue_summary && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">사건</span>{plan.issue_plan.issue_summary}</p>
            )}
            {plan.issue_plan.key_reversal && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">핵심 반전</span>{plan.issue_plan.key_reversal}</p>
            )}
            {plan.issue_plan.why_it_matters && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">왜 중요</span>{plan.issue_plan.why_it_matters}</p>
            )}
            {plan.issue_plan.reader_takeaway && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">독자 takeaway</span>{plan.issue_plan.reader_takeaway}</p>
            )}
            {plan.promised_takeaway && (
              <p><span className="font-bold text-zinc-500 text-[10px] uppercase tracking-widest mr-2">약속</span>{plan.promised_takeaway}</p>
            )}
          </div>
        )}

        {/* 이하 상세 박스/그리드는 showDetail=true 일 때만 — "진단 패널 보기" 토글. */}
        {showDetail && (<>
        {plan.content_pattern === 'issue_explainer' && plan.issue_plan && (
          <div className="grid md:grid-cols-3 gap-3">
            <PlanField title="대상 호출" value={plan.issue_plan.audience_callout} emphasis />
            <PlanField title="핵심 반전" value={plan.issue_plan.key_reversal} emphasis />
            <PlanField title="전환 문장" value={plan.issue_plan.turning_point} />
            <PlanField title="사건 요약" value={plan.issue_plan.issue_summary} />
            <PlanField title="왜 중요한가" value={plan.issue_plan.why_it_matters} />
            <PlanField title="표현 방향" value={plan.issue_plan.expression_direction} />
          </div>
        )}

        {plan.psychological_arc && (
          <div className="border border-emerald-200 rounded bg-emerald-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Psychological Arc — 독자 심리 이동
            </div>
            <div className="mt-2 grid md:grid-cols-4 gap-2">
              <PlanField title="첫 감정" value={plan.psychological_arc.reader_start_emotion} emphasis />
              <PlanField title="첫 질문" value={plan.psychological_arc.reader_first_question} emphasis />
              <PlanField title="신뢰 디테일" value={plan.psychological_arc.credibility_hook} />
              <PlanField title="흐름 확장" value={plan.psychological_arc.pattern_shift} />
              <PlanField title="구조적 의미" value={plan.psychological_arc.structural_meaning} emphasis />
              <PlanField title="마지막 깨달음" value={plan.psychological_arc.reader_end_realization} emphasis />
              <PlanField title="호기심 사다리" value={(plan.psychological_arc.curiosity_ladder || []).join(', ')} />
              <PlanField title="필요 근거" value={(plan.psychological_arc.proof_needed || []).join(', ')} />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <PlanField title="소재 배경" value={plan.topic_background} />
          <PlanField title="왜 지금인지" value={plan.why_now} />
          <PlanField title="독자의 불안/혼란" value={plan.reader_anxiety} emphasis />
          <PlanField title="독자가 가져갈 기준" value={plan.promised_takeaway} emphasis />
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill label={`pattern: ${plan.content_pattern || 'legacy'}`} tone={plan.content_pattern === 'issue_explainer' ? 'ok' : 'muted'} />
          <StatusPill label={`source: ${plan.source_mode || 'unknown'}`} tone="muted" />
          <StatusPill label={`reaction: ${plan.target_reaction || '미정'}`} tone="muted" />
          <StatusPill label={`pillar: ${plan.suggested_content_pillar}`} tone="muted" />
          <StatusPill label={`intent: ${plan.suggested_engagement_intent}`} tone="muted" />
          <StatusPill label={`treatment: ${plan.suggested_treatment}`} tone="muted" />
          <StatusPill label={`format: ${plan.suggested_format_type}`} tone="muted" />
        </div>

        {plan.article_slot_map && (
          <div className="border border-zinc-200 rounded bg-white p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Article Slot Map — 원문에서 뽑은 발행 재료
            </div>
            <div className="mt-2 grid md:grid-cols-3 gap-2">
              <PlanField title="멈추게 하는 첫 장면" value={plan.article_slot_map.strange_scene} emphasis />
              <PlanField title="독자 결정" value={plan.article_slot_map.reader_decision} emphasis />
              <PlanField title="오래된 질서" value={plan.article_slot_map.old_order} />
              <PlanField title="새 신호" value={plan.article_slot_map.new_signal} />
              <PlanField title="동시 플레이어" value={(plan.article_slot_map.coordinated_players || []).join(' / ')} />
              <PlanField title="숫자" value={(plan.article_slot_map.hard_numbers || []).join(' / ')} />
              <PlanField title="고유명사" value={(plan.article_slot_map.named_entities || []).join(' / ')} />
              <PlanField title="직접 인용" value={(plan.article_slot_map.direct_quotes || []).join(' / ')} />
              <PlanField title="과거 맥락" value={plan.article_slot_map.past_failure_or_history} />
              <PlanField title="이번엔 다른 이유" value={plan.article_slot_map.why_now_changed} />
              <PlanField title="불확실성/반론" value={plan.article_slot_map.counter_signal_or_uncertainty} />
              <PlanField title="닫는 프레임" value={plan.article_slot_map.closing_frame} />
            </div>
          </div>
        )}

        {plan.evidence_map && (
          <div className="border border-zinc-200 rounded bg-zinc-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Evidence Map 초안
            </div>
            <div className="mt-2 grid md:grid-cols-3 gap-2">
              <PlanField title="hook_fact" value={plan.evidence_map.hook_fact} />
              <PlanField title="case_detail" value={plan.evidence_map.case_detail} />
              <PlanField title="mechanism" value={plan.evidence_map.mechanism} />
              <PlanField title="authority_signal" value={plan.evidence_map.authority_signal} />
              <PlanField title="official_position" value={plan.evidence_map.official_position} />
              <PlanField title="uncertainty" value={(plan.evidence_map.uncertainty || []).join(' / ')} />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <ListBox title="위험 신호" icon={AlertTriangle} items={plan.risk_flags} tone="warn" />
          <ListBox title="하지 말아야 할 주장" icon={ShieldCheck} items={plan.do_not_claim} tone="danger" />
        </div>

        <ListBox title="사용자 확인 질문" icon={ClipboardCheck} items={plan.user_review_questions} />
        </>)}
      </div>
    </div>
  );
}

function PlanField({ title, value, emphasis }) {
  return (
    <div className={'border rounded p-3 ' + (emphasis ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50')}>
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</div>
      <div className="text-sm text-zinc-900 leading-relaxed mt-1">{value}</div>
    </div>
  );
}

function ListBox({ title, icon: Icon, items, tone }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50'
        : 'border-zinc-200 bg-zinc-50';

  return (
    <div className={`border rounded p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
        <Icon size={12} />
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {(items || []).map((item) => (
          <li key={item} className="text-xs text-zinc-800 leading-relaxed">
            - {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// 진행 중 상태 표시 — 스피너 + 경과 시간(초) + 선택적 단계 메시지.
// startedAt: Date.now() 시점. phase: "Sonar 검색 중" 같은 현재 작업 한 줄 설명.
// streaming 응답이 아니라 % 진척도는 보여줄 수 없음. 솔직히 *경과 시간 + 단계 메시지* 로.
function LoadingPing({ startedAt, phase }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  const seconds = Math.floor(elapsedMs / 1000);
  // 경과 시간 기반의 가벼운 hint — 호출 종류 무관 공통 안내. phase 가 있으면 phase 우선.
  const defaultHint = seconds < 3
    ? '요청 전송 중…'
    : seconds < 12
    ? '응답 대기 중…'
    : seconds < 30
    ? '응답 정리 중… (조금 길어질 수 있음)'
    : '많이 걸리고 있음. 네트워크/API 응답 확인 권장.';
  return (
    <div className="mt-3 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <Loader2 size={14} className="shrink-0 animate-spin" />
      <span className="font-bold tabular-nums">{seconds}초 경과</span>
      <span className="opacity-70">·</span>
      <span>{phase || defaultHint}</span>
    </div>
  );
}

function GatePanel({ title, description, checks, actions }) {
  return (
    <div className="border border-zinc-200 rounded bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-zinc-900">{title}</div>
          <p className="text-[11px] text-zinc-500 mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const cls =
              action.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : action.tone === 'danger'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700';
            return (
              <button
                key={action.label}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold ${cls}`}
              >
                <Icon size={13} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-2 mt-3">
        {checks.map((check) => (
          <div key={check} className="border border-zinc-200 rounded bg-zinc-50 p-3 text-[11px] text-zinc-700 leading-relaxed">
            {check}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchReviewCards({ items, findings, onRunResearch, status, disabled, showDetail }) {
  const acceptedCount = findings.filter((finding) => finding.status === 'accepted').length;
  const rejectedCount = findings.filter((finding) => finding.status === 'rejected').length;
  const itemsWithResults = items.filter((item) => findings.some((f) => f.item_id === item.item_id)).length;

  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            [3] 자료별 Sonar 리서치 검수
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Claude가 요청한 자료, 실제 Sonar 질문, 결과와 출처를 한 카드에서 확인한다.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={`채택 ${acceptedCount}`} tone="ok" />
          <StatusPill label={`폐기 ${rejectedCount}`} tone="warn" />
          <button
            type="button"
            onClick={onRunResearch}
            disabled={disabled || status.loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-900 text-white text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw size={14} />
            {status.loading ? 'Sonar 리서치 중' : 'Sonar 리서치 실행'}
          </button>
        </div>
      </div>
      {status.loading && <div className="px-4 pt-3"><LoadingPing startedAt={status.startedAt} phase="Sonar 가 보강 리서치 질문별 실행 중" /></div>}
      {status.error && <div className="px-4"><ErrorBox message={status.error} /></div>}
      {status.meta?.model && (
        <div className="px-4 pt-3 text-[10px] text-emerald-700">
          Sonar 응답 완료 · model: <span className="font-mono">{status.meta.model}</span>
        </div>
      )}
      {/* 진행 상태 요약 — 항상 보임. */}
      <div className="px-4 pt-3 text-xs text-zinc-700 leading-relaxed">
        {items.length === 0
          ? <>아직 [2] ContentPlan 의 보강 리서치 질문이 없다. Claude 가 deep_research_questions 를 만들어야 이 단계가 채워진다.</>
          : <>총 <span className="font-bold">{items.length}개</span> 자료 요청 중 <span className="font-bold">{itemsWithResults}개</span>에 Sonar 결과 있음 · 채택 <span className="font-bold">{acceptedCount}</span> · 폐기 <span className="font-bold">{rejectedCount}</span></>}
      </div>
      {/* 카드 그리드 — showDetail 일 때만. 평소엔 상단 요약만 보임. */}
      {showDetail && <div className="p-4 space-y-3">
        {items.map((item) => {
          const itemFindings = findings.filter((finding) => finding.item_id === item.item_id);
          const itemAccepted = itemFindings.filter((finding) => finding.status === 'accepted').length;
          const itemRejected = itemFindings.filter((finding) => finding.status === 'rejected').length;
          const firstQuality = itemFindings[0]?.quality_signal || 'pending';

          return (
            <div key={item.item_id} className="border border-zinc-200 rounded overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-zinc-500">{item.item_id}</span>
                    <div className="text-sm font-bold text-zinc-950">{item.item_title}</div>
                    <StatusPill label={item.priority} tone={item.priority === 'required' ? 'warn' : 'muted'} />
                    <StatusPill label={item.expected_evidence_type} tone="muted" />
                    <StatusPill
                      label={`quality: ${firstQuality}`}
                      tone={firstQuality === 'strong' ? 'ok' : firstQuality === 'weak' || firstQuality === 'not_found' ? 'warn' : 'muted'}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={`handoff ${itemAccepted}`} tone="ok" />
                    <StatusPill label={`제외 ${itemRejected}`} tone="warn" />
                  </div>
                </div>
                <div className="mt-2 grid md:grid-cols-[1fr_1.2fr] gap-2">
                  <div className="border border-zinc-200 rounded bg-white p-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Claude가 요청한 이유
                    </div>
                    <p className="text-xs text-zinc-700 mt-1 leading-relaxed">{item.research_purpose}</p>
                  </div>
                  <details className="border border-zinc-200 rounded bg-white p-3">
                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      실제 Sonar 프롬프트 보기
                    </summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100 font-mono">
                      {item.prompt}
                    </pre>
                  </details>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {itemFindings.length === 0 ? (
                  <div className="border border-dashed border-zinc-200 rounded p-4 text-xs text-zinc-500">
                    아직 이 자료 요청에 연결된 Sonar 결과가 없다. `Sonar 리서치 실행` 후 이 자리에 findings와 출처가 묶여 표시된다.
                  </div>
                ) : (
                  itemFindings.map((finding) => (
                    <FindingReviewCard key={finding.id} finding={finding} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function FindingReviewCard({ finding }) {
  const citations = Array.isArray(finding.citations) ? finding.citations.slice(0, 5) : [];

  return (
    <div className="border border-zinc-200 rounded p-3 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatusPill label={finding.status === 'accepted' ? '채택됨' : '폐기됨'} tone={finding.status === 'accepted' ? 'ok' : 'warn'} />
          <StatusPill label={finding.quality_signal} tone={finding.quality_signal === 'strong' ? 'ok' : finding.quality_signal === 'weak' ? 'warn' : 'muted'} />
          <StatusPill label={finding.evidence_type} tone="muted" />
        </div>
        <div className="font-mono text-[10px] text-zinc-500">{finding.source_domain}</div>
      </div>
      <p className="text-sm text-zinc-900 leading-relaxed mt-2">{finding.finding_text}</p>
      <div className="text-[11px] text-zinc-500 mt-2">{finding.recency_note}</div>
      {citations.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            citations
          </div>
          <div className="mt-2 space-y-1.5">
            {citations.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[11px] font-mono text-blue-700 hover:underline"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WriterHandoffPreview({ plan, acceptedFindings, rejectedFindings, showDetail }) {
  const payload = {
    content_plan: {
      planning_title: plan.planning_title,
      content_pattern: plan.content_pattern,
      target_reaction: plan.target_reaction,
      topic_background: plan.topic_background,
      target_reader: plan.target_reader,
      reader_anxiety: plan.reader_anxiety,
      content_angle: plan.content_angle,
      promised_takeaway: plan.promised_takeaway,
      suggested_content_pillar: plan.suggested_content_pillar,
      suggested_engagement_intent: plan.suggested_engagement_intent,
      suggested_treatment: plan.suggested_treatment,
      suggested_format_type: plan.suggested_format_type,
      issue_plan: plan.issue_plan || null,
      evidence_map: plan.evidence_map || null,
    },
      evidence_snapshot: acceptedFindings.map((finding) => ({
      item_id: finding.item_id,
      finding_text: finding.finding_text,
      source_domain: finding.source_domain,
      source_url: Array.isArray(finding.citations) ? finding.citations[0] : '',
      evidence_type: finding.evidence_type,
      recency_note: finding.recency_note,
      accepted_by_user: true,
    })),
    do_not_claim: plan.do_not_claim || [],
    excluded_findings_count: rejectedFindings.length,
  };

  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          [4] Evidence Map / Writer Handoff Preview
        </div>
        <div className="text-xs text-zinc-600 mt-1">
          Writer에는 채택 자료와 금지 주장만 넘긴다. 폐기 자료는 payload에서 제외된다.
        </div>
      </div>
      <div className="p-4">
        {/* 항상 보임 — 요약 카운트 + 핵심 한 줄. */}
        <div className="flex flex-wrap gap-2 mb-3">
          <StatusPill label={`evidence ${acceptedFindings.length}개 전달`} tone="ok" />
          <StatusPill label={`폐기 ${rejectedFindings.length}개 제외`} tone="warn" />
          <StatusPill label={`do_not_claim ${(plan.do_not_claim || []).length}개`} tone="muted" />
        </div>
        <div className="text-xs text-zinc-700 leading-relaxed">
          {acceptedFindings.length === 0
            ? <>아직 Writer 에 넘길 채택 자료가 없다. 위 [3] Sonar 리서치 결과에서 자료를 채택해야 한다.</>
            : <>채택된 자료 <span className="font-bold">{acceptedFindings.length}개</span>와 금지 주장 <span className="font-bold">{(plan.do_not_claim || []).length}개</span>가 GPT Writer 에 전달될 예정. 폐기 자료 {rejectedFindings.length}개는 payload 에 포함되지 않는다.</>}
        </div>
        {/* JSON 원본은 토글 — 보통은 안 봐도 됨. 디버그 시에만. */}
        {showDetail && (
          <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100 font-mono">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function WriterDraftPreview({ plan, acceptedFindings, writerModel, drafts, polishedDraft, status, polishStatus, onGenerate, onPolish }) {
  const hasRealDrafts = Array.isArray(drafts) && drafts.length > 0;
  const r1Draft = hasRealDrafts ? drafts[0] : null;

  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            [5] R1 Writer 초안 → R2 한국어 보정
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            R1은 근거 기반 초안이다. R2는 같은 사실을 유지한 채 외국 기사식 문장 배열을 한국어 발행문으로 다시 보정한다.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={status.loading || !acceptedFindings.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-900 text-white text-xs font-bold disabled:opacity-50"
          >
            <Sparkles size={14} />
            {status.loading ? 'R1 생성 중' : 'R1 초안 생성'}
          </button>
          <button
            type="button"
            onClick={onPolish}
            disabled={polishStatus.loading || !r1Draft}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-zinc-300 bg-white text-zinc-900 text-xs font-bold disabled:opacity-50"
          >
            <Edit3 size={14} />
            {polishStatus.loading ? 'R2 보정 중' : 'R2 한국어 보정'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-2">
          <InfoBox title="발행 형식" icon={FileText}>
            {plan.suggested_format_type || 'short_thread'}
          </InfoBox>
          <InfoBox title="글 문법" icon={GitBranch}>
            {plan.content_pattern || plan.suggested_treatment || 'checklist'}
          </InfoBox>
          <InfoBox title="채택 근거" icon={ClipboardCheck}>
            {acceptedFindings.length}개 findings
          </InfoBox>
          <InfoBox title="금지 주장" icon={ShieldCheck}>
            {(plan.do_not_claim || []).length}개 do_not_claim
          </InfoBox>
        </div>
        <div className="border border-zinc-200 rounded bg-zinc-50 p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Writer 대상 모델
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-zinc-950">
            {writerModel || 'OPENAI_THREAD_MODEL 미설정'}
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            실제 Writer 연결 시 `lib/agent/convertItemToThreadDraft.js`가 이 환경변수 값을 사용한다.
          </p>
        </div>

        {status.loading && <LoadingPing startedAt={status.startedAt} phase="GPT Writer 가 초안 작성 중 (보통 20~60초)" />}
        {status.error && <ErrorBox message={status.error} />}
        {status.meta?.model && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Writer 응답 완료 · model: <span className="font-mono">{status.meta.model}</span>
          </div>
        )}
        {status.meta?.referenceMeta && (
          <WriterReferenceMeta meta={status.meta.referenceMeta} />
        )}
        {polishStatus.loading && <LoadingPing startedAt={polishStatus.startedAt} phase="GPT가 R1을 한국어 발행문 호흡으로 보정 중" />}
        {polishStatus.error && <ErrorBox message={polishStatus.error} />}
        {polishStatus.meta?.model && (
          <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            R2 한국어 보정 완료 · model: <span className="font-mono">{polishStatus.meta.model}</span>
          </div>
        )}

        {!hasRealDrafts && (
          <div className="border border-dashed border-zinc-200 bg-zinc-50 rounded p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-zinc-500" />
              <div>
                <div className="text-xs font-bold text-zinc-900">아직 실제 Writer 초안이 없다</div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  Sonar 리서치에서 채택한 근거가 생기면 `GPT-5 Writer 초안 생성` 버튼이 활성화된다.
                  버튼을 누른 뒤 실제 GPT-5 응답만 이 영역에 표시한다.
                </p>
              </div>
            </div>
          </div>
        )}

        {r1Draft && (
          <div className="space-y-4">
            <details open={!polishedDraft} className="border border-zinc-200 rounded bg-zinc-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-widest text-zinc-700">
                R1 Writer 초안 보기
              </summary>
              <div className="p-3 pt-0">
                <DraftCard draft={r1Draft} stageLabel="R1 Writer 초안" />
              </div>
            </details>
            {polishedDraft && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      R2 최종 발행 후보
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      사실과 출처는 유지하고 한국어 독자가 읽는 순서로 보정한 버전.
                    </p>
                  </div>
                  <StatusPill label="polished" tone="ok" />
                </div>
                <DraftCard draft={polishedDraft} stageLabel="R2 한국어 보정본" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WriterReferenceMeta({ meta }) {
  const picks = Array.isArray(meta.realbody_picks) ? meta.realbody_picks : [];

  return (
    <div className="border border-zinc-200 rounded bg-zinc-50 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        Writer 참조 자료 주입 확인
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatusPill label={meta.has_bad_example ? 'BAD 예시 주입됨' : 'BAD 예시 없음'} tone={meta.has_bad_example ? 'ok' : 'warn'} />
        <StatusPill label={meta.has_knowledge_block ? 'Threads 가이드 주입됨' : '가이드 없음'} tone={meta.has_knowledge_block ? 'ok' : 'warn'} />
        <StatusPill label={`realbody ${picks.length}개`} tone={picks.length ? 'ok' : 'warn'} />
      </div>
      {picks.length > 0 && (
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          {picks.map((pick, index) => (
            <div key={`${pick.preview}-${index}`} className="border border-zinc-200 rounded bg-white p-2">
              <div className="text-[10px] font-mono text-zinc-500">
                score {pick.score} · {pick.topic_label || 'topic 없음'}
              </div>
              <p className="mt-1 text-[11px] text-zinc-700 leading-relaxed">{pick.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft, stageLabel }) {
  const sourceLinks = Array.isArray(draft.source_links) ? draft.source_links.filter((link) => link?.url) : [];
  return (
    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {stageLabel || draft.label}
          </div>
          <div className="text-sm font-bold text-zinc-950">{draft.title}</div>
        </div>
        <StatusPill label={draft.format} tone="muted" />
      </div>
      <div className="p-3 space-y-2">
        {draft.posts.map((post, index) => (
          <div key={`${draft.id}-${index}`} className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-[10px] font-mono text-zinc-400 mb-1">{index + 1}</div>
            <p className="text-sm text-zinc-900 leading-relaxed">{post}</p>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-zinc-200 bg-zinc-50 flex flex-wrap gap-2">
        <StatusPill label={`evidence: ${draft.evidence.length ? draft.evidence.join(', ') : '없음'}`} tone={draft.evidence.length ? 'ok' : 'warn'} />
        <StatusPill label={draft.risk} tone="muted" />
      </div>
      {sourceLinks.length > 0 && (
        <div className="px-3 py-3 border-t border-zinc-200 bg-white">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            발행 후 마지막에 넣을 출처 링크
          </div>
          <div className="mt-2 space-y-1.5">
            {sourceLinks.map((link, index) => (
              <a
                key={`${link.url}-${index}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[11px] font-mono text-blue-700 hover:underline"
              >
                {link.label || link.source_domain || `source ${index + 1}`} — {link.url}
              </a>
            ))}
          </div>
        </div>
      )}
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
    dark: 'bg-zinc-800 border-zinc-700 text-white',
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
