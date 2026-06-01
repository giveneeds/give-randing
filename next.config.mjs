import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // 상위 폴더의 bun.lock 때문에 워크스페이스 루트가 잘못 추론되는 문제 방지 — give-randing 폴더로 고정
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
