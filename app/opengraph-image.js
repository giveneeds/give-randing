import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GIVENEEDS — 전략적 마케팅 파트너";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 임시 placeholder. 디자인된 이미지로 교체 시 이 파일 본문만 수정하거나
// public/og-image.png를 두고 layout.js에서 명시 참조하도록 변경.
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 30%, #1e3a8a 0%, #0a0a0a 60%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          GIVENEEDS
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 36,
            fontWeight: 500,
            color: "#9ca3af",
            letterSpacing: -1,
          }}
        >
          전략적 마케팅 파트너
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            fontSize: 22,
            color: "#6b7280",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          www.giveneeds.co.kr
        </div>
      </div>
    ),
    { ...size }
  );
}
