import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Namtheg AutoML";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRIMARY = "#38009d";
const CONTAINER = "#4f29b7";
const MUTED = "#5b5b6b";

const fontDir = join(process.cwd(), "app", "og-assets");
const arabicFont = readFileSync(join(fontDir, "ibm-plex-arabic-700.woff"));
const latinFont = readFileSync(join(fontDir, "ibm-plex-latin-700.woff"));

// Three-node graph mark, mirroring the Material "graph_3" icon in the header.
const graphMark = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round">
    <line x1="12" y1="6" x2="6" y2="18"/>
    <line x1="12" y1="6" x2="18" y2="18"/>
    <line x1="6" y1="18" x2="18" y2="18"/>
    <circle cx="12" cy="6" r="2.6" fill="#ffffff"/>
    <circle cx="6" cy="18" r="2.6" fill="#ffffff"/>
    <circle cx="18" cy="18" r="2.6" fill="#ffffff"/>
  </svg>`,
)}`;

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
          padding: "76px",
          background: "#ffffff",
          fontFamily: "Plex",
        }}
      >
        {/* Brand lockup — same composition as the site header */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              width: "104px",
              height: "104px",
              borderRadius: "24px",
              background: `linear-gradient(135deg, ${PRIMARY} 0%, ${CONTAINER} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={graphMark} width={60} height={60} alt="" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              lang="ar"
              dir="rtl"
              style={{ fontSize: "76px", color: PRIMARY, lineHeight: 1 }}
            >
              نَمذِج
            </div>
            <div
              style={{
                fontSize: "20px",
                letterSpacing: "6px",
                color: MUTED,
                fontWeight: 700,
              }}
            >
              LIVE AI MODEL
            </div>
          </div>
        </div>

        {/* Hero title */}
        <div style={{ fontSize: "118px", fontWeight: 700, color: PRIMARY, lineHeight: 1 }}>
          Namtheg AutoML
        </div>

        {/* Tagline */}
        <div style={{ fontSize: "32px", color: MUTED, maxWidth: "960px", lineHeight: 1.3 }}>
          Upload a CSV, pick a target, and get ranked, explained ML models.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: arabicFont, weight: 700, style: "normal" },
        { name: "Plex", data: latinFont, weight: 700, style: "normal" },
      ],
    },
  );
}
