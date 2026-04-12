import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT_BASE = `당신은 '기브니즈(GIVENEEDS)'의 라이트 AI 마케팅 전략가입니다.
사용자의 사업을 빠르게 진단하고, 실행 가능한 전략과 기브니즈의 서비스를 자연스럽게 연결해 주는 역할입니다.

[톤 — 친절한 전문가, Impact-first]
- 사용자는 깊이 생각하기보다 "좋은 정보를 듣고 싶어하는" 상태입니다. 사용자에게 "돌아보라"는 식의 자기성찰 요구는 절대 하지 않습니다.
- 대신 추천 시에는 반드시 "이 해결책이 일반적으로 만들 수 있는 시장 파급 효과"를 구체적인 수치 추정으로 제시합니다.
  예) "외식업의 경우 네이버 로컬 검색은 월 평균 수백만 건 규모로 일어나며, 상위 3위권 진입 시 방문 전환이 일반적으로 20~40% 수준 상승하는 경향이 있습니다."
- 수치는 "일반적으로", "보통", "경향이 있다" 등으로 완화된 표현으로 제시하고 단정하지 않습니다.
- 모든 답변은 한국어, 2~5문장 또는 최대 5개의 짧은 불릿으로 압축합니다.

[Hard Rules — 절대 금지]
- 사용자의 "최근 본 매거진/서비스", "클릭한 CTA" 등의 내부 기록을 UI에 언급 금지.
  금지 표현 예: "이전에 ~을 보셨네요", "기록을 참고하면", "최근 ~에 관심 있으시군요", "방문 이력을 보니".
  → 이 정보는 추천 톤과 예시의 우선순위를 조정하는 용도로만 내부적으로 사용합니다.
- 출처 없는 단정, 허위 통계 금지.

[재질의 규칙]
- 사용자의 답변이 모호하거나, 구체적 전략을 수립하기에 정보가 부족하다고 판단되면 추측하지 말고:
  1) 사용자가 한 말을 1~2문장으로 요약해 돌려주고,
  2) "혹시 ~라는 의미가 맞을까요?" 또는 핵심 한 가지만 짧게 다시 묻습니다. (한 번에 여러 질문 X)

[상품 추천 규칙]
- 가능한 경우 하단 CATALOG에서 1~2개를 선택해 구체적으로 어떻게 활용하면 좋은지 1~2문장으로 제안합니다.
- CATALOG에 적합한 항목이 없다면 "직접 상담이 필요해 보입니다"로 부드럽게 유도합니다.

[출력 형식 — 반드시 아래 JSON 구조만 반환]
{
  "reply": "<사용자에게 보일 본문 텍스트>",
  "choices": [{"label": "...", "value": "..."}],  // 다음 단계 선택지 2~4개, 없으면 [] (자유 입력 단계)
  "nextStep": "<mainConcern | subDetail | industry | strength | recommendation | freeChat>"
}
- JSON 외 어떤 텍스트도 출력하지 않습니다. 코드 블록 없이 raw JSON만.
`;

function buildCatalogText(services = [], recs = []) {
  const lines = [];
  const recMap = new Map(recs.map((r) => [r.service_id, r]));
  const seen = new Set();

  for (const r of recs) {
    if (!r) continue;
    const label = r.title;
    if (seen.has(label)) continue;
    seen.add(label);
    const parts = [`- ${label}: ${r.one_liner || ''}`];
    if (r.concern_tags?.length) parts.push(`[고민: ${r.concern_tags.join(',')}]`);
    if (r.industry_tags?.length) parts.push(`[업종: ${r.industry_tags.join(',')}]`);
    if (r.impact_note) parts.push(`\n    파급효과: ${r.impact_note}`);
    lines.push(parts.join(' '));
  }

  for (const s of services) {
    if (recMap.has(s.id)) continue;
    if (seen.has(s.title)) continue;
    seen.add(s.title);
    lines.push(`- ${s.title}: ${s.subtitle || (s.description || '').slice(0, 80)}`);
  }

  return lines.slice(0, 15).join('\n');
}

function buildTrailHint(trail = {}) {
  const parts = [];
  const mags = trail.recentMagazines?.slice(0, 3) || [];
  const svcs = trail.recentServices?.slice(0, 3) || [];
  const ctas = trail.recentCTAs?.slice(0, 3) || [];
  if (mags.length) parts.push(`최근 관심 매거진 주제: ${mags.map((m) => m.title || m.slug).join(', ')}`);
  if (svcs.length) parts.push(`최근 관심 서비스: ${svcs.map((s) => s.title || s.slug).join(', ')}`);
  if (ctas.length) parts.push(`최근 클릭한 CTA: ${ctas.map((c) => c.label).join(', ')}`);
  if (!parts.length) return '';
  return `\n[INTERNAL ONLY — 절대 사용자에게 언급 금지] 사용자의 최근 관심사:\n${parts.join('\n')}\n(위 정보는 답변 톤/예시 우선순위 조정에만 내부적으로 사용하세요.)`;
}

function buildAnswersHint(answers = {}) {
  const parts = [];
  if (answers.mainConcern) parts.push(`주요 고민: ${answers.mainConcern}`);
  if (answers.subDetail) parts.push(`세부: ${answers.subDetail}`);
  if (answers.industry) parts.push(`업종: ${answers.industry}`);
  if (answers.strength) parts.push(`강점: ${answers.strength}`);
  if (!parts.length) return '';
  return `\n[사용자가 지금까지 응답한 내용]\n${parts.join('\n')}`;
}

async function loadCatalog() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { services: [], recs: [] };

  const supabase = createClient(url, key);
  try {
    const [{ data: services }, { data: recs }] = await Promise.all([
      supabase
        .from('services')
        .select('id,slug,title,subtitle,description,category')
        .eq('is_active', true)
        .order('order_num', { ascending: true })
        .limit(30),
      supabase
        .from('chatbot_recommendations')
        .select('service_id,title,one_liner,concern_tags,industry_tags,impact_note,priority')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(30),
    ]);
    return { services: services || [], recs: recs || [] };
  } catch (e) {
    console.warn('loadCatalog failed:', e?.message);
    return { services: [], recs: [] };
  }
}

async function verifyAuth(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { user: null, token: null };

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { user: null, token: null };

  try {
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await supabase.auth.getUser();
    return { user: data?.user || null, token };
  } catch {
    return { user: null, token: null };
  }
}

function parseModelJson(text) {
  if (!text) return null;
  // raw JSON 우선
  try {
    return JSON.parse(text);
  } catch {
    // 코드펜스 제거 후 재시도
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {}
    }
    // 첫 { ~ 마지막 } 추출
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {}
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    // 인증 확인 — 비로그인도 수집 단계 대화는 허용 (5회 제한은 클라이언트에서 관리)
    const { user } = await verifyAuth(request);

    const body = await request.json();
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const trail = body?.trail || {};
    const answers = body?.answers || {};
    const step = body?.step || 'freeChat';

    const cleaned = incoming
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'messages가 비어 있습니다.' }, { status: 400 });
    }

    const { services, recs } = await loadCatalog();
    const catalogText = buildCatalogText(services, recs);

    const systemPrompt =
      SYSTEM_PROMPT_BASE +
      `\n[CURRENT_STEP]\n${step}` +
      buildAnswersHint(answers) +
      buildTrailHint(trail) +
      `\n[CATALOG]\n${catalogText || '(카탈로그 없음 — "직접 상담"으로 유도)'}`;

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, ...cleaned],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI API error:', res.status, errText);
      return NextResponse.json(
        { error: `OpenAI 응답 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseModelJson(raw);

    const reply =
      (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) ||
      raw ||
      '죄송해요, 응답을 불러오지 못했어요.';
    const choices = Array.isArray(parsed?.choices)
      ? parsed.choices
          .filter((c) => c && typeof c.label === 'string')
          .map((c) => ({ label: c.label.slice(0, 80), value: String(c.value || c.label).slice(0, 80) }))
          .slice(0, 4)
      : [];
    const nextStep = typeof parsed?.nextStep === 'string' ? parsed.nextStep : null;

    return NextResponse.json({ reply, choices, nextStep });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json(
      { error: err?.message || '서버 오류' },
      { status: 500 }
    );
  }
}
