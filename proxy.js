import { NextResponse } from 'next/server';
import { isReservedServiceSlug, resolveServiceSlug } from '@/lib/serviceRoutes';

const GONE_PATHS = new Set([
  '/$',
  '/%24',
  '/resource/file/company_intro.pdf',
]);

const LEGACY_REDIRECT_PATHS = new Map([
  ['/magazine/광고-효율을-결정짓는-7가지-필수-체크리스트', '/magazine/click-to-sales-7-tips'],
]);

function redirectWithoutQuery(url, pathname) {
  const target = url.clone();
  target.pathname = pathname;
  target.search = '';
  return NextResponse.redirect(target, 308);
}

function goneResponse() {
  return new NextResponse('Gone', {
    status: 410,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export function proxy(request) {
  const url = request.nextUrl;
  const segments = url.pathname.split('/').filter(Boolean);
  let decodedPathname = url.pathname;
  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    decodedPathname = url.pathname;
  }

  if (GONE_PATHS.has(decodedPathname)) {
    return goneResponse();
  }

  const legacyRedirect = LEGACY_REDIRECT_PATHS.get(decodedPathname);
  if (legacyRedirect) {
    return redirectWithoutQuery(url, legacyRedirect);
  }

  if (segments[0] === 'service' && segments[1]) {
    const targetSlug = resolveServiceSlug(segments[1]);
    if (targetSlug) {
      const target = url.clone();
      target.pathname = `/${targetSlug}`;
      return NextResponse.redirect(target, 308);
    }
  }

  if (segments.length === 1 && !url.pathname.includes('.') && !isReservedServiceSlug(segments[0])) {
    const targetSlug = resolveServiceSlug(segments[0]);
    if (targetSlug && targetSlug !== segments[0]) {
      const target = url.clone();
      target.pathname = `/${targetSlug}`;
      return NextResponse.redirect(target, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
