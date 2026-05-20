"use client";

import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "success", text: "Model training completed (RandomForest - 92.4% Accuracy)", time: "5 mins ago", icon: "check_circle", color: "text-success-green" },
  { id: 2, type: "system", text: "New dataset customer_churn_Q3.csv verified", time: "2 hours ago", icon: "database", color: "text-info-blue" },
  { id: 3, type: "warning", text: "Storage limit reached 45% capacity", time: "1 day ago", icon: "warning", color: "text-warning-orange" },
];

const MOCK_DATASETS = [
  { name: "customer_churn_Q3.csv", size: "12.4 MB", status: "Ready", runId: "b8a1c9df01ae" },
  { name: "sensor_telemetry_raw.csv", size: "450.2 MB", status: "Profiling", runId: "931fe48c90ad" },
  { name: "product_catalog_v2.csv", size: "2.3 MB", status: "Ready", runId: "d8c11e74f1b8" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTitle, setActiveTitle] = useState("Project: ForgeEngine");
  
  // Interactive UI States
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dynamic project title based on the active route/runId
  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0 && parts[0] !== "preview" && parts[0] !== "running" && parts[0] !== "result") {
      const runId = parts[0];
      const pageType = parts[1] || "";
      let label = "Project";
      if (pageType === "preview") label = "Profiling";
      else if (pageType === "running") label = "Training";
      else if (pageType === "result") label = "Analytics";
      
      setActiveTitle(`${label}: Run #${runId.slice(0, 8)}`);
    } else {
      setActiveTitle("Project: ForgeEngine_v2");
    }
  }, [pathname]);

  const filteredDatasets = MOCK_DATASETS.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <html lang="en">
      <body className="bg-surface text-on-surface antialiased">
        <div className="flex h-dvh">
          <Sidebar />
          
          <div className="ml-64 flex flex-col flex-1 min-h-0 sidebar-transition">
            {/* Top App Bar */}
            <header className="h-16 flex items-center sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant w-full px-gutter shrink-0">
              <div className="w-full flex justify-between items-center">
                
                {/* Search Datasets with dynamic dropdown suggestions */}
                <div ref={searchRef} className="flex-1 flex items-center relative">
                  <div className="relative w-72">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: "18px" }}>search</span>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                      placeholder="Search datasets..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                    />
                  </div>

                  {/* Search suggestions dropdown */}
                  <AnimatePresence>
                    {searchFocused && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-12 left-0 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-3 z-50"
                      >
                        <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider px-2.5 mb-2">Datasets & Runs</h4>
                        <ul className="space-y-1">
                          {filteredDatasets.length > 0 ? (
                            filteredDatasets.map((dataset) => (
                              <li key={dataset.runId}>
                                <a
                                  href={`/${dataset.runId}/preview`}
                                  onClick={() => setSearchFocused(false)}
                                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-purple-tint/40 group transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-outline group-hover:text-primary" style={{ fontSize: "18px" }}>description</span>
                                    <div className="text-left">
                                      <p className="text-xs font-semibold text-on-surface truncate w-40">{dataset.name}</p>
                                      <p className="text-[10px] text-on-surface-variant font-mono">{dataset.size}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                                    {dataset.status}
                                  </span>
                                </a>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-on-surface-variant text-center py-4">No matching datasets found</li>
                          )}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Center Dynamic Navigation & Project Indicator */}
                <div className="flex-2 flex justify-center items-center gap-6">
                  <div className="flex items-center gap-2 bg-surface-purple-tint/40 border border-outline-variant px-3 py-1 rounded-full hidden lg:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-xs font-bold text-primary font-mono tracking-wide">{activeTitle}</h2>
                  </div>
                  <nav className="hidden md:flex gap-4">
                    <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-all relative py-1" href="/">
                      Ingestion
                    </a>
                    <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-all relative py-1" href="#">
                      Models
                    </a>
                    <a className="text-xs font-bold text-on-surface-variant hover:text-primary transition-all relative py-1" href="#">
                      Experiments
                    </a>
                  </nav>
                </div>

                {/* Actions, Notifications & Account */}
                <div className="flex-1 flex justify-end items-center gap-4">
                  <button className="text-xs font-semibold text-primary border border-outline-variant px-3 py-1.5 rounded-lg hover:bg-surface-purple-tint/40 hover:border-primary transition-all">Export</button>
                  <button className="text-xs font-semibold bg-primary-container text-on-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:shadow-sm transition-all">Deploy</button>
                  
                  {/* Notifications bell */}
                  <div ref={notificationRef} className="flex items-center gap-2 border-l border-outline-variant pl-4 ml-2 relative">
                    <button
                      onClick={() => setNotificationsOpen(!notificationsOpen)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all relative",
                        notificationsOpen && "bg-surface-purple-tint text-primary"
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>notifications</span>
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
                    </button>

                    {/* Notifications dropdown menu */}
                    <AnimatePresence>
                      {notificationsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-10 right-0 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-3 z-50"
                        >
                          <div className="flex justify-between items-center border-b border-outline-variant pb-2 mb-2 px-1">
                            <h3 className="text-xs font-bold text-on-surface">Notifications</h3>
                            <button className="text-[10px] text-primary hover:underline font-semibold">Mark read</button>
                          </div>
                          <ul className="space-y-2">
                            {MOCK_NOTIFICATIONS.map((n) => (
                              <li key={n.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                                <span className={`material-symbols-outlined shrink-0 mt-0.5 ${n.color}`} style={{ fontSize: "16px" }}>{n.icon}</span>
                                <div className="text-left">
                                  <p className="text-[11px] font-medium text-on-surface leading-normal">{n.text}</p>
                                  <span className="text-[9px] text-outline font-mono">{n.time}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Account Avatar */}
                  <div ref={profileRef} className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className={cn(
                        "w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant hover:border-primary transition-all",
                        profileOpen && "border-primary bg-surface-purple-tint text-primary"
                      )}
                    >
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: "20px" }}>account_circle</span>
                    </button>

                    {/* Account dropdown profile summary modal */}
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-10 right-0 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-4 z-50 text-left"
                        >
                          <div className="flex items-center gap-3 border-b border-outline-variant pb-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>person</span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-on-surface">Khalid Al-Dosari</h4>
                              <p className="text-[10px] text-on-surface-variant font-mono">Premium Enterprise Plan</p>
                            </div>
                          </div>
                          <div className="space-y-2 mb-3">
                            <div>
                              <div className="flex justify-between text-[10px] font-semibold text-on-surface mb-1">
                                <span>API Credits</span>
                                <span className="font-mono">750 / 1000</span>
                              </div>
                              <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary h-full rounded-full" style={{ width: "75%" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] font-semibold text-on-surface mb-1">
                                <span>Forge Storage</span>
                                <span className="font-mono">4.5 GB / 10 GB</span>
                              </div>
                              <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                                <div className="bg-success-green h-full rounded-full" style={{ width: "45%" }} />
                              </div>
                            </div>
                          </div>
                          <button className="w-full bg-surface-container border border-outline-variant hover:bg-surface-purple-tint/40 text-[11px] font-bold py-2 rounded-lg text-primary text-center transition-colors">
                            Manage Account
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
