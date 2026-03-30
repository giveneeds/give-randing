import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "기브니즈 | 마케팅 대행사",
  description: "브랜드 성장을 위한 전략적 마케팅 파트너, 기브니즈",
  openGraph: {
    title: "기브니즈 | 마케팅 대행사",
    description: "브랜드 성장을 위한 전략적 마케팅 파트너, 기브니즈",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
