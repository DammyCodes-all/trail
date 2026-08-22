import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TRAIL — Every bug leaves a trail";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori-safe OG: only flex, backgroundColor, single backgroundImage values.
// No <svg><pattern>/<mask>/<radialGradient> and no mega-path — those crash resvg
// with "Offset is outside the bounds of the DataView".
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          backgroundColor: "#0d0f0e",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
            letterSpacing: "0.2em",
            color: "#ff6a00",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: "#ff6a00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0d0f0e",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ◆
          </div>
          TRAIL
        </div>

        {/* Headline — split into two flex spans for orange word (no negative letterSpacing) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 32,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 0.92,
            color: "#f2f4f6",
            maxWidth: 760,
          }}
        >
          <span>Every bug leaves a&nbsp;</span>
          <span style={{ color: "#ff6a00" }}>trail.</span>
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 19,
            lineHeight: 1.5,
            color: "#8b929c",
            maxWidth: 580,
          }}
        >
          Record, replay, and report browser bugs — no SDK. Data stays in the
          browser.
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 14,
            fontSize: 12,
            color: "#626973",
          }}
        >
          <span>Open source</span>
          <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
          <span>GitHub-native</span>
          <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
          <span>Privacy by default</span>
        </div>
      </div>
    ),
    size,
  );
}
