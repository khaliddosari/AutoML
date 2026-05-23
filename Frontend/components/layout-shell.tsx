"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
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
    <div className="flex h-dvh">
      <Sidebar />
      <div className="ml-64 flex flex-col flex-1 min-h-0">
        <main className="flex-1 min-h-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
