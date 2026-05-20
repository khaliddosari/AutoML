"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Target, Table2, ArrowRight } from "lucide-react";
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
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left sidebar — target picker */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-surface-border p-6 flex flex-col gap-6 shrink-0"
      >
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-primary mb-3">
            <Target size={16} />
            <span className="text-sm font-semibold">Pick a target column</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The target is the column you want to predict. ModelForge will figure out
            whether it&apos;s a classification or regression problem automatically.
          </p>
        </div>

        {/* Column list */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1 -mr-1 pr-1">
          {data.columns.map((col) => (
            <button
              key={col}
              onClick={() => setTarget(col)}
              className={cn(
                "text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer font-mono truncate",
                target === col
                  ? "bg-brand-light text-brand-primary border border-brand-border shadow-sm"
                  : "text-slate-600 hover:bg-surface-elevated hover:text-slate-900 border border-transparent"
              )}
            >
              {col}
              {target === col && (
                <span className="ml-2 text-[10px] bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-sans">
                  target
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!target || starting}
          className={cn(
            "py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer",
            target && !starting
              ? "bg-brand-primary text-white hover:bg-brand-dark shadow-sm hover:shadow-md"
              : "bg-surface-elevated text-slate-400 cursor-not-allowed"
          )}
        >
          {starting ? (
            <><Loader2 size={15} className="animate-spin" />Starting…</>
          ) : (
            <><ArrowRight size={15} />Run AutoML</>
          )}
        </button>
      </motion.aside>

      {/* Main — data preview table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex-1 overflow-auto p-6 bg-surface"
      >
        <div className="flex items-center gap-2 mb-4">
          <Table2 size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">
            Data Preview
          </span>
          <span className="text-xs text-slate-400 bg-surface-elevated border border-surface-border px-2 py-0.5 rounded-full">
            {data.preview.length} rows shown · {data.n_columns} columns
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-border shadow-card bg-white">
          <table className="w-full text-xs font-mono">
            <thead className="bg-surface-elevated">
              <tr className="border-b border-surface-border">
                {data.columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-4 py-3 text-left font-semibold whitespace-nowrap transition-colors",
                      col === target
                        ? "text-brand-primary bg-brand-light/50"
                        : "text-slate-500"
                    )}
                  >
                    {col}
                    {col === target && (
                      <span className="ml-1.5 text-[10px] bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-sans">
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
                  className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover transition-colors"
                >
                  {data.columns.map((col) => (
                    <td
                      key={col}
                      className={cn(
                        "px-4 py-2.5 whitespace-nowrap",
                        col === target ? "text-brand-primary font-medium" : "text-slate-600"
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
