import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import FooterWrapper from "@/components/ui/FooterWrapper";
import BrandSplash from "@/components/ui/BrandSplash";
import LoginToast from "@/components/ui/LoginToast";
import BlueDotCursor from "@/components/ui/BlueDotCursor";

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
          <BrandSplash />
          <BlueDotCursor />
          {children}
          <LoginToast />
          <FooterWrapper />
        </ThemeProvider>
      </body>
    </html>
  );
}
