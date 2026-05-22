// 검토함의 agent_items 1건을 Threads 드래프트(thread_drafts) 로 변환.
// brief + research_context + 채널/주제 거버넌스 KB를 모두 LLM 에 컨텍스트로 주고,
// 1~6개 포스트 시퀀스 + hook/tone/engagement_driver 메타까지 함께 생성.
//
// 매거진 본문 생성기와 별개. 스레드는 짧고 채널 톤이 강해서 독립 로직.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';
import { buildKnowledgeContext } from '@/lib/knowledge/loader';

const PROMPT_VERSION = 'thread_v1_2026_05_17';

/**
 * @param {{ itemId: string, formatTypeHint?: string, extraContext?: string|null }} args
 * @returns {Promise<{ draftId: string, postCount: number, model: string }>}
 */
export async function convertItemToThreadDraft({ itemId, formatTypeHint, extraContext }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  const { data: item, error: itemErr } = await supabaseAdmin
    .from('agent_items')
    .select('id, theme_id, source, post_url, normalized, classification, summary, translation, research_context')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr || !item) throw new Error('아이템을 찾을 수 없음');

  const brief = item.classification || {};
  const summary = item.summary || {};
  const translation = item.translation || {};
  const rc = item.research_context || {};
  const originalTitle = translation.translated_title || item.normalized?.title || '';
  const originalText = translation.translated_text || item.normalized?.extracted_text || '';

  // 주제 정보 (지식베이스 주입에 필요).
  let theme = null;
  if (item.theme_id) {
    const { data } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .eq('id', item.theme_id)
      .maybeSingle();
    theme = data || null;
  }

  // 스레드 드래프트는 인기글 감사까지 포함해 후킹 패턴 학습을 강화 (enrich 보다 자료 다양).
  const knowledgeBlock = buildKnowledgeContext({
    topicCluster: theme?.target_topic_cluster || brief.suggested_topic_cluster,
    persona: theme?.target_persona || brief.suggested_persona,
    channel: 'threads',
    includeAudit: true,
  });

  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 Threads 콘텐츠 작가다.
주 타겟은 요식업 사장님·병의원 원장. 광고티가 강하면 안 되지만, 사장님이 자기 가게/병원에 적용해볼 수 있는 실용적 조언이 보여야 한다.

규칙:
- 각 포스트는 500자 이내. 한글 줄바꿈 활용.
- 첫 포스트는 강한 hook(부정형 자기진단/조건+약속/숫자/통념 거스르기/희소성 등). 첫 줄은 30자 이내.
- 전문 용어보다 현장어를 우선한다. 현장어는 돈/시간/화면/행동/감정 중 2개 이상이 보이는 문장이다.
- 예: "전환율이 낮다"보다 "광고비는 나가는데 전화가 안 온다", "퍼널이 끊긴다"보다 "플레이스는 보는데 예약 버튼까지 안 간다"처럼 쓴다.
- 원문/브리프의 전문 용어는 생활어로 바꾼다. 퍼널=손님이 빠져나가는 지점, ROAS=광고비 쓴 만큼 돌아오는지, 최적화=보고 넘기지 않게 고치는 것.
- reader_problem은 보고서 문장이 아니라 현장에서 나오는 고민 문장으로 본문에 녹인다. 단, 과한 반말/유행어/비하 표현은 쓰지 않는다.
- 거버넌스에서 "사용하지 않는 표현" 으로 분류된 어휘는 절대 쓰지 않는다.
- 의료광고 영역이면 효과 보장 표현 금지, 진료 권유성 어휘 금지.
- 먼저 content_pillar 와 content_goal 을 정한 뒤 글을 쓴다.
- content_pillar 는 방향판이다. 하네스의 주제 예시를 그대로 복사하지 말고, 원문/최신 audit/리서치에서 새 주제를 가져와 가장 맞는 기둥에 배치한다.
- 주제는 플레이스에 앵커링하지 않는다. 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 스레드/숏폼, 블로그, 상세페이지, 요즘 되는 방식 관찰까지 열어둔다.
- CTA는 기본값이 아니다. 본문과 이어지지 않으면 ending_type='none' 으로 닫는다.
- 상담형 CTA는 diagnostic_comment 또는 soft_dm 목적일 때만 쓴다. "업종/지역 남겨주세요" 반복 문구는 피한다.
- 본문에 광고/기브니즈 자기소개는 안 한다. CTA가 필요할 때도 가볍게만 둔다.

${knowledgeBlock ? `[참조 지식·거버넌스]\n${knowledgeBlock}\n\n` : ''}출력 형식: JSON 만. 형식:
{
  "title": "내부 식별용 짧은 라벨 (40자 이내)",
  "content_pillar": "cost_before_spend | do_today | current_observation | trend_plain | content_showcase",
  "content_goal": "save | comment | share | viewpoint | dm",
  "ending_type": "none | save | question | soft_dm | diagnostic_comment",
  "why_this_ending": "본문 흐름과 마무리 방식이 맞는 이유",
  "format_type": "single_post | short_thread | resource_thread",
  "hook_pattern": "curiosity_gap | pain_confession | resource_promise | misconception_break | proof_story | question | anxiety_reframe",
  "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning",
  "engagement_drivers": ["save_value" | "share_value" | "identity" | "curiosity" | "free_resource" | "proof" | "anxiety_relief"],
  "posts": [
    { "index": 1, "body": "..." },
    { "index": 2, "body": "..." }
  ],
  "cta": "CTA가 있을 때만 작성. 없으면 빈 문자열",
  "hashtags": ["#사장님마케팅", "#플레이스"],
  "risk_flags": ["과장 위험" 등 주의점, 없으면 빈 배열]
}`;

  const user = `원문 제목: ${originalTitle}
원문 발췌:
${originalText.slice(0, 1500)}

[브리프]
페르소나: ${brief.suggested_persona || 'general'}
토픽: ${brief.suggested_topic_cluster || '(미지정)'}
추천 제목: ${brief.recommended_title || '(없음)'}
독자 문제: ${brief.reader_problem || '(없음)'}
왜 지금: ${brief.why_now || '(없음)'}
핵심 앵글: ${brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '') || '(없음)'}
실용 takeaway: ${brief.practical_takeaway || '(없음)'}
실행 단계: ${(Array.isArray(brief.execution_steps) ? brief.execution_steps.join(' / ') : '(없음)')}
적합도: ${typeof brief.fit_score === 'number' ? Math.round(brief.fit_score * 100) + '%' : '?'}

${rc?.pain_points?.length ? `[리서치에서 관찰된 현재 사장님 페인포인트]\n${rc.pain_points.join(' / ')}\n` : ''}${rc?.viral_hooks?.length ? `[자주 쓰이는 후킹]\n${rc.viral_hooks.map((h) => `${h?.pattern}${h?.example ? ' (예: ' + h.example + ')' : ''}`).join('\n')}\n` : ''}
${extraContext ? `${extraContext}\n` : ''}
원문 출처: ${item.post_url}

요청:
- 위 브리프와 리서치를 반영해 ${formatTypeHint === 'single_post' ? 'single_post 1개' : 'short_thread(2~4 포스트)'}로 스레드 초안을 만든다.
- 광고티 X, 실무 적용 가능한 인사이트 중심.
- 전문 용어가 나오면 돈/시간/화면/행동/감정이 보이는 말로 치환한다.
- 첫 2줄에는 타깃이 겪는 실제 상황이나 말투가 보여야 한다.
- content_pillar 를 먼저 고른다. 플레이스에만 고정하지 말고 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 요즘 되는 방식 관찰도 선택지로 둔다.
- 하네스의 주제 예시는 템플릿이 아니라 씨앗이다. 그대로 반복하지 말고 이번 입력에서 새 주제를 만든다.
- CTA는 content_goal 과 ending_type 에 맞을 때만 쓴다. 저장형/관찰형 글에는 상담 CTA를 붙이지 않는다.
- 출력은 JSON 만.`;

  const model = process.env.OPENAI_THREAD_MODEL || 'gpt-4o-mini';
  let parsed = null;
  let cost = null;
  try {
    const { content, raw } = await callOpenAI({
      stage: 'thread_draft',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.5 },
    });
    parsed = JSON.parse(content);
    if (raw?.usage) {
      const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 }, 'gpt-4o': { in: 2.5, out: 10 } };
      const p = PRICE[model];
      if (p) cost = ((raw.usage.prompt_tokens || 0) * p.in + (raw.usage.completion_tokens || 0) * p.out) / 1_000_000;
    }
  } catch (e) {
    throw new Error('LLM 생성 실패: ' + e.message);
  }

  // sanitize posts.
  const postsArr = Array.isArray(parsed.posts) ? parsed.posts : [];
  const posts = postsArr.slice(0, 8).map((p, i) => ({
    index: typeof p.index === 'number' ? p.index : i + 1,
    body: typeof p.body === 'string' ? p.body.slice(0, 600) : '',
    char_count: typeof p.body === 'string' ? p.body.length : 0,
  })).filter((p) => p.body);

  if (posts.length === 0) {
    throw new Error('LLM 응답에 유효한 포스트가 없습니다.');
  }

  const insertRow = {
    agent_item_id: item.id,
    theme_id: item.theme_id || null,
    channel: 'threads',
    format_type: VALID_FORMATS.has(parsed.format_type) ? parsed.format_type : (formatTypeHint || 'short_thread'),
    hook_pattern: typeof parsed.hook_pattern === 'string' ? parsed.hook_pattern : null,
    tone_pattern: typeof parsed.tone_pattern === 'string' ? parsed.tone_pattern : null,
    engagement_drivers: Array.isArray(parsed.engagement_drivers) ? parsed.engagement_drivers.filter((x) => typeof x === 'string') : [],
    title: typeof parsed.title === 'string' ? parsed.title.slice(0, 120) : null,
    posts,
    cta: typeof parsed.cta === 'string' ? parsed.cta : null,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((x) => typeof x === 'string').slice(0, 10) : [],
    risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags.filter((x) => typeof x === 'string') : [],
    status: 'draft',
    generator_model: model,
    generator_cost_usd: cost,
    generator_prompt_version: PROMPT_VERSION,
  };

  const { data: draft, error: insErr } = await supabaseAdmin
    .from('thread_drafts')
    .insert(insertRow)
    .select('id')
    .single();
  if (insErr) throw new Error('드래프트 저장 실패: ' + insErr.message);

  return { draftId: draft.id, postCount: posts.length, model };
}

const VALID_FORMATS = new Set(['single_post', 'short_thread', 'resource_thread', 'mega_thread']);
