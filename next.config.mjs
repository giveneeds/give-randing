import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/board',
        destination: '/for-you',
        permanent: true,
      },
      {
        source: '/pages/about/about.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pages/inquiry/inquiry.php',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/pages/service/site.php',
        destination: '/premiumweb',
        permanent: true,
      },
      {
        source: '/pages/service/blog.php',
        destination: '/blogmarketing',
        permanent: true,
      },
      {
        source: '/pages/service/press.php',
        destination: '/pressrelease',
        permanent: true,
      },
      {
        source: '/pages/service/place.php',
        destination: '/placemarketing',
        permanent: true,
      },
      {
        source: '/pages/board/board.list.php',
        has: [{ type: 'query', key: 'board_no', value: '72' }],
        destination: '/for-you',
        permanent: true,
      },
      {
        source: '/pages/board/board.list.php',
        has: [{ type: 'query', key: 'board_no', value: '73' }],
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/pages/board/board.view.php',
        has: [{ type: 'query', key: 'board_no', value: '72' }],
        destination: '/for-you',
        permanent: true,
      },
      {
        source: '/pages/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/magazine/place2',
        destination: '/magazine/naver-place-seo-guide',
        permanent: true,
      },
      {
        source: '/magazine/광고-효율을-결정짓는-7가지-필수-체크리스트',
        destination: '/magazine/click-to-sales-7-tips',
        permanent: true,
      },
      {
        source: '/service/place-optimize',
        destination: '/placemarketing',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/opengraph-image',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['127.0.0.1'],
  // 상위 폴더의 bun.lock 때문에 워크스페이스 루트가 잘못 추론되는 문제 방지 — give-randing 폴더로 고정
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.giveneeds.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'giveneeds.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'give-randing.vercel.app',
      },
    ],
    formats: ['image/webp'],
    qualities: [75],
  },
};

export default nextConfig;
