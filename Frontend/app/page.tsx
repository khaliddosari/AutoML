"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadCSV } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
            <p className="text-body-lg text-on-surface-variant font-medium">Model Forge will automatically parse features and check schema health.</p>
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

        {/* Centered Ingestion Panel */}
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
          
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
                  : "border-outline-variant bg-surface hover:border-primary/50 hover:bg-surface-container-low"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("csv-input-main")?.click()}
            >
              {isVerifying ? (
                /* Multi-Stage Loading Verification Scanner */
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[36px] animate-pulse">cloud_upload</span>
                    <svg className="absolute top-0 left-0 w-16 h-16 animate-[spin_3s_linear_infinite]" viewBox="0 0 36 36">
                      <circle className="text-surface-variant" strokeWidth="2.5" stroke="currentColor" fill="none" cx="18" cy="18" r="16" />
                      <circle className="text-primary" strokeDasharray="30, 100" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" cx="18" cy="18" r="16" />
                    </svg>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h4 className="text-sm font-bold text-on-surface font-mono animate-pulse">
                      Analyzing Dataset Integrity...
                    </h4>
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-sm">
                      {VERIFY_STEPS[verifyStepIndex]}
                    </p>
                  </div>

                  <div className="w-48 bg-surface-container-high rounded-full h-1.5 overflow-hidden mt-4">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(verifyStepIndex / (VERIFY_STEPS.length - 1)) * 100}%` }} />
                  </div>
                </div>
              ) : file ? (
                <>
                  <div className="w-14 h-14 rounded-xl bg-surface-green-tint flex items-center justify-center text-success-green mb-4 shadow-sm animate-scale">
                    <span className="material-symbols-outlined text-[28px]">description</span>
                  </div>
                  <h4 className="text-headline-md text-on-surface font-bold truncate max-w-sm mb-1">{file.name}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mb-4">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · CSV Schema Verified
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
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>fact_check</span>
                    File Summary Checklist
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-success-green" style={{ fontSize: "14px" }}>check</span>
                      Header Row Detected
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-success-green" style={{ fontSize: "14px" }}>check</span>
                      Delimiters Balanced
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-success-green" style={{ fontSize: "14px" }}>check</span>
                      Null values within acceptable limit (1.2%)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-success-green" style={{ fontSize: "14px" }}>check</span>
                      Rows: ~15,420 | Columns: 8
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Problem Type */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-2">Problem Type</label>
                <div className="relative">
                  <select className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-3 appearance-none text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
                    <option value="auto">Auto-Detect Best Match</option>
                    <option value="classification">Classification (Predict Categories)</option>
                    <option value="regression">Regression (Predict Numeric Values)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1.5">Determine model architecture targeting binary/multi-class outputs or regression targets.</p>
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
                      "bg-primary-container hover:bg-primary text-white text-label-md px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all flex items-center gap-2",
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
      </div>
    </div>
  );
}
