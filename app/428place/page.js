'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Moon, Sun, MessageCircle, ArrowRight, Search, MapPin, Phone,
  Star, Users, TrendingUp, AlertTriangle, CheckCircle2, Sparkles,
  BookOpen, BarChart3, KeyRound, Target, Compass, Calendar,
  ExternalLink, ArrowUpRight, Quote
} from 'lucide-react';

const KAKAO_OPENCHAT = 'https://open.kakao.com/o/gPg1ngqi';
const KAKAO_CHANNEL = 'http://pf.kakao.com/_lutxdG';
const RANK_CHECK = 'https://inflowtest.vercel.app/rankcheck';
const MAGAZINE = 'https://giveneeds.co.kr/magazine';

export default function Place428Page() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 [word-break:keep-all] [overflow-wrap:break-word]">
      {/* ── Minimal Header ─────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all ${
          scrolled
            ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-white/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <span className="text-[13px] font-black tracking-[0.18em] text-zinc-900 dark:text-white">
              GIVENEEDS
            </span>
            <span className="hidden sm:inline-block text-[14px] tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
              · 428 Place Guide
            </span>
          </a>
          <div className="flex items-center gap-1.5">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <a
              href={KAKAO_OPENCHAT}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3.5 py-2 rounded-full text-[13px] font-bold tracking-wider uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <MessageCircle size={13} />
              오픈채팅
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 px-5 sm:px-8 overflow-hidden">
        {/* Decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 -z-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/10 dark:bg-violet-400/10 blur-[120px] rounded-full -z-0"
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur text-[14px] tracking-widest font-bold uppercase text-zinc-600 dark:text-zinc-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_10px] shadow-violet-500/60" />
            2026 4월 네이버 플레이스 로직 변경 가이드
          </div>

          <h1 className="text-[38px] sm:text-[62px] font-black tracking-[-0.04em] leading-[1.05] mb-7 text-balance">
            네이버 플레이스 로직 변경,
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-500 dark:from-violet-300 dark:via-fuchsia-300 dark:to-violet-400 bg-clip-text text-transparent">
              우리 가게는 어떻게 됐을까
            </span>
          </h1>

          <p className="text-[20px] sm:text-[22px] text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            스레드 보고 DM 주신 분들께 보내드리는 자료예요.<br />
            일반론 말고, <strong className="text-zinc-900 dark:text-white">본인 가게 상황에 맞춰서</strong> 읽으실 수 있게 만들었어요.
            5–10분, 끝까지. 마지막에 본인이 어디로 가야 할지 분기 안내가 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
            <a
              href={RANK_CHECK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-7 py-4 rounded-xl text-[18px] font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Search size={18} />
              내 가게 순위 30초 진단
              <ArrowRight size={17} />
            </a>
            <a
              href={KAKAO_OPENCHAT}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white px-7 py-4 rounded-xl text-[18px] font-bold tracking-wide hover:border-zinc-900 dark:hover:border-white transition"
            >
              <MessageCircle size={18} />
              비공개 오픈채팅 (4/29)
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-5 text-[14px] tracking-widest font-bold uppercase text-zinc-400 dark:text-zinc-500">
            <span>읽는데 5–10분</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span>업종 무관</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span>실제 케이스 3개</span>
          </div>
        </div>
      </section>

      {/* ── Notice Banner ─────────────────────────── */}
      <section className="px-5 sm:px-8 mb-16 sm:mb-24">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/30 border border-amber-200/80 dark:border-amber-500/20 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/15 dark:bg-amber-400/15 flex items-center justify-center">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[14px] tracking-widest font-bold uppercase text-amber-700 dark:text-amber-400 mb-1.5">
                  먼저 알려드릴 것
                </p>
                <h3 className="text-[20px] sm:text-[22px] font-black tracking-tight mb-2 text-zinc-900 dark:text-white">
                  4월 29일, 비공개 오픈채팅방을 엽니다
                </h3>
                <p className="text-[18px] sm:text-[19px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  로직 업데이트 즉시 공유, 다른 사장님들 케이스 공유, 받는 DM 중 공유 가능한 것 정리해서 올리는 곳이에요.
                </p>
                <a
                  href={KAKAO_OPENCHAT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[18px] font-bold hover:gap-2.5 transition-all"
                >
                  오픈채팅 들어가기
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 0. Self Diagnosis ─────────────────────── */}
      <Section number="00" eyebrow="시작 전 30초">
        <H2>본인 순위부터 직접 확인하세요</H2>
        <Lead>
          자료 본문 읽기 전에 본인 순위부터 보세요.
          이걸 안 보고 읽으면 자료가 남 얘기로 들립니다.
        </Lead>

        <a
          href={RANK_CHECK}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-2xl border-2 border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-6 sm:p-7 mt-8 hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14px] tracking-widest font-bold uppercase opacity-60 mb-2">
                Free Tool
              </div>
              <div className="text-[20px] sm:text-[22px] font-black tracking-tight">
                내 가게 순위 체크하기
              </div>
              <div className="text-[16px] sm:text-[18px] opacity-70 mt-1.5">
                업체명·키워드 → 30초 안에 현재 순위. 키워드 3–5개 다양하게.
              </div>
            </div>
            <ArrowRight size={22} className="shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        <p className="text-[18px] sm:text-[19px] text-zinc-600 dark:text-zinc-400 mt-8 mb-5">
          확인 후, 본인 체감으로 골라주세요. (도구로 과거 비교는 안 됩니다.)
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {TYPES.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5"
            >
              <div className={`inline-flex items-center gap-2 text-[14px] tracking-widest font-black uppercase mb-2 ${t.tag}`}>
                <span className={`w-7 h-7 rounded-full ${t.dot} text-white flex items-center justify-center text-[13px] font-black`}>
                  {t.id}
                </span>
                타입 {t.id}
              </div>
              <p className="text-[18px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t.symptom}
              </p>
            </div>
          ))}
        </div>

        <Note>
          4부에서 타입별로 다른 처방을 드릴 거니까, 본인 타입을 기억해두세요.
        </Note>
      </Section>

      {/* ── 1. What's Happening ───────────────────── */}
      <Section number="01" eyebrow="지금 무슨 일이">
        <H2>지금 무슨 일이 일어나고 있는 건가</H2>

        <div className="my-10 p-7 sm:p-10 rounded-2xl border border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900">
          <div className="text-[14px] tracking-widest font-black uppercase text-zinc-500 dark:text-zinc-400 mb-4">
            한 줄로 정리하면
          </div>
          <p className="text-[26px] sm:text-[32px] font-black tracking-[-0.03em] leading-snug">
            <span className="line-through opacity-40">&ldquo;보여지기만 하면 점수&rdquo;</span>
            였던 시절 끝.<br />
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 dark:from-violet-300 dark:to-fuchsia-300 bg-clip-text text-transparent">
              &ldquo;진짜로 손님이 움직였냐&rdquo;
            </span>
            가 점수가 됨.
          </p>
        </div>

        <div className="space-y-5">
          <ChangeCard
            num="①"
            title="상위 노출보다, 들어온 사람이 뭘 하는지가 더 중요"
            body="예전엔 검색 시 위에 떠 있기만 해도 점수. 지금은 클릭해서 들어온 손님이 전화·길찾기·예약 버튼을 눌렀는지가 더 큰 점수."
            icon={<Phone size={16} />}
          />
          <ChangeCard
            num="②"
            title="페이지에 머무는 시간도 점수"
            body="3초 만에 나가면 마이너스, 1분 이상 머물면 플러스. 사진·소개글 빈약하면 리뷰 쌓아도 한계."
            icon={<TrendingUp size={16} />}
          />
          <ChangeCard
            num="③"
            title="검색어와 정보의 적합도를 정교하게 봄"
            body="업체명에 '강남 미용실' 들어있다고 무조건 뜨는 게 아님. 소개글·메뉴·사진 설명·리뷰까지 합쳐서 적합도 판정."
            icon={<Target size={16} />}
          />
        </div>
      </Section>

      {/* ── Industry differences ──────────────────── */}
      <Section eyebrow="업종별로 다름">
        <H2>업종별로 뭐가 중요한지가 달라요</H2>

        <div className="grid lg:grid-cols-2 gap-5 mt-8">
          {/* 요식업 */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 p-7">
            <div className="text-[32px] mb-3">🍚</div>
            <div className="text-[14px] tracking-widest font-bold uppercase text-orange-600 dark:text-orange-400 mb-2">
              Food & Bev
            </div>
            <h3 className="text-[22px] font-black tracking-tight mb-4 text-zinc-900 dark:text-white">
              요식업
            </h3>
            <p className="text-[18px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5">
              여전히 <strong>고객 방문, 영수증 리뷰가 핵심.</strong> 거기에 더해
              <strong> 길찾기 클릭</strong>과 <strong>같은 손님 재방문 주기</strong>가 큰 점수입니다.
            </p>
            <ul className="space-y-2.5 text-[18px] text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-orange-500" />
                <span>리뷰 200개 있어도 <strong>최근 한 달 신규</strong>가 없으면 죽은 가게로 인식</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-orange-500" />
                <span>길찾기 누른 횟수가 데이터로 쌓임 (검색→길찾기→방문 사이클)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-orange-500" />
                <span>한 달에 두세 번 오는 단골 = 좋은 가게 신호</span>
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-orange-200/60 dark:border-orange-500/10 text-[17px] text-zinc-700 dark:text-zinc-300">
              👉 <strong>리뷰 + 길찾기 + 단골 + 다양한 유입</strong> 골고루
            </div>
          </div>

          {/* 비요식업 */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/10 p-7">
            <div className="text-[32px] mb-3">💇 💪 💅 🏥</div>
            <div className="text-[14px] tracking-widest font-bold uppercase text-violet-600 dark:text-violet-400 mb-2">
              Service / Beauty / Health
            </div>
            <h3 className="text-[22px] font-black tracking-tight mb-4 text-zinc-900 dark:text-white">
              비요식업
            </h3>
            <p className="text-[18px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5">
              <strong>블로그 리뷰 비중이 확 줄었어요.</strong> 대신 이런 게 점수가 됩니다.
            </p>
            <ul className="space-y-2.5 text-[18px] text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-violet-500" />
                <span><strong>플레이스 페이지 체류 시간</strong> (사진·소개글 풍부할수록 ↑)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-violet-500" />
                <span><strong>들어와서 행동</strong> (전화·길찾기·예약·외부 링크 클릭)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-1 text-violet-500" />
                <span><strong>같은 사람의 재방문</strong> (관심 가게로 분류)</span>
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-violet-200/60 dark:border-violet-500/10 text-[17px] text-zinc-700 dark:text-zinc-300">
              👉 비요식업은 <strong>페이지 풍부 + 손님 행동</strong> 유도가 핵심
            </div>
          </div>
        </div>
      </Section>

      {/* ── Inflow Diversification (HERO BLOCK) ───── */}
      <Section eyebrow="다른 곳이 안 알려주는 진짜 핵심">
        <div className="rounded-3xl bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 dark:border-white/10 text-white p-7 sm:p-12 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur text-[14px] tracking-widest font-bold uppercase mb-6">
              <Sparkles size={12} className="text-violet-300" />
              유입을 어떻게 만들 거냐
            </div>
            <h3 className="text-[26px] sm:text-[38px] font-black tracking-[-0.03em] leading-tight mb-5">
              모든 점수는 결국,<br />
              <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                우리 페이지에 사람이 와야
              </span>
              {' '}쌓입니다
            </h3>
            <p className="text-zinc-300 leading-relaxed mb-8 sm:text-[20px]">
              그래서 진짜 본질은 <strong className="text-white">&ldquo;어떻게 자연스럽게 사람을 우리 페이지로 데려올 거냐&rdquo;</strong>인데,
              보통 다른 대행사들은 이걸 한 가지 방식으로만 풉니다 — <strong className="text-white">&ldquo;플레이스 리워드 트래픽&rdquo;</strong>.
              쉽게 말해 돈 주고 사람을 우리 페이지에 보내는 방식이에요.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
                <div className="text-[14px] tracking-widest font-bold uppercase text-rose-300 mb-2">
                  ❌ 한 가지만 쓰면
                </div>
                <p className="text-[18px] text-zinc-200 leading-relaxed">
                  처음엔 점수 올라가는 듯. 같은 패턴 반복되면 네이버가 알아챔.
                  <strong className="text-white"> &ldquo;자연스럽지 않다&rdquo;</strong>로 분류되면 점수가 오히려 깎입니다.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="text-[14px] tracking-widest font-bold uppercase text-emerald-300 mb-2">
                  ✅ 여러 통로를 번갈아
                </div>
                <p className="text-[18px] text-zinc-200 leading-relaxed">
                  통로를 여러 개 깔아두고 주기적으로 번갈아 굴리면, 네이버가
                  <strong className="text-white"> &ldquo;자연스럽게 인기 있는 곳&rdquo;</strong>으로 분류합니다.
                </p>
              </div>
            </div>

            {/* Channel table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-zinc-950/40">
              <div className="grid grid-cols-12 px-5 py-3 text-[14px] tracking-widest font-bold uppercase text-zinc-400 border-b border-white/10 bg-white/[0.02]">
                <div className="col-span-4">유입 통로</div>
                <div className="col-span-6 hidden sm:block">어떻게 만드나</div>
                <div className="col-span-4 sm:col-span-2 text-right">주기</div>
              </div>
              {CHANNELS.map((c) => (
                <div
                  key={c.name}
                  className="grid grid-cols-12 px-5 py-4 text-[18px] border-b border-white/5 last:border-0 items-center"
                >
                  <div className="col-span-8 sm:col-span-4 font-bold text-white flex items-center gap-2">
                    <c.icon size={14} className="text-violet-300 shrink-0" />
                    {c.name}
                  </div>
                  <div className="col-span-12 sm:col-span-6 text-zinc-400 mt-1.5 sm:mt-0 text-[17px]">
                    {c.how}
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-right text-[13px] font-bold text-violet-300 tracking-wider">
                    {c.cycle}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 sm:p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-3">
                <Quote size={18} className="shrink-0 text-violet-300 mt-0.5" />
                <p className="text-[18px] sm:text-[19px] text-zinc-300 leading-relaxed italic">
                  같은 식당에 매일 같은 시간, 같은 사람들만 오면 어떻게 보일까요?
                  &ldquo;단골 가게&rdquo;로 보이지 &ldquo;동네에서 핫한 가게&rdquo;로는 안 보이죠.
                  반대로 점심엔 직장인, 저녁엔 가족, 주말엔 데이트 손님이 골고루 오면
                  &ldquo;이 동네 핫한 곳&rdquo;으로 보여요. 네이버가 우리 가게 보는 시선도 똑같습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-[14px] tracking-widest font-bold uppercase text-amber-300 mb-2">
                단, 리워드를 무조건 쓰지 말라는 건 아닙니다
              </div>
              <p className="text-[18px] text-zinc-300 leading-relaxed">
                매출이 급격히 빠진 가게라면 리워드 트래픽을 <strong className="text-white">응급처치 보조 수단</strong>으로 쓰기도 해요.
                다만 <strong className="text-white">메인이 되면 안 됩니다</strong> — 비용은 매달 그대로 나가고 자생력은 안 생깁니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Keyword Diversification ───────────────── */}
      <Section eyebrow="키워드도 여러 갈래로">
        <H2>통로뿐 아니라 &ldquo;키워드&rdquo;도 다각화</H2>
        <Lead>
          한 키워드만 잡고 있으면 그 키워드 1위를 해도 들어오는 손님 수에 한계.
          진짜 잘되는 가게는 <strong>5–10개 키워드에서 골고루 잡혀</strong> 손님 풀이 몇 배로 큽니다.
        </Lead>

        <div className="grid lg:grid-cols-2 gap-5 mt-8">
          <KeywordCard
            emoji="💪"
            title="강남 헬스장 사장님"
            keywords={[
              { kw: '강남 헬스장', tag: '메인' },
              { kw: '강남 다이어트', tag: '목적' },
              { kw: '강남 PT', tag: '서비스' },
              { kw: '강남역 운동', tag: '위치 변형' },
              { kw: '강남 1:1 트레이닝', tag: '구체 서비스' },
              { kw: '강남 체형교정', tag: '결과' },
            ]}
            footer="이 6개에서 다 상위에 잡히면 한 키워드 1위 가게보다 유입이 5–10배"
          />
          <KeywordCard
            emoji="🍚"
            title="망원동 한식당 사장님"
            keywords={[
              { kw: '망원 한식', tag: '메인' },
              { kw: '망원동 점심', tag: '시간대' },
              { kw: '망원 가족 식사', tag: '목적' },
              { kw: '망원역 맛집', tag: '위치 변형' },
              { kw: '망원 데이트 식당', tag: '상황' },
              { kw: '망원 회식', tag: '모임' },
            ]}
            footer="여러 갈래로 들어오는 가게가 결국 매출도 안정적"
          />
        </div>

        <Note tone="violet" icon={<KeyRound size={18} />}>
          <strong>나만의 키워드 리스트 만들기</strong> — 종이에 10개 적어보세요.
          (메인 1 / 목적 3 / 위치 변형 2 / 상황 2 / 서비스 변형 2)
          적어놓고 보면 우리 소개글에 그중 몇 개가 들어있는지 바로 보입니다.
          안 들어있는 단어부터 자연스럽게 채우면 돼요.
        </Note>

        {/* DM Quote */}
        <div className="mt-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-7">
          <div className="flex items-center gap-2 text-[14px] tracking-widest font-black uppercase text-zinc-500 dark:text-zinc-400 mb-4">
            <MessageCircle size={13} />
            어제 받은 DM
          </div>
          <p className="text-[20px] sm:text-[22px] text-zinc-800 dark:text-zinc-200 leading-relaxed italic mb-5">
            &ldquo;강남에서 미용실 5년째인데, 유입도 하루에 400회씩 들어오구요. 영수증 리뷰도 320개예요.
            근데 &lsquo;강남 미용실&rsquo;로 검색하면 30위 밖이에요. 옆집은 리뷰 80개인데 5위.
            도대체 뭐가 다른 거죠?&rdquo;
          </p>
          <div className="pt-5 border-t border-zinc-200 dark:border-white/10">
            <div className="text-[14px] tracking-widest font-black uppercase text-violet-600 dark:text-violet-400 mb-2">
              → 답
            </div>
            <p className="text-[18px] sm:text-[19px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
              리뷰 개수만 보면 본인이 압도적인데, 옆집은 <strong>페이지 자체가 풍부</strong>합니다 —
              사진 많고 소개글 충실하고 메뉴/가격 정보도 다 있고. 본인 페이지는 손님이 들어와서
              30초만 봐도 더 볼 게 없는 구조일 가능성이 높아요.
              <strong> 들어온 손님이 둘러볼 게 없는 페이지는 점수가 안 올라갑니다.</strong>
              옆집 페이지랑 본인 페이지를 손님 입장에서 직접 켜놓고 비교해보세요.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 2. Cases ──────────────────────────────── */}
      <Section number="02" eyebrow="실제 케이스">
        <H2>다른 사장님들은 뭘 했나</H2>

        <div className="space-y-5 mt-8">
          {CASES.map((c, i) => (
            <CaseCard key={i} {...c} />
          ))}
        </div>

        <Note tone="violet" icon={<Sparkles size={18} />}>
          <strong>세 케이스 공통점</strong> — 다 자기 페이지 약점을 1–2개로 좁혀서 거기만 집중적으로 손봤어요.
          한 번에 다 바꾸려고 하면 뭐 때문에 좋아졌는지 모르고, 작업도 산으로 갑니다.
        </Note>

        {/* 순위 추이 데이터 시각화 */}
        <figure className="mt-12 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-5 sm:px-7 pt-6 pb-4">
            <div className="flex items-center gap-2 text-[13px] tracking-widest font-black uppercase text-violet-600 dark:text-violet-400 mb-2">
              <BarChart3 size={14} />
              실제 추이 데이터
            </div>
            <h4 className="font-black text-[20px] sm:text-[22px] text-zinc-900 dark:text-white leading-snug mb-2">
              실제 사장님들 가게의 순위 변동 (4월 1주~2주차)
            </h4>
            <p className="text-[16px] sm:text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              로직 변경 직후, 어떤 가게는 <strong className="text-emerald-600 dark:text-emerald-400">140위 → 1위</strong>까지 회복하고,
              어떤 가게는 <strong className="text-rose-600 dark:text-rose-400">10위권 → 30~40위로 후퇴</strong>합니다.
              차이는 위 케이스에서 다룬 &ldquo;페이지 보강 + 유입 다양화&rdquo; 여부.
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-white/10 p-3 sm:p-5">
            <img
              src="/428place/rank-tracking.png"
              alt="실제 사장님 가게들의 4월 1~2주차 네이버 플레이스 순위 변동 추이 데이터"
              className="w-full h-auto rounded-lg border border-zinc-200 dark:border-white/10"
              loading="lazy"
            />
          </div>
          <figcaption className="px-5 sm:px-7 py-4 text-[14px] text-zinc-500 dark:text-zinc-500 border-t border-zinc-200 dark:border-white/10 leading-relaxed">
            * 가게명·URL은 비식별 처리. 일부 사장님 동의 하에 공유한 실제 추적 데이터입니다.
          </figcaption>
        </figure>
      </Section>

      {/* ── 3. This Week Actions ──────────────────── */}
      <Section number="03" eyebrow="당장 이번 주">
        <H2>이번 주에 당장 할 수 있는 3가지</H2>

        <div className="space-y-4 mt-8">
          <ActionCard
            num="01"
            title="손님 입장에서 우리 페이지 30초 봐보기"
            desc="본인 핸드폰으로 네이버에서 우리 가게 검색 → 플레이스 페이지에서 30초 가만히 보세요."
            checks={[
              '우리가 무슨 업종인지',
              '대표 메뉴(서비스) 3개가 뭔지',
              '가격이 얼마쯤 하는지',
              '위치랑 전화번호',
              '예약·문의는 어떻게 하면 되는지',
            ]}
            outro="3개 이상 안 보이면 손님도 똑같이 못 보고 나갑니다. 30초 만에 나가는 페이지가 되는 이유의 99%는 이거예요."
          />
          <ActionCard
            num="02"
            title="소개글에 손님이 검색할 만한 단어가 있나"
            desc="플레이스 관리자에서 소개글을 다시 읽어보세요."
            checks={[
              '우리 동네 이름이 들어있나? (예: 강남, 망원, 송파)',
              '우리 업종 단어가 들어있나? (미용실 → 컷·펌·염색)',
              '실제 검색할 만한 표현인가? (광고 문구 X, 검색어 O)',
            ]}
            outro="rankcheck에서 순위가 안 잡히는 키워드는, 그 단어가 우리 소개글·메뉴 설명에 아예 없는 경우가 대부분이에요."
          />
          <ActionCard
            num="03"
            title="첫 화면에 &lsquo;손님이 누를 버튼&rsquo;이 다 보이나"
            desc="플레이스 페이지를 켰을 때 스크롤 안 내려도 전화·길찾기·예약 버튼이 다 보이나요?"
            checks={[
              '안 보이면 → 사진·정보 순서 조정해서 위로',
              '외부 링크 없으면 → 카톡채널·예약 페이지 등록',
            ]}
            outro="1시간 안에 다 할 수 있고, 효과가 가장 빨리 옵니다 — 손님 행동 데이터가 바로 쌓이니까요."
          />
        </div>
      </Section>

      {/* ── 4. Type Prescriptions ─────────────────── */}
      <Section number="04" eyebrow="본인 타입별 처방">
        <H2>0번에서 고른 타입에 따라</H2>
        <Lead>같은 자료를 봤어도 다음 행동은 다릅니다.</Lead>

        <div className="grid lg:grid-cols-2 gap-5 mt-8">
          {PRESCRIPTIONS.map((p) => (
            <TypeCard key={p.id} {...p} />
          ))}
        </div>
      </Section>

      {/* ── 5. Monthly Routine ────────────────────── */}
      <Section number="05" eyebrow="중장기 체질 개선">
        <H2>한 달 안에 점검할 5가지</H2>
        <Lead>
          이번 주 액션이 응급처치라면, 이건 <strong>체질 개선</strong>입니다.
          이 다섯 개를 루틴으로 돌리는 가게와 안 돌리는 가게는 6개월 후 격차가 어마어마합니다.
        </Lead>

        <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-white dark:bg-zinc-900">
          {ROUTINES.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 p-5 sm:p-6 border-b border-zinc-200 dark:border-white/10 last:border-0"
            >
              <div className="col-span-1 text-[14px] tracking-widest font-black text-zinc-400 dark:text-zinc-600">
                0{i + 1}
              </div>
              <div className="col-span-11 sm:col-span-4">
                <div className="flex items-center gap-2">
                  <r.icon size={14} className="text-violet-500 dark:text-violet-400 shrink-0" />
                  <h4 className="font-black text-zinc-900 dark:text-white text-[19px]">
                    {r.title}
                  </h4>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-7 text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {r.detail}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[18px] text-zinc-500 dark:text-zinc-500 italic">
          지금 1위인 가게가 1년 뒤에도 1위인 게 우연이 아니에요.
        </p>
      </Section>

      {/* ── 6. Honest Note ────────────────────────── */}
      <Section number="06" eyebrow="솔직히">
        <H2>이 자료가 다루지 않는 것</H2>

        <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 p-7">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5">
            이 자료는 <strong>&ldquo;누구나 할 수 있는 기본기&rdquo;</strong>까지만 담았어요.
            진짜 디테일 — 예를 들면:
          </p>
          <ul className="space-y-2 text-[18px] text-zinc-700 dark:text-zinc-300 mb-6">
            {[
              '업종별 체류 시간 임계값이 정확히 몇 초인지',
              '리뷰 키워드 분포의 "건강한 비율"이 어떻게 되는지',
              '로직 업데이트가 다음에 어디로 갈 가능성이 큰지',
              '본인 가게 데이터를 실제로 분석한 결과',
            ].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-zinc-400">·</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            이런 건 자료로 풀기엔 변동성이 크고, 잘못 적용하면 역효과 나는 부분들이 있어서
            <strong className="text-zinc-900 dark:text-white"> 1:1 진단이 아니면 책임지고 답을 드리기 어렵습니다.</strong>
          </p>
        </div>
      </Section>

      {/* ── Routing CTA ───────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 sm:py-28 bg-zinc-50 dark:bg-zinc-900/40 border-y border-zinc-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-[14px] tracking-widest font-bold uppercase text-zinc-600 dark:text-zinc-300 mb-5">
              <Compass size={12} className="text-violet-500" />
              본인은 어디로 가야 할까
            </div>
            <h2 className="text-[32px] sm:text-[50px] font-black tracking-[-0.03em] leading-[1.1]">
              어디까지 직접 해볼 건지에<br className="hidden sm:block" /> 따라 다음 단계가 갈립니다
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {ROUTES.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target={r.url.startsWith('http') ? '_blank' : undefined}
                rel={r.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`group block rounded-2xl border-2 ${r.borderClass} ${r.bgClass} p-7 transition-all hover:scale-[1.01] active:scale-[0.99]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.iconBg}`}>
                    <r.icon size={18} className={r.iconColor} />
                  </div>
                  <span className={`text-[14px] tracking-widest font-black uppercase ${r.tagColor}`}>
                    {r.tag}
                  </span>
                </div>
                <h3 className="text-[20px] font-black tracking-tight mb-2 text-zinc-900 dark:text-white">
                  {r.title}
                </h3>
                <p className="text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
                  {r.desc}
                </p>
                <ul className="space-y-1.5 text-[17px] text-zinc-700 dark:text-zinc-300 mb-5">
                  {r.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={r.iconColor}>·</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className={`inline-flex items-center gap-1.5 text-[18px] font-bold ${r.iconColor} group-hover:gap-2.5 transition-all`}>
                  {r.cta}
                  <ArrowUpRight size={14} />
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-[18px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong className="text-amber-700 dark:text-amber-300">필수 참고</strong> — 이 자료의 액션을 다 하셨는데도 2–3주 안에
            변화가 없다면, 본인이 못 보는 데이터 문제가 있을 가능성이 높아요. 그땐 4번 분기로 오시는 게 맞습니다.
          </div>
        </div>
      </section>

      {/* ── Closing ───────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-7 mb-10">
            <div className="flex items-center gap-2 text-[14px] tracking-widest font-black uppercase text-zinc-500 dark:text-zinc-400 mb-4">
              <MessageCircle size={13} />
              자주 받는 DM
            </div>
            <p className="text-[20px] text-zinc-800 dark:text-zinc-200 leading-relaxed italic mb-5">
              &ldquo;이 자료 보고 따라 했는데 변화 없으면 어떡하죠?&rdquo;
            </p>
            <div className="pt-5 border-t border-zinc-200 dark:border-white/10">
              <div className="text-[14px] tracking-widest font-black uppercase text-violet-600 dark:text-violet-400 mb-2">
                → 답
              </div>
              <p className="text-[18px] sm:text-[19px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                보통 변화 없는 분들의 80%는 <strong>2주 만에 포기한 경우</strong>예요.
                데이터가 쌓여서 로직에 반영되는 데 최소 3–4주 걸립니다.
                액션 한 다음 <strong>rankcheck로 매주 모니터링하면서 4주는 버텨주세요.</strong>
                그래도 안 움직이면 그건 본인 페이지 문제가 아니라 <strong>경쟁 강도</strong> 문제일 수 있어요.
              </p>
            </div>
          </div>

          <p className="text-[20px] sm:text-[22px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            이번 분기는 <strong className="text-zinc-900 dark:text-white">로직 변경 적응 골든타임</strong>입니다.
            지금 안 움직이면 적응한 가게들 사이에서 1년 동안 따라잡기 어려워져요.
            반대로 지금 움직이면 적응 안 한 가게들 자리를 가져올 수 있는 시기이기도 합니다.
          </p>

          <p className="mt-6 text-[18px] text-zinc-500 dark:text-zinc-500">
            오픈채팅 4/29에 봬요. 그 전에 더 궁금한 거 있으면 DM 주세요.
          </p>
        </div>
      </section>

      {/* ── Minimal Footer ────────────────────────── */}
      <footer className="px-5 sm:px-8 py-12 border-t border-zinc-200 dark:border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <a href="/" className="text-[13px] font-black tracking-[0.18em] text-zinc-900 dark:text-white">
              GIVENEEDS
            </a>
            <p className="mt-2 text-[16px] text-zinc-500 dark:text-zinc-500">
              © {new Date().getFullYear()} GIVENEEDS. 네이버 플레이스 로직 변경 가이드 · 2026.04
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[16px] text-zinc-500 dark:text-zinc-400">
            <a href={MAGAZINE} className="hover:text-zinc-900 dark:hover:text-white transition" target="_blank" rel="noopener noreferrer">
              매거진
            </a>
            <a href={RANK_CHECK} className="hover:text-zinc-900 dark:hover:text-white transition" target="_blank" rel="noopener noreferrer">
              순위 체크
            </a>
            <a href={KAKAO_OPENCHAT} className="hover:text-zinc-900 dark:hover:text-white transition" target="_blank" rel="noopener noreferrer">
              오픈채팅
            </a>
            <a href={KAKAO_CHANNEL} className="hover:text-zinc-900 dark:hover:text-white transition" target="_blank" rel="noopener noreferrer">
              카카오채널
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────── Sub-components ─────────── */

function Section({ number, eyebrow, children }) {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">
        {(number || eyebrow) && (
          <div className="flex items-center gap-3 mb-5">
            {number && (
              <span className="text-[14px] tracking-widest font-black text-zinc-400 dark:text-zinc-600 tabular-nums">
                / {number}
              </span>
            )}
            {eyebrow && (
              <span className="text-[14px] tracking-widest font-black uppercase text-violet-600 dark:text-violet-400">
                {eyebrow}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

function H2({ children }) {
  return (
    <h2 className="text-[32px] sm:text-[50px] font-black tracking-[-0.03em] leading-[1.1] text-zinc-900 dark:text-white mb-5">
      {children}
    </h2>
  );
}

function Lead({ children }) {
  return (
    <p className="text-[20px] sm:text-[22px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
      {children}
    </p>
  );
}

function Note({ children, tone = 'zinc', icon }) {
  const tones = {
    zinc: 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300',
    violet: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-500/20 text-zinc-700 dark:text-zinc-300',
  };
  return (
    <div className={`mt-8 rounded-xl border p-5 sm:p-6 text-[18px] leading-relaxed ${tones[tone]}`}>
      <div className="flex gap-3">
        {icon && (
          <div className="shrink-0 text-violet-600 dark:text-violet-400 mt-0.5">{icon}</div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

function ChangeCard({ num, title, body, icon }) {
  return (
    <div className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-900 dark:hover:border-white transition">
      <div className="flex items-start gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center text-[20px] font-black">
          {num}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-violet-500 dark:text-violet-400">{icon}</span>
            <h3 className="font-black text-[22px] text-zinc-900 dark:text-white">{title}</h3>
          </div>
          <p className="text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

function KeywordCard({ emoji, title, keywords, footer }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-7">
      <div className="text-[26px] mb-2">{emoji}</div>
      <h3 className="font-black text-[22px] text-zinc-900 dark:text-white mb-5">{title}</h3>
      <ul className="space-y-2.5 mb-5">
        {keywords.map((k, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-[18px]">
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">{k.kw}</span>
            <span className="text-[14px] tracking-widest font-bold uppercase text-zinc-400 dark:text-zinc-500 shrink-0">
              {k.tag}
            </span>
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-zinc-200 dark:border-white/10 text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
        → {footer}
      </div>
    </div>
  );
}

function CaseCard({ tag, location, problem, root, actions, result }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="bg-zinc-900 dark:bg-zinc-950 p-5 sm:p-6 text-white border-b border-zinc-800 dark:border-white/10">
        <div className="text-[14px] tracking-widest font-black uppercase text-violet-300 mb-2">
          {tag}
        </div>
        <h3 className="text-[22px] sm:text-[26px] font-black tracking-tight">{location}</h3>
      </div>
      <div className="p-5 sm:p-7 space-y-5">
        <CaseRow label="상황" body={problem} accent="rose" />
        <CaseRow label="문제 진단" body={root} accent="amber" />
        <div>
          <div className="text-[14px] tracking-widest font-black uppercase text-violet-600 dark:text-violet-400 mb-2.5">
            뭘 했나
          </div>
          <ul className="space-y-2 text-[18px] text-zinc-700 dark:text-zinc-300">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-violet-500 dark:text-violet-400" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <CaseRow label="결과" body={result} accent="emerald" />
      </div>
    </div>
  );
}

function CaseRow({ label, body, accent }) {
  const colors = {
    rose: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div>
      <div className={`text-[14px] tracking-widest font-black uppercase mb-1.5 ${colors[accent]}`}>
        {label}
      </div>
      <p className="text-[18px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}

function ActionCard({ num, title, desc, checks, outro }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 sm:p-7">
      <div className="flex items-start gap-5 mb-5">
        <div className="shrink-0 text-[14px] tracking-widest font-black text-violet-600 dark:text-violet-400 tabular-nums pt-1">
          / {num}
        </div>
        <div className="flex-1">
          <h3 className="font-black text-[22px] text-zinc-900 dark:text-white mb-2 leading-snug">
            {title}
          </h3>
          <p className="text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{desc}</p>
        </div>
      </div>
      <ul className="space-y-2.5 pl-9 mb-5">
        {checks.map((c, i) => (
          <li key={i} className="flex items-start gap-3 text-[18px] text-zinc-700 dark:text-zinc-300">
            <span className="shrink-0 mt-1 w-4 h-4 rounded border border-zinc-300 dark:border-white/20" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
      <div className="pl-9">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-white/5 p-4 text-[17px] text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
          {outro}
        </div>
      </div>
    </div>
  );
}

function TypeCard({ id, label, cause, priority, outcome, color }) {
  const colorMap = {
    rose: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20' },
    sky: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/20' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-7 ring-4 ${c.ring}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-9 h-9 rounded-full ${c.dot} text-white flex items-center justify-center font-black`}>
          {id}
        </span>
        <h3 className="font-black text-[20px] text-zinc-900 dark:text-white leading-tight">{label}</h3>
      </div>
      <p className="text-[18px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
        <span className="font-bold text-zinc-900 dark:text-white">원인:</span> {cause}
      </p>
      <div className="mb-5">
        <div className={`text-[14px] tracking-widest font-black uppercase mb-2 ${c.text}`}>
          우선순위
        </div>
        <ol className="space-y-1.5 text-[18px] text-zinc-700 dark:text-zinc-300">
          {priority.map((p, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 w-4 text-zinc-400 tabular-nums">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-white/5 p-4 text-[17px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
        → {outcome}
      </div>
    </div>
  );
}

/* ─────────── Data ─────────── */

const TYPES = [
  { id: 'A', symptom: '요 한 달 사이 손님이 눈에 띄게 줄었다 / 검색해도 예전처럼 안 뜬다', tag: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  { id: 'B', symptom: '원래부터 검색해도 잘 안 보였다', tag: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  { id: 'C', symptom: '잘 되다 안 되다 들쭉날쭉이다', tag: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  { id: 'D', symptom: '큰 문제는 없는데 요즘 살짝 불안하다', tag: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
];

const CHANNELS = [
  { name: '영수증 리뷰', how: '매장 방문 손님 리뷰 유도 (QR, 안내 문구)', cycle: '매주 꾸준히', icon: Star },
  { name: '블로그 리뷰', how: '블로거·단골에게 후기 작성 요청, 또는 협업', cycle: '격주~월 1', icon: BookOpen },
  { name: '자연 검색 유입', how: '소개글·메뉴·사진 키워드 풀세팅', cycle: '분기별 점검', icon: Search },
  { name: '지도·길찾기 유입', how: '위치 정보 정확성, 영업 정보 최신화', cycle: '월 1회', icon: MapPin },
  { name: '외부 채널 유입', how: '인스타·카톡채널·SNS에서 플레이스 링크 노출', cycle: '상시', icon: ExternalLink },
];

const CASES = [
  {
    tag: 'CASE 01',
    location: '강남 미용실 A 사장님',
    problem:
      '리뷰 280개 쌓아놨는데 \'강남 미용실\' 검색하면 12위에서 28위로 떨어짐. 매출 직격탄.',
    root:
      '사장님이 직접 손님 입장에서 본인 페이지를 켜봤더니 — 사진 8장, 소개글 두 줄, 가격대 X, 시술 종류 모호. 들어온 손님이 더 볼 게 없는 페이지.',
    actions: [
      '소개글: 두 줄 → 시술 종류·소요 시간·가격대까지 자세하게',
      '사진: 8장 → 24장 (시술 전·후 비교 컷 추가)',
      '첫 화면에 "예약하기" 버튼이 바로 보이게',
      '매출이 너무 급해서 위 작업 중 시간 벌기용 리워드 트래픽도 일부 병행 (메인은 페이지 보강)',
    ],
    result:
      '4주 뒤 → 페이지 정보가 풍부해지니 둘러볼 거리가 많아짐. 순위 6위 복귀, 예약 클릭 3배+. 리워드 비중 점차 축소, 자체 유입 비중 확대.',
  },
  {
    tag: 'CASE 02',
    location: '마포 한식당 B 사장님',
    problem:
      '영수증 리뷰 460개로 \'망원 한식\' 3위였다가 9위로 떨어짐.',
    root:
      '영수증 리뷰만 잔뜩, 다른 유입 통로가 거의 없음. 최근 한 달 신규 리뷰 20개뿐, 다 "맛있어요"만 반복. 블로그·지도 유입 거의 없음.',
    actions: [
      '단골 30분께 영수증 리뷰 요청 — 구체 가이드 동봉 (어떤 메뉴, 어떤 분위기)',
      '동네 음식 블로거 3명과 협업 → 블로그 후기 라인 확보',
      '인스타 운영 채널에 플레이스 링크 노출 (외부 유입)',
      '매장 메뉴별 QR로 사진 리뷰 유도',
    ],
    result:
      '3주 뒤 → 영수증 리뷰 41개 신규 + 블로그 후기 5건 + 인스타→플레이스 클릭 주당 60+. 통로 다양화로 순위 4위 회복.',
  },
  {
    tag: 'CASE 03',
    location: '송파 필라테스 C 사장님',
    problem:
      '오픈 6개월. 리뷰 90개 쌓았는데 \'송파 필라테스\' 검색하면 40위 밖.',
    root:
      '비요식업은 리뷰만 쌓아도 잘 안 올라감. 페이지에 예약 링크도 없고, 손님이 행동할 버튼이 부족.',
    actions: [
      '카카오톡 채널을 플레이스에 연결 (문의 행동 데이터 적재)',
      '예약 페이지 외부 링크 등록',
      '소개글에 "1:1 상담", "체험 수업" 같은 검색 표현 자연스럽게',
      '전화번호를 페이지 상단으로 이동',
    ],
    result: '5주 뒤 → 12위 진입. 외부 링크 클릭 주당 평균 47회.',
  },
];

const PRESCRIPTIONS = [
  {
    id: 'A',
    label: '최근 2–4주 사이 갑자기 떨어졌다',
    color: 'rose',
    cause: '로직 변경 직격탄. 본인이 못한 게 아니라 기준이 바뀐 것.',
    priority: [
      '3부 액션 1·2·3 다 하기 (1주일 안에)',
      '최근 한 달 리뷰 추세 확인 → 적으면 단골 리뷰 요청 캠페인',
      '체류 시간 늘리는 콘텐츠 보강 (사진·소개글 두꺼이)',
    ],
    outcome: '1–2주 안에 회복 신호 옵니다. 안 오면 더 깊은 문제 → 5부 분기로.',
  },
  {
    id: 'B',
    label: '원래부터 잘 안 보였다',
    color: 'sky',
    cause: '기초 셋업이 안 된 경우가 대부분. 로직 변경과 무관, 처음부터 다시.',
    priority: [
      '카테고리 설정 정확성 (잘못되면 키워드 매칭 자체가 X)',
      '소개글·사진·메뉴 풀세팅 (없는 것 다 채우기)',
      '영업시간·휴무일·위치 정확성',
      '그 다음에 3부 액션',
    ],
    outcome: '시간이 좀 걸려요 (1–2개월). 대신 한 번 자리 잡으면 안정적.',
  },
  {
    id: 'C',
    label: '올랐다 떨어졌다 반복',
    color: 'amber',
    cause: '손님 행동 패턴이 들쭉날쭉. 보통 콘텐츠나 키워드가 한쪽에 쏠려 일정한 손님 풀이 안 만들어지는 케이스.',
    priority: [
      '플레이스 관리자 통계(클릭·전화·길찾기 추이) 한 번 보기',
      '사진이 다 비슷한 분위기면 → 다양한 각도·시점·시간대 추가',
      '리뷰가 한 키워드만 반복되면 → 단골에게 구체 가이드로 요청',
      '키워드 한 가지에 쏠렸나 점검',
    ],
    outcome: '가장 까다로운 타입. 혼자 짚어내기 어려울 수 있음.',
  },
  {
    id: 'D',
    label: '안정적이었는데 요즘 흔들림',
    color: 'emerald',
    cause: '경쟁사가 새로 들어왔거나 강해진 경우. 차별화 포인트가 약해짐.',
    priority: [
      '같은 키워드 상위 5개 가게 직접 둘러보기 → 차이 분석',
      '본인만의 차별점을 소개글·사진에서 명확히',
      '최근성 신호 강화 (최근 한 달 사진·소개글·이벤트 업데이트)',
    ],
    outcome: '방어전이에요. 위기는 아니지만 방치하면 위기로 갑니다.',
  },
];

const ROUTINES = [
  { title: '리뷰 캠페인 시스템화', detail: '단골 30–50명 명단 만들어서 분기별 리뷰 요청 (구체 가이드 포함)', icon: Star },
  { title: '사진 라이브러리 확장', detail: '메뉴/서비스별 3장 이상, 분기별 신규 컷 추가 (계절·이벤트별)', icon: BarChart3 },
  { title: '외부 링크 관리', detail: '카톡채널·인스타·자체 예약페이지 등 외부 액션 채널 1–2개 운영', icon: ExternalLink },
  { title: '키워드 매핑', detail: '잡고 싶은 키워드 10개 → rankcheck로 매주 모니터링', icon: KeyRound },
  { title: '경쟁사 모니터링', detail: '같은 키워드 상위 3–5개 가게의 변화 추적 (월 1회)', icon: Users },
];

const ROUTES = [
  {
    id: 'A',
    tag: 'Route A',
    title: '일단 더 공부하고 싶다',
    desc: '플레이스·검색 마케팅 전반 글들. 천천히 읽으면서 큰 그림 잡으시면 됩니다.',
    bullets: ['배경부터 차근차근', '글 형태로 천천히'],
    cta: '기브니즈 매거진',
    icon: BookOpen,
    url: MAGAZINE,
    iconColor: 'text-zinc-700 dark:text-zinc-300',
    iconBg: 'bg-zinc-100 dark:bg-white/10',
    tagColor: 'text-zinc-500 dark:text-zinc-500',
    bgClass: 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
    borderClass: 'border-zinc-200 dark:border-white/10 hover:border-zinc-900 dark:hover:border-white',
  },
  {
    id: 'B',
    tag: 'Route B',
    title: '내 가게 순위를 계속 보고 싶다',
    desc: '키워드 10개 정도 정해서 매주 한 번씩 돌려보세요. 변화 추세 보면 본인 타입이 명확해집니다.',
    bullets: ['주 1회 모니터링', '키워드별 변화 추적'],
    cta: '순위 체크 도구',
    icon: BarChart3,
    url: RANK_CHECK,
    iconColor: 'text-violet-600 dark:text-violet-300',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    tagColor: 'text-violet-500 dark:text-violet-400',
    bgClass: 'bg-violet-50/50 dark:bg-violet-950/10 hover:bg-violet-50 dark:hover:bg-violet-950/20',
    borderClass: 'border-violet-200 dark:border-violet-500/30 hover:border-violet-600 dark:hover:border-violet-400',
  },
  {
    id: 'C',
    tag: 'Route C',
    title: '정보 계속 먼저 받고 싶다',
    desc: '로직 업데이트 즉시 공유, DM 질문 정리, 다른 업종 사장님 케이스. 4/29 전이면 DM 주세요.',
    bullets: ['즉시 공유 채널', '4/29 오픈', '4/29 전엔 DM'],
    cta: '비공개 오픈채팅',
    icon: MessageCircle,
    url: KAKAO_OPENCHAT,
    iconColor: 'text-amber-600 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    tagColor: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20',
    borderClass: 'border-amber-200 dark:border-amber-500/30 hover:border-amber-600 dark:hover:border-amber-400',
  },
  {
    id: 'D',
    tag: 'Route D',
    title: '내 가게 직접 봐달라',
    desc: '데이터 직접 분석 → 타입 진단 → 1:1 액션 플랜. 실행 대행도 별도 상담. 예산 알려주셔야 구체적으로 짤 수 있어요.',
    bullets: ['1:1 진단', '액션 플랜', '실행 대행 가능'],
    cta: '카톡채널 문의',
    icon: Calendar,
    url: KAKAO_CHANNEL,
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    tagColor: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
    borderClass: 'border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-600 dark:hover:border-emerald-400',
  },
];
