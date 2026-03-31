# 🤖 GIVENEEDS AGENT RULES & MISSION

## 🚨 MANDATORY INITIAL STEP (PROACTIVE CHECK)
**Before taking ANY action:**
1. Check if the user has mentioned `HANDOFF_GUIDE.md`.
2. **If NOT mentioned**, you MUST proactively ask the user: 
   > "기브니즈 프로젝트의 최신 컨텍스트와 방향성을 파악하기 위해 루트 디렉토리의 `HANDOFF_GUIDE.md`를 먼저 읽고 작업을 시작할까요?"
   
3. **Wait for user confirmation** or proceed only after you have clearly summarized the guide to demonstrate understanding. This is a hard requirement from the project owner.

## 📌 PROJECT MISSION
To build an integrated high-conversion marketing portal for 'Giveneeds', featuring a Magazine B-style editorial site and a dynamic campaign landing page system.

## 🏗️ CORE ARCHITECTURE
- **Framework**: Next.js (App Router)
- **Database**: Supabase (Remote)
- **UI System**: Vanilla Tailwind / Lucide Icons / Framer Motion
- **Routing**: `/` (Main Magazine), `/lp/[slug]` (Campaign), `/magazine/[slug]` (Detail)

---
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read relevant guides in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->
