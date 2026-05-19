"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResult, plotUrl, type RunResult } from "@/lib/api";

function ScoreCard({ score, metric }: { score: number; metric: string }) {
  const pct = metric === "r2"
    ? Math.max(0, Math.min(100, score * 100))
    : score * 100;
  const color = pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-2 glow-blue"
    >
      <span className="text-xs font-heading text-slate-500 uppercase tracking-widest">
        Model Score
      </span>
      <span className={cn("text-6xl font-heading font-bold tabular-nums leading-none", color)}>
        {pct.toFixed(1)}
        <span className="text-2xl text-slate-500 ml-1">%</span>
      </span>
      <span className="text-xs font-heading text-slate-400 uppercase tracking-wide mt-1">
        {metric === "r2" ? "R² score" : metric}
      </span>
    </motion.div>
  );
}

function ProblemBadge({ type }: { type: string }) {
  const isReg = type === "regression";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        "glass rounded-2xl p-8 flex flex-col items-center justify-center gap-3",
        isReg ? "glow-amber" : "border-purple-500/30"
      )}
    >
      <span className="text-xs font-heading text-slate-500 uppercase tracking-widest">
        Problem Type
      </span>
      <span className={cn(
        "text-3xl font-heading font-bold capitalize",
        isReg ? "text-amber-400" : "text-purple-400"
      )}>
        {type}
      </span>
      <span className="text-xs text-slate-500 text-center">
        {isReg
          ? "Predicting a continuous numeric value"
          : "Predicting a discrete category"}
      </span>
    </motion.div>
  );
}

function Justification({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-2xl p-6 flex flex-col gap-3"
    >
      <span className="text-xs font-heading text-slate-500 uppercase tracking-widest">
        Model Justification
      </span>
      <p className="text-slate-300 text-sm leading-relaxed font-body">{text}</p>
    </motion.div>
  );
}

function PlotViewer({ runId }: { runId: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-4 flex flex-col gap-3"
    >
      <span className="text-xs font-heading text-slate-500 uppercase tracking-widest px-2">
        Result Plot
      </span>
      <div className="relative min-h-64 rounded-xl overflow-hidden bg-black/20">
        {!loaded && (
          <div className="absolute inset-0 shimmer rounded-xl" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plotUrl(runId)}
          alt="Model result plot"
          className={cn(
            "w-full h-auto rounded-xl transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </motion.div>
  );
}

export default function ResultPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResult(runId).then((r) => { setResult(r); setLoading(false); });
  }, [runId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!result || result.status === "failed") {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 text-sm">{result?.error ?? "No result found."}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 hover:text-white underline cursor-pointer"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 gap-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mb-2"
      >
        <div>
          <h1 className="font-heading font-bold text-xl text-white">Results</h1>
          <p className="text-xs text-slate-500 font-heading mt-0.5">
            run <span className="text-slate-400">{runId}</span>
            {result.target && (
              <> · target <span className="text-brand-primary">{result.target}</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw size={13} />
          New dataset
        </button>
      </motion.div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score + Problem type */}
        <ScoreCard
          score={result.accuracy_score ?? 0}
          metric={result.score_metric ?? "score"}
        />
        <ProblemBadge type={result.problem_type ?? "unknown"} />

        {/* Justification — full width */}
        <div className="md:col-span-2">
          <Justification text={result.justification ?? "No justification returned."} />
        </div>

        {/* Plot — full width */}
        <div className="md:col-span-2">
          <PlotViewer runId={runId} />
        </div>
      </div>
    </div>
  );
}
