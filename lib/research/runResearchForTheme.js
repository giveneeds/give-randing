// 주제 1건에 대해 리서치 1회 실행 — 키워드별 검색 + 결과 합치기 + LLM 인사이트 추출 + 스냅샷 저장.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { searchQuery } from './searchProvider.js';
import { extractInsights } from './extractInsights.js';

/**
 * @param {{ themeId: string, maxKeywords?: number }} args
 * @returns {Promise<{ snapshotId: string, resultCount: number, insights: object }>}
 */
export async function runResearchForTheme({ themeId, maxKeywords = 3 }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  const { data: theme, error: themeErr } = await supabaseAdmin
    .from('content_themes')
    .select('id, name, research_keywords')
    .eq('id', themeId)
    .maybeSingle();
  if (themeErr || !theme) throw new Error('주제를 찾을 수 없음');

  const keywords = (theme.research_keywords || []).slice(0, maxKeywords);
  if (keywords.length === 0) {
    throw new Error('리서치 키워드가 비어 있습니다. 주제 편집에서 키워드를 추가해 주세요.');
  }

  // 키워드별로 검색 → 결과 모두 합침 (도메인 기준 dedupe).
  const seenUrls = new Set();
  const merged = [];
  for (const kw of keywords) {
    try {
      const { results } = await searchQuery(kw, { maxResults: 8 });
      for (const r of results) {
        if (!r.url || seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        merged.push({ ...r, source_keyword: kw });
      }
    } catch (e) {
      // 키워드 1개 실패해도 다음 키워드 계속.
      console.error(`[research] 키워드 "${kw}" 실패:`, e.message);
    }
  }

  // 인사이트 추출 (LLM 1회).
  const compositeQuery = keywords.join(' / ');
  const insights = await extractInsights({
    themeName: theme.name,
    query: compositeQuery,
    results: merged,
  });

  // 스냅샷 저장.
  const { data: snap, error: snapErr } = await supabaseAdmin
    .from('theme_research_snapshots')
    .insert({
      theme_id: theme.id,
      query: compositeQuery,
      results: merged,
      insights,
      model: insights.model,
      cost_usd: insights.cost_usd,
      result_count: merged.length,
    })
    .select('id')
    .single();
  if (snapErr) throw snapErr;

  return {
    snapshotId: snap.id,
    resultCount: merged.length,
    insights,
  };
}

/**
 * 주제별 가장 최근 스냅샷의 insights 1건을 반환 — brief 생성 시 컨텍스트로 사용.
 */
export async function getLatestInsightsForTheme(themeId) {
  if (!supabaseAdmin || !themeId) return null;
  const { data } = await supabaseAdmin
    .from('theme_research_snapshots')
    .select('insights, snapshotted_at')
    .eq('theme_id', themeId)
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.insights || null;
}
