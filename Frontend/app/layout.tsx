import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ModelForge — AutoML",
  description: "LLM-orchestrated AutoML: upload a CSV, get a ranked model with justification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-dvh flex flex-col">
          <header className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3">
            <span className="font-heading text-xl font-bold text-brand-primary text-glow tracking-tight">
              ModelForge
            </span>
            <span className="text-xs text-slate-500 font-body mt-0.5">AutoML</span>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
