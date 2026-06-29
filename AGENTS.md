# 🤖 GIVENEEDS AGENT RULES & MISSION

## 🚨 MANDATORY INITIAL STEP (PROACTIVE CHECK)
**Before taking ANY action:**
1. Check if the user has mentioned `HANDOFF_GUIDE.md`.
2. **If NOT mentioned**, you MUST proactively ask the user: 
   > "기브니즈 프로젝트의 최신 컨텍스트와 방향성을 파악하기 위해 루트 디렉토리의 `HANDOFF_GUIDE.md`를 먼저 읽고 작업을 시작할까요?"
   
3. **Wait for user confirmation** or proceed only after you have clearly summarized the guide to demonstrate understanding. This is a hard requirement from the project owner.

## 🚨 DATA INTEGRITY & CONFLICT PREVENTION (CRITICAL)
**Before any database-related action (SQL, Seeding, Migration):**
1. **Pre-check mandatory**: Always perform a `SELECT` first to verify if existing data (especially user-modified content) will be affected.
2. **Never overwrite blindly**: Favor `ON CONFLICT DO NOTHING` over `DO UPDATE` unless explicitly requested. 
3. **Manual Backup**: Before running modifying scripts, extract current data to a temporary file of the workspace and notify the user.
4. **Risk Disclosure**: Explicitly warn the user if a script has the potential to overwrite or delete their manual modifications in the Admin UI/Supabase Dashboard.

## 📌 PROJECT MISSION
To build an integrated high-conversion marketing portal for 'Giveneeds', featuring a Magazine B-style editorial site and a dynamic campaign landing page system.

## 🏗️ CORE ARCHITECTURE
- **Framework**: Next.js (App Router)
- **Database**: Supabase (Remote)
- **UI System**: Vanilla Tailwind / Lucide Icons / Framer Motion
- **Routing**: `/` (Main Magazine), `/lp/[slug]` (Campaign), `/magazine/[slug]` (Detail)

## 🔍 SEO WORK LOG (기록 + 재수정 경고)
1. **작업 시작 전**: 루트 `SEO_LOG.md`를 먼저 읽는다. 수정하려는 대상(파일/영역)이 이미 기록돼 있으면, 진행하기 전에 사용자에게 다음을 알리고 경고한다.
   - 그 작업이 **언제(날짜)** 이뤄졌는지
   - 당시 **무슨 목적으로 / 무엇을 막기 위한** 변경이었는지
   - 지금 방향·방법대로 진행하면 **어느 부분이 어떻게 바뀌는지**
   그 후 사용자 확인을 받고 진행한다. (누가 했는지는 따지지 않는다)
2. **커밋할 때마다**: `SEO_LOG.md` 맨 위에 항목 하나를 추가한다 (날짜 · 커밋해시 / 한 일 / 목적·이유 / 대상 / 검증). 기록 전용이며 할 일 목록은 적지 않는다.

---
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read relevant guides in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->
