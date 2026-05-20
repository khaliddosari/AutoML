"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "ingestion", icon: "upload_file", label: "Data Ingestion", pattern: /^\/$/ },
  { key: "overview", icon: "analytics", label: "Dataset Overview", pattern: /\/preview$/ },
  { key: "training", icon: "model_training", label: "Model Training", pattern: /\/running$/ },
  { key: "analytics", icon: "insights", label: "Analytics", pattern: /\/result$/ },
];

function getRunId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && !["preview", "running", "result"].includes(parts[0])) {
    return parts[0];
  }
  return null;
}

function getNavHref(key: string, runId: string | null): string {
  if (key === "ingestion") return "/";
  if (!runId) return "#";
  if (key === "overview") return `/${runId}/preview`;
  if (key === "training") return `/${runId}/running`;
  if (key === "analytics") return `/${runId}/result`;
  return "#";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const runId = getRunId(pathname);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync collapsed state to document body for global layout shifts
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [isCollapsed]);

  return (
    <motion.nav
      animate={{ width: isCollapsed ? 76 : 256 }}
      transition={{ duration: 0.3, ease: [0.32, 0.94, 0.6, 1] }}
      className="h-screen flex flex-col fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant z-50 overflow-hidden select-none"
    >
      <div className="flex flex-col h-full justify-between py-base relative">
        
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-0 top-6 w-5 h-10 bg-surface-container-low border border-r-0 border-outline-variant hover:border-primary rounded-l-md flex items-center justify-center text-outline hover:text-primary transition-all duration-200 hover:w-6 group"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110" style={{ fontSize: "14px" }}>
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        <div className="px-4 py-4 flex-1 flex flex-col">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 mb-6 px-2 overflow-hidden shrink-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0 shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>settings_input_component</span>
            </motion.div>
            
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  <h1 className="text-body-md text-primary font-bold leading-tight">AutoML Forge</h1>
                  <p className="text-[10px] text-on-surface-variant font-mono">v1.0.4 · Active</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Create Button */}
          <div className="mb-6 px-1 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/")}
              className={cn(
                "relative overflow-hidden w-full bg-gradient-to-r from-primary-container to-primary text-on-primary text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-md transition-shadow group shrink-0"
              )}
            >
              {/* Shimmer overlay */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              
              <span className="material-symbols-outlined z-10" style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>add</span>
              
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="z-10 text-sm font-semibold whitespace-nowrap"
                >
                  Create New Model
                </motion.span>
              )}
            </motion.button>
          </div>

          {/* Navigation Items */}
          <ul className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map(({ key, icon, label, pattern }) => {
              const isActive = pattern.test(pathname);
              const href = getNavHref(key, runId);
              const isDisabled = href === "#";

              return (
                <li key={key}>
                  <a
                    href={href}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                      }
                    }}
                    className={cn(
                      "relative flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-300 select-none group",
                      isActive
                        ? "text-primary font-bold"
                        : isDisabled
                        ? "text-outline opacity-40 cursor-not-allowed"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                    )}
                    title={isCollapsed ? label : undefined}
                  >
                    {/* Animated Sliding Background Active Pill */}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 bg-surface-purple-tint border-l-4 border-primary rounded-lg z-0"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}

                    <span
                      className={cn(
                        "material-symbols-outlined z-10 transition-transform duration-200 group-hover:scale-108",
                        isActive && "text-primary"
                      )}
                      style={{
                        fontSize: "20px",
                        fontVariationSettings: isActive ? "'FILL' 1" : undefined
                      }}
                    >
                      {icon}
                    </span>

                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium z-10 whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Support/Settings */}
        <div className="px-4 pb-4 shrink-0">
          <ul className="flex flex-col gap-1 border-t border-outline-variant pt-4">
            <li>
              <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all group" title={isCollapsed ? "Settings" : undefined}>
                <span className="material-symbols-outlined transition-transform duration-200 group-hover:rotate-45" style={{ fontSize: "18px" }}>settings</span>
                {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all group" title={isCollapsed ? "Support" : undefined}>
                <span className="material-symbols-outlined transition-transform duration-200 group-hover:scale-110" style={{ fontSize: "18px" }}>help</span>
                {!isCollapsed && <span className="text-sm font-medium">Support</span>}
              </a>
            </li>
          </ul>
        </div>

      </div>
    </motion.nav>
  );
}
