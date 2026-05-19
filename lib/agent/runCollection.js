// 수집 오케스트레이터: agent_sources 에서 active=true 인 행을 읽고
// 각 source_type 에 맞는 collector 를 호출, LLM enrich, agent_items INSERT.
// agent_jobs 에 실행 이력 기록.
//
// 핵심 정책:
// - cron 트리거: src.meta.daily_limit (기본 1) 만큼 fresh(아직 DB에 없는) 아이템만 INSERT.
//   매체에서 받은 top N 이 이미 다 DB에 있으면 다음 신선한 글로 넘어가서 찾음.
// - 수동 트리거(어드민): cap 없이 전체 처리.
// - enrich(LLM 호출)는 fresh 확정된 아이템에만 수행 → 중복 글 enrich 비용 0.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { collectNaverNews } from '@/lib/collectors/naverNews';
import { collectGoogleNewsRss } from '@/lib/collectors/googleNewsRss';
import { collectHackerNews } from '@/lib/collectors/hackerNews';
import { enrichItem } from '@/lib/llm';

const COLLECTORS = {
  naver_news: (s) => collectNaverNews(s.identifier, s.meta || {}),
  google_news: (s) => collectGoogleNewsRss(s.identifier, s.meta || {}),
  hackernews: (s) => collectHackerNews(s.identifier, s.meta || {}),
};

/**
 * @param {{trigger?:'cron'|'manual', sourceIds?:string[]}} opts
 * @returns {Promise<{jobId, stats}>}
 */
export async function runCollection(opts = {}) {
  if (!supabaseAdmin) throw new Error('service role 미설정');
  const trigger = opts.trigger || 'manual';

  // 1) job 시작
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('agent_jobs')
    .insert({
      started_at: new Date().toISOString(),
      status: 'running',
      trigger,
      stats: {},
    })
    .select('id')
    .single();
  if (jobErr) throw jobErr;
  const jobId = job.id;

  const stats = {
    collected: 0,
    failed: 0,
    skipped: 0,
    enriched: 0,
    enrich_failed: 0,
    by_source: {},
  };
  const errors = [];

  try {
    // 2) active 소스 로드
    let query = supabaseAdmin
      .from('agent_sources')
      .select('id, source_type, identifier, label, meta')
      .eq('active', true);
    if (opts.sourceIds?.length) {
      query = query.in('id', opts.sourceIds);
    }
    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;
    if (!sources || sources.length === 0) {
      throw new Error('active 소스가 없습니다. /admin/content-studio/sources 에서 등록하세요.');
    }

    // 3) 소스별 수집 + enrich + INSERT
    for (const src of sources) {
      const fn = COLLECTORS[src.source_type];
      if (!fn) {
        errors.push(`unsupported source_type: ${src.source_type}`);
        continue;
      }

      let items = [];
      try {
        items = await fn(src);
      } catch (e) {
        errors.push(`collect ${src.source_type}/${src.identifier}: ${e.message}`);
        stats.failed += 1;
        continue;
      }

      // 사전 중복 체크 — (source, post_id) 기준으로 이미 들어와 있는 게 있는지 1쿼리로 확인.
      // 결과: 중복은 enrich 호출 전에 걸러져서 LLM 비용 낭비를 막는다.
      const postIds = items.map((it) => it.post_id).filter(Boolean);
      let existingSet = new Set();
      if (postIds.length > 0) {
        const { data: existing } = await supabaseAdmin
          .from('agent_items')
          .select('post_id')
          .eq('source', src.source_type)
          .in('post_id', postIds);
        existingSet = new Set((existing || []).map((e) => e.post_id));
      }

      // collector 응답 순서를 신선도 순으로 신뢰하고, 그 안에서 fresh 인 것만 추림.
      const freshItems = items.filter((it) => it.post_id && !existingSet.has(it.post_id));
      // 사전 중복으로 걸러진 건수는 skipped 로 기록.
      stats.skipped += items.length - freshItems.length;

      // cron: fresh 중 cap (기본 1) 만큼만 처리. 매체에서 정말 fresh가 없으면 0건.
      // manual: cap 없이 전체 fresh 처리.
      let toProcess;
      if (trigger === 'cron') {
        const cap = Number.isFinite(src.meta?.daily_limit) ? Math.max(1, src.meta.daily_limit) : 1;
        toProcess = freshItems.slice(0, cap);
      } else {
        toProcess = freshItems;
      }
      stats.by_source[src.source_type] = (stats.by_source[src.source_type] || 0) + toProcess.length;

      for (const item of toProcess) {
        let enriched = { summary: null, translation: null, brief: null };
        try {
          enriched = await enrichItem({
            title: item.normalized?.title,
            text: item.normalized?.extracted_text,
            sourceLabel: `${src.source_type} / ${src.identifier}`,
          });
          stats.enriched += 1;
        } catch (e) {
          stats.enrich_failed += 1;
          // enrich 실패해도 raw 는 저장
        }

        // brief 결과를 classification 컬럼으로 매핑 — 기존 admin UI/매거진 변환기가
        // suggested_persona / suggested_topic_cluster 키로 분류 정보를 읽기 때문에 호환 유지.
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
          risk_flags: enriched.brief.risk_flags,
          generated_at: enriched.brief.generated_at,
          model: enriched.brief.model,
        } : null;

        const row = {
          job_id: jobId,
          source: item.source,
          source_account: item.source_account || null,
          post_id: item.post_id,
          post_url: item.post_url,
          posted_at: item.posted_at,
          raw_data: item.raw_data,
          normalized: item.normalized,
          classification,
          summary: enriched.summary,
          translation: enriched.translation,
          status: 'collected',
          send_flag: false,
        };

        const { error: insErr } = await supabaseAdmin
          .from('agent_items')
          .insert(row);

        if (insErr) {
          if (insErr.code === '23505') {
            stats.skipped += 1;   // 같은 (source, post_id) 중복
          } else {
            errors.push(`insert ${item.post_id}: ${insErr.message}`);
            stats.failed += 1;
          }
        } else {
          stats.collected += 1;
        }
      }

      // 소스의 last_collected_at 갱신
      await supabaseAdmin
        .from('agent_sources')
        .update({ last_collected_at: new Date().toISOString() })
        .eq('id', src.id);
    }

    // 4) job 종료
    const finalStatus = stats.failed === 0 ? 'success' : (stats.collected > 0 ? 'partial' : 'failed');
    await supabaseAdmin
      .from('agent_jobs')
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        stats,
        error: errors.length ? errors.join('\n').slice(0, 5000) : null,
      })
      .eq('id', jobId);

    return { jobId, stats, errors };
  } catch (e) {
    await supabaseAdmin
      .from('agent_jobs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed',
        stats,
        error: e.message,
      })
      .eq('id', jobId);
    throw e;
  }
}
