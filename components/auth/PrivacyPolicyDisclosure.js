'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 로그인/회원가입 화면에서 사용하는 "개인정보 처리방침" 더보기 토글.
 * - 헤더(개인정보 처리방침) 클릭 또는 "더보기" 버튼으로 펼침/접힘
 * - 본문은 작은 글씨로 표기 (템플릿 초안 — 추후 법무 검토 후 교체 권장)
 */
export default function PrivacyPolicyDisclosure({ className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`mt-5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-[12px] font-black tracking-tight text-zinc-900 dark:text-white">
          개인정보 처리방침
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
          {open ? '접기' : '더보기'}
          <ChevronDown
            size={12}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 -mt-1 max-h-56 overflow-y-auto text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 space-y-2">
          <p className="font-bold text-zinc-700 dark:text-zinc-300">
            기브니즈(Giveneeds, 이하 “회사”)는 이용자의 개인정보를 중요시하며,
            「개인정보 보호법」 등 관련 법령을 준수하기 위해 노력합니다.
          </p>

          <p>
            <span className="font-bold">1. 수집하는 개인정보 항목</span>
            <br />
            카카오 계정 연동 시 제공되는 프로필 정보(닉네임, 프로필 이미지),
            이메일 주소, 카카오 회원 식별자(고유 ID)를 수집합니다. 서비스
            이용 과정에서 IP, 접속 로그, 쿠키, 디바이스 정보가 자동으로
            생성·수집될 수 있습니다.
          </p>

          <p>
            <span className="font-bold">2. 개인정보의 수집 및 이용 목적</span>
            <br />
            회원 식별 및 본인 확인, 서비스 제공 및 운영, 고객 문의 응대,
            마케팅 전략 리포트·매거진·AI 진단 기능 제공, 신규 서비스 안내 및
            이벤트 정보 발송(동의 시), 부정 이용 방지 및 보안 목적.
          </p>

          <p>
            <span className="font-bold">3. 개인정보의 보유 및 이용 기간</span>
            <br />
            회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다.
            단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 안전하게
            보관합니다(예: 전자상거래법에 따른 계약·청약철회 기록 5년 등).
          </p>

          <p>
            <span className="font-bold">4. 개인정보의 제3자 제공</span>
            <br />
            회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
            다만, 법령에 근거하거나 수사기관의 적법한 요청이 있는 경우는
            예외로 합니다.
          </p>

          <p>
            <span className="font-bold">5. 이용자의 권리</span>
            <br />
            이용자는 언제든지 본인의 개인정보를 열람·정정·삭제·처리정지를
            요청할 수 있으며, 회원 탈퇴를 통해 동의를 철회할 수 있습니다.
          </p>

          <p>
            <span className="font-bold">6. 개인정보 보호책임자</span>
            <br />
            채정욱, 박성빈
            <br />
            문의: giveneeds1@naver.com
          </p>

          <p className="pt-1 text-zinc-400 dark:text-zinc-500">
            본 방침은 초안이며, 서비스 정책 변경 시 사전 공지 후 개정될 수
            있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
