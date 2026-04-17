const ANON_KEY = 'gvnds.anon_id';
const SESSION_TS_KEY = 'gvnds.session_ts';
const SESSION_ID_KEY = 'gvnds.session_id';
const UTM_KEY = 'gvnds.utm';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

// ── Anonymous ID ──
export function getAnonymousId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

// ── UTM 파싱 + 캐시 ──
export function captureUtm() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utm = {};
  let hasUtm = false;

  for (const k of keys) {
    const v = params.get(k);
    if (v) {
      utm[k] = v;
      hasUtm = true;
    }
  }

  if (hasUtm) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    return utm;
  }

  try {
    const cached = sessionStorage.getItem(UTM_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch { return {}; }
}

export function getStoredUtm() {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(UTM_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch { return {}; }
}

// ── 디바이스/브라우저 감지 ──
export function detectDevice() {
  if (typeof navigator === 'undefined') return { device_type: 'unknown', browser: 'unknown' };

  const ua = navigator.userAgent || '';
  let device_type = 'desktop';
  if (/Mobi|Android/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';

  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return { device_type, browser };
}

// ── 채널 그룹핑 (서버에서도 사용 가능) ──
export function deriveChannelGroup({ utm_source, utm_medium, referrer }) {
  const src = (utm_source || '').toLowerCase();
  const med = (utm_medium || '').toLowerCase();
  const ref = (referrer || '').toLowerCase();

  if (med === 'cpc' || med === 'ppc') return 'paid_search';
  if (['facebook', 'instagram', 'meta', 'fb', 'ig'].includes(src) && ['paid', 'cpc', 'cpm', 'social'].includes(med)) return 'paid_social';
  if (med === 'email' || med === 'newsletter') return 'email';
  if (src === 'kakao' || med === 'kakao') return 'kakao';

  if (!src && !med) {
    if (!ref) return 'direct';
    if (/google|naver|daum|bing|yahoo/i.test(ref)) return 'organic';
    return 'referral';
  }

  if (med === 'organic') return 'organic';
  if (med === 'referral') return 'referral';
  if (med === 'social') return 'organic_social';

  return 'other';
}

// ── 세션 관리 ──
export function isNewSession() {
  if (typeof window === 'undefined') return true;
  const last = localStorage.getItem(SESSION_TS_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > SESSION_TIMEOUT;
}

export function touchSession() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_TS_KEY, Date.now().toString());
}

export function getSessionId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_ID_KEY);
}

export function setSessionId(id) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_ID_KEY, id);
}

// ── 세션 시작 (서버에 POST) ──
export async function startSession() {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return null;

  const utm = captureUtm();
  const device = detectDevice();
  const referrer = typeof document !== 'undefined' ? document.referrer : '';
  const landingUrl = typeof window !== 'undefined' ? window.location.pathname : '';

  const channelGroup = deriveChannelGroup({
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    referrer,
  });

  try {
    const res = await fetch('/api/events/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: anonymousId,
        first_url: landingUrl,
        landing_url: landingUrl,
        referrer,
        ...utm,
        channel_group: channelGroup,
        ...device,
      }),
    });
    const data = await res.json();
    if (data.session_id) {
      setSessionId(data.session_id);
      touchSession();
    }
    return data.session_id || null;
  } catch (e) {
    console.error('[tracker] session start failed:', e);
    return null;
  }
}

// ── 이벤트 전송 ──
export async function trackEvent(eventType, eventData = {}) {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return;

  const sessionId = getSessionId();
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';

  touchSession();

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: anonymousId,
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        page_url: pageUrl,
      }),
    });
  } catch (e) {
    console.error('[tracker] event failed:', e);
  }
}

// ── 리드 폼에서 사용: 현재 추적 데이터 스냅샷 ──
export function getTrackingSnapshot() {
  const utm = getStoredUtm();
  const device = detectDevice();
  return {
    anonymous_id: getAnonymousId(),
    ...utm,
    ...device,
    channel_group: deriveChannelGroup({
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    }),
    first_visit_url: typeof window !== 'undefined' ? window.location.pathname : '',
  };
}
