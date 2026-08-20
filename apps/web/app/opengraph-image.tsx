import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TRAIL — Every bug leaves a trail";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 64,
        backgroundColor: "#0d0f0e",
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "monospace",
          fontSize: 14,
          letterSpacing: "0.2em",
          color: "#ff6a00",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "#ff6a00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0d0f0e",
            fontWeight: 700,
          }}
        >
          ◆
        </div>
        TRAIL
      </div>
      <div
        style={{
          marginTop: 32,
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: "-0.04em",
          color: "#f2f4f6",
          maxWidth: 720,
        }}
      >
        Every bug leaves a <span style={{ color: "#ff6a00" }}>trail.</span>
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 18,
          lineHeight: 1.6,
          color: "#8b929c",
          maxWidth: 560,
        }}
      >
        Record, replay, and report browser bugs — no SDK. Data stays in the
        browser.
      </div>
      <div
        style={{
          marginTop: 28,
          display: "flex",
          gap: 12,
          fontFamily: "monospace",
          fontSize: 12,
          color: "#626973",
        }}
      >
        <span>Open source</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
        <span>GitHub-native</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
        <span>Privacy by default</span>
      </div>
    </div>,
    size,
  );
}
