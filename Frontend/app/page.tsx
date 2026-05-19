"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import type { UploadResponse } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();

  function handleUploaded(res: UploadResponse) {
    router.push(`/${res.run_id}/preview`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-12">
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl font-bold text-white text-glow tracking-tight">
          Upload your dataset
        </h1>
        <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
          ModelForge trains and evaluates models automatically, then gives you a
          plain-English explanation of why the winner won.
        </p>
      </motion.div>

      <motion.div
        className="w-full max-w-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      >
        <UploadZone onUploaded={handleUploaded} />
      </motion.div>

      <motion.div
        className="flex gap-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {[
          { label: "Upload CSV", sub: "drag & drop" },
          { label: "Pick target", sub: "one click" },
          { label: "Get results", sub: "score + plot + justification" },
        ].map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-xs font-heading text-brand-primary font-semibold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm text-slate-300 font-medium">{step.label}</span>
            <span className="text-xs text-slate-500">{step.sub}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
