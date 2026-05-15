import { createHash } from 'node:crypto';

// URL → 12자 단축 hash. 파일명/인덱스 키로 쓴다.
// 12자면 충돌 확률은 2^-48 수준이라 MVP 규모에서는 무시 가능.
export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}
