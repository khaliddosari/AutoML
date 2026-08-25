"use client";
// sidebar
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { Icon } from "./icon";

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
  const pathname = usePathname() || "";
  const router = useRouter();
  const runId = getRunId(pathname);

  return (
    <nav
      className={cn(
        "w-52 h-dvh flex flex-col fixed left-0 top-0 glass-strong border-r border-outline-variant z-50 overflow-hidden select-none transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full relative">

        {/* Mobile header — mirrors the main app header: close on left, brand centered */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0 select-none">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="text-primary p-1.5 rounded-lg hover:bg-surface-purple-tint transition-colors flex items-center justify-center cursor-pointer"
          >
            <Icon name="close" className="block" style={{ fontSize: "24px" }} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-purple-tint flex items-center justify-center shrink-0">
              <Icon name="graph_3" className="text-primary" style={{ fontSize: "18px" }} />
            </div>
            <p className="text-xl text-on-background"><Brand /></p>
          </div>
          <div className="w-9 h-9" />
        </div>

        <div className="px-4 pt-4 pb-8 md:pb-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Desktop Brand Logo & Name */}
          <div className="hidden md:flex items-center gap-2 mb-6 px-2 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-surface-purple-tint flex items-center justify-center shrink-0">
              <Icon name="graph_3" className="text-primary" style={{ fontSize: "20px" }} />
            </div>
            <div className="leading-tight flex-1 text-center">
              <p className="text-2xl text-on-background"><Brand /></p>
            </div>
            <div className="w-10 shrink-0" />
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
                "btn-primary relative overflow-hidden w-full text-label-md py-3 rounded-lg group shrink-0"
              )}
            >
              {/* Shimmer overlay */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ backgroundSize: "200% 100%" }} />

              <span className="z-10 text-xs font-semibold whitespace-nowrap">
                Create New Model
              </span>
            </motion.button>
          </div>

          {/* Navigation Items */}
          <ul className="flex flex-col gap-1">
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
                      "flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-300 select-none group origin-left",
                      isActive
                        ? "text-primary font-bold scale-[1.04]"
                        : isDisabled
                        ? "text-outline opacity-40 cursor-not-allowed"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                    )}
                  >

                    <Icon
                      name={icon}
                      className={cn(
                        "z-10 transition-transform duration-200 group-hover:scale-110 w-5 text-center",
                        isActive && "text-primary"
                      )}
                      style={{ fontSize: "18px" }}
                    />

                    <span className="text-sm font-medium z-10 whitespace-nowrap">
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Made By / LinkedIn links — at bottom on all devices */}
          <div className="mt-auto pt-6 pb-6 md:pb-1 flex flex-col gap-2 shrink-0">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Made by</span>
            <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-3.5 px-1">
              <a
                href="https://www.linkedin.com/in/khalid-al-dosari/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-container transition-colors"
              >
                <i className="fab fa-linkedin text-[15px]" aria-hidden="true" />
                Khalid Al Dosari
              </a>
              <a
                href="https://www.linkedin.com/in/ahmed-alasmari-sa/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-container transition-colors"
              >
                <i className="fab fa-linkedin text-[15px]" aria-hidden="true" />
                Ahmed Alasmari
              </a>
            </div>
          </div>
        </div>

      </div>
    </nav>
  );
}
