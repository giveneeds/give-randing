const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';

// 한국어 SNS(Threads) 마케팅 콘텐츠 파이프라인용 — *전술적 실행 인텔리전스* 만 뽑아낸다.
// "X 는 중요하다" 같은 일반 조언은 모두 거른다. 실제 사용자가 실제 도구·프롬프트·명령으로
// 측정 가능한 결과를 얻은 사례 우선. 출처 도메인은 제한하지 않는다(번역/로컬화는 후속 단계).
const TACTICAL_SYSTEM_PROMPT = `You are extracting TACTICAL EXECUTION INTELLIGENCE for a Korean B2B marketing content pipeline.

PRIORITIZE (high tactical_concreteness):
- Practitioner first-person accounts ("I ran X with Y prompt and got Z")
- Specific tools/prompts/commands used (exact names, exact text or paraphrase)
- Measurable outcomes (numbers, percentages, before/after, time saved, ROI, conversion changes)
- Failure stories with cause analysis (what didn't work, why)
- Step-by-step workflows actually executed

EXCLUDE (low tactical_concreteness):
- Corporate blog posts that say "X is important" without HOW
- Generic best-practices lists, listicles ("5 ways to ...")
- Predictions, trend forecasts, "the future of X"
- Abstract thought-leadership ("creativity matters", "data is the new oil")
- Vendor marketing copy

For EACH finding, output a tactical_concreteness score 0-5:
  5 = exact tool + exact prompt/command/step + measurable outcome with numbers
  4 = practitioner workflow with most specifics (tool + steps, partial numbers)
  3 = clear specific lesson with at least one concrete element
  2 = useful observation but mostly directional
  1 = abstract advice with weak grounding
  0 = pure platitude (must be excluded)

Findings scored 0 or 1 must NOT be returned. Drop them.

Output language: write the finding text in Korean (translate/localize as needed). Preserve specific names, numbers, tool names, and prompt fragments in their original form when meaningful. Always cite source (URL).`;

export async function askPerplexity({ query, context }) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return { skipped: true, reason: 'PERPLEXITY_API_KEY 미설정' };
  }

  const model = process.env.PERPLEXITY_MODEL || 'sonar';
  const messages = [
    { role: 'system', content: TACTICAL_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Research query: ${query}`,
        context ? `Context:\n${context}` : '',
        'Output JSON only with the following schema (no markdown, no commentary):',
        '{',
        '  "key_findings": [',
        '    { "text": "<finding in Korean>", "tactical_concreteness": 0-5, "source_url": "<url>", "specifics": ["<tool>", "<number>", ...] }',
        '  ],',
        '  "source_notes": [{"title":"...","url":"...","why_useful":"..."}],',
        '  "missing_context": ["..."]',
        '}',
        'Rules:',
        '- Drop any finding with tactical_concreteness <= 1.',
        '- Sort key_findings by tactical_concreteness descending.',
        '- specifics: list the concrete artifacts (tool names, numbers, command fragments) the finding cites. Empty array if none.',
      ].filter(Boolean).join('\n\n'),
    },
  ];

  const res = await fetch(PERPLEXITY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Perplexity ${res.status}`);
  }

  const content = json.choices?.[0]?.message?.content || '';
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // 구 schema(plain string findings) 폴백 — 점수 없이 가져와 후처리에서 무시되도록.
    parsed = { key_findings: [{ text: content.slice(0, 1200), tactical_concreteness: 0, source_url: '', specifics: [] }], source_notes: [], missing_context: ['JSON parse 실패'] };
  }

  // 정규화 — 신구 schema 모두 받아 객체 배열로 통일. 점수 ≥2 만 유지.
  const rawFindings = Array.isArray(parsed.key_findings) ? parsed.key_findings : [];
  const findings = [];
  for (const f of rawFindings) {
    let text = '';
    let score = null;
    let url = '';
    let specifics = [];
    if (typeof f === 'string') {
      text = f.trim();
      score = null;
    } else if (f && typeof f === 'object') {
      text = typeof f.text === 'string' ? f.text.trim() : '';
      score = Number.isFinite(Number(f.tactical_concreteness)) ? Math.max(0, Math.min(5, Math.round(Number(f.tactical_concreteness)))) : null;
      url = typeof f.source_url === 'string' ? f.source_url : '';
      specifics = Array.isArray(f.specifics) ? f.specifics.filter((x) => typeof x === 'string' && x.trim()).slice(0, 5) : [];
    }
    if (!text) continue;
    // 점수 ≤1 컷. 점수 없는 구 schema 결과는 통과시키되 점수 0 으로 표기(snapshot 단계에서 따로 처리).
    if (typeof score === 'number' && score <= 1) continue;
    findings.push({ text: text.slice(0, 800), tactical_concreteness: score, source_url: url, specifics });
  }
  // 점수 있는 것 우선 정렬.
  findings.sort((a, b) => (b.tactical_concreteness ?? 0) - (a.tactical_concreteness ?? 0));

  return {
    skipped: false,
    model,
    key_findings: findings.slice(0, 10),
    source_notes: Array.isArray(parsed.source_notes)
      ? parsed.source_notes.filter((x) => x && typeof x === 'object').slice(0, 6).map((x) => ({
          title: typeof x.title === 'string' ? x.title : '',
          url: typeof x.url === 'string' ? x.url : '',
          why_useful: typeof x.why_useful === 'string' ? x.why_useful : '',
        }))
      : [],
    missing_context: Array.isArray(parsed.missing_context) ? parsed.missing_context.filter((x) => typeof x === 'string').slice(0, 5) : [],
    raw_citations: Array.isArray(json.citations) ? json.citations : [],
  };
}
