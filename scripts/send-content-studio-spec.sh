#!/usr/bin/env bash
# 콘텐츠 스튜디오 파이프라인 명세서 + 다이어그램을 텔레그램으로 전송
#
# 사용법:
#   TELEGRAM_CHAT_ID=123456789 ./scripts/send-content-studio-spec.sh
#   (TELEGRAM_BOT_TOKEN은 .env.local에서 자동 로드)
#
# 송신 항목:
#   1. 인트로 텍스트
#   2. 다이어그램 4종 (PNG, 캡션 포함)
#   3. 명세서 전체 (.md 파일 문서 첨부)
set -euo pipefail

cd "$(dirname "$0")/.."

# .env.local에서 TELEGRAM_BOT_TOKEN 로드
if [[ -f .env.local ]]; then
  export $(grep -E '^TELEGRAM_BOT_TOKEN=' .env.local | xargs -I{} echo {})
fi

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN이 필요합니다 (.env.local 또는 export)}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID 환경변수를 지정하세요}"

API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
DIAG_DIR="docs/diagrams"
SPEC="docs/content-studio-pipeline-spec.md"

send_text() {
  local text="$1"
  curl -sS -X POST "${API}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d parse_mode="HTML" \
    --data-urlencode text="${text}" \
    | python3 -c 'import json,sys;r=json.load(sys.stdin);print("text:",r.get("ok"),r.get("description",""))'
}

send_photo() {
  local file="$1"; local caption="$2"
  curl -sS -X POST "${API}/sendPhoto" \
    -F chat_id="${TELEGRAM_CHAT_ID}" \
    -F caption="${caption}" \
    -F parse_mode="HTML" \
    -F photo="@${file}" \
    | python3 -c 'import json,sys;r=json.load(sys.stdin);print("photo:",r.get("ok"),r.get("description",""))'
}

send_doc() {
  local file="$1"; local caption="$2"
  curl -sS -X POST "${API}/sendDocument" \
    -F chat_id="${TELEGRAM_CHAT_ID}" \
    -F caption="${caption}" \
    -F parse_mode="HTML" \
    -F document="@${file}" \
    | python3 -c 'import json,sys;r=json.load(sys.stdin);print("doc:",r.get("ok"),r.get("description",""))'
}

echo "[1/6] 인트로 전송"
send_text "<b>콘텐츠 스튜디오 파이프라인 명세서</b>
2026-05-20 기준

5탭 IA: 주제 → 리서치 → 검토함 → 발행 → 진행
다이어그램 4종 + 전체 명세서(.md) 순서로 전달합니다."

echo "[2/6] 01-overview"
send_photo "${DIAG_DIR}/01-overview.png" "<b>① 전체 파이프라인 오버뷰</b>
외부 소스 → 5탭 → Supabase DB 의 데이터 흐름"

echo "[3/6] 02-review-state"
send_photo "${DIAG_DIR}/02-review-state.png" "<b>② 검토함 상태 머신</b>
collected → reviewed → approved → notified/thread_drafted"

echo "[4/6] 03-thread-conversion"
send_photo "${DIAG_DIR}/03-thread-conversion.png" "<b>③ 스레드 변환 흐름</b>
검토함 → convertItemToThreadDraft → KB 주입 → LLM → thread_drafts"

echo "[5/6] 04-collect-sequence"
send_photo "${DIAG_DIR}/04-collect-sequence.png" "<b>④ 수집 시퀀스</b>
cron → collect → enrich(LLM) → agent_items + agent_ai_logs"

echo "[6/6] 명세서 .md 첨부"
send_doc "${SPEC}" "<b>전체 명세서 (Markdown)</b>
의존성 매트릭스 / 외부 의존성 / 알려진 취약점 / 변경 체크리스트 포함"

echo "완료"
