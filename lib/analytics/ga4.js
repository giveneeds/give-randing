/**
 * GA4 (Google Analytics 4) helper.
 *
 * Setup: see docs/SETUP_GA4.md
 * Env: NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. G-XXXXXXXXXX)
 *
 * Coexists with lib/tracker.js (자체 Supabase 추적). 두 시스템은 독립적.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const gaEnabled = () => Boolean(GA_MEASUREMENT_ID) && typeof window !== 'undefined' && typeof window.gtag === 'function';

/**
 * 페이지뷰 전송. Next.js App Router 의 클라이언트 라우팅에서는 자동 발생하지 않으므로
 * components/GoogleAnalytics.js 가 usePathname() 변화 시 수동 호출.
 */
export function pageview(url) {
  if (!gaEnabled()) return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

/**
 * 임의 이벤트 전송. params 는 GA4 에 전달되는 이벤트 매개변수 객체.
 *
 * @param {string} eventName - GA4 이벤트 이름 (snake_case 권장)
 * @param {object} params - 이벤트 매개변수
 */
export function gaEvent(eventName, params = {}) {
  if (!gaEnabled()) return;
  try {
    window.gtag('event', eventName, params);
  } catch (e) {
    // 광고 차단기 등에서 발생 가능 — silent
  }
}

/**
 * 사전 정의된 이벤트 래퍼들 — 호출부 가독성을 위해.
 * docs/SETUP_GA4.md 의 "자동 수집되는 이벤트 목록" 표와 동일한 네이밍.
 */
export const ga = {
  leadFormView: ({ formMode, campaignId }) =>
    gaEvent('lead_form_view', { form_mode: formMode, campaign_id: campaignId || null }),

  kakaoLoginStart: ({ campaignId, pagePath }) =>
    gaEvent('kakao_login_start', { campaign_id: campaignId || null, page_path: pagePath }),

  leadFormSubmit: ({ formMode, campaignId, leadType }) =>
    gaEvent('lead_form_submit', {
      form_mode: formMode,
      campaign_id: campaignId || null,
      lead_type: leadType,
    }),

  ctaClick: ({ ctaLabel, ctaLocation, pagePath }) =>
    gaEvent('cta_click', { cta_label: ctaLabel, cta_location: ctaLocation, page_path: pagePath }),
};
