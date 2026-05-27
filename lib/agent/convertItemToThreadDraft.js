// 검토함의 agent_items 1건을 Threads 드래프트(thread_drafts) 로 변환.
// brief + research_context + 채널/주제 거버넌스 KB를 모두 LLM 에 컨텍스트로 주고,
// 겹치지 않는 여러 방향을 만들고, 자동 채점하되 모든 후보를 저장한다.
// 최종 선택은 사용자가 텔레그램/어드민에서 하도록 variant_review 에 기록을 남긴다.
//
// 매거진 본문 생성기와 별개. 스레드는 짧고 채널 톤이 강해서 독립 로직.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';
import { buildKnowledgeContext } from '@/lib/knowledge/loader';
import { normalizePersona } from '@/lib/contentTaxonomy';

const PROMPT_VERSION = 'thread_v5_branching_user_choice_2026_05_24';

/**
 * @param {{ itemId: string, formatTypeHint?: string, extraContext?: string|null, variantCount?: number }} args
 * @returns {Promise<{ draftId: string, draftIds: string[], postCount: number, model: string }>}
 */
export async function convertItemToThreadDraft({ itemId, formatTypeHint, extraContext, variantCount = 7 }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');
  const targetVariantCount = normalizeVariantCount(variantCount);

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
  const originalText = translation.translated_text
    || item.normalized?.extracted_text
    || item.normalized?.text
    || item.normalized?.excerpt
    || summary.one_line_summary
    || '';

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
  const normalizedPersona = normalizePersona(theme?.target_persona || brief.suggested_persona || brief.target_persona || 'general');

  // 스레드 드래프트는 인기글 감사까지 포함해 후킹 패턴 학습을 강화 (enrich 보다 자료 다양).
  const knowledgeBlock = buildKnowledgeContext({
    topicCluster: theme?.target_topic_cluster || brief.suggested_topic_cluster,
    persona: normalizedPersona,
    channel: 'threads',
    includeAudit: true,
  });

  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 Threads 콘텐츠 작가다.
주 독자는 마케팅을 직접 판단해야 하는 작은 사업자/브랜드 운영자다. 원문/브리프가 특정 업종을 말할 때만 요식업 사장님·병의원 원장·자영업자로 좁힌다. 뉴스성/시사성 소재는 억지로 "자영업자 실무팁"으로 닫지 않아도 된다.

규칙:
- Threads는 한 포스트에 최대 1000자까지 쓸 수 있다. single_post 는 최소 500자 이상, 권장 500~900자로 쓴다.
- 연결글의 1번 포스트는 설명문이 아니라 문을 여는 hook 이다. 80~220자를 우선하고, 짧게 궁금증/FOMO/오해 깨기를 만든 뒤 정보 설명은 2번 포스트부터 푼다.
- 연결글의 2번 이후 포스트는 역할에 따라 300~850자를 권장한다. 첫 포스트가 짧아도 전체 정보 밀도는 낮아지면 안 된다.
- 첫 포스트 첫 줄은 30자 이내. 결론을 다 말하지 말고 "왜?", "나도 놓친 건가?", "그래서 뭘 봐야 하지?"가 남아야 한다.
- 전문 용어보다 현장어를 우선한다. 현장어는 돈/시간/화면/행동/감정 중 2개 이상이 보이는 문장이다.
- 예: "전환율이 낮다"보다 "광고비는 나가는데 전화가 안 온다", "퍼널이 끊긴다"보다 "플레이스는 보는데 예약 버튼까지 안 간다"처럼 쓴다.
- 원문/브리프의 전문 용어는 생활어로 바꾼다. 퍼널=손님이 빠져나가는 지점, ROAS=광고비 쓴 만큼 돌아오는지, 최적화=보고 넘기지 않게 고치는 것.
- reader_problem은 보고서 문장이 아니라 현장에서 나오는 고민 문장으로 본문에 녹인다. 단, 과한 반말/유행어/비하 표현은 쓰지 않는다.
- 소비자언어는 쉬운 설명문이 아니라 실제 사람이 검색창에 치거나 옆 사람에게 묻는 말이다. 첫 3줄 안에 가능한 한 "주차 돼?", "지금 열었어?", "예약 되나?", "애 데리고 가도 돼?"처럼 실제 말투/검색어/장면을 넣는다.
- 초반에 "방문 직전 고객", "검색 의도", "구매 퍼널", "전환", "예약으로 이어지는 고객", "~할 가능성이 큽니다", "~하는 단계입니다" 같은 분석어를 쓰면 실패다.
- 사람이 실제로 잘 쓰지 않는 작문체를 생활어처럼 꾸미지 않는다. "아직 구경 중일 때가 많습니다", "진짜 오늘 나갈 사람은" 같은 어색한 설명문보다 실제 질문/검색어를 먼저 보여준다.
- 거버넌스에서 "사용하지 않는 표현" 으로 분류된 어휘는 절대 쓰지 않는다.
- 의료광고 영역이면 효과 보장 표현 금지, 진료 권유성 어휘 금지.
- 먼저 content_pillar 후보 2~3개를 점수화한다. 하나로 성급하게 좁히지 말고, 이 소재가 계정에서 어떤 역할을 할 수 있는지 2~3개 가능성을 남긴다.
- content_pillar 는 방향판이다. 하네스의 주제 예시를 그대로 복사하지 말고, 원문/최신 audit/리서치에서 새 주제를 가져와 가장 맞는 기둥 후보에 배치한다.
- content_pillar 와 content_treatment 를 분리한다. 기둥은 글의 역할, treatment 는 푸는 문법이다.
- 주제는 플레이스에 앵커링하지 않는다. 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 스레드/숏폼, 블로그, 상세페이지, 요즘 되는 방식 관찰까지 열어둔다.
- 뉴스성 소재는 어느 기둥에서도 news_commentary 로 처리할 수 있다. 모든 소재를 체크리스트나 실행 가이드로 바꾸지 않는다.
- FOMO는 별도 기둥이 아니라 글 안에 녹이는 심리 장치다. "쓸 수 있나?"가 아니라 "어떤 강도와 위치로 녹일 것인가"를 판단한다. 겁은 줄 수 있지만 "망합니다", "끝입니다", "무조건 해야 합니다" 같은 과격한 공포 문장은 금지한다.
- fomo_reframe 은 표현 템플릿이 아니라 심리 구조다. quiet_gap, delayed_regret, rule_changed, insider_move, cost_leak, authority_signal, missed_timing, wrong_problem, comparison_gap 중 주제에 맞는 하나를 고른다.
- 좋은 FOMO는 "나만 놓치고 있을 수 있다", "잘하는 곳은 조용히 바꾸고 있다", "지금은 티 안 나지만 나중에 차이 난다", "왜 안 되는지 모른 채 돈/시간을 쓸 수 있다" 중 하나의 감정을 만든다. 단, 매번 같은 표현을 반복하지 않는다.
- news_commentary/opinion/case_note 에서는 "논란이 터졌습니다 → 여러분도 문구를 점검하세요" 같은 얕은 결론을 실패로 본다. 사건의 맥락, 사람들이 반응한 이유, 브랜드 운영자가 놓친 감각 중 최소 2개가 보여야 한다.
- "자영업자 여러분", "사장님들도" 같은 직접 호명은 원문이 그 대상을 명확히 가리킬 때만 쓴다. 아니면 "운영하는 사람", "브랜드를 보는 사람", "콘텐츠를 올리는 사람"처럼 넓게 쓴다.
- 뉴스/사례 글은 원문에서 확인되는 고유 맥락을 반드시 붙잡는다. 브랜드명, 캠페인명, 날짜, 문제 문구, 소비자 반응 중 확인된 신호 1~2개가 본문에 없으면 substance 2점 이하.
- 추상어 반복 금지: "고객은 이제", "존중받는 느낌", "브랜드가 놓치는 감정", "메시지를 조정해야 할 때" 같은 문장을 근거 없이 반복하면 generic_filler 로 보고 overall 3점 이하.
- 좋은 뉴스 코멘터리는 교훈을 먼저 말하지 않는다. "무슨 표현이 어떤 기억/감정을 건드렸고, 왜 의도보다 해석이 커졌는가"를 먼저 보여준 뒤 관점으로 닫는다.
- 한 번에 서로 겹치지 않는 ${targetVariantCount}개 후보를 만든 뒤 채점한다. 최종 선택은 사용자가 한다. 너는 recommended_variant_id 만 제안하고, ${targetVariantCount}개 후보를 모두 보존한다.
- ${targetVariantCount}개 후보는 위에서 고른 2~3개 pillar 후보 안에서 나뉘어야 한다. 후보끼리는 content_pillar, content_treatment, hook, 문장 리듬, 결론 방식이 서로 달라야 한다. 같은 말을 형식만 바꿔 반복하면 실패다.
- 후보끼리 첫 문장, 핵심 비유, CTA, 번호 구조를 재사용하지 않는다.
- 후보끼리 제목·첫 문장·결론이 비슷하면 non_overlap 2점 이하, overall 3점 이하로 낮춘다. 같은 결론을 반복한 후보를 recommended_variant_id 로 제안하면 안 된다.
- 밀도 있는 글을 위해 source_signal, old_friction, new_change, giveneeds_angle, misconception_to_break, practical_examples 를 먼저 정리한 뒤 본문을 쓴다.
- Threads 발행 레퍼런스가 있으면 "이런 식으로 구성되는구나"를 먼저 읽고 주제 선정과 구조 판단에 반영한다. 별도 DB에 저장된 분석값을 찾지 말고, 레퍼런스 원문/관찰 기록에서 첫 글 hook, 후속 포스트 역할, 저장/공유 장치를 감각적으로 빌린다.
- 단, 이미지 카드형 레퍼런스의 짧은 캡션은 텍스트 원고의 낮은 기준으로 삼지 않는다. 카드 OCR이 없는 표본은 "이미지 안 정보가 있을 수 있음"으로 보고, 우리 원고는 텍스트만으로도 이해될 만큼 맥락을 보강한다.
- 벤치마크가 "정보형 1/n 연속글 수집 미확정"이라고 표시하면 연속 포스트를 무조건 만들지 않는다. 주제가 정보형이면 납득에 필요한 기준/예시/맥락이 충분한지로 포스트 수를 정한다.
- practical_examples 는 "무엇을/어느 화면이나 도구에서/왜 하는지"가 보여야 한다. 근거 없는 "AI로 분석하세요", "콘텐츠를 만드세요" 류는 예시로 인정하지 않는다.
- practical_examples 는 practical_tip/checklist/resource_thread 에서 중요하다. news_commentary/opinion 에서는 0~1개여도 괜찮고, 대신 source_signal 과 giveneeds_angle 이 선명해야 한다.
- 원문·리서치에 없는 도구 기능, 효과, 성과를 만들지 않는다. 확인되지 않은 예시는 missing_info 에 넣고 본문에서는 낮춰 쓴다.
- 리소스가 부족하면 억지로 아는 척하지 말고 research_sufficiency='thin' 또는 'missing' 으로 두고 risk_flags 에 "리서치 부족"을 남긴다.
- format_type 은 자동으로 고른다. single_post 는 관찰/공감/짧은 오해 깨기, short_thread 는 실제 단계가 나뉠 때, resource_thread 는 도구·템플릿·예시 모음일 때만 쓴다.
- 포스트 수는 주제의 밀도로 결정한다. single_post 는 한 포스트 안에서 최소 500자 이상으로 장면, 맥락, 관점, 마무리가 모두 서야 한다. short_thread 는 각 포스트 역할이 분리될 때만 쓴다. resource_thread 는 실제 예시/도구/문장/검색어가 5개 이상일 때만 쓴다.
- 절대 길이 기준: short_thread/resource_thread/mega_thread 중 explainer, practical_tip, checklist, case_note, news_commentary 는 전체 본문 합계 800자 이상을 기본으로 한다. 1번 hook 포스트를 제외한 각 후속 포스트는 ending 전까지 250자 이상을 우선한다. 60~100자짜리 요약 포스트 여러 개는 실패다.
- 리서치가 얇아도 60~100자 포스트로 때우지 않는다. 모르는 부분은 낮춰 쓰되, 확인된 맥락·예시·기준·반론을 충분히 풀어 single_post 500자 또는 연결글 총 800자 기준을 맞춘다.
- 새 개념/뉴스/기술 정보글은 5~7개 포스트까지 허용한다. "이게 뭐냐 → 왜 나왔냐 → 실제 사례 → 어디에 쓰냐 → 무엇을 봐야 하냐"가 필요하면 짧게 압축하지 않는다.
- 정보글은 문답지처럼 쓰지 않는다. 독자가 속으로 물을 법한 질문 흐름을 자연스러운 설명문/대화형 문장으로 녹인다.
- 제목/원문에 에이전틱 AI, 제로클릭 커머스, 자율 마케팅처럼 독자가 모를 개념이 있으면 반드시 초반에 쉬운 말로 풀어준다. 단, "Q. / A." 형식은 쓰지 않는다.
- 짧게 쓰는 기준은 "한 관점으로 충분해서"다. 길게 쓰는 기준은 "납득에 필요한 장면과 기준이 여럿이라"다. 같은 결론을 늘리기 위해 나누면 실패다.
- 각 포스트에는 role 이 있어야 한다. hook/problem, context, mistake, criterion, example, action, ending 중 하나로 설명할 수 없으면 그 포스트는 만들지 않는다.
- 1,2,3 식 번호 매기기는 기본값이 아니다. 단계·체크리스트·리소스 목록이 명확할 때만 쓴다.
- 리서치가 얇거나 한 문장 관점이 강한 소재는 어느 기둥이든 single_post 를 우선하고, 짧은 문장과 줄바꿈으로 끝낼 수 있다.
- CTA는 기본값이 아니다. 본문과 이어지지 않으면 ending_type='none' 으로 닫는다.
- 상담형 CTA는 diagnostic_comment 또는 soft_dm 목적일 때만 쓴다. "업종/지역 남겨주세요" 반복 문구는 피한다.
- 본문에 광고/기브니즈 자기소개는 안 한다. CTA가 필요할 때도 가볍게만 둔다.

${knowledgeBlock ? `[참조 지식·거버넌스]\n${knowledgeBlock}\n\n` : ''}출력 형식: JSON 만. 형식:
{
  "density_check": {
    "source_signal": "수집/원문에서 발견한 핵심 신호",
    "old_friction": "이전에는 무엇이 귀찮거나 어려웠는가",
    "new_change": "이번에 무엇이 달라졌는가",
    "giveneeds_angle": "기브니즈 관점으로 번역한 한 줄",
    "misconception_to_break": "깨고 싶은 흔한 오해",
    "practical_examples": [
      { "action": "오늘 해볼 수 있는 구체 행동", "evidence": "어떤 원문/리서치 신호에서 나온 예시인지", "confidence": "high | medium | low" }
    ],
    "research_sufficiency": "enough | thin | missing",
    "missing_info": ["부족한 정보"]
  },
  "pillar_candidates": [
    {
      "content_pillar": "cost_before_spend | do_today | current_observation | trend_plain | content_showcase",
      "fit_score": 1,
      "why_this_pillar": "이 소재가 이 기둥에서 작동하는 이유",
      "risk_if_forced": "억지로 쓰면 생기는 문제"
    }
  ],
  "variants": [
    {
      "variant_id": 1,
      "title": "내부 식별용 짧은 라벨 (40자 이내)",
      "angle": "이 후보만의 다른 해석 방향",
      "differentiation_note": "다른 후보와 겹치지 않는 지점",
      "content_pillar": "cost_before_spend | do_today | current_observation | trend_plain | content_showcase",
      "pillar_candidate_rank": 1,
      "content_treatment": "news_commentary | practical_tip | checklist | explainer | case_note | opinion | fomo_reframe",
      "fomo_mechanism": "quiet_gap | delayed_regret | rule_changed | insider_move | cost_leak | authority_signal | missed_timing | wrong_problem | comparison_gap | none",
      "fomo_intensity": "none | subtle | clear",
      "fomo_expression": "none | hook_only | body_context | ending_reframe",
      "content_goal": "save | comment | share | viewpoint | dm",
      "ending_type": "none | save | question | soft_dm | diagnostic_comment",
      "why_this_ending": "본문 흐름과 마무리 방식이 맞는 이유",
      "format_decision": {
        "post_count_reason": "왜 이 포스트 수가 맞는지",
        "split_roles": ["각 포스트 역할"],
        "why_not_shorter": "더 짧게 쓰지 않는 이유",
        "why_not_longer": "더 길게 쓰지 않는 이유"
      },
      "format_type": "single_post | short_thread | resource_thread",
      "recommended_length": 1,
      "explanation_style": "scene | conversational_explainer | checklist | case_breakdown | resource_list | opinion_note | comparison",
      "hook_pattern": "curiosity_gap | pain_confession | resource_promise | misconception_break | proof_story | question | anxiety_reframe",
      "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning",
      "engagement_drivers": ["save_value" | "share_value" | "identity" | "curiosity" | "free_resource" | "proof" | "anxiety_relief"],
      "posts": [
        { "index": 1, "body": "..." }
      ],
      "cta": "CTA가 있을 때만 작성. 없으면 빈 문자열",
      "hashtags": ["#브랜드마케팅"],
      "risk_flags": ["과장 위험" 등 주의점, 없으면 빈 배열],
      "scores": {
        "topic_fit": 1,
        "audience_empathy": 1,
        "naturalness": 1,
        "non_overlap": 1,
        "format_fit": 1,
        "usefulness_or_viewpoint": 1,
        "brand_safety": 1,
        "substance": 1,
        "specificity": 1,
        "anti_generic": 1,
        "voc_fit": 1,
        "fomo_fit": 1,
        "overall": 1
      },
      "score_reason": "왜 이 점수인지 한 문장"
    }
  ],
  "recommended_variant_id": 1,
  "recommendation_reason": "${targetVariantCount}개 중 먼저 검토하면 좋은 후보를 제안한 이유. 최종 선택은 사용자가 한다.",
  "variant_notes": [
    { "variant_id": 2, "note": "낮은 점수/높은 점수와 관계없이 보존할 비교 메모" }
  ]
}`;

  const user = `원문 제목: ${originalTitle}
원문 발췌:
${originalText.slice(0, 1500)}

[브리프]
페르소나: ${normalizedPersona}
토픽: ${brief.suggested_topic_cluster || '(미지정)'}
추천 제목: ${brief.recommended_title || '(없음)'}
독자 문제: ${brief.reader_problem || '(없음)'}
왜 지금: ${brief.why_now || '(없음)'}
핵심 앵글: ${brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '') || '(없음)'}
실용 takeaway: ${brief.practical_takeaway || '(없음)'}
실행 단계: ${(Array.isArray(brief.execution_steps) ? brief.execution_steps.join(' / ') : '(없음)')}
적합도: ${typeof brief.fit_score === 'number' ? Math.round(brief.fit_score * 100) + '%' : '?'}

${rc?.pain_points?.length ? `[리서치에서 관찰된 운영자 페인포인트]\n${rc.pain_points.join(' / ')}\n` : ''}${rc?.viral_hooks?.length ? `[자주 쓰이는 후킹]\n${rc.viral_hooks.map((h) => `${h?.pattern}${h?.example ? ' (예: ' + h.example + ')' : ''}`).join('\n')}\n` : ''}
${extraContext ? `${extraContext}\n` : ''}
원문 출처: ${item.post_url}

요청:
- 위 브리프와 리서치를 반영해 format_type 을 직접 고른다. ${formatTypeHint ? `힌트는 ${formatTypeHint} 이지만, 소재에 맞지 않으면 바꿔도 된다.` : '힌트가 없으면 single_post/short_thread/resource_thread 중 가장 자연스러운 형식을 고른다.'}
- 글이 짧거나 길어지는 이유를 format_decision 에 명시한다. 포스트를 나누는 이유가 없으면 single_post 로 낮춘다.
- 정보글은 짧게 압축하지 않는다. 독자가 용어를 모를 가능성이 크면 explanation_style='conversational_explainer' 로 두고 5~7개 포스트까지 쓴다. 단, "Q. / A." 형식은 쓰지 않는다.
- 한 포스트는 최대 1000자다. single_post 는 반드시 500자 이상으로 쓴다. 연결글의 1번 포스트는 80~220자의 hook 을 우선하고, 2번 이후 포스트에서 정보 밀도를 채운다.
- short_thread 는 각 포스트 역할이 서로 달라야 한다. 같은 주장을 반복하면 format_fit 2점 이하.
- 먼저 content_pillar 후보 2~3개를 점수화해 pillar_candidates 에 담는다. 그 다음 그 기둥 후보들 안에서 서로 겹치지 않는 ${targetVariantCount}개 글 후보를 만든다.
- ${targetVariantCount}개 후보는 모두 사용자가 볼 수 있는 최종 후보로 작성한다. 내부에서 삭제하거나 1개로 압축하지 않는다.
- ${targetVariantCount}개 후보는 관점, pillar, treatment, FOMO 녹이는 방식, 설명 방식, 길이, hook, 결론 방식이 달라야 한다.
- 각 후보를 1~5점으로 채점한다. overall 은 평균이 아니라 "실제로 발행해도 어색하지 않은가"를 최우선으로 판단한다.
- 최종 선택은 사용자가 한다. 너는 recommended_variant_id 로 먼저 보면 좋은 후보만 제안하고, 나머지 후보도 모두 보존한다.
- 광고티 X, 실무 적용 가능한 인사이트 중심.
- 전문 용어가 나오면 돈/시간/화면/행동/감정이 보이는 말로 치환한다.
- 첫 2줄에는 타깃이 겪는 실제 상황이나 말투가 보여야 한다. 연결글이면 첫 포스트에서 결론을 다 말하지 않는다.
- 첫 3줄은 실제 사람이 쓰는 말/검색어/장면/호기심으로 시작한다. "키워드", "퍼널", "전환", "고객 의도" 같은 분석어로 시작하지 않는다.
- 소비자언어를 직접 써야 한다. 쉬운 설명문으로 바꾼 정도면 voc_fit 을 2점 이하로 둔다.
- content_pillar 를 먼저 고른다. 플레이스에만 고정하지 말고 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 요즘 되는 방식 관찰도 선택지로 둔다.
- content_treatment 도 함께 고른다. 뉴스성/시사성 소재는 어느 기둥이든 news_commentary 로 풀 수 있다.
- 모든 후보에서 FOMO를 어떻게 녹일지 판단한다. fomo_intensity 를 none/subtle/clear 중 고르고, fomo_expression 을 none/hook_only/body_context/ending_reframe 중 고른다. 단, FOMO 문장을 템플릿처럼 반복하지 말고 fomo_mechanism 을 다르게 설계한다.
- fomo_reframe 을 선택한 후보는 무엇이 두려운지 구체적으로 보여줘야 한다. 후회, 격차, 비용 누수, 룰 변경, 내부자 움직임, 권위 신호 중 하나가 분명하지 않으면 fomo_fit 2점 이하.
- 뉴스성/시사성 소재는 "무슨 일이 있었나 → 왜 사람들이 반응했나 → 지금 장사/마케팅이 얼마나 민감한 시대인가" 정도로 끝내도 된다.
- 뉴스성/시사성 소재는 반드시 "이 사건이 어떤 감정/기억/맥락을 건드렸는가"를 말한다. 단순히 "논란이 났으니 조심하자"로 끝내면 substance 점수를 1점으로 둔다.
- 독자를 자영업자로 단정하지 않는다. 브리프가 넓은 소재면 "브랜드를 운영하는 사람", "마케팅을 만드는 사람", "콘텐츠를 올리는 사람" 기준으로 쓴다.
- 이번 입력의 브랜드/사건/표현을 지워도 성립하는 일반론이면 실패다. 본문만 읽어도 왜 이 소재에서 나온 글인지 보여야 한다.
- 후보 중 최소 ${Math.max(2, Math.min(5, targetVariantCount - 1))}개는 서로 다른 결론을 가져야 한다. 예: 감정 관찰, 맥락 리스크, 내부 검수 관점, 밈/말장난 한계, 사과 전 대응, 소비자 기억, 브랜드 신뢰처럼 아예 다른 처리 방식.
- 점수는 관대하게 주지 않는다. 일반론·중복·근거 부족이 있으면 overall 3 이하. 5점은 바로 발행해도 어색하지 않고, 구체 맥락과 새 관점이 모두 있을 때만 준다.
- 하네스의 주제 예시는 템플릿이 아니라 씨앗이다. 그대로 반복하지 말고 이번 입력에서 새 주제를 만든다.
- 본문 작성 전에 density_check 를 채운다. practical_tip/checklist/resource_thread 는 practical_examples 가 중요하지만, news_commentary/opinion 은 source_signal/giveneeds_angle 이 선명하면 짧게 써도 된다.
- practical_examples 는 action/evidence/confidence 를 가진 객체 배열로 작성한다. evidence 가 비어 있으면 그 예시는 부족한 예시다.
- research_sufficiency 가 thin/missing 이면 단정적인 글 대신 관찰형/질문형으로 낮추고 risk_flags 에 "리서치 부족"을 포함한다.
- 1,2,3 식 포스트 분리는 실행 단계나 목록 가치가 있을 때만 쓴다. 다만 Threads에서 잘 먹히는 1/n 구조를 쓸 때는 1번은 hook, 2번 이후는 정보 단위로 역할이 갈라져야 한다. single_post 로 끝낼 때도 500자 이상으로 장면, 맥락, 관점, 마무리를 충분히 담는다.
- CTA는 content_goal 과 ending_type 에 맞을 때만 쓴다. 저장형/코멘터리형 글에는 상담 CTA를 붙이지 않는다.
- 후보가 서로 비슷해지면 실패다. 같은 결론을 다른 말로 반복하지 말고, 아예 다른 콘텐츠 처리 방식을 섞는다.
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

  const qualityReview = await reviewAndMaybeRepairVariants({
    parsed,
    originalTitle,
    originalText,
    brief,
    extraContext,
    itemId,
    model,
    variantCount: targetVariantCount,
  });
  if (qualityReview.repairedParsed) {
    parsed = qualityReview.repairedParsed;
  }

  const variantReview = normalizeVariantReview(parsed, targetVariantCount);
  variantReview.metadata.quality_review = qualityReview.metadata;
  const variantsToSave = variantReview.variants.length > 0
    ? variantReview.variants
    : [normalizeVariant(parsed, 0)].filter(Boolean);
  const recommendedVariant = variantReview.recommendedVariant || variantsToSave[0] || parsed;

  if (variantsToSave.length === 0) {
    throw new Error('LLM 응답에 유효한 포스트가 없습니다.');
  }

  const densityCheck = normalizeDensityCheck(parsed.density_check);
  const insertRows = variantsToSave.map((variant) => {
    const posts = sanitizePosts(variant.posts);
    const generationDecision = buildGenerationDecision(variant, densityCheck);
    const riskFlags = buildRiskFlags(variant, generationDecision, posts);
    const resolvedFormat = VALID_FORMATS.has(variant.format_type)
      ? variant.format_type
      : chooseFallbackFormat({ formatTypeHint, generationDecision });

    return {
      agent_item_id: item.id,
      theme_id: item.theme_id || null,
      channel: 'threads',
      format_type: resolvedFormat,
      hook_pattern: typeof variant.hook_pattern === 'string' ? variant.hook_pattern : null,
      tone_pattern: typeof variant.tone_pattern === 'string' ? variant.tone_pattern : null,
      engagement_drivers: Array.isArray(variant.engagement_drivers) ? variant.engagement_drivers.filter((x) => typeof x === 'string') : [],
      title: buildVariantTitle(variant),
      posts,
      cta: typeof variant.cta === 'string' ? variant.cta : null,
      hashtags: Array.isArray(variant.hashtags) ? variant.hashtags.filter((x) => typeof x === 'string').slice(0, 10) : [],
      risk_flags: riskFlags,
      research_context_used: {
        generation_density_check: densityCheck,
        generation_decision: generationDecision,
        variant_review: {
          ...variantReview.metadata,
          saved_variant_id: variant.variant_id,
          human_selection_status: 'pending',
        },
      },
      status: 'draft',
      generator_model: model,
      generator_cost_usd: cost,
      generator_prompt_version: PROMPT_VERSION,
    };
  });

  const { data: drafts, error: insErr } = await supabaseAdmin
    .from('thread_drafts')
    .insert(insertRows)
    .select('id, title');
  if (insErr) throw new Error('드래프트 저장 실패: ' + insErr.message);

  const savedDrafts = (drafts || []).map((draft, idx) => ({
    draftId: draft.id,
    title: draft.title,
    variant_id: variantsToSave[idx]?.variant_id || idx + 1,
    recommended: variantsToSave[idx]?.variant_id === variantReview.metadata.recommended_variant_id,
    score: variantsToSave[idx]?.scores?.overall || null,
    content_pillar: variantsToSave[idx]?.content_pillar || null,
    content_treatment: variantsToSave[idx]?.content_treatment || null,
    explanation_style: variantsToSave[idx]?.explanation_style || null,
    format_type: variantsToSave[idx]?.format_type || null,
  }));
  const recommendedDraft = savedDrafts.find((d) => d.recommended) || savedDrafts[0];
  const recommendedDecision = buildGenerationDecision(recommendedVariant, densityCheck);
  const recommendedRiskFlags = buildRiskFlags(recommendedVariant, recommendedDecision, sanitizePosts(recommendedVariant.posts));

  return {
    draftId: recommendedDraft?.draftId,
    draftIds: savedDrafts.map((d) => d.draftId),
    savedDrafts,
    postCount: sanitizePosts(recommendedVariant.posts).length,
    model,
    densityCheck,
    generationDecision: recommendedDecision,
    variantReview: variantReview.metadata,
    riskFlags: recommendedRiskFlags,
  };
}

const VALID_FORMATS = new Set(['single_post', 'short_thread', 'resource_thread', 'mega_thread']);

async function reviewAndMaybeRepairVariants({ parsed, originalTitle, originalText, brief, extraContext, itemId, model, variantCount = 7 }) {
  if (!Array.isArray(parsed?.variants) || parsed.variants.length === 0) {
    return { metadata: { skipped: true, reason: 'variants 없음' }, repairedParsed: null };
  }
  const targetVariantCount = normalizeVariantCount(variantCount);

  const compactVariants = parsed.variants.slice(0, targetVariantCount).map((v) => ({
    variant_id: v.variant_id,
    title: v.title,
    content_pillar: v.content_pillar,
    content_treatment: v.content_treatment,
    fomo_mechanism: v.fomo_mechanism,
    fomo_intensity: v.fomo_intensity,
    fomo_expression: v.fomo_expression,
    explanation_style: v.explanation_style,
    format_type: v.format_type,
    recommended_length: v.recommended_length,
    posts: Array.isArray(v.posts) ? v.posts.map((p) => ({
      index: p.index,
      body: typeof p.body === 'string' ? p.body.slice(0, 700) : '',
      char_count: typeof p.body === 'string' ? p.body.length : 0,
    })) : [],
    total_chars: Array.isArray(v.posts) ? v.posts.reduce((sum, p) => sum + (typeof p.body === 'string' ? p.body.length : 0), 0) : 0,
    scores: v.scores,
    score_reason: v.score_reason,
  }));

  const sys = `너는 기브니즈 Threads 후보를 검수하는 품질 에이전트다.
생성기가 만든 ${targetVariantCount}개 후보를 보고 아래를 검사한다.

검수 기준:
- ${targetVariantCount}개 후보가 실제로 서로 다른가.
- 기둥 후보 2~3개 안에서 겹치지 않게 배치됐는가.
- FOMO가 yes/no가 아니라 강도/장치/위치로 자연스럽게 녹았는가.
- Q. / A. 같은 문답지 형식이 나오지 않았는가.
- single_post 가 500자 미만이면 실패다.
- explainer/practical_tip/checklist/case_note/news_commentary 계열 short_thread 가 전체 800자 미만이면 실패다. 60~100자 포스트를 여러 개 붙인 후보는 정보 밀도 부족으로 반드시 수정한다.
- 이미지 카드형 레퍼런스처럼 짧은 캡션만 흉내 낸 후보는 실패다. 카드 이미지 없이 텍스트만으로 읽히는 원고라면 맥락/예시/기준이 본문 안에 있어야 한다.
- 정보형/해설형인데 첫 포스트만 강하고 후속 설명의 정보 단위가 부족하면 quality_gate_failed 로 보고 수정한다.
- 각 후보가 원문/리서치에서 온 구체 맥락을 갖고 있는가.
- AI스러운 일반론, 얕은 결론, 자영업자 단정, 억지 CTA가 있으면 수정한다.

수정이 필요하면 revised_variants 에 ${targetVariantCount}개 후보 전체를 다시 반환한다. 괜찮으면 revised_variants 는 빈 배열.
출력은 JSON만.`;

  const user = `원문 제목: ${originalTitle}
원문 요약/발췌:
${originalText.slice(0, 1200)}

브리프:
${JSON.stringify({
  persona: normalizePersona(brief.suggested_persona || brief.target_persona || 'general'),
  reader_problem: brief.reader_problem,
  why_now: brief.why_now,
  content_angle: brief.content_angle || brief.content_angles?.[0],
}, null, 2)}

추가 리서치 컨텍스트:
${extraContext || '(없음)'}

후보:
${JSON.stringify(compactVariants, null, 2)}

JSON:
{
  "overall_pass": true,
  "needs_revision": false,
  "global_feedback": "...",
  "variant_feedback": [{"variant_id":1,"issues":["..."],"fix_direction":"..."}],
  "revised_variants": []
}`;

  try {
    const { content } = await callOpenAI({
      stage: 'thread_variant_quality_review',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.2 },
    });
    const review = JSON.parse(content);
    const revisedVariants = Array.isArray(review.revised_variants)
      ? review.revised_variants.map(normalizeVariant).filter(Boolean).slice(0, targetVariantCount)
      : [];

    let repairedParsed = review.needs_revision && revisedVariants.length === targetVariantCount
      ? { ...parsed, variants: revisedVariants }
      : null;
    let hardQualityRepair = null;
    if (!repairedParsed && process.env.DISABLE_THREAD_HARD_REPAIR !== '1') {
      const hardIssues = collectHardQualityIssues(parsed.variants);
      if (hardIssues.length > 0) {
        hardQualityRepair = await repairHardQualityFailures({
          parsed,
          originalTitle,
          originalText,
          brief,
          extraContext,
          itemId,
          model,
          targetVariantCount,
          hardIssues,
        });
        if (
          hardQualityRepair.repairedVariants.length === targetVariantCount
          && (
            !hardQualityRepair.remaining_issues
            || hardQualityRepair.remaining_issues.length === 0
            || repairedVariantsImproveLength(parsed.variants, hardQualityRepair.repairedVariants)
          )
        ) {
          repairedParsed = { ...parsed, variants: hardQualityRepair.repairedVariants };
        }
      }
    }

    return {
      repairedParsed,
      metadata: {
        checked: true,
        overall_pass: Boolean(review.overall_pass),
        needs_revision: Boolean(review.needs_revision),
        repaired: Boolean(repairedParsed),
        hard_quality_repair: hardQualityRepair,
        global_feedback: typeof review.global_feedback === 'string' ? review.global_feedback : '',
        variant_feedback: Array.isArray(review.variant_feedback) ? review.variant_feedback.slice(0, targetVariantCount) : [],
      },
    };
  } catch (e) {
    return {
      repairedParsed: null,
      metadata: {
        checked: false,
        error: e.message,
      },
    };
  }
}

function repairedVariantsImproveLength(originalVariants, repairedVariants) {
  const originals = Array.isArray(originalVariants) ? originalVariants : [];
  const repaired = Array.isArray(repairedVariants) ? repairedVariants : [];
  if (originals.length === 0 || repaired.length !== originals.length) return false;
  return repaired.every((variant, idx) => {
    const before = variantTotalChars(originals[idx]);
    const after = variantTotalChars(variant);
    return after >= 400 && after >= before * 1.8;
  });
}

function variantTotalChars(variant) {
  const posts = Array.isArray(variant?.posts) ? variant.posts : [];
  return posts.reduce((sum, post) => sum + (typeof post?.body === 'string' ? post.body.length : 0), 0);
}

async function repairHardQualityFailures({ parsed, originalTitle, originalText, brief, extraContext, itemId, model, targetVariantCount, hardIssues }) {
  const compactVariants = (Array.isArray(parsed?.variants) ? parsed.variants : []).slice(0, targetVariantCount).map((v) => ({
    variant_id: v.variant_id,
    title: v.title,
    angle: v.angle,
    content_pillar: v.content_pillar,
    content_treatment: v.content_treatment,
    fomo_mechanism: v.fomo_mechanism,
    fomo_intensity: v.fomo_intensity,
    fomo_expression: v.fomo_expression,
    explanation_style: v.explanation_style,
    format_type: v.format_type,
    recommended_length: v.recommended_length,
    posts: Array.isArray(v.posts) ? v.posts.map((p, idx) => ({
      index: p.index || idx + 1,
      body: typeof p.body === 'string' ? p.body : '',
      char_count: typeof p.body === 'string' ? p.body.length : 0,
    })) : [],
    scores: v.scores,
    score_reason: v.score_reason,
  }));

  const sys = `너는 기브니즈 Threads 원고를 다시 쓰는 repair 에이전트다.
아래 후보들은 구조는 맞지만 본문 길이와 정보 밀도가 부족하다. 반드시 후보 개수와 variant_id 를 유지하되 posts.body 를 다시 작성한다.

절대 조건:
- revised_variants 를 정확히 ${targetVariantCount}개 반환한다.
- single_post 는 실제 한국어 본문 기준 850~1000자로 쓴다.
- explainer/practical_tip/checklist/case_note/news_commentary 계열 short_thread/resource_thread 는 실제 한국어 본문 합계 1100자 이상으로 쓴다.
- 연결글의 1번 hook 포스트는 80~220자로 짧고 강하게 써도 된다. 2번 이후 마지막 ending 포스트를 제외한 각 포스트는 실제 한국어 본문 기준 320자 이상으로 쓴다.
- 60~100자짜리 요약 포스트 여러 개는 실패다.
- "예를 들어 A 브랜드" 같은 가짜 예시는 쓰지 않는다. 입력에 있는 CMTS, 에피어, reference benchmark, AI 에이전트, 정보형 스레드 구조 같은 확인된 재료 안에서만 쓴다.
- Q. / A. 형식은 쓰지 않는다.
- AI식 일반론, 얕은 결론, 억지 CTA 금지.
- JSON만 반환한다.`;

  const user = `원문 제목: ${originalTitle}
원문/입력 발췌:
${originalText.slice(0, 1600)}

브리프:
${JSON.stringify({
  persona: normalizePersona(brief.suggested_persona || brief.target_persona || 'general'),
  topic_cluster: brief.suggested_topic_cluster,
  reader_problem: brief.reader_problem,
  why_now: brief.why_now,
  content_angle: brief.content_angle || brief.content_angles?.[0],
  practical_takeaway: brief.practical_takeaway,
}, null, 2)}

추가 리서치/benchmark 컨텍스트:
${extraContext || '(없음)'}

하드 품질 실패:
${JSON.stringify(hardIssues, null, 2)}

수정 대상 후보:
${JSON.stringify(compactVariants, null, 2)}

출력 JSON:
{
  "revised_variants": [
    {
      "variant_id": 1,
      "title": "...",
      "angle": "...",
      "content_pillar": "...",
      "content_treatment": "...",
      "fomo_mechanism": "...",
      "fomo_intensity": "...",
      "fomo_expression": "...",
      "explanation_style": "...",
      "format_type": "single_post | short_thread | resource_thread | mega_thread",
      "recommended_length": 4,
      "posts": [{"index":1,"body":"..."}],
      "scores": {"overall":4,"topic_fit":4,"audience_empathy":4,"naturalness":4,"non_overlap":4,"format_fit":4,"usefulness_or_viewpoint":4,"brand_safety":5,"substance":4,"specificity":4,"anti_generic":4,"voc_fit":4,"fomo_fit":4},
      "score_reason": "수정 후 왜 통과 가능한지"
    }
  ]
}`;

  try {
    const repairModel = process.env.OPENAI_THREAD_REPAIR_MODEL || 'gpt-4o';
    const { content } = await callOpenAI({
      stage: 'thread_variant_hard_quality_repair',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model: repairModel,
      params: { response_format: { type: 'json_object' }, temperature: 0.35, max_tokens: 8000 },
    });
    const parsedRepair = JSON.parse(content);
    const repairedVariants = Array.isArray(parsedRepair.revised_variants)
      ? parsedRepair.revised_variants.map(normalizeVariant).filter(Boolean).slice(0, targetVariantCount)
      : [];
    return {
      attempted: true,
      repairedVariants,
      remaining_issues: collectHardQualityIssues(repairedVariants),
    };
  } catch (e) {
    return {
      attempted: true,
      error: e.message,
      repairedVariants: [],
      remaining_issues: hardIssues,
    };
  }
}

function sanitizePosts(postsArr) {
  return (Array.isArray(postsArr) ? postsArr : []).slice(0, 8).map((p, i) => ({
    index: typeof p.index === 'number' ? p.index : i + 1,
    body: typeof p.body === 'string' ? p.body.slice(0, 1000) : '',
    char_count: typeof p.body === 'string' ? p.body.length : 0,
  })).filter((p) => p.body);
}

function buildVariantTitle(variant) {
  const label = `후보 ${variant.variant_id}`;
  const title = typeof variant.title === 'string' && variant.title.trim()
    ? variant.title.trim()
    : label;
  return title.startsWith(label) ? title.slice(0, 120) : `${label} · ${title}`.slice(0, 120);
}

function buildRiskFlags(variant, generationDecision, posts) {
  const riskFlags = Array.isArray(variant.risk_flags) ? variant.risk_flags.filter((x) => typeof x === 'string') : [];
  if (generationDecision.research_sufficiency !== 'enough' && !riskFlags.includes('리서치 부족')) {
    riskFlags.push('리서치 부족');
  }
  if (variant.format_type === 'single_post' && posts[0]?.body?.length < 500 && !riskFlags.includes('single_post 500자 미만')) {
    riskFlags.push('single_post 500자 미만');
  }
  const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
  if (totalChars < minimumTotalCharsForVariant(variant) && !riskFlags.includes('총 본문 정보량 부족')) {
    riskFlags.push('총 본문 정보량 부족');
  }
  if (posts.length > 1 && posts.some((p, idx) => isThinContinuationPost({ post: p, postIdx: idx, posts, variant })) && !riskFlags.includes('후속 포스트 정보 밀도 부족')) {
    riskFlags.push('후속 포스트 정보 밀도 부족');
  }
  if (looksGenericAiFiller(posts) && !riskFlags.includes('AI식 일반론')) {
    riskFlags.push('AI식 일반론');
  }
  return riskFlags;
}

function normalizeDensityCheck(input) {
  const obj = input && typeof input === 'object' ? input : {};
  const examples = Array.isArray(obj.practical_examples)
    ? obj.practical_examples.map((ex) => {
        if (typeof ex === 'string') {
          return { action: ex, evidence: '', confidence: 'low' };
        }
        if (!ex || typeof ex !== 'object') {
          return { action: '', evidence: '', confidence: 'low' };
        }
        return {
          action: typeof ex.action === 'string' ? ex.action : '',
          evidence: typeof ex.evidence === 'string' ? ex.evidence : '',
          confidence: ['high', 'medium', 'low'].includes(ex.confidence) ? ex.confidence : 'low',
        };
      }).filter((ex) => ex.action)
    : [];

  return {
    source_signal: typeof obj.source_signal === 'string' ? obj.source_signal : '',
    old_friction: typeof obj.old_friction === 'string' ? obj.old_friction : '',
    new_change: typeof obj.new_change === 'string' ? obj.new_change : '',
    giveneeds_angle: typeof obj.giveneeds_angle === 'string' ? obj.giveneeds_angle : '',
    misconception_to_break: typeof obj.misconception_to_break === 'string' ? obj.misconception_to_break : '',
    practical_examples: examples,
    research_sufficiency: ['enough', 'thin', 'missing'].includes(obj.research_sufficiency) ? obj.research_sufficiency : 'thin',
    missing_info: Array.isArray(obj.missing_info) ? obj.missing_info.filter((x) => typeof x === 'string') : [],
  };
}

function buildGenerationDecision(parsed, densityCheck) {
  const requiredFields = ['source_signal', 'old_friction', 'new_change', 'giveneeds_angle'];
  const missingRequired = requiredFields.filter((key) => !densityCheck[key]);
  const groundedExamples = densityCheck.practical_examples.filter((ex) => ex.action && ex.evidence);
  let researchSufficiency = densityCheck.research_sufficiency;
  const contentPillar = typeof parsed.content_pillar === 'string' ? parsed.content_pillar : null;
  const contentTreatment = typeof parsed.content_treatment === 'string' ? parsed.content_treatment : null;
  const commentaryCanBeThin = ['news_commentary', 'opinion'].includes(contentTreatment)
    && densityCheck.source_signal
    && densityCheck.giveneeds_angle;

  if (missingRequired.length > 0 || (!commentaryCanBeThin && groundedExamples.length < 3)) {
    researchSufficiency = researchSufficiency === 'missing' ? 'missing' : 'thin';
  }

  return {
    content_pillar: contentPillar,
    pillar_candidate_rank: Number.isFinite(Number(parsed.pillar_candidate_rank)) ? Number(parsed.pillar_candidate_rank) : null,
    content_treatment: contentTreatment,
    fomo_mechanism: typeof parsed.fomo_mechanism === 'string' ? parsed.fomo_mechanism : 'none',
    fomo_intensity: typeof parsed.fomo_intensity === 'string' ? parsed.fomo_intensity : 'none',
    fomo_expression: typeof parsed.fomo_expression === 'string' ? parsed.fomo_expression : 'none',
    format_type: typeof parsed.format_type === 'string' ? parsed.format_type : null,
    recommended_length: Number.isFinite(Number(parsed.recommended_length)) ? Number(parsed.recommended_length) : null,
    explanation_style: typeof parsed.explanation_style === 'string' ? parsed.explanation_style : null,
    format_decision: normalizeFormatDecision(parsed.format_decision),
    content_goal: typeof parsed.content_goal === 'string' ? parsed.content_goal : null,
    ending_type: typeof parsed.ending_type === 'string' ? parsed.ending_type : null,
    why_this_ending: typeof parsed.why_this_ending === 'string' ? parsed.why_this_ending : '',
    research_sufficiency: researchSufficiency,
    grounded_example_count: groundedExamples.length,
    missing_required_fields: missingRequired,
  };
}

function chooseFallbackFormat({ formatTypeHint, generationDecision }) {
  if (VALID_FORMATS.has(formatTypeHint)) return formatTypeHint;
  if (['news_commentary', 'opinion'].includes(generationDecision.content_treatment)) return 'single_post';
  if (generationDecision.content_goal === 'save' && generationDecision.grounded_example_count >= 2) return 'short_thread';
  return 'single_post';
}

function normalizeVariantReview(parsed, variantCount = 7) {
  const targetVariantCount = normalizeVariantCount(variantCount);
  const variants = Array.isArray(parsed?.variants)
    ? parsed.variants.map(normalizeVariant).filter(Boolean).slice(0, targetVariantCount)
    : [];
  const pillarCandidates = Array.isArray(parsed?.pillar_candidates)
    ? parsed.pillar_candidates.map(normalizePillarCandidate).filter(Boolean).slice(0, 3)
    : [];

  if (variants.length === 0) {
    return {
      variants: [],
      recommendedVariant: null,
      metadata: {
        mode: 'single_generation_fallback',
        variant_count: 0,
        requested_variant_count: targetVariantCount,
        selection_stage: 'fallback',
        recommendation_reason: 'LLM이 variants 배열을 반환하지 않아 단일 초안을 사용함.',
      },
    };
  }

  const requestedId = Number(parsed.recommended_variant_id || parsed.selected_variant_id);
  const recommended = variants.find((v) => v.variant_id === requestedId)
    || [...variants].sort((a, b) => (b.scores.overall || 0) - (a.scores.overall || 0))[0];

  return {
    variants,
    recommendedVariant: recommended,
    metadata: {
      mode: 'branching_user_choice',
      requested_variant_count: targetVariantCount,
      selection_stage: 'user_pending',
      all_variants_preserved: true,
      variant_count: variants.length,
      pillar_candidates: pillarCandidates,
      recommended_variant_id: recommended.variant_id,
      // Legacy key kept so older admin surfaces can still highlight the recommended candidate.
      selected_variant_id: recommended.variant_id,
      recommendation_reason: typeof parsed.recommendation_reason === 'string'
        ? parsed.recommendation_reason
        : (typeof parsed.selection_reason === 'string' ? parsed.selection_reason : recommended.score_reason),
      selected_scores: recommended.scores,
      variants: variants.map((v) => ({
        variant_id: v.variant_id,
        title: v.title,
        angle: v.angle,
        differentiation_note: v.differentiation_note,
        content_pillar: v.content_pillar,
        pillar_candidate_rank: v.pillar_candidate_rank,
        content_treatment: v.content_treatment,
        fomo_mechanism: v.fomo_mechanism,
        fomo_intensity: v.fomo_intensity,
        fomo_expression: v.fomo_expression,
        format_decision: v.format_decision,
        format_type: v.format_type,
        recommended_length: v.recommended_length,
        explanation_style: v.explanation_style,
        scores: v.scores,
        score_reason: v.score_reason,
        preview: v.posts.map((p) => p.body).join('\n\n').slice(0, 600),
      })),
      variant_notes: Array.isArray(parsed.variant_notes)
        ? parsed.variant_notes.slice(0, targetVariantCount)
        : variants.filter((v) => v.variant_id !== recommended.variant_id).map((v) => ({
            variant_id: v.variant_id,
            note: '추천 후보와 비교해 점수 또는 자연스러움이 다름. 삭제하지 않고 보존.',
          })),
    },
  };
}

function normalizeVariantCount(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return 7;
  return Math.max(1, Math.min(7, Math.round(n)));
}

function normalizePillarCandidate(input) {
  if (!input || typeof input !== 'object') return null;
  const score = Number(input.fit_score);
  return {
    content_pillar: typeof input.content_pillar === 'string' ? input.content_pillar : null,
    fit_score: Number.isFinite(score) ? Math.max(1, Math.min(5, score)) : 3,
    why_this_pillar: typeof input.why_this_pillar === 'string' ? input.why_this_pillar : '',
    risk_if_forced: typeof input.risk_if_forced === 'string' ? input.risk_if_forced : '',
  };
}

function normalizeVariant(input, idx) {
  if (!input || typeof input !== 'object') return null;
  const posts = Array.isArray(input.posts)
    ? input.posts.map((p, i) => ({
        index: typeof p.index === 'number' ? p.index : i + 1,
        body: typeof p.body === 'string' ? p.body.slice(0, 1000) : '',
      })).filter((p) => p.body)
    : [];
  if (posts.length === 0) return null;
  const scores = normalizeVariantScores(input.scores);
  const formatType = typeof input.format_type === 'string' ? input.format_type : null;
  let scoreReason = typeof input.score_reason === 'string' ? input.score_reason : '';
  if (formatType === 'single_post' && (posts[0]?.body || '').length < 500) {
    scores.format_fit = Math.min(scores.format_fit, 2);
    scores.overall = Math.min(scores.overall, 2);
    scoreReason = `${scoreReason ? `${scoreReason} ` : ''}single_post는 500자 이상 기준인데 현재 후보는 짧아 감점.`;
  }
  const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
  const tempVariant = { ...input, format_type: formatType, content_treatment: input.content_treatment };
  const minTotalChars = minimumTotalCharsForVariant(tempVariant);
  if (totalChars < minTotalChars) {
    scores.substance = Math.min(scores.substance, 2);
    scores.format_fit = Math.min(scores.format_fit, 2);
    scores.overall = Math.min(scores.overall, 2);
    scoreReason = `${scoreReason ? `${scoreReason} ` : ''}발행 후보 최소 본문량은 ${minTotalChars}자 기준인데 현재 ${totalChars}자라 감점.`;
  }
  if (posts.length > 1 && posts.some((p, postIdx) => isThinContinuationPost({ post: p, postIdx, posts, variant: tempVariant }))) {
    scores.substance = Math.min(scores.substance, 2);
    scores.format_fit = Math.min(scores.format_fit, 2);
    scores.overall = Math.min(scores.overall, 2);
    scoreReason = `${scoreReason ? `${scoreReason} ` : ''}연결글은 1번 hook 을 제외한 후속 포스트 정보 단위가 부족해 감점.`;
  }
  if (looksGenericAiFiller(posts)) {
    scores.substance = Math.min(scores.substance, 2);
    scores.specificity = Math.min(scores.specificity, 2);
    scores.anti_generic = Math.min(scores.anti_generic, 1);
    scores.overall = Math.min(scores.overall, 2);
    scoreReason = `${scoreReason ? `${scoreReason} ` : ''}AI 역할/효율/공유하세요 수준의 일반론이라 발행 후보로 부적합.`;
  }

  return {
    ...input,
    variant_id: Number.isFinite(Number(input.variant_id)) ? Number(input.variant_id) : idx + 1,
    title: typeof input.title === 'string' ? input.title.slice(0, 120) : `후보 ${idx + 1}`,
    angle: typeof input.angle === 'string' ? input.angle : '',
    differentiation_note: typeof input.differentiation_note === 'string' ? input.differentiation_note : '',
    content_pillar: typeof input.content_pillar === 'string' ? input.content_pillar : null,
    pillar_candidate_rank: Number.isFinite(Number(input.pillar_candidate_rank)) ? Number(input.pillar_candidate_rank) : null,
    content_treatment: typeof input.content_treatment === 'string' ? input.content_treatment : null,
    fomo_mechanism: typeof input.fomo_mechanism === 'string' ? input.fomo_mechanism : 'none',
    fomo_intensity: typeof input.fomo_intensity === 'string' ? input.fomo_intensity : 'none',
    fomo_expression: typeof input.fomo_expression === 'string' ? input.fomo_expression : 'none',
    format_decision: normalizeFormatDecision(input.format_decision),
    format_type: formatType,
    recommended_length: Number.isFinite(Number(input.recommended_length)) ? Number(input.recommended_length) : posts.length,
    explanation_style: typeof input.explanation_style === 'string' ? input.explanation_style : null,
    posts,
    scores,
    score_reason: scoreReason,
  };
}

function requiresLongThread(variant) {
  const formatType = variant?.format_type;
  if (!['short_thread', 'resource_thread', 'mega_thread'].includes(formatType)) return false;
  return ['explainer', 'practical_tip', 'checklist', 'case_note', 'news_commentary'].includes(variant?.content_treatment);
}

function minimumTotalCharsForVariant(variant) {
  if (variant?.format_type === 'single_post') return 500;
  if (requiresLongThread(variant)) return 1100;
  return 800;
}

function minimumPostCharsForVariant(variant) {
  if (requiresLongThread(variant)) return 320;
  return 220;
}

function minimumHookCharsForThread() {
  return 80;
}

function isThinContinuationPost({ post, postIdx, posts, variant }) {
  if (!post || postIdx >= posts.length - 1) return false;
  const length = post.body?.length || 0;
  if (postIdx === 0 && posts.length > 1) {
    return length < minimumHookCharsForThread();
  }
  return length < minimumPostCharsForVariant(variant);
}

function looksGenericAiFiller(posts) {
  const text = (Array.isArray(posts) ? posts : [])
    .map((post) => post?.body || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return true;
  const totalChars = text.length;
  const genericHits = [
    /AI의 다양한 역할/,
    /어떻게 활용하고 계신가요/,
    /효율성을 높일 수 있습니다/,
    /지식을 쉽게 배울 수 있습니다/,
    /아이디어를 내고 초안을 작성/,
    /복잡한 작업을 자동화/,
    /마케팅 팀의 효율성/,
    /경험을 공유해보세요/,
  ].filter((pattern) => pattern.test(text)).length;
  const hasSpecificSignal = /[0-9]{2,}|CMTS|에피어|네이버|메타|구글|Threads|Reddit|X|플레이스|예약|리뷰|광고비|검색|캠페인|사례|고객/.test(text);
  return genericHits >= 2 || (totalChars < 450 && genericHits >= 1) || (totalChars < 650 && !hasSpecificSignal);
}

function collectHardQualityIssues(variants) {
  return (Array.isArray(variants) ? variants : []).flatMap((variant, idx) => {
    const normalized = normalizeVariant(variant, idx);
    if (!normalized) {
      return [{ variant_id: variant?.variant_id || idx + 1, issues: ['유효한 posts 없음'] }];
    }
    const posts = normalized.posts || [];
    const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
    const issues = [];
    if (normalized.format_type === 'single_post' && (posts[0]?.body?.length || 0) < 500) {
      issues.push(`single_post 500자 미만 (${posts[0]?.body?.length || 0}자)`);
    }
    const minTotalChars = minimumTotalCharsForVariant(normalized);
    if (totalChars < minTotalChars) {
      issues.push(`발행 후보 최소 본문량 미달 (${totalChars}/${minTotalChars}자)`);
    }
    if (posts.length > 1) {
      const thinPosts = posts
        .filter((p, postIdx) => isThinContinuationPost({ post: p, postIdx, posts, variant: normalized }))
        .map((p) => `${p.index}:${p.body?.length || 0}자`);
      if (thinPosts.length > 0) {
        issues.push(`후속 포스트 정보 밀도 부족 (${thinPosts.join(', ')})`);
      }
    }
    if (looksGenericAiFiller(posts)) {
      issues.push('AI식 일반론/구체 신호 부족');
    }
    return issues.length ? [{ variant_id: normalized.variant_id, title: normalized.title, issues }] : [];
  });
}

function normalizeFormatDecision(input) {
  const obj = input && typeof input === 'object' ? input : {};
  return {
    post_count_reason: typeof obj.post_count_reason === 'string' ? obj.post_count_reason : '',
    split_roles: Array.isArray(obj.split_roles) ? obj.split_roles.filter((x) => typeof x === 'string').slice(0, 8) : [],
    why_not_shorter: typeof obj.why_not_shorter === 'string' ? obj.why_not_shorter : '',
    why_not_longer: typeof obj.why_not_longer === 'string' ? obj.why_not_longer : '',
  };
}

function normalizeVariantScores(scores) {
  const s = scores && typeof scores === 'object' ? scores : {};
  const keys = [
    'topic_fit',
    'audience_empathy',
    'naturalness',
    'non_overlap',
    'format_fit',
    'usefulness_or_viewpoint',
    'brand_safety',
    'substance',
    'specificity',
    'anti_generic',
    'voc_fit',
    'fomo_fit',
    'overall',
  ];
  const out = {};
  for (const key of keys) {
    const n = Number(s[key]);
    out[key] = Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 3;
  }
  return out;
}
