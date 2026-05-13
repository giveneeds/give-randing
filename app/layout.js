import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import FooterWrapper from "@/components/ui/FooterWrapper";
import BrandSplash from "@/components/ui/BrandSplash";
import LoginToast from "@/components/ui/LoginToast";
import BlueDotCursor from "@/components/ui/BlueDotCursor";
import Tracker from "@/components/Tracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.giveneeds.co.kr";

const SITE_TITLE = "GIVENEEDS | 전략적 마케팅 파트너";
const SITE_DESCRIPTION =
  "기브니즈는 B2B 마케팅 대행사입니다. 네이버·구글·메타 광고 운영, 바이럴, 리뷰 관리, AI 마케팅까지 — 데이터 기반 전환 성과를 만드는 전략 파트너.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | GIVENEEDS" },
  description: SITE_DESCRIPTION,
  keywords: [
    "마케팅 대행사",
    "B2B 마케팅",
    "디지털 마케팅",
    "네이버 SEO",
    "네이버 플레이스",
    "퍼포먼스 마케팅",
    "바이럴 마케팅",
    "AI 마케팅",
    "기브니즈",
    "GIVENEEDS",
  ],
  authors: [{ name: "GIVENEEDS" }],
  creator: "GIVENEEDS",
  publisher: "GIVENEEDS",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "GIVENEEDS",
    locale: "ko_KR",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // images는 app/opengraph-image.js가 자동 주입
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // images도 file-based로 자동 처리
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: {
    // TODO: Google Search Console / 네이버 서치어드바이저에서 받은 코드로 교체
    google: "REPLACE_WITH_GOOGLE_VERIFICATION",
    other: {
      "naver-site-verification": "REPLACE_WITH_NAVER_VERIFICATION",
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrandSplash />
          <BlueDotCursor />
          <Tracker />
          {children}
          <LoginToast />
          <FooterWrapper />
        </ThemeProvider>
      </body>
    </html>
  );
}
