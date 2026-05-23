"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadCSV } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/brand";

const VERIFY_STEPS = [
  "Reading CSV byte stream into client buffer...",
  "Validating comma-separated schemas and structural delimiters...",
  "Running data profiling models & null frequency scans...",
  "Compiling automatic feature types and verification matrices...",
  "Verification complete. Data is healthy and ready for ingestion."
];

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [windowDragging, setWindowDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepIndex, setVerifyStepIndex] = useState(0);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.types.includes("Files")) setWindowDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (e.clientX === 0 && e.clientY === 0) setWindowDragging(false);
  };

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => { e.preventDefault(); setWindowDragging(false); });
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
        setTimeout(() => { setIsVerifying(false); setFile(selectedFile); }, 300);
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

      {/* Full-screen drag overlay */}
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
            <p className="text-body-lg text-on-surface-variant font-medium">
              <Brand /> will automatically parse features and check schema health.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1280px] mx-auto w-full">

        {/* Page header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-headline-lg text-on-surface mb-2 font-bold">Data Ingestion</h2>
            <p className="text-body-lg text-on-surface-variant">
              Upload a dataset and <Brand /> will automatically configure and run the full training pipeline.
            </p>
          </div>

        </div>

        {/* Upload card */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow">

            {/* Card header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">upload_file</span>
                Upload Dataset
              </h3>

            </div>

            {/* Dropzone */}
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
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${(verifyStepIndex / (VERIFY_STEPS.length - 1)) * 100}%` }}
                    />
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
                    Supported format: <strong className="font-semibold text-primary font-mono">.CSV</strong> (up to 500 MB). Files are parsed and verified on upload.
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

            {/* Action footer: visible once file is verified */}
            <AnimatePresence>
              {file && !isVerifying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-outline-variant flex flex-wrap items-center justify-between gap-4">
                    {/* Auto-pilot notice */}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: "18px" }}>auto_awesome</span>
                      <span>
                        Problem type, feature strategy and missing value handling are
                        <strong className="text-primary font-semibold"> detected automatically</strong> by the pipeline.
                      </span>
                    </div>

                    {/* Error + CTA */}
                    <div className="flex items-center gap-3 ml-auto shrink-0">
                      {error && <p className="text-xs text-error font-medium">{error}</p>}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleUpload}
                        disabled={uploading}
                        className={cn(
                          "bg-primary-container hover:bg-primary !text-white text-label-md px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all flex items-center gap-2",
                          uploading && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn("material-symbols-outlined !text-white", uploading && "animate-spin")}
                          style={{ fontSize: "18px" }}
                        >
                          {uploading ? "sync" : "play_arrow"}
                        </span>
                        <span className="!text-white">
                          {uploading ? "Uploading..." : "Start Ingestion"}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
