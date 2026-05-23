import { cn } from "@/lib/utils";

/**
 * The product wordmark — رنَمذِج (Arabic for "model"). Always rendered in
 * IBM Plex Sans Arabic bold so it stays visually consistent everywhere it
 * appears across the UI.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={cn("font-arabic font-bold inline-block", className)}
    >
      نَمذِج
    </span>
  );
}
