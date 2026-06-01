import { searchQuery } from '@/lib/research/searchProvider';
import { askPerplexity } from '@/lib/research/perplexityProvider';
import { callOpenAI } from '@/lib/llm';

/**
 * Additional material research after the user picks a topic.
 * This is separate from tone/SNS research: it looks for facts, examples, and missing context.
 */
export async function runSupplementalResearch({ item, theme, deepResearch }) {
  const brief = item.classification || {};
  const title = item.normalized?.title || '';
  const angle = brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '');
  const queries = buildSupplementalQueries({ title, angle, brief, theme, deepResearch });

  const merged = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const { results } = await searchQuery(q, {
        includeDomains: null,
        maxResults: 6,
        searchDepth: 'basic',
      });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q });
      }
    } catch (e) {
      console.error(`[runSupplementalResearch] 검색 "${q}" 실패:`, e.message);
    }
  }

  // Perplexity 는 영어 쿼리(전술 자료가 풍부한 쪽) + 한국어 컨텍스트로 호출.
  // queries[1] 이 영어 first-pass(reddit OR twitter ...) 라 그걸 우선 사용.
  const perplexityQuery = queries[1] || queries[0] || title || angle;
  let perplexity = null;
  try {
    perplexity = await askPerplexity({
      query: perplexityQuery,
      context: [
        title && `title: ${title}`,
        angle && `angle: ${angle}`,
        brief.reader_problem && `reader_problem: ${brief.reader_problem}`,
        'Korean B2B marketing audience. Findings will be translated/localized for Korean Threads readers — keep tool names, prompts, numbers in their original form.',
      ].filter(Boolean).join('\n'),
    });
  } catch (e) {
    perplexity = { skipped: true, reason: e.message };
  }

  const insights = await summarizeSupplementalResearch({ title, angle, results: merged, perplexity });
  return { queries, results: merged, perplexity, insights };
}

// 쿼리는 *전술 실행 자료* 를 직접 겨눈다.
// 영어 쿼리 비중을 한국어보다 약간 더 둔다 — 영어 SNS(Reddit/X/HackerNews)에 실제 사용자
// 워크플로우 + 수치 후기가 압도적으로 많다. 번역/로컬화는 Writer 단계에서 자연어로 푼다.
// 한국어 쿼리 1개 + 영어 쿼리 3개 = 총 4개 (Tavily 1000회/월 한도엔 영향 미미: cron 1회/일).
function buildSupplementalQueries({ title, angle, brief, theme, deepResearch }) {
  const seeds = [
    angle,
    brief.reader_problem,
    brief.why_now,
    deepResearch?.insights?.adapted_angles?.[0],
    title,
    theme?.name,
  ].filter(Boolean);
  const seedKo = seeds[0] || '마케팅 실전';
  const seedEn = englishKeywordFromAngle(angle, title, theme) || 'marketing';

  return [
    // 한국어 1개 — 국내 사례·블로그 후기 사냥
    `${seedKo} 실제 사례 수치 결과 후기`,
    // 영어 3개 — 실전 워크플로우 / 도구·프롬프트 / Before-After
    `reddit OR twitter ${seedEn} actual workflow with numbers OR ROI`,
    `${seedEn} site:news.ycombinator.com OR site:reddit.com practitioner tool prompt`,
    `${seedEn} before after metrics case study not summary`,
  ];
}

// angle/title 에서 영어 키워드 추출. 이미 영어가 섞여 있으면(예: "ROAS", "GA4", "AI marketing")
// 그대로 사용; 아니면 theme 기반 디폴트.
function englishKeywordFromAngle(angle, title, theme) {
  const text = `${angle || ''} ${title || ''}`;
  // 영어 단어 3글자 이상 추출.
  const englishTokens = (text.match(/[A-Za-z][A-Za-z0-9+&\-]{2,}/g) || [])
    .map((t) => t.trim())
    .filter((t, i, arr) => t.length >= 3 && arr.indexOf(t) === i);
  if (englishTokens.length >= 2) return englishTokens.slice(0, 4).join(' ');
  if (englishTokens.length === 1) return `${englishTokens[0]} marketing`;
  // 영어 키워드 부족 — theme 기반 폴백.
  const themeName = theme?.name || '';
  if (/광고|ROAS|메타/.test(themeName)) return 'meta ads ROAS optimization';
  if (/AI|에이전트/.test(themeName)) return 'AI marketing workflow practitioner';
  if (/스레드|threads/i.test(themeName)) return 'threads engagement growth';
  if (/네이버|블로그/.test(themeName)) return 'SEO content workflow';
  return 'b2b marketing tactic workflow';
}

async function summarizeSupplementalResearch({ title, angle, results, perplexity }) {
  // Perplexity 발견은 이미 점수+specifics 가 붙어 있어 그대로 직렬화 — LLM 이 점수 정보를 참고하게.
  const perplexityFindings = (perplexity?.key_findings || []).map((f, i) => {
    if (typeof f === 'string') return `[Perplexity ${i + 1}] ${f}`;
    const score = (typeof f.tactical_concreteness === 'number') ? f.tactical_concreteness : '?';
    const specs = Array.isArray(f.specifics) && f.specifics.length ? ` / 구체: ${f.specifics.join(', ')}` : '';
    const src = f.source_url ? ` / 출처: ${f.source_url}` : '';
    return `[Perplexity ${i + 1} · 전술점수 ${score}/5] ${f.text}${specs}${src}`;
  });
  const sample = [
    ...(results || []).slice(0, 10).map((r, i) => (
      `[검색 ${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 350)}\n${r.url}`
    )),
    ...perplexityFindings,
  ].join('\n\n');

  if (!sample) {
    return { evidence_points: [], content_additions: [], missing_context: [], model: 'skip', cost_usd: null };
  }

  const sys = `너는 기브니즈 콘텐츠 기획자의 보강 리서처다. 본문에 들어갈 *전술적 근거*(실제 도구·프롬프트·수치·사례)를 우선 추출한다.

규칙:
- evidence_points 의 각 항목에 tactical_concreteness 점수(0~5)를 매긴다:
  5 = 정확한 도구명 + 구체 명령/프롬프트/단계 + 측정 가능한 수치
  4 = 실무 워크플로우 + 일부 수치
  3 = 구체 사례 하나는 있음
  2 = 방향성만 있음
  1~0 = 추상 — 출력에서 제외
- "X 가 중요하다", "Y 시대에는~" 같은 일반 조언은 evidence_points 에서 빼라.
- 영어 자료라도 한국어로 번역해 옮기되, 도구명·프롬프트 조각·수치는 원형 유지.
- 출처 URL 이 있으면 source 에 기입. 추측이면 source 를 비운다.

JSON만 출력. evidence_points 는 점수 내림차순으로.`;

  const user = `제목: ${title}
앵글: ${angle || '(없음)'}

수집 자료:
${sample}

JSON:
{
  "evidence_points": [{"point":"<한국어 본문 한 줄>","source":"<url 또는 빈문자열>","how_to_use":"<본문에 어떻게 활용할지>","tactical_concreteness":0-5,"specifics":["<도구/수치/명령>"]}],
  "content_additions": ["..."],
  "missing_context": ["..."]
}`;

  const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  try {
    const { content, raw } = await callOpenAI({
      stage: 'supplemental_research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.2 },
    });
    const obj = JSON.parse(content);
    const cost = raw?.usage ? estimateMiniCost(raw.usage) : null;
    const evidencePoints = Array.isArray(obj.evidence_points)
      ? obj.evidence_points.filter((x) => x && typeof x === 'object').map((x) => ({
          point: typeof x.point === 'string' ? x.point : '',
          source: typeof x.source === 'string' ? x.source : '',
          how_to_use: typeof x.how_to_use === 'string' ? x.how_to_use : '',
          tactical_concreteness: Number.isFinite(Number(x.tactical_concreteness))
            ? Math.max(0, Math.min(5, Math.round(Number(x.tactical_concreteness))))
            : null,
          specifics: Array.isArray(x.specifics) ? x.specifics.filter((s) => typeof s === 'string' && s.trim()).slice(0, 5) : [],
        }))
      : [];
    // 점수 ≤1 컷, 점수 있는 것 우선 정렬, 최대 6개.
    const filteredEvidence = evidencePoints
      .filter((x) => x.point && (x.tactical_concreteness === null || x.tactical_concreteness >= 2))
      .sort((a, b) => (b.tactical_concreteness ?? 0) - (a.tactical_concreteness ?? 0))
      .slice(0, 6);
    return {
      evidence_points: filteredEvidence,
      content_additions: Array.isArray(obj.content_additions) ? obj.content_additions.filter((x) => typeof x === 'string').slice(0, 5) : [],
      missing_context: Array.isArray(obj.missing_context) ? obj.missing_context.filter((x) => typeof x === 'string').slice(0, 4) : [],
      model,
      cost_usd: cost,
    };
  } catch (e) {
    console.error('[runSupplementalResearch] LLM 실패:', e.message);
    return { evidence_points: [], content_additions: [], missing_context: [], model, cost_usd: null };
  }
}

function estimateMiniCost(usage) {
  return (((usage.prompt_tokens || 0) * 0.15) + ((usage.completion_tokens || 0) * 0.6)) / 1_000_000;
}
