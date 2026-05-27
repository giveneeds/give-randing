# Reference Workflow

Threads 글로직은 잘 쓴 발행물을 계속 읽고, 필요한 레퍼런스만 골라 프롬프트에 넣는 방식으로 운영한다.

## 현재 결정

- Supabase DB나 벡터 검색은 아직 만들지 않는다.
- 단일 md 파일에 무한 누적하지 않는다.
- `docs/reference-data/threads-curated/index.json`을 기준으로 관련 레퍼런스 파일만 선택한다.
- 레퍼런스 원문 전체는 `docs/reference-data`에 두고, 생성에 바로 도움이 되는 관찰 카드만 `threads-curated/*.md`에 둔다.

## 파일 구조

```text
docs/reference-data/threads-curated/
  README.md
  index.json
  fomo-patterns.md
  info-thread-structure.md
  tool-roundup.md
  case-breakdown.md
  opinion-observation.md
  mistake-gap.md
```

## Loader 동작

`lib/knowledge/loader.js`는 다음 기준으로 레퍼런스를 점수화한다.

- `contentPillar`
- `contentTreatment`
- `fomoMechanism`
- `topicCluster`
- `referenceQueryText`
- `index.json`의 `pillars`, `treatments`, `patterns`, `fomo`, `topics`, `keywords`, `priority`

선택된 상위 레퍼런스 카드만 프롬프트에 들어간다. 전체 md를 모두 읽지 않는다.

## 주간 갱신

`.github/workflows/weekly-threads-audit.yml`가 매주 월요일 KST 07:00에 실행된다.

실행 항목:

1. `npm run threads:audit`
2. `npm run threads:reference-search`
3. `npm run threads:reference-benchmark`
4. `npm run threads:curated:check`
5. `npm run threads:topics`

이 워크플로우는 시장에서 발행되는 Threads를 주간으로 갱신한다. 단, `threads-curated/*.md` 관찰 카드는 아직 자동 생성하지 않는다. 사람이 확인한 좋은 글만 카드로 추가한다.

## 레퍼런스 추가 절차

1. 좋은 Threads 원문을 찾는다.
2. 가능하면 `config/threads-reference-urls.json`에 URL과 메타를 추가한다.
3. `npm run threads:reference-benchmark`로 상세/benchmark를 갱신한다.
4. 알맞은 `threads-curated/*.md`에 관찰 카드를 추가한다.
5. `threads-curated/index.json`에 같은 id를 등록한다.
6. `npm run threads:curated:check`를 실행한다.
7. `npm run build`를 실행한다.

## 다음 고도화 후보

- 레퍼런스가 50개를 넘으면 `maxReferences`, token budget, scoring 가중치를 재조정한다.
- 레퍼런스가 100개를 넘고 주제별 선택 품질이 떨어지면 Supabase 테이블 또는 벡터 검색을 검토한다.
- 생성된 우리 글의 실제 반응이 확인되면 잘 터진 글을 `threads-curated`에 다시 편입한다.
- 주간 audit 결과에서 사람이 검토할 큐레이션 후보를 자동 요약하는 스크립트를 추가할 수 있다.
