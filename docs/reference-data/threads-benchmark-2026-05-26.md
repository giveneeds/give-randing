# Threads 레퍼런스 구조 벤치마크 2026-05-26

Apify 상세 수집 결과를 원고 품질 기준으로 쓰기 위해 구조만 분석한 문서다. 주제/내용을 그대로 베끼는 용도가 아니라, 실제 발행 Threads가 어느 정도의 밀도와 구조를 갖는지 판단하는 기준으로 쓴다.

## 검증 결론

- 상세 actor 댓글/후속 수집: 확인됨
- 같은 작성자 후속 댓글 수집: 확인됨
- 정보형 1/n 연속글 수집: 이번 표본에서는 미확정
- 결론: 상세 actor는 댓글/같은 작성자 댓글을 수집했지만, 이번 표본에서는 정보형 1/n 연속글 수집이 확정되지 않았다.
- 한계: 이미지 카드형 게시물은 OCR이 없으면 카드 안 정보를 품질 기준으로 쓸 수 없다.

## 표본 구성

- 전체 표본: 5
- 텍스트 구조 기준으로 사용 가능: 0
- 텍스트 기준으로 약함: 3
- 이미지 카드 의존으로 OCR 전까지 제한: 2

## 관찰 수치

- 루트 본문 글자 수 p50/p75: 157 / 163
- 사용 가능 텍스트 총 글자 수 p50/p75: - / -
- 사용 가능 표본의 관찰 포스트 수 p50: -
- Hook 유형: {"statement":1,"comment_dm_resource":1,"question":2,"numbered_list":1}
- 참여 패턴: {"mixed":2,"comment_or_dm_conversion":1,"comment_pattern":2}
- FOMO 장치: {}

## 표본별 구조

| # | 작성자 | 미디어 | 루트 글자 | 원시 후속 | 의미 후속 | 총 텍스트 | Hook | 참여 패턴 | benchmark 사용 |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| 1 | @aiprompttreasure | 17 | 149 | 0 | 0 | 149 | statement | mixed | limited_without_ocr |
| 2 | @ai.woojoo | 8 | 350 | 0 | 0 | 350 | comment_dm_resource | comment_or_dm_conversion | limited_without_ocr |
| 3 | @bandi_tiger | 0 | 163 | 19 | 0 | 163 | question | comment_pattern | weak_text_reference |
| 4 | @billy___ssam | 0 | 157 | 0 | 0 | 157 | numbered_list | mixed | weak_text_reference |
| 5 | @riha.dev | 0 | 55 | 13 | 0 | 55 | question | comment_pattern | weak_text_reference |

## 생성 품질 기준 반영

- single_post 는 최소 500자 이상으로 쓴다.
- 정보형/해설형/뉴스 코멘터리형은 독자 이해에 필요한 맥락이 있으면 1200~5000자까지 허용한다.
- 이미지 카드형 레퍼런스의 짧은 캡션은 텍스트 원고의 낮은 기준으로 삼지 않는다. 카드 안 텍스트 OCR이 없으면 오히려 본문이 설명을 보강해야 한다.
- 후속 포스트가 있다면 각 포스트는 hook, context, example, criterion, action, ending 중 하나의 역할을 가져야 한다.
- 아래 상황이면 재작성 또는 quality_gate_failed 로 본다:
  - 정보형/해설형인데 정보 단위가 3개 미만이다.
  - 이미지 카드형 레퍼런스를 따라가면서 텍스트 설명을 비워둔다.
  - 첫 포스트만 강하고 후속 설명에서 기준/예시/맥락이 빠진다.
  - 레퍼런스보다 짧은 것이 아니라, 독자가 이해할 재료 자체가 부족하다.

## 표본 메모

### 1. @aiprompttreasure

- URL: https://www.threads.com/@aiprompttreasure/post/DYrc7EwiLRD
- 판정: limited_without_ocr
- Hook: statement
- FOMO 장치: 뚜렷하지 않음
- 첫 문장/본문 미리보기: 2026 AI Tools You Can’t Miss: 1. Video Creation 2. Image Generation 3. Avatar Creation 4. Audio Generation 5. Copywriting 6. Presentations Designs...
- 의미 있는 후속글 예시: 없음

### 2. @ai.woojoo

- URL: https://www.threads.com/@ai.woojoo/post/DYWcp06Eb_p
- 판정: limited_without_ocr
- Hook: comment_dm_resource
- FOMO 장치: 뚜렷하지 않음
- 첫 문장/본문 미리보기: Claude를 제대로 쓰는 사람은 프롬프트가 아니라 '스킬'을 씁니다. ━━━━━━━━━━━━━━━━ 스킬(Skill)은 검증된 워크플로우를 통째로 Claude에 얹는 기능입니다. 즉흥 프롬프트로는 못 가는 곳까지 한 번에 데려다 줍니다. 이번 글에 정리한 분야: 디자인 · 콘텐츠 · 글쓰기 리서치 · 마케팅 · 개발 자
- 의미 있는 후속글 예시: 없음

### 3. @bandi_tiger

- URL: https://www.threads.com/@bandi_tiger/post/DYeqtjqknrh
- 판정: weak_text_reference
- Hook: question
- FOMO 장치: 뚜렷하지 않음
- 첫 문장/본문 미리보기: 두근두근 설레는 첫 스레드야 스치니들(스친님들...?) 잘부탁해🤗 일반사무직 퇴사하고 적지않은 나이에 AI마케팅 배우는 사람인데, 실습겸 스레드 처음 써봐. 이게 뭐라고 한글자 한글자 쓰는게 떨려서 30분을 고민했어.ㅋㅋㅋ 나도 스하리1000프로젝트 하고싶은데... 껴줄사람! 이얏호! 🚀
- 의미 있는 후속글 예시: 없음

### 4. @billy___ssam

- URL: https://www.threads.com/@billy___ssam/post/DYiuyGcGfjg
- 판정: weak_text_reference
- Hook: numbered_list
- FOMO 장치: 뚜렷하지 않음
- 첫 문장/본문 미리보기: 26년 최고의 '무기'를 장착하세요. 1. 바이브 코딩(Vibe Coding) 2. AI 활용 툴 최소 2개 이상 3. 영상&디자인 중급 기술 4. 영향력 있는 개인 SNS 1개 5. 심리학, 인문학, 마케팅 중 1개 27년도에 분명 달라질 수 있는 5가지의 무기를 장착해 보세요.
- 의미 있는 후속글 예시: 없음

### 5. @riha.dev

- URL: https://www.threads.com/@riha.dev/post/DYcgYgKIFGI
- 판정: weak_text_reference
- Hook: question
- FOMO 장치: 뚜렷하지 않음
- 첫 문장/본문 미리보기: 개발, AI, 마케팅 관심있어. 사실 관심 있는거 많은데 나랑 친구 할래? 스하리=꼭 반하리 간다!
- 의미 있는 후속글 예시: 없음

