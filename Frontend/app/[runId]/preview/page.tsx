"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { startRun } from "@/lib/api";

interface PreviewData {
  run_id: string;
  columns: string[];
  n_columns: number;
  preview: Record<string, unknown>[];
}

export default function PreviewPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);
  const [target, setTarget] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/backend/runs/${runId}/preview`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.columns?.length) setTarget(d.columns[d.columns.length - 1]);
      });
  }, [runId]);

  async function handleStart() {
    if (!target) return;
    setStarting(true);
    setError(null);
    try {
      await startRun(runId, target);
      router.push(`/${runId}/running`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run.");
      setStarting(false);
    }
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
      {/* Left — target picker */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/[0.06] p-6 flex flex-col gap-6 shrink-0"
      >
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-300 uppercase tracking-widest mb-1">
            Target column
          </h2>
          <p className="text-xs text-slate-500">
            Pick the column the model should predict.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-96 lg:max-h-none pr-1">
          {data.columns.map((col) => (
            <button
              key={col}
              onClick={() => setTarget(col)}
              className={cn(
                "text-left px-3 py-2.5 rounded-lg text-sm font-heading transition-all duration-150 cursor-pointer",
                target === col
                  ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/40 glow-blue"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
              )}
            >
              {col}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}

        <motion.button
          onClick={handleStart}
          disabled={!target || starting}
          className={cn(
            "mt-auto py-3 rounded-xl font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer",
            target && !starting
              ? "bg-brand-accent text-white hover:brightness-110 glow-amber"
              : "bg-white/[0.06] text-slate-500 cursor-not-allowed"
          )}
          whileTap={target && !starting ? { scale: 0.97 } : {}}
        >
          {starting ? (
            <><Loader2 size={15} className="animate-spin" /> Starting…</>
          ) : (
            "Run AutoML →"
          )}
        </motion.button>
      </motion.aside>

      {/* Right — data preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex-1 overflow-auto p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Table2 size={16} className="text-slate-500" />
          <h2 className="font-heading text-sm font-semibold text-slate-300">
            Preview{" "}
            <span className="text-slate-500 font-normal">
              ({data.preview.length} rows · {data.n_columns} columns)
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-xs font-heading">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {data.columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-4 py-3 text-left font-semibold whitespace-nowrap transition-colors",
                      col === target ? "text-brand-primary" : "text-slate-400"
                    )}
                  >
                    {col}
                    {col === target && (
                      <span className="ml-1.5 text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded-full">
                        target
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.preview.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  {data.columns.map((col) => (
                    <td
                      key={col}
                      className={cn(
                        "px-4 py-2.5 whitespace-nowrap",
                        col === target ? "text-brand-primary/80" : "text-slate-400"
                      )}
                    >
                      {String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
