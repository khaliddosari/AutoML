"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
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
    <div className="flex flex-col items-center gap-5 w-full max-w-xl mx-auto">
      {/* File type badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-xs text-slate-500 mr-1">Supported formats:</span>
        {FILE_TYPES.map(({ ext, label, supported }) => (
          <span
            key={ext}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium font-mono border transition-colors",
              supported
                ? "bg-brand-light text-brand-primary border-brand-border"
                : "bg-surface-elevated text-slate-400 border-surface-border"
            )}
          >
            {supported && <CheckCircle2 size={10} className="text-brand-primary" />}
            {ext}
            {!supported && (
              <span className="text-[10px] text-slate-400 ml-0.5 font-sans">soon</span>
            )}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      <motion.label
        htmlFor="csv-input"
        className={cn(
          "w-full cursor-pointer rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all duration-200 select-none",
          dragging
            ? "border-brand-primary bg-brand-light/60 shadow-focus"
            : "border-surface-border bg-white hover:border-brand-muted hover:bg-brand-light/20"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={dragging ? { scale: 1.015 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          animate={dragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-colors duration-200",
            dragging ? "bg-brand-primary text-white" : "bg-surface-elevated text-slate-400"
          )}
        >
          <UploadCloud size={26} />
        </motion.div>

        <div className="text-center space-y-1">
          <p className="text-slate-700 font-medium text-sm">
            Drop your CSV here, or{" "}
            <span className="text-brand-primary font-semibold">browse files</span>
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
            <div className="card px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                <FileText size={15} className="text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate font-mono">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-surface-elevated transition-colors cursor-pointer"
                aria-label="Remove file"
              >
                <X size={14} />
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
          "w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
          file && !uploading
            ? "bg-brand-primary text-white hover:bg-brand-dark shadow-sm hover:shadow-md"
            : "bg-surface-elevated text-slate-400 cursor-not-allowed"
        )}
        whileTap={file && !uploading ? { scale: 0.98 } : {}}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading…
          </>
        ) : (
          "Analyze Dataset →"
        )}
      </motion.button>
    </div>
  );
}
