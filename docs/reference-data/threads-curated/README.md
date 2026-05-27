# Threads Curated References

이 디렉토리는 잘 쓴 Threads 발행물을 DB 없이 계속 참고하기 위한 파일 기반 레퍼런스 저장소다.

## 왜 DB가 아닌가

- 현재 레퍼런스 수는 파일 기반으로 충분히 관리 가능하다.
- LLM 생성에 필요한 것은 정규화된 분석값보다 "이런 식으로 구성되는구나"를 읽게 하는 짧은 관찰 카드다.
- DB/벡터 검색은 레퍼런스가 수백 개로 늘어나고 의미 기반 검색이 필요해질 때 전환한다.

## 구조

```text
docs/reference-data/threads-curated/
  index.json
  fomo-patterns.md
  info-thread-structure.md
  tool-roundup.md
  case-breakdown.md
  opinion-observation.md
  mistake-gap.md
```

`index.json`은 loader가 필요한 레퍼런스만 고르기 위한 메타 파일이다. 각 md 파일에는 실제 관찰 카드만 둔다.

## 추가 규칙

새 레퍼런스는 아래 순서로 추가한다.

1. 원문/상세 수집 결과는 `docs/reference-data/threads-reference-detail-*.json` 또는 관련 raw/detail 파일에 둔다.
2. 생성에 바로 도움이 되는 관찰만 알맞은 md 파일에 카드로 추가한다.
3. `index.json`에 같은 `id`로 메타를 추가한다.
4. `npm run threads:curated:check`로 누락 파일/중복 id를 확인한다.

## 관찰 카드 형식

```text
## REF-YYYYMMDD-slug

- source_url:
- author:
- topic:
- 왜 볼 만한가:
- 첫 포스트 구성:
- 후속 포스트 구성:
- 반응 장치:
- 우리 기둥 매핑:
- 우리 글에 빌릴 점:
- 피할 점:
```

## Loader 규칙

`lib/knowledge/loader.js`는 전체 파일을 다 읽지 않는다.

1. `index.json`에서 현재 원고의 기둥, 토픽 클러스터, FOMO 장치, 본문 힌트와 맞는 레퍼런스를 점수화한다.
2. 상위 3~5개 레퍼런스의 md 파일만 읽는다.
3. 각 md 파일 안에서도 해당 카드만 추출해 프롬프트에 넣는다.
4. 어떤 것도 맞지 않으면 `priority`가 높은 기본 레퍼런스만 읽는다.

## 다음 에이전트 작업 메모

- 주간 GitHub Actions는 Apify audit/reference benchmark를 갱신한다. 이 결과는 시장 스레드 관찰 자료다.
- 자동으로 큐레이션 md까지 쓰는 단계는 아직 없다. 우선 사람이 검증한 좋은 글만 관찰 카드로 추가한다.
- 레퍼런스가 50개를 넘으면 `maxReferences`와 token budget을 다시 조정한다.
- 레퍼런스가 100개를 넘고 주제별 선택 품질이 떨어지면 Supabase 테이블 또는 벡터 검색으로 이전을 검토한다.
