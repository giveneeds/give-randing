import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { RawDocument } from '../types/index.js';
import { checkUrl } from './urlFilter.js';

// Playwright 기반 단일 페이지 크롤러.
// MVP에서는 로그인/우회/세션 캐싱 없이 가장 단순하게 작동.
// 한국어 페이지를 위해 locale과 Accept-Language를 명시한다.

const PAGE_TIMEOUT_MS = 30_000;
const POST_LOAD_WAIT_MS = 2_000;
const RETRY_DELAY_MS = 5_000;

export interface CrawlSuccess {
  ok: true;
  doc: RawDocument;
}
export interface CrawlFailure {
  ok: false;
  url: string;
  reason: string;
  attempt: number;
}
export type CrawlResult = CrawlSuccess | CrawlFailure;

// Browser/Context는 시드 전체에서 재사용한다 (매 URL마다 brower launch는 비용 낭비).
export class PlaywrightCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      locale: 'ko-KR',
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }

  // 단일 URL을 가져와 RawDocument로 반환. retry 1회 정책 포함.
  async fetch(url: string): Promise<CrawlResult> {
    const filterCheck = checkUrl(url);
    if (filterCheck.blocked) {
      return {
        ok: false,
        url,
        reason: filterCheck.reason ?? '차단 도메인',
        attempt: 0,
      };
    }

    return this.fetchWithRetry(url, filterCheck.host, 1);
  }

  private async fetchWithRetry(url: string, host: string, attempt: number): Promise<CrawlResult> {
    if (!this.context) {
      throw new Error('PlaywrightCrawler.init()을 먼저 호출해야 합니다.');
    }

    const page = await this.context.newPage();
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT_MS,
      });

      // 4xx → 즉시 skip. 재시도해도 같은 결과.
      const status = response?.status() ?? 0;
      if (status >= 400 && status < 500) {
        return {
          ok: false,
          url,
          reason: `HTTP ${status}`,
          attempt,
        };
      }

      // 광고/추가 리소스 로드 대기 (networkidle은 한국 사이트에서 잘 안 끝남).
      await page.waitForTimeout(POST_LOAD_WAIT_MS);

      const html = await page.content();
      const doc: RawDocument = {
        source_url: url,
        domain: host,
        raw_html: html,
        fetched_at: new Date().toISOString(),
      };
      return { ok: true, doc };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // 5xx, timeout, network error → retry 1회.
      if (attempt === 1 && this.isTransient(reason)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.fetchWithRetry(url, host, 2);
      }
      return { ok: false, url, reason, attempt };
    } finally {
      await page.close();
    }
  }

  // 일시적(retry 가치 있음) 에러인지 판정. 보수적으로 잡는다.
  private isTransient(reason: string): boolean {
    const transientHints = ['timeout', 'net::ERR_', 'ECONNRESET', 'ETIMEDOUT', '5'];
    const lower = reason.toLowerCase();
    return transientHints.some((hint) => lower.includes(hint.toLowerCase()));
  }
}
