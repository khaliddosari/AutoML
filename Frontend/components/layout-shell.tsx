"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Brand } from "./brand";
import { SiteFooter } from "./site-footer";
import { Icon } from "./icon";

/** Fixed cyan/blue/violet glow field the glass surfaces refract. Never remove. */
function AmbientField() {
  return <div className="ambient-field animate-drift" aria-hidden="true" />;
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Share routes are public, no-account pages embedded into LinkedIn-style demos.
  // Drop the internal sidebar so visitors don't see "Data Ingestion / Model Training"
  // nav they can't access.
  const isPublicShare = pathname.startsWith("/share");

  if (isPublicShare) {
    return (
      <div className="min-h-dvh flex flex-col relative">
        <AmbientField />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col relative">
      <AmbientField />
      {/* Mobile Top Navigation Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 glass-strong border-b border-outline-variant shrink-0 select-none relative z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
          className="text-primary p-1.5 rounded-lg hover:bg-surface-purple-tint transition-colors flex items-center justify-center cursor-pointer"
        >
          <Icon name="menu" className="block" style={{ fontSize: "24px" }} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(79,195,247,0.35)]">
            <Icon name="graph_3" className="text-on-primary" style={{ fontSize: "18px" }} />
          </div>
          <div className="leading-tight">
            <p className="text-xl text-on-background"><Brand /></p>
          </div>
        </div>

        <div className="w-9 h-9" /> {/* Spacer */}
      </header>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar + Content row — no z-index here so the fixed sidebar's z-50 competes at root */}
      <div className="flex flex-row flex-1 min-h-0 relative">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-h-0 ml-0 md:ml-64 overflow-x-hidden">
          <main className="flex-1 min-h-0 flex flex-col">{children}</main>
        </div>
      </div>

      {/* Footer spans full width — hidden on mobile to preserve screen space */}
      <div className="hidden md:block relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
