import { NextResponse } from 'next/server';
import { isReservedServiceSlug, resolveServiceSlug } from '@/lib/serviceRoutes';

export function proxy(request) {
  const url = request.nextUrl;
  const segments = url.pathname.split('/').filter(Boolean);

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
