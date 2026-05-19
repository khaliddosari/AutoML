"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCSV, type UploadResponse } from "@/lib/api";

interface Props {
  onUploaded: (res: UploadResponse) => void;
}

export function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are accepted.");
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

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

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
    <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
      {/* Drop zone */}
      <motion.label
        htmlFor="csv-input"
        className={cn(
          "w-full cursor-pointer rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all duration-200",
          dragging
            ? "border-brand-primary bg-brand-primary/10 glow-blue"
            : "border-white/10 hover:border-brand-primary/50 hover:bg-white/[0.02]"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={dragging ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          animate={dragging ? { y: -4 } : { y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <UploadCloud
            size={48}
            className={cn(
              "transition-colors duration-200",
              dragging ? "text-brand-primary" : "text-slate-500"
            )}
          />
        </motion.div>

        <div className="text-center">
          <p className="text-slate-200 font-medium">
            Drop your CSV here, or{" "}
            <span className="text-brand-primary underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">CSV files only · max 1M rows</p>
        </div>

        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={onInputChange}
        />
      </motion.label>

      {/* Selected file chip */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-full glass rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <FileText size={18} className="text-brand-primary shrink-0" />
            <span className="text-sm text-slate-200 truncate flex-1 font-heading">
              {file.name}
            </span>
            <span className="text-xs text-slate-500 shrink-0">
              {(file.size / 1024).toFixed(0)} KB
            </span>
            <button
              onClick={() => { setFile(null); setError(null); }}
              className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-400"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <motion.button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={cn(
          "w-full py-3 rounded-xl font-heading font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
          file && !uploading
            ? "bg-brand-primary text-white hover:bg-blue-400 glow-blue"
            : "bg-white/[0.06] text-slate-500 cursor-not-allowed"
        )}
        whileTap={file && !uploading ? { scale: 0.97 } : {}}
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
