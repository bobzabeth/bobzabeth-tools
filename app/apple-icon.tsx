import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <div style={{ fontSize: 80, lineHeight: 1, display: "flex" }}>✈</div>
        <div
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "bold",
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          旅のしおり
        </div>
      </div>
    ),
    { ...size }
  );
}
