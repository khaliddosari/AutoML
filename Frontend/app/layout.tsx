import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ModelForge — AutoML",
  description: "LLM-orchestrated AutoML: upload a CSV, get a ranked model with justification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-dvh flex flex-col">
          <header className="bg-white/90 backdrop-blur-sm border-b border-surface-border px-6 py-3.5 flex items-center gap-3 sticky top-0 z-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-brand-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 10 L7 3 L12 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.5 10 L7 7 L9.5 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                </svg>
              </div>
              <span className="font-heading text-[15px] font-semibold text-slate-900 tracking-tight">
                ModelForge
              </span>
            </div>
            <span className="text-[11px] font-medium text-brand-primary bg-brand-light border border-brand-border px-2 py-0.5 rounded-full">
              AutoML
            </span>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
