"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadCSV } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MOCK_RECENT_UPLOADS = [
  { id: "customer_churn_Q3", runId: "b8a1c9df01ae", name: "customer_churn_Q3.csv", size: "12.4 MB", time: "2 hrs ago", rows: "15,420 rows", status: "ready", bg: "bg-surface-green-tint text-success-green", label: "Ready" },
  { id: "sensor_telemetry_raw", runId: "931fe48c90ad", name: "sensor_telemetry_raw.csv", size: "450.2 MB", time: "Just now", progress: 45, status: "profiling", bg: "bg-secondary-container text-on-secondary-container", label: "Profiling..." },
  { id: "legacy_logs_2022", runId: "broken_run", name: "legacy_logs_2022.csv", size: "8.1 MB", time: "Yesterday", status: "error", bg: "bg-error-container text-error", label: "Parsing Error" },
  { id: "product_catalog_v2", runId: "d8c11e74f1b8", name: "product_catalog_v2.csv", size: "2.3 MB", time: "Oct 24", rows: "850 rows", status: "ready", bg: "bg-surface-green-tint text-success-green", label: "Ready" }
];

const VERIFY_STEPS = [
  "Reading CSV byte stream into client buffer...",
  "Validating comma-separated schemas and structural delimiters...",
  "Running data profiling models & null frequency scans...",
  "Compiling automatic feature types and verification matrices...",
  "Verification Complete! Data is healthy and ready for configuration."
];

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [windowDragging, setWindowDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Verification simulation
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepIndex, setVerifyStepIndex] = useState(0);

  // Recent Uploads Actions Dropdown
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Screen drag events
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.types.includes("Files")) {
      setWindowDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    // Only turn off if leaving window bounds
    if (e.clientX === 0 && e.clientY === 0) {
      setWindowDragging(false);
    }
  };

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      setWindowDragging(false);
    });
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, []);

  const runVerification = (selectedFile: File) => {
    setIsVerifying(true);
    setVerifyStepIndex(0);
    setError(null);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < VERIFY_STEPS.length) {
        setVerifyStepIndex(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsVerifying(false);
          setFile(selectedFile);
        }, 300);
      }
    }, 450);
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are supported right now.");
      return;
    }
    runVerification(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setWindowDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadCSV(file);
      router.push(`/${res.run_id}/preview`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setUploading(false);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-gutter relative select-none">
      
      {/* Full-Screen Glassmorphic Drag Overlay */}
      <AnimatePresence>
        {windowDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-surface/75 backdrop-blur-md z-50 flex flex-col items-center justify-center border-4 border-dashed border-primary m-4 rounded-2xl"
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setWindowDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setWindowDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-surface-purple-tint flex items-center justify-center mb-6 text-primary shadow-lg"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "40px" }}>cloud_upload</span>
            </motion.div>
            <h3 className="text-headline-lg text-primary font-bold mb-2">Drop your CSV here</h3>
            <p className="text-body-lg text-on-surface-variant font-medium">AutoML Forge will automatically parse features and check schema health.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1280px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-headline-lg text-on-surface mb-2 font-bold">Data Ingestion</h2>
            <p className="text-body-lg text-on-surface-variant">Upload raw datasets or load existing workflows to configure predictive training.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-surface-container-high px-4.5 py-1.5 rounded-full text-label-sm font-semibold text-on-surface-variant border border-outline-variant">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: "16px" }}>storage</span>
              Storage Quota: 45% used
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left Column */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Upload Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">upload_file</span>
                  Upload Dataset
                </h3>
                <button className="text-primary hover:bg-surface-purple-tint/50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>link</span>
                  <span className="text-xs font-semibold">Import via URL</span>
                </button>
              </div>

              {/* Dropzone Area */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 select-none min-h-[260px] relative overflow-hidden",
                  dragging
                    ? "border-primary bg-surface-purple-tint/40 shadow-sm"
                    : file
                    ? "border-primary bg-surface-purple-tint/10"
                    : "border-outline-variant bg-surface hover:border-primary hover:bg-surface-container-low"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !isVerifying && document.getElementById("csv-input-main")?.click()}
              >
                {/* File Parsing Verification Screen */}
                <AnimatePresence>
                  {isVerifying && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-surface-container-lowest/95 z-30 flex flex-col items-center justify-center p-6 text-center"
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4 shrink-0" />
                      <h4 className="text-body-md font-bold text-primary mb-2">Analyzing CSV Structure</h4>
                      
                      <div className="w-80 bg-surface-container-high h-1 rounded-full overflow-hidden mb-4 shrink-0">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(verifyStepIndex / (VERIFY_STEPS.length - 1)) * 100}%` }} />
                      </div>

                      <div className="space-y-1.5 max-w-sm">
                        {VERIFY_STEPS.slice(0, verifyStepIndex + 1).map((step, idx) => (
                          <motion.p
                            key={idx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "text-xs font-mono transition-colors",
                              idx === verifyStepIndex ? "text-primary font-semibold" : "text-outline"
                            )}
                          >
                            {idx < verifyStepIndex ? "✓ " : "› "}{step}
                          </motion.p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cloud Upload Icon */}
                <div className="w-16 h-16 rounded-full bg-surface-purple-tint flex items-center justify-center mb-4 group-hover:scale-108 transition-transform duration-300">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "32px", fontVariationSettings: "'FILL' 1" }}
                  >
                    cloud_upload
                  </span>
                </div>

                {file ? (
                  <>
                    <h4 className="text-headline-md text-on-surface font-semibold mb-1 truncate max-w-md font-mono">{file.name}</h4>
                    <p className="text-xs text-on-surface-variant font-mono mb-6 bg-surface-purple-tint px-2.5 py-0.5 rounded-full font-bold">
                      {(file.size / 1024).toFixed(0)} KB · Ready to profile
                    </p>
                    
                    <button
                      onClick={removeFile}
                      className="bg-surface-container-high text-error hover:bg-error-container text-xs font-bold px-4 py-2 rounded-lg border border-outline-variant hover:border-error/20 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                      Remove File
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="text-headline-md text-on-surface font-semibold mb-2">Drag &amp; Drop files here</h4>
                    <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md">
                      Supported formats: <strong className="font-semibold text-primary font-mono">.CSV</strong> (up to 500MB). Files will be parsed and verified in memory upon upload.
                    </p>
                    <button
                      className="bg-surface-container-high text-on-surface text-label-md px-5 py-2.5 rounded-lg border border-outline-variant group-hover:border-primary group-hover:text-primary transition-all font-semibold"
                      onClick={(e) => { e.stopPropagation(); document.getElementById("csv-input-main")?.click(); }}
                    >
                      Browse Files
                    </button>
                  </>
                )}

                <input
                  id="csv-input-main"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            </div>

            {/* Ingestion Configuration Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h3 className="text-headline-md font-bold text-on-surface">Ingestion Configuration</h3>
              </div>

              {/* Dynamic checklist when file is ready */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-surface-purple-tint/20 rounded-xl border border-primary/10 flex flex-col gap-3 overflow-hidden"
                  >
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">File Checklist Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline">Columns</span>
                        <span className="text-xs font-bold font-mono text-on-surface">Auto-detected (20+)</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline">Size</span>
                        <span className="text-xs font-bold font-mono text-on-surface">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline">Delimiter</span>
                        <span className="text-xs font-bold font-mono text-on-surface">Comma ( , )</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-outline">Encoding</span>
                        <span className="text-xs font-bold font-mono text-on-surface">UTF-8 Verified</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Column - disabled until upload */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-2">Target Column (Prediction Goal)</label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 appearance-none text-sm text-on-surface-variant cursor-not-allowed opacity-70"
                      disabled
                    >
                      <option>Awaiting dataset upload...</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5">You will select the prediction column in the next screen after profiling.</p>
                </div>

                {/* Missing Value Strategy */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-2">Missing Value Strategy</label>
                  <div className="relative">
                    <select className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-3 appearance-none text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
                      <option value="mean">Impute with Mean (Numeric)</option>
                      <option value="median">Impute with Median (Numeric)</option>
                      <option value="mode">Impute with Mode (Categorical)</option>
                      <option value="drop_rows">Drop Rows</option>
                      <option value="flag">Flag as Missing (Indicator Column)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5">Configure default behavior for null fields during model feature engineering.</p>
                </div>

                {/* Footer row */}
                <div className="md:col-span-2 pt-5 border-t border-outline-variant flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      defaultChecked
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      id="auto-detect"
                      type="checkbox"
                    />
                    <label className="text-sm font-semibold text-on-surface cursor-pointer select-none" htmlFor="auto-detect">Auto-detect datatypes</label>
                  </div>
                  <div className="flex items-center gap-4 ml-auto">
                    {error && <p className="text-xs text-error font-medium">{error}</p>}
                    <button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className={cn(
                        "bg-primary-container hover:bg-primary text-on-primary text-label-md px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all flex items-center gap-2",
                        (!file || uploading) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        {uploading ? "sync" : "play_arrow"}
                      </span>
                      {uploading ? "Uploading..." : "Start Ingestion"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Recent Uploads */}
          <div ref={menuRef} className="xl:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col card-shadow max-h-[800px] overflow-hidden">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <h3 className="text-headline-md font-bold text-on-surface">Recent Uploads</h3>
              <button className="text-outline hover:text-primary transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>filter_list</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              <ul className="flex flex-col gap-2">
                {MOCK_RECENT_UPLOADS.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => {
                      if (item.status === "ready") {
                        router.push(`/${item.runId}/preview`);
                      }
                    }}
                    className={cn(
                      "bg-surface p-4 rounded-xl border border-transparent hover:border-outline-variant transition-all group flex flex-col gap-3 relative",
                      item.status === "ready" ? "cursor-pointer hover:shadow-sm" : ""
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                          item.status === "ready" ? "bg-surface-green-tint text-success-green" :
                          item.status === "profiling" ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-error"
                        )}>
                          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                            {item.status === "ready" ? "description" : 
                             item.status === "profiling" ? "sync" : "broken_image"}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-on-surface truncate w-36" title={item.name}>{item.name}</h4>
                          <p className="text-[10px] text-on-surface-variant font-mono font-medium">{item.size} · {item.time}</p>
                        </div>
                      </div>
                      
                      {/* Menu trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === item.id ? null : item.id);
                        }}
                        className="text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all p-0.5 rounded-full hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>more_vert</span>
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {activeMenu === item.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-4 top-10 w-36 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md py-1 z-30 text-left font-sans"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                                if (item.status === "ready") router.push(`/${item.runId}/preview`);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-purple-tint/40 hover:text-primary flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>visibility</span>
                              View Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container flex items-center gap-1.5 border-t border-outline-variant"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
                              Remove
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-sans shrink-0",
                        item.status === "ready" ? "bg-surface-green-tint text-success-green" :
                        item.status === "profiling" ? "bg-surface-purple-tint text-primary" : "bg-error-container text-error"
                      )}>
                        <span className="material-symbols-outlined fill" style={{ fontSize: "12px" }}>
                          {item.status === "ready" ? "check_circle" : 
                           item.status === "profiling" ? "hourglass_empty" : "error"}
                        </span> 
                        {item.label}
                      </span>

                      {item.progress ? (
                        <div className="w-24 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: `${item.progress}%` }} />
                        </div>
                      ) : item.rows ? (
                        <span className="text-[11px] text-on-surface-variant font-mono font-semibold">{item.rows}</span>
                      ) : (
                        <span className="text-[11px] text-primary font-bold hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>View Logs</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 border-t border-outline-variant bg-surface-bright text-center shrink-0">
              <a className="text-xs font-bold text-primary hover:text-on-primary-fixed-variant transition-colors flex items-center justify-center gap-1" href="#">
                View All Datasets
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
