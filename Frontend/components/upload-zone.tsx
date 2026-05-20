"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCSV, type UploadResponse } from "@/lib/api";

interface Props {
  onUploaded: (res: UploadResponse) => void;
}

const FILE_TYPES = [
  { ext: ".csv", label: "CSV", supported: true },
  { ext: ".xlsx", label: "Excel", supported: false },
  { ext: ".tsv", label: "TSV", supported: false },
  { ext: ".parquet", label: "Parquet", supported: false },
];

export function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are supported right now.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
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
      onUploaded(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xl mx-auto">
      {/* Format badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="section-label">Formats:</span>
        {FILE_TYPES.map(({ ext, label, supported }) => (
          <span
            key={ext}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono border transition-colors",
              supported
                ? "bg-brand-light text-brand-primary border-brand-border"
                : "bg-surface-elevated text-slate-400 border-surface-border"
            )}
          >
            {supported && <CheckCircle2 size={9} className="text-brand-primary" />}
            {label}
            {!supported && (
              <span className="text-[10px] text-slate-400 font-sans">soon</span>
            )}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      <motion.label
        htmlFor="csv-input"
        className={cn(
          "w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-3 transition-all duration-200 select-none",
          dragging
            ? "border-brand-mid bg-brand-light/70 shadow-focus"
            : file
            ? "border-brand-border bg-brand-light/30"
            : "border-surface-border bg-white hover:border-brand-border hover:bg-brand-light/20 hover:shadow-card"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={dragging ? { scale: 1.015 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          animate={dragging ? { y: -6, scale: 1.12 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200",
            dragging
              ? "bg-brand-primary text-white shadow-md"
              : file
              ? "bg-brand-light text-brand-primary"
              : "bg-surface-elevated text-slate-400"
          )}
        >
          <UploadCloud size={22} />
        </motion.div>

        <div className="text-center space-y-1">
          <p className="text-slate-800 font-semibold text-sm">
            {dragging ? "Drop it!" : "Drop your CSV here, or "}
            {!dragging && (
              <span className="text-brand-primary underline underline-offset-2 decoration-brand-border">
                browse files
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400">Up to 1 million rows · UTF-8 encoded</p>
        </div>

        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </motion.label>

      {/* Selected file chip */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="card px-4 py-3 flex items-center gap-3 border-brand-lighter bg-white">
              <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                <FileText size={15} className="text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate font-mono">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-surface-elevated transition-colors cursor-pointer"
                aria-label="Remove file"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
            role="alert"
          >
            <span className="w-4 h-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[10px] font-bold text-red-500 shrink-0">!</span>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <motion.button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={cn(
          "w-full py-2.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2",
          file && !uploading
            ? "bg-brand-primary text-white hover:bg-brand-dark shadow-sm hover:shadow-md cursor-pointer"
            : "bg-surface-elevated text-slate-400 cursor-not-allowed"
        )}
        whileTap={file && !uploading ? { scale: 0.98 } : {}}
      >
        {uploading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            Analyze Dataset
            <ArrowRight size={14} className={file ? "opacity-100" : "opacity-40"} />
          </>
        )}
      </motion.button>
    </div>
  );
}
