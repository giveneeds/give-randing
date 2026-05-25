// 검색 결과 모음 → LLM 으로 페인포인트·바이럴 후킹·추천 앵글 추출.
// 이 결과는 (1) 어드민 리서치 페이지에 노출, (2) brief 생성 시 컨텍스트로 주입.

import { callOpenAI } from '@/lib/llm';

/**
 * @param {{ themeName: string, query: string, results: Array<{title,url,content,source_domain}> }} args
 * @returns {Promise<{
 *   pain_points: string[],
 *   viral_hooks: Array<{ pattern: string, example: string }>,
 *   recommended_angles: string[],
 *   model: string,
 *   cost_usd: number|null,
 * }>}
 */
export async function extractInsights({ themeName, query, results }) {
  if (!results || results.length === 0) {
    return { pain_points: [], viral_hooks: [], recommended_angles: [], model: 'skip', cost_usd: 0 };
  }

  // 상위 결과 본문 + 메타를 LLM 프롬프트에 압축해서 전달.
  const sample = results.slice(0, 10).map((r, i) => (
    `[${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 400)}`
  )).join('\n\n');

  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 콘텐츠 리서처다.
주 타겟은 요식업 사장님, 병의원 원장, 브랜드 운영자, 마케터, 작은 브랜드 운영자, 일반 독자까지 포함한다.
주제가 업종 특화인지, 브랜드/마케팅 운영 관점인지, 일반 독자가 읽을 이슈인지 먼저 구분한 뒤 검색 결과 모음을 보고:

1) pain_points: 글들 속에 드러난 독자 페인포인트·고민·짜증의 패턴. 5개 이내. 각 25자 내외.
2) viral_hooks: 검색 결과 글에서 발견되는 후킹 구조. 한국 SNS 마케팅에서 검증된 7가지 패턴
   (부정형 자기진단 / 조건+시간 약속 / 숫자+가십 / 통념 거스르기 / 전문가 자기 모순 / 즉시 데이터 / 희소성 공개)
   중 어떤 패턴을 쓰는지 + 원문 예시 한 줄. 5개 이내.
3) recommended_angles: 이 주제로 기브니즈가 발행할 만한 매거진·스레드 앵글. 5개 이내. 각 40자 내외.

요식업/병의원 근거가 없으면 "사장님 실무 팁"으로 억지 변환하지 않는다. 해외 AI/마케팅 이슈는 마케터·브랜드 운영자·일반 독자 관점으로 정리한다.

출력은 JSON 만. 가치 없거나 자료 부족하면 빈 배열.`;

  const user = `주제: ${themeName}
검색 쿼리: ${query}
검색 결과:
${sample}

JSON 형태:
{
  "pain_points": ["...","..."],
  "viral_hooks": [{ "pattern": "부정형 자기진단", "example": "원문 한 줄" }],
  "recommended_angles": ["...","..."]
}`;

  let parsed = { pain_points: [], viral_hooks: [], recommended_angles: [] };
  let model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  let cost_usd = null;

  try {
    const { content, raw } = await callOpenAI({
      stage: 'research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' } },
    });
    const obj = JSON.parse(content);
    parsed = {
      pain_points: Array.isArray(obj.pain_points) ? obj.pain_points.slice(0, 5).filter((x) => typeof x === 'string') : [],
      viral_hooks: Array.isArray(obj.viral_hooks)
        ? obj.viral_hooks.slice(0, 5).filter((h) => h && typeof h === 'object').map((h) => ({
            pattern: typeof h.pattern === 'string' ? h.pattern : '',
            example: typeof h.example === 'string' ? h.example : '',
          }))
        : [],
      recommended_angles: Array.isArray(obj.recommended_angles) ? obj.recommended_angles.slice(0, 5).filter((x) => typeof x === 'string') : [],
    };
    // callOpenAI 내부에서 cost 가 agent_ai_logs 에 기록되므로 여기는 raw usage 만 참고.
    if (raw?.usage) {
      const inTok = raw.usage.prompt_tokens || 0;
      const outTok = raw.usage.completion_tokens || 0;
      const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 }, 'gpt-4o': { in: 2.5, out: 10 } };
      const p = PRICE[model];
      if (p) cost_usd = (inTok * p.in + outTok * p.out) / 1_000_000;
    }
  } catch (e) {
    // 실패해도 빈 결과 반환 — 리서치는 보조 기능이라 전체 흐름 막지 않음.
    console.error('[research/extractInsights] LLM 실패:', e.message);
  }

  return { ...parsed, model, cost_usd };
}
