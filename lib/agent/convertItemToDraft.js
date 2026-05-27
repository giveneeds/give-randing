import { marked } from 'marked';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';

const CANONICAL_ORIGIN = 'https://www.giveneeds.co.kr';

const SELECT_COLS = [
  'id',
  'job_id',
  'source',
  'post_url',
  'normalized',
  'classification',
  'summary',
  'translation',
  'status',
].join(', ');

const CLUSTER_CATEGORY = {
  place_visibility: 'ATTRACT',
  ad_efficiency: 'ATTRACT',
  local_acquisition: 'ATTRACT',
  review_trust: 'REVENUE',
  menu_offer: 'REVENUE',
  local_retention: 'REVENUE',
  service_page: 'REVENUE',
};

const PERSONA_TAG = {
  general: '작은 사업자/브랜드 운영자',
  general: '공통',
  unknown: '미분류',
  restaurant_owner: '작은 사업자/브랜드 운영자',
  clinic_owner: '작은 사업자/브랜드 운영자',
  brand_operator: '작은 사업자/브랜드 운영자',
  marketer: '작은 사업자/브랜드 운영자',
  small_brand_owner: '작은 사업자/브랜드 운영자',
  general_reader: '공통',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isSafeHref(href) {
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function markdownToHtml(markdown) {
  const renderer = new marked.Renderer();

  // 원문/LLM 출력에 HTML이 섞여도 매거진 HTML에 그대로 들어가지 않게 한다.
  renderer.html = () => '';
  renderer.heading = function heading({ tokens, depth }) {
    const level = depth <= 2 ? 2 : 3;
    return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
  };
  renderer.link = function link({ href, title, tokens }) {
    const label = this.parser.parseInline(tokens);
    if (!isSafeHref(href)) return label;
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`;
  };

  return marked.parse(normalizeMarkdown(markdown), {
    renderer,
    async: false,
    breaks: false,
    gfm: true,
  });
}

function normalizeMarkdown(markdown) {
  return String(markdown || '')
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

async function ensureUniqueSlug(base) {
  const safeBase = base || `draft-${Date.now()}`;
  const { data, error } = await supabaseAdmin
    .from('magazines')
    .select('slug')
    .like('slug', `${safeBase}%`);

  if (error) throw error;

  const taken = new Set((data || []).map((row) => row.slug));
  let candidate = safeBase;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${safeBase}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function getBrief(item) {
  const c = item.classification || {};
  return {
    target_persona: c.suggested_persona || c.target_persona || 'general',
    topic_cluster: c.suggested_topic_cluster || c.topic_cluster || null,
    fit_score: c.fit_score ?? null,
    relevance_reason: c.relevance_reason || null,
    reader_problem: c.reader_problem || null,
    why_now: c.why_now || null,
    signal_type: c.signal_type || null,
    content_angles: Array.isArray(c.content_angles) ? c.content_angles : [],
    content_angle: c.content_angle || null,
    practical_takeaway: c.practical_takeaway || null,
    execution_steps: Array.isArray(c.execution_steps) ? c.execution_steps : [],
    tone_direction: c.tone_direction || null,
    recommended_title: c.recommended_title || null,
    lead_magnet: c.lead_magnet || null,
    lead_magnet_idea: c.lead_magnet_idea || null,
    approval_reason: c.approval_reason || null,
    risk_flags: Array.isArray(c.risk_flags) ? c.risk_flags : [],
  };
}

function getSourceText(item) {
  return (
    item.normalized?.extracted_text ||
    item.translation?.translated_text ||
    item.summary?.one_line_summary ||
    ''
  );
}

function getTitle(item, brief) {
  return (
    brief.recommended_title ||
    item.translation?.translated_title ||
    item.normalized?.title ||
    '기브니즈 매거진 초안'
  );
}

function getExcerpt(item, brief) {
  return (
    item.summary?.one_line_summary ||
    brief.relevance_reason ||
    `${getTitle(item, brief)} 초안입니다.`
  );
}

function getCategory(brief) {
  return CLUSTER_CATEGORY[brief.topic_cluster] || 'TREND';
}

function getTags(brief) {
  return [
    PERSONA_TAG[brief.target_persona] || brief.target_persona,
    brief.topic_cluster,
  ].filter(Boolean);
}

function getAdminOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || CANONICAL_ORIGIN;
}

async function cleanupCreatedDraft(magazineId) {
  if (!magazineId) return;
  const { error } = await supabaseAdmin
    .from('magazines')
    .delete()
    .eq('id', magazineId);
  if (error) console.error('생성 실패 후 draft 정리 실패', error.message);
}

async function generateDraftMarkdown(item, brief, title) {
  const sourceText = getSourceText(item).slice(0, 5000);
  const sourceUrl = item.post_url || '';

  if (!sourceText) {
    throw new Error('드래프트 생성에 사용할 원문 텍스트가 없습니다.');
  }

  const system = `너는 기브니즈 매거진 작가 보조다. B2B 마케팅 에이전시 관점에서, 타겟 페르소나(요식업/병의원 사장)가 바로 적용할 수 있는 실용 매거진 글 초안을 만든다. 마케팅 광고티 X, 사실 기반, H2/H3 명확한 구조, 1500~2500자 한국어 마크다운.`;

  const user = `추천 제목:
${title}

원문 텍스트:
${sourceText}

브리프:
- target_persona: ${brief.target_persona}
- topic_cluster: ${brief.topic_cluster || '(없음)'}
- signal_type: ${brief.signal_type || '(없음)'}
- reader_problem: ${brief.reader_problem || '(없음)'}
- why_now: ${brief.why_now || '(없음)'}
- content_angle: ${brief.content_angle || '(없음)'}
- content_angles: ${brief.content_angles.length ? brief.content_angles.join(' / ') : '(없음)'}
- practical_takeaway: ${brief.practical_takeaway || '(없음)'}
- execution_steps: ${brief.execution_steps.length ? brief.execution_steps.join(' / ') : '(없음)'}
- tone_direction: ${brief.tone_direction || '(없음)'}
- recommended_title: ${brief.recommended_title || '(없음)'}
- relevance_reason: ${brief.relevance_reason || '(없음)'}
- risk_flags: ${brief.risk_flags.length ? brief.risk_flags.join(' / ') : '(없음)'}

요청:
- 한국어 매거진 본문 초안을 1500~2500자로 작성
- H2/H3 구조를 명확히 사용
- 독자의 현재 문제 상황으로 시작
- 기사 나열이 아니라 "무슨 변화인가 → 왜 중요한가 → 내 업체에 어떻게 적용할까" 구조로 작성
- 쉽게 풀어 쓰되 얕아지지 않게 구체적인 방법과 예시를 포함
- 작은 사업자/브랜드 운영자가 바로 적용하거나 점검할 수 있는 체크 포인트 포함. 업종이 명확하지 않으면 요식업/병의원으로 단정하지 않음
- 과장된 마케팅 문구나 광고성 표현은 피하고, 원문 사실을 기반으로 해석
- 마지막 줄에 정확히 다음 형식 포함: 원문 출처: ${sourceUrl}`;

  const model = process.env.OPENAI_DRAFT_MODEL || 'gpt-4o-mini';
  const { content } = await callOpenAI({
    stage: 'draft',
    itemId: item.id,
    jobId: item.job_id,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    params: {
      temperature: 0.35,
      max_tokens: 3000,
    },
  });

  const markdown = normalizeMarkdown(content);
  if (!markdown) throw new Error('LLM이 빈 드래프트를 반환했습니다.');
  return markdown;
}

/**
 * 승인된 agent_items 1건을 매거진 draft로 변환한다.
 * 실패 시 agent_items.status는 변경하지 않는다.
 *
 * @param {string} itemId
 * @returns {Promise<{magazineId: string, magazineUrl: string, leadMagnetCreated: boolean}>}
 */
export async function convertItemToMagazineDraft(itemId) {
  if (!supabaseAdmin) throw new Error('service role 미설정');
  if (!itemId) throw new Error('itemId 누락');

  const { data: item, error: itemError } = await supabaseAdmin
    .from('agent_items')
    .select(SELECT_COLS)
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error('agent_items 행을 찾을 수 없습니다.');
  if (item.status === 'sent') throw new Error('이미 매거진 draft로 변환된 아이템입니다.');

  const brief = getBrief(item);
  const title = getTitle(item, brief);
  const markdown = await generateDraftMarkdown(item, brief, title);
  const contentHtml = markdownToHtml(markdown);
  const slug = await ensureUniqueSlug(slugify(title) || `agent-${item.id.slice(0, 8)}`);

  const { data: magazine, error: magazineError } = await supabaseAdmin
    .from('magazines')
    .insert({
      slug,
      title,
      category: getCategory(brief),
      content_html: contentHtml,
      excerpt: getExcerpt(item, brief),
      tags: getTags(brief),
      status: 'draft',
      author: 'GIVENEEDS',
      is_featured: false,
      is_premium: false,
      show_resources: false,
      sort_order: 0,
    })
    .select('id')
    .single();

  if (magazineError) throw magazineError;

  let leadMagnetCreated = false;
  if (brief.lead_magnet_idea) {
    const leadMagnet = brief.lead_magnet || {};
    const { error: resourceError } = await supabaseAdmin
      .from('content_resources')
      .insert({
        magazine_id: magazine.id,
        title: brief.lead_magnet_idea,
        description: [
          leadMagnet.type ? `유형: ${leadMagnet.type}` : null,
          leadMagnet.why_this_magnet || 'AI가 제안한 리드마그넷 후보입니다. 작가가 파일을 업로드한 뒤 공개 여부를 결정하세요.',
          Array.isArray(leadMagnet.sections) && leadMagnet.sections.length
            ? `구성: ${leadMagnet.sections.join(', ')}`
            : null,
        ].filter(Boolean).join('\n'),
        file_url: '',
        file_name: '파일 업로드 대기',
        file_type: null,
        sort_order: 0,
        is_enabled: false,
      });

    if (resourceError) {
      await cleanupCreatedDraft(magazine.id);
      throw resourceError;
    }
    leadMagnetCreated = true;
  }

  const { error: updateError } = await supabaseAdmin
    .from('agent_items')
    .update({
      status: 'sent',
      send_flag: true,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (updateError) {
    await cleanupCreatedDraft(magazine.id);
    throw updateError;
  }

  const magazineUrl = `/admin/magazines/editor?id=${magazine.id}`;
  return {
    magazineId: magazine.id,
    magazineUrl,
    adminUrl: `${getAdminOrigin()}${magazineUrl}`,
    leadMagnetCreated,
  };
}
