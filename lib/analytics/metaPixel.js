const DEFAULT_META_PIXEL_ID = '3470213669812233';

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || DEFAULT_META_PIXEL_ID;

function hasWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isMetaPixelEnabled() {
  return Boolean(META_PIXEL_ID) && hasWindow();
}

export function isAdminPath(pathname) {
  return Boolean(pathname) && pathname.startsWith('/admin');
}

export function initMetaPixel() {
  if (!isMetaPixelEnabled()) return false;

  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue.push(args);
      }
    };

    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  if (!window.__giveneedsMetaPixelInitialized) {
    window.fbq('init', META_PIXEL_ID);
    window.__giveneedsMetaPixelInitialized = true;
  }

  return true;
}

export function metaPageview() {
  if (!initMetaPixel()) return;
  window.fbq('track', 'PageView');
}

export function metaLead(params = {}) {
  if (!initMetaPixel()) return;
  window.fbq('track', 'Lead', params);
}

export function metaContact(params = {}) {
  if (!initMetaPixel()) return;
  window.fbq('track', 'Contact', params);
}
