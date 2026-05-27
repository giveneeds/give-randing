import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { searchQuery } from '@/lib/research/searchProvider';
import { enrichItem } from '@/lib/llm';
import { getLatestInsightsForTheme } from '@/lib/research/runResearchForTheme';
import { buildPillarDrivenSourceQueries, isOffTopicCollectedItem } from './pillarResearchQueries.js';

const SOCIAL_TARGETS = [
  {
    source: 'reddit_search',
    label: 'Reddit',
    domains: ['reddit.com'],
  },
  {
    source: 'x_search',
    label: 'X',
    domains: ['x.com', 'twitter.com'],
  },
];

/**
 * Ensures phase-1 Telegram proposals include one Reddit and one X overseas topic when possible.
 * Reddit/X are used here as topic discovery sources for global marketing/AI issues,
 * not as Korean tone/VOC sampling sources.
 * These are stored as normal agent_items so the existing selection/parser flow works.
 *
 * @param {{jobId: string, seedItems?: Array<object>}} args
 */
export async function ensureSocialCandidates({ jobId, seedItems = [] }) {
  if (!supabaseAdmin || !jobId) return { inserted: 0, skipped: true, reason: 'missing_supabase_or_job' };

  const seeds = await buildSearchSeeds(seedItems);
  if (seeds.length === 0) return { inserted: 0, skipped: true, reason: 'no_search_seed' };

  let inserted = 0;
  const errors = [];

  for (const target of SOCIAL_TARGETS) {
    try {
      const alreadyInJob = seedItems.some((item) => item.source === target.source || (target.source === 'reddit_search' && item.source === 'reddit'));
      // Even when a Reddit source already exists, keep one search-backed candidate if the job has no explicit overseas topic supplement.
      const theme = seeds[0]?.theme || null;
      const queryEntries = buildSocialQueryEntries({ target, seeds, theme });
      const item = await findFreshSocialResult({ target, queryEntries });
      if (!item) continue;
      if (alreadyInJob && item.raw_data?.purpose !== 'required_social_topic_candidate') {
        // No-op placeholder for readability; currently we still insert the supplemental result below.
      }

      const researchContext = theme?.id ? await getLatestInsightsForTheme(theme.id) : null;
      const enriched = await enrichItem({
        title: item.normalized?.title,
        text: item.normalized?.extracted_text,
        sourceLabel: `${target.label} 해외 주제 후보 / ${item.raw_data?.generated_query || item.raw_data?.query || ''}`,
        researchContext,
        themeHint: theme ? {
          name: theme.name,
          target_persona: theme.target_persona,
          target_topic_cluster: theme.target_topic_cluster,
        } : null,
      });

      const classification = enriched.brief ? {
        suggested_persona: enriched.brief.target_persona,
        business_contexts: enriched.brief.business_contexts,
        suggested_topic_cluster: enriched.brief.topic_cluster,
        fit_score: enriched.brief.fit_score,
        relevance_reason: enriched.brief.relevance_reason,
        reader_problem: enriched.brief.reader_problem,
        why_now: enriched.brief.why_now,
        signal_type: enriched.brief.signal_type,
        content_angles: enriched.brief.content_angles,
        content_angle: enriched.brief.content_angle,
        practical_takeaway: enriched.brief.practical_takeaway,
        execution_steps: enriched.brief.execution_steps,
        tone_direction: enriched.brief.tone_direction,
        recommended_title: enriched.brief.recommended_title,
        lead_magnet: enriched.brief.lead_magnet,
        lead_magnet_idea: enriched.brief.lead_magnet_idea,
        approval_reason: enriched.brief.approval_reason,
        risk_flags: [
          ...(Array.isArray(enriched.brief.risk_flags) ? enriched.brief.risk_flags : []),
          '해외 주제 후보',
        ],
        generated_at: enriched.brief.generated_at,
        model: enriched.brief.model,
      } : null;

      const { data: existing } = await supabaseAdmin
        .from('agent_items')
        .select('id')
        .eq('source', item.source)
        .eq('post_id', item.post_id)
        .maybeSingle();
      if (existing?.id) continue;

      const { error } = await supabaseAdmin
        .from('agent_items')
        .insert({
          job_id: jobId,
          source: item.source,
          source_account: item.source_account,
          post_id: item.post_id,
          post_url: item.post_url,
          posted_at: item.posted_at,
          raw_data: item.raw_data,
          normalized: item.normalized,
          classification,
          summary: enriched.summary,
          translation: enriched.translation,
          theme_id: theme?.id || null,
          research_context: researchContext || null,
          status: 'collected',
          send_flag: false,
        });
      if (error) throw error;
      inserted += 1;
    } catch (e) {
      errors.push(`${target.label}: ${e.message}`);
    }
  }

  return { inserted, skipped: false, errors };
}

async function buildSearchSeeds(seedItems) {
  const seeds = [];
  const themeIds = [...new Set((seedItems || []).map((item) => item.theme_id).filter(Boolean))];
  const themeMap = new Map();
  if (themeIds.length > 0) {
    const { data: themes } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster, research_keywords')
      .in('id', themeIds);
    for (const theme of themes || []) themeMap.set(theme.id, theme);
  }

  for (const item of seedItems || []) {
    const c = item.classification || {};
    const theme = themeMap.get(item.theme_id) || null;
    const query = [
      c.content_angle,
      Array.isArray(c.content_angles) ? c.content_angles[0] : null,
      c.reader_problem,
      item.normalized?.title,
      theme?.research_keywords?.[0],
      theme?.name,
    ].filter(Boolean)[0];
    if (query) seeds.push({ query, theme });
  }

  if (seeds.length === 0) {
    const { data: themes } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster, research_keywords')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(3);
    for (const theme of themes || []) {
      const query = theme.research_keywords?.[0] || theme.name;
      if (query) seeds.push({ query, theme });
    }
  }

  return seeds.slice(0, 3);
}

function buildSocialQueryEntries({ target, seeds, theme }) {
  const seed = seeds.find((s) => s.query) || seeds[0];
  const pseudoSource = {
    source_type: target.source,
    identifier: seed?.query || theme?.name || 'small business marketing',
    meta: { pillar_query_limit: 3 },
  };
  const entries = buildPillarDrivenSourceQueries(pseudoSource, { linkedTheme: theme, trigger: 'cron' });
  return entries.length > 0
    ? entries
    : [{ query: pseudoSource.identifier, pillar: null, reason: 'fallback' }];
}

async function findFreshSocialResult({ target, queryEntries }) {
  for (const entry of queryEntries || []) {
    const query = entry.query || entry.source?.identifier;
    if (!query) continue;
    const { results } = await searchQuery(query, {
      includeDomains: target.domains,
      maxResults: 8,
      searchDepth: 'basic',
    });
    for (const result of results || []) {
      if (!result.url) continue;
      const postId = `${target.source}:${result.url}`.slice(0, 200);
      const item = {
        source: target.source,
        source_account: result.source_domain || target.domains[0],
        post_id: postId,
        post_url: result.url,
        posted_at: null,
        raw_data: {
          source_url: result.url,
          domain: result.source_domain || null,
          fetched_at: new Date().toISOString(),
          query,
          generated_query: query,
          content_pillar_query: entry.pillar || null,
          pillar_query_reason: entry.reason || null,
          score: result.score,
          purpose: 'overseas_topic_candidate',
        },
        normalized: {
          title: result.title || result.url,
          extracted_text: result.content || '',
          headings: result.title ? [result.title] : [],
          meta_description: result.content || null,
          published_at: null,
        },
      };
      if (isOffTopicCollectedItem(item)) continue;
      const { data: existing } = await supabaseAdmin
        .from('agent_items')
        .select('id')
        .eq('source', target.source)
        .eq('post_id', postId)
        .maybeSingle();
      if (existing?.id) continue;
      return item;
    }
  }
  return null;
}
