import { searchQuery } from '@/lib/research/searchProvider';
import { callOpenAI } from '@/lib/llm';
import { getThreadsAuditInfo } from '@/lib/knowledge/loader';

const TONE_DOMAINS = ['threads.com', 'threads.net'];

/**
 * Third pass: Korean Threads tone adaptation.
 * Prefer weekly Threads audit data already collected in docs/reference-data.
 * Live search is a fallback, not the primary source.
 */
export async function runToneResearch({ item, theme, deepResearch }) {
  const brief = item.classification || {};
  const title = item.normalized?.title || '';
  const angle = brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '');
  const query = [
    angle,
    brief.reader_problem,
    deepResearch?.insights?.audience_reactions?.[0],
    title,
    theme?.name,
  ].filter(Boolean)[0] || '마케팅 반응 말투';

  const auditInfo = getThreadsAuditInfo();
  const audit = auditInfo?.body || '';
  if (audit && audit.trim().length > 500) {
    const stale = isAuditStale(auditInfo.audit_date);
    const insights = await extractToneInsights({
      title,
      angle,
      results: [],
      auditText: audit,
      sourceMode: 'threads_audit',
      auditInfo: {
        filename: auditInfo.filename,
        audit_date: auditInfo.audit_date,
        stale,
      },
    });
    return {
      queries: ['threads_audit_cache'],
      results: [],
      source_mode: 'threads_audit',
      source_recency: stale ? 'stale' : 'fresh',
      audit_file: auditInfo.filename || null,
      audit_date: auditInfo.audit_date || null,
      insights,
    };
  }

  const queries = [
    `${query} 반응 말투`,
    `${query} 사람들 댓글 질문`,
  ];

  const merged = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const { results } = await searchQuery(q, {
        includeDomains: TONE_DOMAINS,
        maxResults: 6,
      });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q });
      }
    } catch (e) {
      console.error(`[runToneResearch] 검색 "${q}" 실패:`, e.message);
    }
  }

  const insights = await extractToneInsights({ title, angle, results: merged, sourceMode: 'live_threads_search' });
  return { queries, results: merged, source_mode: 'live_threads_search', insights };
}

async function extractToneInsights({ title, angle, results, auditText, sourceMode, auditInfo }) {
  if ((!results || results.length === 0) && !auditText) {
    return { voice_patterns: [], phrases_to_borrow: [], phrases_to_avoid: [], reader_questions: [], model: 'skip', cost_usd: null };
  }

  const sample = auditText
    ? `[Threads 감사 데이터]\n${auditText.slice(0, 5000)}`
    : results.slice(0, 12).map((r, i) => (
      `[${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 320)}`
    )).join('\n\n');

  const sys = `너는 한국 Threads 구조/말투 어댑터다.
자료에서 한국 Threads에서 자연스럽게 먹히는 시작 방식, 첫 포스트 길이, 연속 포스트 역할 분리, 후킹 감각, 피해야 할 AI식 표현을 뽑는다.
출력은 글쓰기 참고용이지 문장 복사용이 아니다.
Reddit/X는 이 단계의 중심 소스가 아니다. 주차별 Threads 감사 데이터가 있으면 그것을 우선한다.
중요: 잘 터지는 Threads는 첫 글에서 짧게 궁금증/FOMO/오해 깨기를 만들고, 후속 포스트에서 정보를 푸는 경우가 많다. "긴 설명을 1번부터 다 쓰는 구조"는 경고한다.

JSON:
{
  "voice_patterns": ["..."],
  "opening_patterns": ["..."],
  "first_post_rules": ["..."],
  "continuation_roles": ["..."],
  "structure_benchmarks": ["..."],
  "phrases_to_borrow": ["..."],
  "phrases_to_avoid": ["..."],
  "reader_questions": ["..."]
}`;

const user = `제목: ${title}
앵글: ${angle || '(없음)'}
소스 모드: ${sourceMode || 'unknown'}
audit 파일: ${auditInfo?.filename || '(없음)'}
audit 날짜: ${auditInfo?.audit_date || '(없음)'}
audit 신선도: ${auditInfo ? (auditInfo.stale ? 'stale - 말투 참고 신뢰도 낮음' : 'fresh') : 'no_audit'}

참고 자료:
${sample}`;

  const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  try {
    const { content, raw } = await callOpenAI({
      stage: 'tone_research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.2 },
    });
    const obj = JSON.parse(content);
    return {
      voice_patterns: normalizeStringArray(obj.voice_patterns, 5),
      opening_patterns: normalizeStringArray(obj.opening_patterns, 6),
      first_post_rules: normalizeStringArray(obj.first_post_rules, 5),
      continuation_roles: normalizeStringArray(obj.continuation_roles, 7),
      structure_benchmarks: normalizeStringArray(obj.structure_benchmarks, 5),
      phrases_to_borrow: normalizeStringArray(obj.phrases_to_borrow, 8),
      phrases_to_avoid: normalizeStringArray(obj.phrases_to_avoid, 8),
      reader_questions: normalizeStringArray(obj.reader_questions, 6),
      model,
      cost_usd: raw?.usage ? estimateMiniCost(raw.usage) : null,
    };
  } catch (e) {
    console.error('[runToneResearch] LLM 실패:', e.message);
    return { voice_patterns: [], phrases_to_borrow: [], phrases_to_avoid: [], reader_questions: [], model, cost_usd: null };
  }
}

function normalizeStringArray(input, max) {
  return Array.isArray(input) ? input.filter((x) => typeof x === 'string' && x.trim()).slice(0, max) : [];
}

function estimateMiniCost(usage) {
  return (((usage.prompt_tokens || 0) * 0.15) + ((usage.completion_tokens || 0) * 0.6)) / 1_000_000;
}

function isAuditStale(dateString) {
  if (!dateString) return true;
  const auditTime = Date.parse(`${dateString}T00:00:00+09:00`);
  if (!Number.isFinite(auditTime)) return true;
  const ageMs = Date.now() - auditTime;
  return ageMs > 7 * 24 * 60 * 60 * 1000;
}
