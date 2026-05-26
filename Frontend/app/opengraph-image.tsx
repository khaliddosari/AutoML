import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Namtheg — LLM-orchestrated AutoML";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRIMARY = "#38009d";
const MID = "#4f29b7";
const TINT = "#e7ddff";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${MID} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#ffffff",
              color: PRIMARY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 700,
            }}
          >
            N
          </div>
          <div
            style={{
              fontSize: "22px",
              letterSpacing: "4px",
              fontWeight: 600,
              color: TINT,
            }}
          >
            LIVE AI MODEL
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "108px", fontWeight: 700, lineHeight: 1 }}>
            Namtheg
          </div>
          <div style={{ fontSize: "40px", fontWeight: 600, color: TINT }}>
            LLM-orchestrated AutoML
          </div>
        </div>

        <div style={{ fontSize: "30px", color: "rgba(255,255,255,0.85)", maxWidth: "900px" }}>
          Upload a CSV, pick a target, and get ranked, explained ML models.
        </div>
      </div>
    ),
    { ...size },
  );
}
