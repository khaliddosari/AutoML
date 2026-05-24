"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";

const NAV_ITEMS = [
  { key: "ingestion", icon: "upload_file", label: "Data Ingestion", pattern: /^\/$/ },
  { key: "overview", icon: "analytics", label: "Dataset Overview", pattern: /\/preview$/ },
  { key: "training", icon: "model_training", label: "Model Training", pattern: /\/running$/ },
  { key: "analytics", icon: "insights", label: "Analytics", pattern: /\/result$/ },
  { key: "inference", icon: "rocket_launch", label: "Inference", pattern: /\/inference$/ },
];

function getRunId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && !["preview", "running", "result", "inference"].includes(parts[0])) {
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
  if (key === "inference") return `/${runId}/inference`;
  return "#";
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const runId = getRunId(pathname);

  return (
    <nav
      className={cn(
        "w-64 h-screen flex flex-col fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant z-50 overflow-hidden select-none transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full justify-between py-base relative">
        
        <div className="px-4 py-4 flex-1 flex flex-col">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 mb-6 px-2 overflow-hidden shrink-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-on-primary" style={{ fontSize: "28px" }}>graph_3</span>
            </motion.div>

            <div className="leading-tight">
              <p className="text-xl text-on-background"><Brand /></p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Live AI Model</p>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden ml-auto text-outline hover:text-primary p-1 rounded-full transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
            </button>
          </div>

          {/* Create Button */}
          <div className="mb-6 px-1 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onClose();
                router.push("/");
              }}
              className={cn(
                "relative overflow-hidden w-full bg-gradient-to-r from-primary-container to-primary text-white text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-md transition-shadow group shrink-0"
              )}
            >
              {/* Shimmer overlay */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              
              <span className="material-symbols-outlined z-10 text-white" style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>add</span>
              
              <span className="z-10 text-sm font-semibold whitespace-nowrap text-white">
                Create New Model
              </span>
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
                      } else {
                        onClose();
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

                    <span className="text-sm font-medium z-10 whitespace-nowrap">
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

      </div>
    </nav>
  );
}
