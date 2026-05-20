"use client";

import { usePathname } from "next/navigation";

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
  const runId = getRunId(pathname);

  return (
    <nav className="w-64 h-screen flex flex-col fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant z-50">
      <div className="flex flex-col h-full justify-between py-base">
        <div className="px-6 py-4">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>settings_input_component</span>
            </div>
            <div>
              <h1 className="text-headline-md text-primary font-bold">AutoML Forge</h1>
              <p className="text-label-sm text-on-surface-variant">V1.0.4 - Active</p>
            </div>
          </div>

          {/* Create button */}
          <button className="w-full bg-primary-container text-on-primary text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary transition-colors duration-200 mb-6">
            <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>add</span>
            Create New Model
          </button>

          {/* Nav items */}
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ key, icon, label, pattern }) => {
              const isActive = pattern.test(pathname);
              const href = getNavHref(key, runId);
              return (
                <li key={key}>
                  <a
                    href={href}
                    className={
                      isActive
                        ? "flex items-center gap-3 px-4 py-3 rounded-r-full text-primary font-bold border-r-4 border-primary bg-surface-purple-tint"
                        : "flex items-center gap-3 px-4 py-3 rounded-r-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200"
                    }
                  >
                    <span
                      className="material-symbols-outlined"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {icon}
                    </span>
                    <span className="text-label-md">{label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4">
          <ul className="flex flex-col gap-1 border-t border-outline-variant pt-4">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>settings</span>
                <span className="text-label-md">Settings</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>help</span>
                <span className="text-label-md">Support</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
