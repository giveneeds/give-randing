# content-mvp — 기브니즈 콘텐츠 자동화 MVP

기브니즈 inbound lead engine의 1차 검증용 독립 프로토타입입니다.
**수집 → 본문 추출 → 토픽 분류 → 요약** 까지의 파이프라인 형태를 LLM 없이 한국어 콘텐츠로 빠르게 굴려보기 위한 도구입니다.

> 이 도구는 `give-randing` Next.js 앱과 완전히 격리됩니다. 자체 `package.json` / `tsconfig.json` / `node_modules` 를 사용하며, 메인 빌드·배포에 영향을 주지 않습니다.

---

## 무엇을 하는가

1. `data/input/seed-urls.json` 의 URL 배열을 Playwright Chromium으로 수집
2. `@mozilla/readability` + `jsdom` 으로 본문·헤딩·메타 추출
3. **rule-based** 분류기로 페르소나(`restaurant_owner` / `clinic_owner`)와 토픽 클러스터(예: `place_visibility`, `review_trust`)를 추정
4. **extractive** 요약기로 한 줄 요약·핵심 포인트·`why_it_matters` 생성 (LLM 호출 없음)
5. 문서별 결과를 `data/processed/{hash}.json` 에 저장

분류·요약 모두 **인터페이스 기반**으로 분리되어 있어 추후 LLM 구현체로 한 줄 교체 가능.

---

## 설치

```bash
cd tools/content-mvp
npm install
```

`postinstall` 단계에서 `playwright install chromium` 이 자동 실행됩니다. Chromium 바이너리는 약 170MB이며 다운로드에 1~3분 걸릴 수 있습니다. 실패하면 수동으로:

```bash
npx playwright install chromium
```

---

## 실행

1. 시드 URL을 채웁니다 (`data/input/seed-urls.json`):

```json
[
  { "url": "https://example.com/some-article", "note": "선택 메모" },
  "https://example.com/another-article"
]
```

문자열만 적어도 되고, `{ url, note }` 형태로 적어도 됩니다.

2. 파이프라인 실행:

```bash
npm run dev
```

3. 결과 확인:
- `data/raw/{hash}.json` — 크롤한 원본 HTML + 메타
- `data/raw/_index.json` — URL → hash 인덱스 (중복 재수집 방지)
- `data/raw/failures.jsonl` — 실패 로그 (append-only)
- `data/processed/{hash}.json` — 추출·요약·분류가 모두 합쳐진 최종 산출물

---

## 결과 JSON 스키마 (요약)

```json
{
  "source_url": "...",
  "domain": "...",
  "fetched_at": "ISO8601",
  "title": "...",
  "published_at": "ISO8601 또는 null",
  "meta_description": "... 또는 null",
  "extracted_text": "...",
  "headings": ["...", "..."],
  "one_line_summary": "...",
  "key_points": ["...", "...", "..."],
  "why_it_matters": "... 또는 null",
  "suggested_persona": "restaurant_owner | clinic_owner | unknown",
  "suggested_topic_cluster": "place_visibility | review_trust | ...",
  "classification_confidence": 0.0,
  "matched_keywords": [{ "keyword": "...", "where": "title", "count": 1 }],
  "processed_at": "ISO8601"
}
```

`why_it_matters` 는 분류 confidence가 0.4 미만이거나 분류가 `unclassified` 일 때 **`null`** 로 둡니다. 가짜 인사이트를 만들지 않는 게 운영자 신뢰에 더 중요합니다.

---

## 폴더 구조

```
tools/content-mvp/
├─ data/
│  ├─ input/       # 시드 URL (사용자가 채움)
│  ├─ raw/         # 크롤 원본 + 인덱스 + 실패 로그
│  └─ processed/   # 최종 산출물
├─ src/
│  ├─ types/         # 모든 스키마 SSOT
│  ├─ crawler/       # Playwright + URL 필터
│  ├─ extractor/     # Readability + 메타/헤딩
│  ├─ classifier/    # rule-based + 키워드 사전
│  ├─ summarizer/    # extractive 요약
│  ├─ workflows/     # 파이프라인 시퀀서
│  ├─ lib/           # hash, logger, paths
│  └─ index.ts       # 엔트리포인트
└─ ...
```

---

## 무엇이 MVP에 들어 있지 않은가 (의도적 제외)

- **LLM 호출** — 요약·분류 모두 휴리스틱. 인터페이스만 LLM swap-in 가능하게 열어둠.
- **로그인/세션/안티봇 우회** — 차단 도메인(네이버 블로그·카페·인스타·페북 등)은 자동 skip + 경고.
- **분산 큐잉 / 백그라운드 워커** — 단일 프로세스 순차 처리.
- **DB 저장** — JSON 파일 only.
- **운영 콘솔 UI** — 결과는 파일로 확인.

---

## 운영 정책

- **공개 콘텐츠 본인 검토용**으로만 사용합니다. robots.txt 강제 준수는 하지 않지만, 외부 발행/재배포는 본 도구의 범위가 아닙니다.
- 차단 도메인 패턴은 `src/crawler/urlFilter.ts` 에 정의되어 있고, 필요 시 추가/제거.
- 분류 키워드 사전은 `src/classifier/keywordDictionary.ts` 에 모여 있습니다. 운영하면서 가장 자주 수정될 파일입니다.

---

## 다음 단계 (이 MVP 검증 이후)

- `data/processed/` 결과를 사람이 보면서 키워드 사전 보강 → 재실행
- LLM 요약기(`createSummarizer('llm')`) 구현 + 비교 평가
- 이 인터페이스 그대로 `give-randing` 메인 앱의 `/admin/content-studio` 로 통합
