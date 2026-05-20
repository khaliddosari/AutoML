"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import type { UploadResponse } from "@/lib/api";
import { Sparkles, Zap, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Orchestrated",
    desc: "An LLM agent drives the full pipeline — profiling, engineering, training, and explaining.",
  },
  {
    icon: Zap,
    title: "5 Models Compared",
    desc: "Random Forest, Gradient Boosting, Extra Trees, Logistic Regression, and KNN all compete.",
  },
  {
    icon: Shield,
    title: "Leakage-Free",
    desc: "Imputation is fit on training data only. CV-based model selection, not test-set shopping.",
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleUploaded(res: UploadResponse) {
    setExiting(true);
    await new Promise((r) => setTimeout(r, 380));
    router.push(`/${res.run_id}/preview`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-14">
      <AnimatePresence>
        {!exiting && (
          <motion.div
            key="upload-content"
            className="w-full max-w-xl flex flex-col items-center gap-10"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -56 }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Hero */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                Upload your dataset
              </h1>
              <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                Drop any CSV and ModelForge will automatically train, compare, and
                explain the best model — no code required.
              </p>
            </div>

            {/* Upload zone */}
            <UploadZone onUploaded={handleUploaded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature strip — fades out on exit */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl"
        animate={exiting ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="card px-4 py-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <Icon size={15} className="text-brand-primary" />
              <span className="text-xs font-semibold text-slate-700">{title}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
