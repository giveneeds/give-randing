import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import AiChatbot from "@/components/ui/AiChatbot";
import FooterWrapper from "@/components/ui/FooterWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "GIVENEEDS | Strategic Marketing Partner",
  description: "성장을 위한 최고의 마케팅 파트너, 기브니즈 매거진",
  openGraph: {
    title: "GIVENEEDS | Strategic Marketing Partner",
    description: "성장을 위한 최고의 마케팅 파트너, 기브니즈 매거진",
    type: "website",
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
          {children}
          <FooterWrapper />
        </ThemeProvider>
        
        {/* Kakao SDK Initializer */}
        <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js" integrity="sha384-l680eb3tqQ+vOq02oJq5+qj60bYI0fKvXfN7/4A+N+4A+N+4A+N+4" crossOrigin="anonymous" async></script>
      </body>
    </html>
  );
}
