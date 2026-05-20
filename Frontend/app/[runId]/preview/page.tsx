"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: "32px" }}>sync</span>
          <p className="text-label-md text-on-surface-variant">Loading preview…</p>
        </div>
      </div>
    );
  }

  const numericCols = data.columns.filter((col) => {
    const val = data.preview[0]?.[col];
    return typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)));
  });
  const catCols = data.columns.filter((col) => !numericCols.includes(col));

  return (
    <div className="flex-1 overflow-y-auto p-gutter">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-end gap-4">
          <div>
            <h1 className="text-headline-xl text-on-background mb-2">
              Dataset: {runId?.slice(0, 16)}
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              Diagnostic overview and health metrics for predictive modeling readiness.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-green-tint text-success-green rounded-full text-label-sm">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
              Verified
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-purple-tint text-primary rounded-full text-label-sm">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>update</span>
              Synced
            </span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-8">
          {/* Hero card */}
          <div className="col-span-1 lg:col-span-7 bg-surface-container-lowest rounded-xl ghost-border overflow-hidden card-shadow relative min-h-[280px] flex items-end p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-purple-tint/40 to-surface-green-tint/20 z-0" />
            <div className="relative z-10 w-full">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-label-md text-primary mb-1 block">Primary Target</span>
                  <h2 className="text-headline-lg text-on-background">{target || "Select target column"}</h2>
                </div>
                <div className="text-right">
                  <span className="text-headline-xl text-primary font-bold">{data.preview.length.toLocaleString()}</span>
                  <span className="text-body-md text-on-surface-variant block">Preview Rows Loaded</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary metric cards */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-gutter">
            {/* Data Health */}
            <div className="flex-1 bg-surface-green-tint/30 rounded-xl ghost-border p-6 flex flex-col justify-between card-shadow border-t-4 border-t-success-green">
              <div className="flex justify-between items-start">
                <h3 className="text-headline-md text-on-background">Data Health</h3>
                <span className="material-symbols-outlined text-success-green" style={{ fontSize: "28px" }}>health_and_safety</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-headline-xl text-success-green">{data.n_columns}</span>
                  <span className="text-body-md text-on-surface-variant">Columns Detected</span>
                </div>
                <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-success-green rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>

            {/* Feature Space */}
            <div className="flex-1 bg-surface-container-lowest rounded-xl ghost-border p-6 flex flex-col justify-between card-shadow border-t-4 border-t-info-blue">
              <div className="flex justify-between items-start">
                <h3 className="text-headline-md text-on-background">Feature Space</h3>
                <span className="material-symbols-outlined text-info-blue" style={{ fontSize: "28px" }}>category</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-headline-lg text-info-blue">{data.n_columns}</span>
                  <span className="text-body-md text-on-surface-variant block">Total Features</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant rounded text-label-sm">{numericCols.length} Num</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant rounded text-label-sm">{catCols.length} Cat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Column Selection + Run */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow mb-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">target</span>
                <h3 className="text-headline-md text-on-surface">Select Prediction Target</h3>
              </div>
              <div className="relative min-w-[220px]">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded py-2 px-3 appearance-none text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  {data.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
              </div>
              <p className="text-label-sm text-on-surface-variant">The model will predict this column.</p>
            </div>
            <div className="flex items-center gap-3">
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                onClick={handleStart}
                disabled={!target || starting}
                className={`bg-primary-container text-on-primary text-label-md px-6 py-3 rounded shadow-sm hover:bg-primary transition-colors flex items-center gap-2 ${
                  !target || starting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {starting ? "sync" : "play_arrow"}
                </span>
                {starting ? "Starting..." : "Run AutoML"}
              </button>
            </div>
          </div>
        </div>

        {/* Data Preview Table */}
        <div className="bg-surface-container-lowest rounded-xl ghost-border card-shadow overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface">
            <h3 className="text-headline-md text-on-background">Data Preview (Top {data.preview.length} Rows)</h3>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-sm">
              {data.n_columns} columns
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-label-md text-on-surface-variant">
                  {data.columns.map((col) => (
                    <th
                      key={col}
                      className={`p-4 border-b border-outline-variant font-semibold whitespace-nowrap ${
                        col === target ? "text-primary bg-surface-purple-tint/40" : ""
                      }`}
                    >
                      {col}
                      {col === target && (
                        <span className="ml-1.5 text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          target
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-md text-on-background">
                {data.preview.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/50 last:border-0"
                  >
                    {data.columns.map((col) => (
                      <td
                        key={col}
                        className={`p-4 whitespace-nowrap font-mono text-sm ${
                          col === target ? "text-primary font-medium" : ""
                        }`}
                      >
                        {String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
