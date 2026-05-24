import React from "react";
import { cn } from "@/lib/utils";

/**
 * The product wordmark — نَمذِج (Arabic for "model"). Always rendered in
 * IBM Plex Sans Arabic bold so it stays visually consistent everywhere it
 * appears across the UI.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={cn("font-arabic font-bold inline-flex items-center text-primary text-[1.18em] leading-none", className)}
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
              className="font-arabic font-bold text-[1.18em] inline-flex items-center mx-0.5 text-primary leading-none"
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
