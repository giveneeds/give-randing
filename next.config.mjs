import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/service/place-optimize',
        destination: '/service/place-marketing',
        permanent: true,
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
