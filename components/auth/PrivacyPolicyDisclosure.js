'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 로그인/회원가입 화면에서 사용하는 "개인정보 처리방침" 더보기 토글.
 * - 헤더(개인정보 처리방침) 클릭 또는 "더보기" 버튼으로 펼침/접힘
 * - 카카오 로그인 검수 통과를 위해 항목별 이용 목적 매핑·법정 보존 기간 명시.
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
            기브니즈(Giveneeds, 이하 “회사”)는 「개인정보 보호법」 및
            「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을
            준수하며, 이용자의 개인정보를 보호하기 위하여 다음과 같이 처리방침을
            수립·공개합니다.
          </p>

          <p>
            <span className="font-bold">1. 수집하는 개인정보 항목</span>
            <br />
            회사는 카카오 계정을 통한 회원가입 및 서비스 운영을 위하여 다음
            항목을 수집합니다.
            <br />· 필수: 닉네임, 카카오 회원 식별자(고유 ID), 이메일 주소,
            이름, 휴대전화번호
            <br />· 자동수집: IP 주소, 접속 로그, 쿠키, 디바이스 정보, 서비스
            이용 기록
          </p>

          <p>
            <span className="font-bold">2. 개인정보의 이용 목적</span>
            <br />
            수집된 개인정보는 아래 목적에 한하여 이용되며, 목적 외 용도로는
            이용되지 않습니다.
            <br />· 닉네임, 카카오 회원 식별자: 회원 식별 및 중복 가입 방지,
            서비스 내 사용자 표시
            <br />· 이메일 주소: 회원 계정 식별, 결제·계약·계정 보안 등 주요
            서비스 안내 발송
            <br />· 이름: 유료 서비스 결제 및 전자세금계산서 발행 시 본인 확인,
            계약·견적·결과 보고서 등 운영 문서상 담당자 식별
            <br />· 휴대전화번호: 1:1 컨설팅 및 캠페인 운영 단계별 유선 상담,
            결제·계약·환불 등 거래 관련 긴급 안내, 운영 이슈 발생 시 즉시 연락
            <br />· 자동수집 정보: 부정 이용 방지, 서비스 품질 개선, 보안 사고
            대응
          </p>

          <p>
            <span className="font-bold">3. 개인정보의 보유 및 이용 기간</span>
            <br />
            회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다.
            다만 관계 법령에 따라 다음 기간 동안 보존합니다.
            <br />· 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)
            <br />· 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)
            <br />· 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)
            <br />· 웹사이트 방문 기록: 3개월 (통신비밀보호법)
          </p>

          <p>
            <span className="font-bold">4. 개인정보의 제3자 제공</span>
            <br />
            회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
            다만, 관계 법령에 근거하거나 수사기관의 적법한 요청이 있는 경우는
            예외로 합니다.
          </p>

          <p>
            <span className="font-bold">5. 이용자 및 법정대리인의 권리와 행사 방법</span>
            <br />
            이용자는 언제든지 본인의 개인정보를 열람·정정·삭제·처리정지를
            요청할 수 있으며, 회원 탈퇴를 통해 동의를 철회할 수 있습니다.
            요청은 아래 개인정보 보호책임자 연락처로 접수하실 수 있으며,
            회사는 지체 없이 조치합니다.
          </p>

          <p>
            <span className="font-bold">6. 개인정보 보호책임자</span>
            <br />
            성명: 채정욱, 박성빈
            <br />
            연락처: giveneeds1@naver.com
          </p>

          <p className="pt-1 text-zinc-400 dark:text-zinc-500">
            본 방침은 시행일로부터 적용되며, 법령 또는 서비스 정책 변경 시
            사전 공지 후 개정됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
