import React from "react";
import { cn } from "@/lib/utils";

/**
 * The product wordmark — نَمذِج (Arabic for "model"). Always rendered in
 * IBM Plex Sans Arabic bold so it stays visually consistent everywhere it
 * appears across the UI.
 */
/** OpenType feature set that lights up the Thmanyah serif ligatures/stylistic sets. */
const THMANYAH_FEATURES: React.CSSProperties = {
  fontFeatureSettings:
    '"liga" 1, "dlig" 1, "clig" 1, "calt" 1, "salt" 1, "ss01" 1, "ss02" 1, "ss03" 1, "ss04" 1, "ss05" 1',
  textRendering: "optimizeLegibility",
};

export function Brand({ className }: { className?: string }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      style={THMANYAH_FEATURES}
      className={cn("font-display font-bold inline-flex items-center text-primary text-[1.22em] leading-none", className)}
    >
      نَمذِج
    </span>
  );
}

/**
 * Formats any occurrence of "نَمذِج" in a string by wrapping it in a styled Brand span
 * so it stands out, is highly readable, and uses the correct Arabic bold font.
 */
export function formatArabicBrand(text: string): React.ReactNode {
  if (!text) return "";
  
  // Matches "نَمذِج" and common diacritic variants
  const regex = /(ن[َْ]?م[َْ]?ذ[ِْ]?ج)/g;
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <span
              key={index}
              lang="ar"
              dir="rtl"
              style={THMANYAH_FEATURES}
              className="font-display font-bold text-[1.22em] inline-flex items-center mx-0.5 text-primary leading-none"
            >
              نَمذِج
            </span>
          );
        }
        return part;
      })}
    </>
  );
}
