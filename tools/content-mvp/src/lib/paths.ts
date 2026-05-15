import { fileURLToPath } from 'node:url';
import path from 'node:path';

// src/lib/paths.ts → ../../ → tools/content-mvp/
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');

export const PATHS = {
  root: ROOT,
  inputDir: path.join(ROOT, 'data', 'input'),
  rawDir: path.join(ROOT, 'data', 'raw'),
  processedDir: path.join(ROOT, 'data', 'processed'),
  seedUrls: path.join(ROOT, 'data', 'input', 'seed-urls.json'),
  rawIndex: path.join(ROOT, 'data', 'raw', '_index.json'),
  failures: path.join(ROOT, 'data', 'raw', 'failures.jsonl'),
} as const;

// 특정 해시에 해당하는 raw/processed 파일 경로를 만들어 반환.
export function rawPath(hash: string): string {
  return path.join(PATHS.rawDir, `${hash}.json`);
}

export function processedPath(hash: string): string {
  return path.join(PATHS.processedDir, `${hash}.json`);
}
