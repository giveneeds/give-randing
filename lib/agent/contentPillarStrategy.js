import fs from 'node:fs';
import path from 'node:path';
import { normalizePersona } from '@/lib/contentTaxonomy';

const FALLBACK_PILLARS = {
  cost_before_spend: {
    label: '광고비 쓰기 전에 먼저 봐야 할 것',
    role: '마케팅 비용을 날리지 않게 돕는 판단 질문',
    threadKeywords: ['광고비', '광고효과', '대행사', '성과'],
  },
  do_today: {
    label: '오늘 바로 해볼 수 있는 마케팅',
    role: '저장하고 따라 할 수 있는 작은 실행',
    threadKeywords: ['AI 마케팅', '콘텐츠 소재', '블로그 제목', '리뷰 답글'],
  },
  current_observation: {
    label: '요즘 되는 방식에 대한 관찰',
    role: '일반인도 재미있게 읽는 현상 관찰',
    threadKeywords: ['요즘 마케팅', '바이럴', '스레드', '소비자 심리'],
  },
  trend_plain: {
    label: '요즘 마케팅 흐름 쉽게 풀기',
    role: '이슈를 브랜드 운영자가 볼 변화로 번역',
    threadKeywords: ['AI 검색', '메타 광고', '네이버 검색', '숏폼', '검색 변화'],
  },
  content_showcase: {
    label: '우리 업체를 더 잘 보여주는 콘텐츠 만들기',
    role: '소재와 표현을 더 잘 고르는 법',
    threadKeywords: ['후킹', '광고 소재', '콘텐츠 기획', '상세페이지', '카드뉴스'],
  },
};

let pillarConfigCache = null;

export function getContentPillars() {
  if (pillarConfigCache) return pillarConfigCache;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'content-pillars.json'), 'utf8');
    const parsed = JSON.parse(raw);
    pillarConfigCache = parsed?.pillars && typeof parsed.pillars === 'object'
      ? parsed.pillars
      : FALLBACK_PILLARS;
  } catch {
    pillarConfigCache = FALLBACK_PILLARS;
  }
  return pillarConfigCache;
}

export function choosePillarStrategy({ item, theme, candidate } = {}) {
  const pillars = getContentPillars();
  const classification = item?.classification || {};
  const summary = item?.summary || {};
  const source = item?.source || candidate?.source || '';
  const text = [
    candidate?.title,
    candidate?.recommended_title,
    candidate?.one_line,
    candidate?.content_angle,
    candidate?.reader_problem,
    classification.recommended_title,
    classification.reader_problem,
    classification.why_now,
    classification.content_angle,
    Array.isArray(classification.content_angles) ? classification.content_angles.join(' ') : '',
    classification.practical_takeaway,
    Array.isArray(classification.execution_steps) ? classification.execution_steps.join(' ') : '',
    classification.suggested_topic_cluster,
    summary.one_line_summary,
    item?.normalized?.title,
    item?.normalized?.text,
    item?.normalized?.excerpt,
  ].filter(Boolean).join(' ').toLowerCase();

  const scores = Object.entries(pillars).map(([key, value]) => {
    let score = 1.6;
    const keywordHits = (value.threadKeywords || []).filter((keyword) => (
      keyword && text.includes(String(keyword).toLowerCase())
    ));
    score += Math.min(1.2, keywordHits.length * 0.35);

    const roleWords = `${value.label || ''} ${value.role || ''}`
      .split(/[\s/·,]+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length >= 2);
    score += Math.min(0.7, roleWords.reduce((acc, word) => acc + (text.includes(word) ? 0.12 : 0), 0));

    score += sourceBoost({ key, source, text });
    score += clusterBoost({ key, cluster: theme?.target_topic_cluster || classification.suggested_topic_cluster, text });

    if (theme?.name && text.includes(String(theme.name).toLowerCase())) score += 0.2;
    if (typeof classification.fit_score === 'number') score += Math.max(0, Math.min(0.5, classification.fit_score * 0.5));

    return {
      content_pillar: key,
      label: value.label || key,
      fit_score: Math.round(Math.max(1, Math.min(5, score)) * 10) / 10,
      why_this_pillar: buildPillarReason({ key, label: value.label || key, source, text, keywordHits, classification }),
      risk_if_forced: buildPillarRisk(key),
    };
  }).sort((a, b) => b.fit_score - a.fit_score);

  const selected = scores[0] || {
    content_pillar: 'current_observation',
    label: FALLBACK_PILLARS.current_observation.label,
    fit_score: 3,
    why_this_pillar: '명확한 실행 근거보다 요즘 반응을 관찰하는 쪽이 자연스럽습니다.',
    risk_if_forced: '실행 팁으로 몰면 일반론이 될 수 있습니다.',
  };

  return {
    selected_content_pillar: selected.content_pillar,
    selected_content_pillar_label: selected.label,
    content_pillar_fit_score: selected.fit_score,
    content_pillar_reason: selected.why_this_pillar,
    target_fit_summary: buildTargetFitSummary({ classification, theme }),
    research_source_summary: buildResearchSourceSummary(source),
    writing_direction: buildWritingDirection({ selected, classification, source }),
    pillar_candidates: scores.slice(0, 3),
  };
}

export function selectPillarDrivenTopicCandidates(candidates = [], { limit = 7 } = {}) {
  const targetLimit = Math.max(1, Math.min(12, Number(limit) || 7));
  const pool = Array.isArray(candidates)
    ? candidates.filter((candidate) => candidate && candidate.id)
    : [];
  if (pool.length <= targetLimit) {
    return relabelCandidates(pool);
  }

  const selected = [];
  const selectedIds = new Set();
  const pillarOrder = getPillarSelectionOrder();

  // Reddit/X are topic discovery sources, not a separate display category.
  // Still, keep one of each when available so overseas issue discovery does not get washed out by news/latest order.
  for (const source of ['reddit_search', 'reddit', 'x_search']) {
    if (source === 'reddit' && selected.some((candidate) => candidate.source === 'reddit_search')) continue;
    const candidate = bestCandidate(pool, {
      excludeIds: selectedIds,
      predicate: (entry) => entry.source === source,
      selected,
    });
    if (candidate) addCandidate({ candidate, selected, selectedIds, targetLimit });
  }

  // First pass: give every strategy lane a chance to contribute one topic.
  for (const pillar of pillarOrder) {
    if (selected.length >= targetLimit) break;
    const candidate = bestCandidate(pool, {
      excludeIds: selectedIds,
      predicate: (entry) => entry.selected_content_pillar === pillar,
      selected,
    });
    if (candidate) addCandidate({ candidate, selected, selectedIds, targetLimit });
  }

  // Second pass: fill remaining slots with the strongest non-overlapping topics.
  while (selected.length < targetLimit) {
    const candidate = bestCandidate(pool, {
      excludeIds: selectedIds,
      selected,
    });
    if (!candidate) break;
    addCandidate({ candidate, selected, selectedIds, targetLimit });
  }

  return relabelCandidates(selected);
}

function sourceBoost({ key, source, text }) {
  const s = String(source || '').toLowerCase();
  let boost = 0;
  if (['reddit', 'reddit_search', 'x_search'].includes(s)) {
    if (key === 'trend_plain') boost += 0.55;
    if (key === 'current_observation') boost += 0.35;
  }
  if (/news|article|official|rss/.test(s)) {
    if (key === 'trend_plain') boost += 0.55;
    if (key === 'current_observation') boost += 0.25;
  }
  if (/논란|발표|업데이트|출시|규제|ai|검색|플랫폼|해외|reddit|x\b/.test(text)) {
    if (key === 'trend_plain') boost += 0.55;
    if (key === 'current_observation') boost += 0.25;
  }
  if (/체크|방법|템플릿|오늘|바로|실행|바꿔|따라/.test(text) && key === 'do_today') boost += 0.55;
  if (/광고비|성과|대행|보고서|roas|비용|돈/.test(text) && key === 'cost_before_spend') boost += 0.65;
  if (/소재|후킹|카피|상세페이지|콘텐츠|문구|표현/.test(text) && key === 'content_showcase') boost += 0.55;
  return boost;
}

function getPillarSelectionOrder() {
  const pillars = getContentPillars();
  const configOrder = readDefaultRotation();
  const fromConfig = configOrder.filter((key) => pillars[key]);
  const rest = Object.keys(pillars).filter((key) => !fromConfig.includes(key));
  return [...fromConfig, ...rest];
}

function readDefaultRotation() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'content-pillars.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.defaultRotation) ? parsed.defaultRotation.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function bestCandidate(pool, { excludeIds = new Set(), predicate = () => true, selected = [] } = {}) {
  const scored = pool
    .filter((candidate) => !excludeIds.has(candidate.id))
    .filter(predicate)
    .map((candidate) => ({
      candidate,
      score: scoreCandidateForTopicSelection(candidate, selected),
      similarity: maxTopicSimilarity(candidate, selected),
    }))
    .filter((entry) => entry.score > -Infinity)
    .sort((a, b) => b.score - a.score);
  const nonOverlapping = scored.filter((entry) => entry.similarity < 0.62);
  return (nonOverlapping[0] || scored[0])?.candidate || null;
}

function addCandidate({ candidate, selected, selectedIds, targetLimit }) {
  if (!candidate || selectedIds.has(candidate.id) || selected.length >= targetLimit) return;
  selected.push(candidate);
  selectedIds.add(candidate.id);
}

function scoreCandidateForTopicSelection(candidate, selected) {
  const classification = candidate.classification || {};
  let score = Number(candidate.content_pillar_fit_score) || 1;
  if (typeof candidate.fit_score === 'number') score += candidate.fit_score * 1.2;
  if (typeof classification.fit_score === 'number') score += classification.fit_score * 0.8;

  const source = String(candidate.source || '').toLowerCase();
  if (['reddit_search', 'reddit', 'x_search'].includes(source)) score += 0.75;
  if (/news|official|article|rss/.test(source)) score += 0.35;

  const riskFlags = [
    ...(Array.isArray(candidate.risk_flags) ? candidate.risk_flags : []),
    ...(Array.isArray(classification.risk_flags) ? classification.risk_flags : []),
  ].join(' ');
  if (/리서치 부족|근거 부족|후킹.*약|자료.*부족/.test(riskFlags)) score -= 0.8;

  const pillarCount = selected.filter((entry) => entry.selected_content_pillar === candidate.selected_content_pillar).length;
  score -= pillarCount * 0.45;

  const overlapPenalty = selected.reduce((maxPenalty, entry) => (
    Math.max(maxPenalty, topicSimilarity(candidate, entry))
  ), 0);
  score -= overlapPenalty * 1.4;

  return Math.round(score * 100) / 100;
}

function topicSimilarity(a, b) {
  const aTokens = topicTokens(a);
  const bTokens = topicTokens(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let hits = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) hits += 1;
  }
  return hits / Math.min(aTokens.size, bTokens.size);
}

function maxTopicSimilarity(candidate, selected) {
  return selected.reduce((max, entry) => Math.max(max, topicSimilarity(candidate, entry)), 0);
}

function topicTokens(candidate) {
  const text = [
    candidate.title,
    candidate.recommended_title,
    candidate.one_line,
    candidate.content_angle,
    candidate.reader_problem,
    candidate.topic_cluster,
  ].filter(Boolean).join(' ').toLowerCase();
  const stopWords = new Set(['그리고', '하지만', '이것', '저것', '오늘', '요즘', '마케팅', '콘텐츠', '브랜드', '운영자', '사람', '방식']);
  return new Set(
    text
      .replace(/[^\p{L}\p{N}\s#_.-]/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopWords.has(token))
      .slice(0, 40),
  );
}

function relabelCandidates(candidates) {
  return candidates.map((candidate, idx) => ({
    ...candidate,
    label: `[후보 ${idx + 1}]`,
    candidate_index: idx + 1,
    selection_lane: candidate.selected_content_pillar || null,
    selection_mode: 'pillar_first_topic_discovery',
  }));
}

function clusterBoost({ key, cluster, text }) {
  const c = String(cluster || '').toLowerCase();
  if (/trend|ai|platform|search|news/.test(c) && key === 'trend_plain') return 0.55;
  if (/content|creative|showcase|copy/.test(c) && key === 'content_showcase') return 0.45;
  if (/cost|ad|ads|spend/.test(c) && key === 'cost_before_spend') return 0.45;
  if (/action|today|execution/.test(c) && key === 'do_today') return 0.4;
  if (/observation|consumer|viral/.test(c) && key === 'current_observation') return 0.4;
  if (/검색|ai|플랫폼|업데이트/.test(text) && key === 'trend_plain') return 0.25;
  return 0;
}

function buildPillarReason({ key, label, source, text, keywordHits, classification }) {
  const sourceLabel = buildResearchSourceSummary(source);
  if (key === 'trend_plain') {
    return `${sourceLabel}에서 나온 변화 신호를 쉬운 말로 번역하는 편이 자연스럽습니다. ${keywordHits[0] ? `"${keywordHits[0]}" 신호도 있습니다.` : '실행 팁보다 흐름 해석이 먼저입니다.'}`;
  }
  if (key === 'current_observation') {
    return '바로 따라 하는 방법보다 사람들이 왜 반응하는지 관찰하는 글로 풀 때 어색함이 적습니다.';
  }
  if (key === 'do_today') {
    return '본문에 오늘 바꿔볼 행동이나 입력값으로 이어질 단서가 있어 실행형으로 확장할 수 있습니다.';
  }
  if (key === 'cost_before_spend') {
    return '돈을 쓰기 전에 판단해야 할 비용/성과 신호가 있어 점검형 기둥에 맞습니다.';
  }
  if (key === 'content_showcase') {
    return '표현, 소재, 문구, 보여주는 방식의 문제로 풀면 브랜드 운영자가 바로 이해하기 쉽습니다.';
  }
  return `${label} 기둥과 가장 가까운 신호가 있습니다. 독자 문제: ${classification.reader_problem || text.slice(0, 40) || '미상'}`;
}

function buildPillarRisk(key) {
  const risks = {
    cost_before_spend: '비용 문제가 아닌 소재를 억지로 광고비 점검으로 몰면 공감이 약해집니다.',
    do_today: '근거가 얇은 소재를 실행팁으로 몰면 뻔한 체크리스트가 됩니다.',
    current_observation: '정보가 많은 소재를 관찰형으로만 쓰면 알맹이가 부족해질 수 있습니다.',
    trend_plain: '흐름 설명만 하고 독자 장면이 없으면 뉴스 요약처럼 보일 수 있습니다.',
    content_showcase: '표현 문제로만 좁히면 이슈의 맥락이나 소비자 감정을 놓칠 수 있습니다.',
  };
  return risks[key] || '억지로 고정하면 후보 간 차이가 줄어듭니다.';
}

function buildTargetFitSummary({ classification, theme }) {
  const persona = normalizePersona(theme?.target_persona || classification?.suggested_persona || 'general');
  const problem = classification?.reader_problem || classification?.practical_takeaway || '';
  const personaLabel = persona === 'unknown' ? '미분류 독자' : '작은 사업자/브랜드 운영자';
  if (problem) return `${personaLabel} 기준으로 "${problem}" 지점과 연결됩니다.`;
  return `${personaLabel} 기준으로 읽히되, 특정 업종으로 단정하지 않습니다.`;
}

function buildResearchSourceSummary(source) {
  const s = String(source || '').toLowerCase();
  if (s.includes('reddit')) return 'Reddit 해외 주제 후보';
  if (s.includes('x_search')) return 'X 해외 이슈 후보';
  if (s.includes('news')) return '뉴스/웹 수집 자료';
  if (s.includes('official')) return '공식 자료';
  if (s.includes('threads')) return 'Threads 말투 참고 자료';
  return source || '수집 자료';
}

function buildWritingDirection({ selected, classification, source }) {
  const treatment = /reddit|x_search|news|official/i.test(source || '') ? '해외/이슈 맥락을 한국어로 보기 좋게 번역' : '수집 신호를 기브니즈 관점으로 재해석';
  const angle = classification?.content_angle || (Array.isArray(classification?.content_angles) ? classification.content_angles[0] : '');
  return `${selected.label} 기둥으로 잡고, ${treatment}${angle ? `합니다. 핵심 앵글은 "${angle}"입니다.` : '합니다.'}`;
}
