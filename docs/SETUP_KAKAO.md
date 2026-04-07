# 카카오 로그인 (Premium Gating) 설정 가이드

프리미엄 매거진(`is_premium=true`) 글을 비로그인 사용자에게 잠그고, 카카오 로그인 후 열람할 수 있게 합니다.
**기존 `leads` 테이블/매거진 데이터는 일절 건드리지 않습니다.** Supabase 내장 `auth.users` 스키마만 사용합니다.

---

## 1. Kakao Developers 앱 생성

1. https://developers.kakao.com 접속 → 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
2. 앱 이름: `GIVENEEDS` (자유), 사업자명: `기브니즈`
3. 생성 후 좌측 **앱 키** 메뉴에서 **REST API 키** 복사 (예: `abcdef1234...`)
4. 좌측 **카카오 로그인** 메뉴 → **활성화 ON**
5. **Redirect URI** 등록:
   ```
   https://<YOUR-SUPABASE-PROJECT>.supabase.co/auth/v1/callback
   ```
   (Supabase 프로젝트 대시보드 → Settings → API → Project URL 의 도메인 사용)
6. **동의항목** 메뉴 → **닉네임**, **프로필 이미지** 필수 동의로 설정 (이메일은 선택)
7. **보안** 메뉴 → **Client Secret 생성** → 발급된 secret 값 복사

---

## 2. Supabase Auth Provider 설정

1. Supabase Dashboard → 대상 프로젝트 → **Authentication → Providers**
2. **Kakao** 항목 펼치기 → **Enable Kakao** 토글 ON
3. 입력:
   - **Client ID (REST API Key)**: 위 1-3에서 복사한 REST API 키
   - **Client Secret**: 위 1-7에서 발급한 Client Secret
4. **Save** 클릭

---

## 3. 환경변수

`.env.local` 또는 Vercel Environment Variables 에 이미 설정된 변수만 있으면 됩니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # 이미지 업로드용 (이미 설정되어 있음)
```

추가 환경변수는 필요 없습니다. (redirectTo는 클라이언트에서 `window.location.origin`을 자동 사용)

---

## 4. Storage 버킷 생성 (이미지 업로드용)

Supabase Dashboard → **SQL Editor** → 새 쿼리 → 아래 파일 내용을 붙여 넣고 실행:

```
sql/create_magazine_storage.sql
```

이 스크립트는:
- `magazine-images` 스토리지 버킷을 생성 (public read)
- service_role 만 업로드 가능한 RLS 정책 추가

**기존 데이터는 변경하지 않습니다.** (`ON CONFLICT DO NOTHING`)

---

## 5. 동작 확인

1. `npm run dev`
2. 어드민에서 매거진 글 하나의 **Premium Content** 토글을 ON 후 저장
3. **시크릿 창**으로 해당 매거진 상세 페이지 접속
4. 본문이 페이드아웃되며 카카오 로그인 모달이 자동으로 뜨는지 확인
5. 카카오로 로그인 → 같은 페이지로 리다이렉트되며 본문이 전체 노출되는지 확인

---

## 데이터 안전성 체크

- ✅ `magazines` 테이블: 컬럼 추가 없음, 기존 글 무수정 (Tiptap이 HTML 그대로 출력)
- ✅ `leads` 테이블: 무관 (Supabase Auth는 별도의 `auth.users` 스키마 사용)
- ✅ 이미지 업로드: 신규 버킷 `magazine-images` 만 사용, 기존 버킷 무영향
- ✅ 기존 글은 운영자가 다시 저장하지 않는 한 마크업이 절대 자동 변환되지 않음
