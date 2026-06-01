// Content Architect — research 직후 / Writer 직전에 산다.
// 채택 콘셉트(creative_brief) + freeze 된 findings(F001~) + tone 자료를 받아,
// N개 variant 각각의 outline 을 만든다. variant 마다 다른 STRUCTURE_MAP 템플릿을 강제 배정해
// "같은 구조 반복" 함정을 막고, 각 슬롯에 (evidence_ids·takeaway·max_chars·forbidden) 을 핀 박아
// Writer 가 일반론으로 흘러가는 것을 차단한다.
//
// 2a (안전 분할) 단계: Architect 의 outline 은 Writer 에 *추가 컨텍스트* 로 흐른다.
// Writer 의 기존 rotation/생성 로직은 그대로 유지. 나중에 2b 에서 Writer 를 outline 기반으로 단순화.

import { callOpenAI } from '@/lib/llm';
import { ontologyPrefix } from '@/lib/agent/contentOntology';

// 7개 variant 가 사용할 구조 템플릿. variant_id 가 1~7 일 때 정확히 v1~v7 의 구조를 배정한다.
// Threads/B2B 마케팅 톤에 맞춰 정욱님 톤 샘플에서 본 결로 추렸다.
export const STRUCTURE_MAP = [
  {
    variant_id: 1,
    template: 'before_after',
    name: 'Before → After',
    description: '이전 상황(답답함/막힘) → 전환 계기(무엇을 바꿨나) → 이후 상태(수치·결과) → 독자 시사점',
    slot_roles: ['hook_before', 'trigger', 'after_with_numbers', 'takeaway'],
    rationale_hint: '경쟁사 모니터링·MCP 영상편집처럼 "구체 변화"가 명확한 소재에 강함.',
  },
  {
    variant_id: 2,
    template: 'info_vs_criterion',
    name: '정보 vs 기준 1)2)3)',
    description: '표면 정보 한 줄 → "기준이 더 비싸다" 주장 → 1)2)3) 정보 vs 기준 구체 대비 → 마감',
    slot_roles: ['hook', 'criterion_claim', 'pair_1', 'pair_2', 'pair_3', 'ending'],
    rationale_hint: '"정보 vs 기준" 톤 샘플 직접 모방. 추상 주장을 즉시 구체 대비로 증명.',
  },
  {
    variant_id: 3,
    template: 'command_to_output',
    name: '명령 → 아웃풋',
    description: '후킹 → 실행 워크플로우 ❶~❺ → 결과 → 함정 → soft CTA',
    slot_roles: ['hook_problem', 'workflow_steps', 'result_with_numbers', 'pitfall', 'soft_cta'],
    rationale_hint: 'MCP 영상편집·경쟁사 자동화처럼 "이 명령 → 이 결과"가 보이는 소재.',
  },
  {
    variant_id: 4,
    template: 'counter_argument',
    name: '반론 → 반박',
    description: '후킹 → 독자 예상 반론 1줄 → 근거 기반 반박 → 결론',
    slot_roles: ['hook', 'expected_objection', 'evidence_based_rebuttal', 'conclusion'],
    rationale_hint: '논쟁 가능한 주제에서 댓글 유발. provocation hook 과 잘 맞음.',
  },
  {
    variant_id: 5,
    template: 'numbers_then_meaning',
    name: '수치 → 해석',
    description: '핵심 수치 first → 맥락(언제·어디·누구) → 해석 → 독자 시사점',
    slot_roles: ['hook_number', 'context', 'interpretation', 'reader_implication'],
    rationale_hint: '네이버 로직 변화처럼 수치/사실 자체가 강할 때.',
  },
  {
    variant_id: 6,
    template: 'observation_breaks_norm',
    name: '관찰 → 통념 깨기',
    description: '관찰 장면 setup → 사람들이 믿는 통념 → 통념 깨는 사실 → 재정의',
    slot_roles: ['observation', 'common_belief', 'contrast_fact', 'reframe'],
    rationale_hint: '자영업 도발처럼 "다들 ~한다는데 사실은~" 톤. micro_humor 와 맞음.',
  },
  {
    variant_id: 7,
    template: 'question_engagement',
    name: '질문 → 답 / 관계 유도',
    description: '독자 고민 장면 → 짧은 답 → 열린 질문(댓글 유도)',
    slot_roles: ['scene_setup', 'short_answer', 'open_question'],
    rationale_hint: '친구찾기·작품자랑처럼 relate intent. 끝을 닫지 않고 댓글 받음.',
  },
];

/**
 * @param {{
 *   creativeBrief: object | null,
 *   findingsSnapshot: Array<{id, source, type, text, citation?, how_to_use?}>,
 *   toneInsights?: object | null,
 *   variantCount?: number,
 *   jobId?: string | null,
 * }} args
 * @returns {Promise<{ outlines: Array<object>, model: string, cost_usd: number|null, skipped?: boolean, reason?: string }>}
 */
export async function runContentArchitect({ creativeBrief, findingsSnapshot, toneInsights, variantCount = 7, jobId } = {}) {
  const targetCount = Math.max(1, Math.min(7, Number(variantCount) || 7));
  const snapshot = Array.isArray(findingsSnapshot) ? findingsSnapshot : [];

  // creative_brief 가 비어 있으면 Architect 가 출발점이 없으니 스킵 — Writer 가 기존대로 진행.
  if (!creativeBrief || !creativeBrief.core_angle) {
    return { outlines: [], model: 'skip', cost_usd: null, skipped: true, reason: 'creative_brief 없음' };
  }

  const sys = `${ontologyPrefix({ includeEnums: true })}너는 기브니즈 콘텐츠의 "Content Architect" 다. Writer 가 글을 쓰기 전에 ${targetCount}개 variant 의 구성안(outline)을 만든다.

각 variant 는 아래 STRUCTURE_MAP 의 v1~v${targetCount} 구조 템플릿을 정확히 배정 받는다. 자유 선택하지 마라. 7개 variant 가 다른 구조를 가져야 다양성이 산다.

[STRUCTURE_MAP — variant_id 별 강제 배정]
${STRUCTURE_MAP.slice(0, targetCount).map((s) => `v${s.variant_id} = ${s.template} (${s.name})
  설명: ${s.description}
  슬롯 role 순서: ${s.slot_roles.join(' → ')}
  활용 힌트: ${s.rationale_hint}`).join('\n\n')}

[슬롯 명세 — 각 슬롯마다 아래 필드를 모두 채운다]
- role: 위 STRUCTURE_MAP 의 slot_roles 에 있는 이름 그대로.
- intent: 이 슬롯이 독자에게 무엇을 일으켜야 하는가 1줄.
- evidence_ids: FINDINGS SNAPSHOT 의 id 배열(예: ["F001","F010"]). 수치/고유명사/인용이 필요하면 핀 박는다. 일반 도입/마감 슬롯이면 빈 배열 가능. ⚠️ snapshot 에 없는 id 쓰면 실패.
- takeaway: 이 슬롯을 다 쓰고 난 뒤 독자 머릿속에 남아야 할 것 1줄. 추상어 금지("중요하다", "고려해야 한다" 같은 결론 금지).
- max_chars: 슬롯 본문 최대 글자수. 40 ~ 280 사이. hook 슬롯은 40~80, 본체는 120~220, 마감은 60~120 권장.
- forbidden: 이 슬롯에서 절대 쓰지 말아야 할 패턴 1줄 (예: "snapshot 외 수치 금지", "결론 다 말하지 않음", "마케팅 용어 금지").

[variant 마다 함께 결정할 메타]
- content_pillar: cost_before_spend / do_today / current_observation / trend_plain / content_showcase 중 1개.
- engagement_intent: reach / trust / convert / relate / recycle 중 1개. ${targetCount}개 variant 가 5종을 분산 (relate·trust 정도는 2번 등장 허용, 같은 의도 3번 이상 금지).
- hook_pattern: curiosity_gap / confession_story / niche_expert / provocation / micro_humor / anxiety_reframe 중 1개. 가능하면 6종 모두 다르게.
- fomo_mechanism: quiet_gap / delayed_regret / rule_changed / insider_move / cost_leak / authority_signal / missed_timing / wrong_problem / comparison_gap / none 중 1개.
- rationale: 1줄로 "왜 이 구조·intent·hook 조합이 이 콘셉트에 맞는지".

[출력 — JSON 만]
{
  "outlines": [
    {
      "variant_id": 1,
      "structure_template": "before_after",
      "structure_name": "Before → After",
      "rationale": "...",
      "content_pillar": "...",
      "engagement_intent": "...",
      "hook_pattern": "...",
      "fomo_mechanism": "...",
      "slots": [
        { "role": "hook_before", "intent": "...", "evidence_ids": ["F001"], "takeaway": "...", "max_chars": 80, "forbidden": "..." },
        ...
      ]
    },
    ... (${targetCount}개)
  ]
}

⚠️ evidence_ids 는 snapshot 에 실제 존재하는 F### 만 사용. 없는 id 쓰면 실패.
⚠️ 모든 slot 의 takeaway 는 구체여야 한다. "독자에게 영감을 준다" 같은 추상은 실패.
⚠️ ${targetCount}개 variant 의 structure_template 은 STRUCTURE_MAP 의 v1~v${targetCount} 와 정확히 일치해야 한다.

[수치 슬롯 매핑 — 매우 중요]
slot role 에 "number", "result_with_numbers", "after_with_numbers", "hook_number" 처럼 *수치 결과* 가 들어가야 하는 슬롯에는, snapshot 의 finding 중 본문 text 에 실제 수치(%·배·명·만원·N% 향상 등)가 포함된 finding 만 evidence_ids 로 골라라. 수치 없는 finding(예: "도구 사용보다 데이터 해석이 중요하다")을 수치 슬롯에 매핑하면 그 슬롯이 무의미해진다. snapshot 을 다시 훑어 수치 있는 finding 을 우선 사용하라.

수치 없는 finding 은 "criterion_claim", "interpretation", "common_belief", "reframe" 같은 *해석/관점* 슬롯에 쓰는 게 적절하다.

[기획 축 반영 — 매우 중요]
각 variant 의 outline 은 creative_brief 의 *기획 3필드* 를 직접 운반한다.
- ${targetCount}개 outline 중 *마지막 슬롯* (takeaway / ending / open_question 류 마감 슬롯) 은 creative_brief.reader_takeaway 를 직접 옮긴다.
  · 슬롯의 takeaway 필드에 *brief 의 reader_takeaway 의 내용* 을 그대로(라벨 떼고) 박는다. 추상화·일반화 금지.
  · 슬롯의 intent 필드는 "독자가 글을 닫을 때 머릿속에 ${'${'} reader_takeaway 의 내용 ${'}'} 가 남아야 한다" 로 명시.
- creative_brief.planning_purpose 가:
  · "change" 면 마지막 슬롯 role 이 "reframe" / "ending_with_perspective_shift" 같이 *관점 전환* 함의여야 함.
  · "resolve" 면 "action" / "next_step" / "soft_cta" 같이 *해결 다음 한 발* 함의여야 함.
  · "improve" 면 "criterion" / "checklist_one_line" / "upgrade_hint" 같이 *한 단계 더 가는 지표* 함의여야 함.
- creative_brief.proof_anchor_type 이:
  · "numbers" 포함 → 본체 슬롯 중 하나에 수치 있는 finding evidence_ids 매핑 필수.
  · "case" 포함 → 본체 슬롯 중 하나에 *사례* finding 매핑 + intent 에 "구체 사례 1개를 그대로 운반".
  · "workflow" 포함 → 본체 슬롯에 *단계 나열* (❶~❺ 또는 1)2)3)) 명시.
  · "comparison" 포함 → 본체 슬롯에 *정보 vs 기준* / Before vs After 대비 명시.

이 운반이 빠지면 outline 의 의미가 없다. brief 의 기획 축은 *형식적 메타* 가 아니라 *글의 마감 방향* 이다.`;

  // user payload — 채택 콘셉트 + findings snapshot + tone rhythm 만 추린다 (광범위 컨텍스트는 Writer 가 받음).
  const briefBlock = {
    topic_title: creativeBrief.topic_title || null,
    reader_problem: creativeBrief.reader_problem || null,
    core_angle: creativeBrief.core_angle || null,
    hook_candidate: creativeBrief.hook_candidate || null,
    evidence_needed: Array.isArray(creativeBrief.evidence_needed) ? creativeBrief.evidence_needed : [],
  };
  const snapshotBlock = snapshot.map((f) => ({
    id: f.id,
    source: f.source,
    type: f.type,
    text: f.text,
    citation: f.citation || null,
    how_to_use: f.how_to_use || null,
  }));
  const rhythmExample = (toneInsights?.rhythm_example || '').slice(0, 600);

  const user = `[CREATIVE BRIEF — 이 글의 척추]
${JSON.stringify(briefBlock, null, 2)}

[FINDINGS SNAPSHOT — 슬롯의 evidence_ids 에 쓸 수 있는 풀]
${JSON.stringify(snapshotBlock, null, 2)}

${rhythmExample ? `[톤 — 호흡 참고 (Writer 용, Architect 는 구조만 신경)]\n${rhythmExample}` : ''}

위 자료로 ${targetCount}개 variant 의 outline 을 STRUCTURE_MAP 순서대로 정확히 생성하라.`;

  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  let parsed = null;
  let costUsd = null;
  try {
    const { content, raw } = await callOpenAI({
      stage: 'content_architect',
      jobId,
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
      if (p) costUsd = ((raw.usage.prompt_tokens || 0) * p.in + (raw.usage.completion_tokens || 0) * p.out) / 1_000_000;
    }
  } catch (e) {
    console.error('[runContentArchitect] LLM 실패:', e.message);
    return { outlines: [], model, cost_usd: null, skipped: true, reason: 'LLM 호출/파싱 실패: ' + e.message };
  }

  const rawOutlines = Array.isArray(parsed?.outlines) ? parsed.outlines : [];
  const snapshotIds = new Set(snapshot.map((f) => f.id));

  // 정규화 + 검증 — variant_id 매칭, 구조 일치, evidence_ids 존재 검증.
  const outlines = [];
  for (let i = 0; i < targetCount; i += 1) {
    const expectedVariantId = i + 1;
    const expectedTemplate = STRUCTURE_MAP[i].template;
    const found = rawOutlines.find((o) => Number(o?.variant_id) === expectedVariantId);
    if (!found) {
      outlines.push({
        variant_id: expectedVariantId,
        structure_template: expectedTemplate,
        structure_name: STRUCTURE_MAP[i].name,
        skipped_reason: 'Architect 출력에 해당 variant 누락',
        slots: [],
      });
      continue;
    }
    const slots = Array.isArray(found.slots) ? found.slots.map((s) => ({
      role: typeof s?.role === 'string' ? s.role.slice(0, 60) : '',
      intent: typeof s?.intent === 'string' ? s.intent.slice(0, 240) : '',
      evidence_ids: Array.isArray(s?.evidence_ids)
        ? s.evidence_ids.filter((id) => typeof id === 'string' && snapshotIds.has(id))
        : [],
      takeaway: typeof s?.takeaway === 'string' ? s.takeaway.slice(0, 200) : '',
      max_chars: Number.isFinite(Number(s?.max_chars)) ? Math.max(20, Math.min(400, Math.round(Number(s.max_chars)))) : 200,
      forbidden: typeof s?.forbidden === 'string' ? s.forbidden.slice(0, 200) : '',
    })) : [];
    outlines.push({
      variant_id: expectedVariantId,
      structure_template: expectedTemplate,
      structure_name: STRUCTURE_MAP[i].name,
      rationale: typeof found.rationale === 'string' ? found.rationale.slice(0, 240) : '',
      content_pillar: typeof found.content_pillar === 'string' ? found.content_pillar : null,
      engagement_intent: typeof found.engagement_intent === 'string' ? found.engagement_intent : null,
      hook_pattern: typeof found.hook_pattern === 'string' ? found.hook_pattern : null,
      fomo_mechanism: typeof found.fomo_mechanism === 'string' ? found.fomo_mechanism : null,
      slots,
    });
  }

  // 후처리: 수치 슬롯에 수치 없는 finding 만 매핑된 경우, snapshot 의 수치 있는 finding 으로 보정.
  // Architect 프롬프트로 가이드해도 LLM 이 "권위 있어 보이는" 해석성 finding 을 수치 슬롯에 넣는 패턴이 잦아
  // 코드로 강제한다. role 명에 number/result/after_with 가 포함되면 수치 슬롯으로 간주.
  enforceNumericalEvidence(outlines, snapshot);

  return { outlines, model, cost_usd: costUsd };
}

const NUMERICAL_SLOT_ROLE_RE = /(number|result_with|after_with|hook_number)/i;
const HAS_NUMBER_RE = /\d+(\.\d+)?\s*(%|배|만\s?원|만\s?명|명|건|시간|개|초|분|일|주|월|년|점)/;

function enforceNumericalEvidence(outlines, snapshot) {
  if (!Array.isArray(outlines) || !Array.isArray(snapshot)) return;
  const numericalFindings = snapshot.filter((f) => HAS_NUMBER_RE.test(f?.text || ''));
  if (numericalFindings.length === 0) return; // snapshot 자체에 수치 없으면 보정 불가
  const numericalIds = numericalFindings.map((f) => f.id);
  const isNumericalId = new Map(snapshot.map((f) => [f.id, HAS_NUMBER_RE.test(f?.text || '')]));
  for (const o of outlines) {
    for (const s of o.slots || []) {
      if (!NUMERICAL_SLOT_ROLE_RE.test(s.role || '')) continue;
      // 1) 슬롯의 evidence_ids 중 수치 있는 것만 남김
      const kept = (s.evidence_ids || []).filter((id) => isNumericalId.get(id));
      // 2) 남은 게 없으면 snapshot 의 수치 있는 finding 중 첫 2개를 자동 추가
      if (kept.length === 0) {
        s.evidence_ids = numericalIds.slice(0, 2);
        s.auto_enforced = true; // 메타 표기 — 디버깅·검수용
      } else {
        s.evidence_ids = kept;
      }
    }
  }
}

// outline 배열을 Writer 용 사람-읽기 가능 텍스트 블록으로 렌더.
// 2a 단계에서 Writer 가 이 텍스트를 extraContext 안에서 받아 가이드로 사용.
export function renderOutlinesForWriter(outlines) {
  if (!Array.isArray(outlines) || outlines.length === 0) return '';
  const lines = [
    '[ARCHITECT OUTLINES — variant 별 구조 가이드. 자신의 variant_id 에 해당하는 outline 을 따라라]',
    '아래 outline 이 있는 variant 는 그 구조와 슬롯 명세대로 본문을 구성한다. 슬롯 role 순서, evidence_ids 지정(snapshot 의 F### 만), max_chars, forbidden 을 지킨다. 슬롯 takeaway 는 그 슬롯이 끝났을 때 독자 머릿속에 남아야 할 것이다.',
    '',
  ];
  for (const o of outlines) {
    if (o.skipped_reason) {
      lines.push(`--- variant ${o.variant_id} (${o.structure_name}) — Architect 누락, Writer 가 기존 방식으로 처리 ---`);
      lines.push('');
      continue;
    }
    lines.push(`--- variant ${o.variant_id} | ${o.structure_template} | ${o.structure_name} ---`);
    if (o.rationale) lines.push(`이유: ${o.rationale}`);
    const meta = [
      o.content_pillar ? `pillar=${o.content_pillar}` : null,
      o.engagement_intent ? `intent=${o.engagement_intent}` : null,
      o.hook_pattern ? `hook=${o.hook_pattern}` : null,
      o.fomo_mechanism ? `fomo=${o.fomo_mechanism}` : null,
    ].filter(Boolean).join(' · ');
    if (meta) lines.push(`메타: ${meta}`);
    lines.push('슬롯:');
    for (const s of o.slots) {
      const ev = s.evidence_ids?.length ? `[evidence: ${s.evidence_ids.join(', ')}]` : '[evidence: 없음]';
      lines.push(`  · ${s.role} (≤${s.max_chars}자) ${ev}`);
      if (s.intent) lines.push(`      intent: ${s.intent}`);
      if (s.takeaway) lines.push(`      takeaway: ${s.takeaway}`);
      if (s.forbidden) lines.push(`      forbidden: ${s.forbidden}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
