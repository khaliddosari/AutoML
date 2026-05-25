"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Brand } from "./brand";
import { SiteFooter } from "./site-footer";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Share routes are public, no-account pages embedded into LinkedIn-style demos.
  // Drop the internal sidebar so visitors don't see "Data Ingestion / Model Training"
  // nav they can't access.
  const isPublicShare = pathname.startsWith("/share");

  if (isPublicShare) {
    return (
      <div className="min-h-dvh flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col relative">
      {/* Mobile Top Navigation Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-surface-container-lowest border-b border-outline-variant shrink-0 select-none">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-primary p-1.5 rounded-lg hover:bg-surface-purple-tint/40 transition-colors flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined block" style={{ fontSize: "24px" }}>menu</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: "22px" }}>graph_3</span>
          </div>
          <div className="leading-tight">
            <p className="text-lg text-on-background"><Brand /></p>
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Live AI Model</p>
          </div>
        </div>

        <div className="w-9 h-9" /> {/* Spacer */}
      </header>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar + Content row */}
      <div className="flex flex-row flex-1 min-h-0 relative">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-h-0 ml-0 md:ml-64 overflow-x-hidden">
          <main className="flex-1 min-h-0 flex flex-col">{children}</main>
        </div>
      </div>

      {/* Footer spans full width outside the sidebar offset */}
      <SiteFooter />
    </div>
  );
}
