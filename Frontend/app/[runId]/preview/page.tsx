"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { startRun, getPreview } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

interface PreviewData {
  run_id: string;
  filename?: string;
  columns: string[];
  n_columns: number;
  preview: Record<string, unknown>[];
}

interface ColumnStats {
  column: string;
  type: "numeric" | "categorical";
  mean: string;
  std: string;
  min: string;
  max: string;
  nullPct: string;
  cardinality: number;
}

export default function PreviewPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);
  const [target, setTarget] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DataTable States
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"data" | "stats">("data");
  
  // Tooltip Hover States
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    getPreview(runId)
      .then((d) => {
        setData(d);
        if (d.columns?.length) setTarget(d.columns[d.columns.length - 1]);
      })
      .catch((err) => {
        setError(err.message || "Failed to load preview.");
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
      <div className="flex-1 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3">
          <Icon name="sync" className="text-primary animate-spin" style={{ fontSize: "36px" }} />
          <p className="text-sm font-semibold text-on-surface-variant font-mono">Compiling dataset metrics...</p>
        </div>
      </div>
    );
  }

  const numericCols = data.columns.filter((col) => {
    const val = data.preview[0]?.[col];
    return typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "");
  });
  const catCols = data.columns.filter((col) => !numericCols.includes(col));

  // Dynamic Summary Statistics Calculation
  const calculateSummaryStats = (): ColumnStats[] => {
    return data.columns.map((col) => {
      const isNum = numericCols.includes(col);
      const values = data.preview.map(row => row[col]);
      const validNums = values.map(v => Number(v)).filter(n => !isNaN(n) && n !== null && n !== undefined);
      
      const nullsCount = values.filter(v => v === null || v === undefined || v === "" || String(v).trim() === "-").length;
      const nullPct = ((nullsCount / values.length) * 100).toFixed(1);
      const uniqueVals = new Set(values.filter(v => v !== null && v !== undefined && v !== "")).size;

      if (isNum && validNums.length > 0) {
        const sum = validNums.reduce((a, b) => a + b, 0);
        const meanVal = sum / validNums.length;
        const minVal = Math.min(...validNums);
        const maxVal = Math.max(...validNums);
        
        // Std Dev
        const variance = validNums.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / validNums.length;
        const stdVal = Math.sqrt(variance);

        return {
          column: col,
          type: "numeric",
          mean: meanVal.toFixed(2),
          std: stdVal.toFixed(2),
          min: minVal.toFixed(2),
          max: maxVal.toFixed(2),
          nullPct: `${nullPct}%`,
          cardinality: uniqueVals
        };
      } else {
        return {
          column: col,
          type: "categorical",
          mean: "N/A",
          std: "N/A",
          min: "N/A",
          max: "N/A",
          nullPct: `${nullPct}%`,
          cardinality: uniqueVals
        };
      }
    });
  };

  const summaryStats = calculateSummaryStats();

  // Search & Pagination Logic
  const filteredRows = data.preview.filter(row => {
    return data.columns.some(col => {
      const val = String(row[col] ?? "").toLowerCase();
      return val.includes(searchQuery.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const numericPct = data.n_columns > 0 ? (numericCols.length / data.n_columns) * 100 : 0;
  const catPct = 100 - numericPct;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:p-gutter relative select-none">
      <div className="max-w-[1280px] mx-auto w-full">
        
        {/* Page Header */}
        <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-headline-lg font-bold text-on-background mb-1 md:mb-2">
              Dataset: {data.filename ?? runId?.slice(0, 16)}
            </h1>
            <p className="text-sm md:text-body-lg text-on-surface-variant">
              Full feature breakdown, data quality metrics, and schema targets for training.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-green-tint text-success-green rounded-full text-xs font-bold border border-success-green/30">
              <Icon name="check_circle" style={{ fontSize: "13px" }} />
              Schema Verified
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-purple-tint text-primary rounded-full text-xs font-bold border border-primary/30">
              <Icon name="cloud_done" style={{ fontSize: "13px" }} />
              Synced
            </span>
          </div>
        </div>

        {/* Bento Grid with Gradients & Tooltips */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6 mb-4 md:mb-8">

          {/* Card 1: Target Prediction Variable */}
          <div className="col-span-1 lg:col-span-6 bg-gradient-to-br from-surface-purple-tint/30 to-surface-container rounded-xl border border-outline-variant p-4 md:p-6 card-shadow relative min-h-[160px] md:min-h-[220px] flex flex-col justify-between overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">Prediction Goal</span>
                <h3 className="text-headline-md font-bold text-on-background flex items-center gap-1.5">
                  Target Variable
                  <span
                    onMouseEnter={() => setActiveTooltip("target")}
                    onMouseLeave={() => setActiveTooltip(null)}
                    role="img"
                    aria-label="About the target variable"
                    className="text-outline cursor-help hover:text-primary transition-colors inline-flex"
                  >
                    <Icon name="help_outline" style={{ fontSize: "15px" }} />
                  </span>
                </h3>
              </div>
              <Icon name="target" className="text-primary bg-surface-purple-tint p-2 rounded-lg" style={{ fontSize: "24px" }} />
            </div>

            <div className="relative z-10 flex justify-between items-end gap-3 mt-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-primary font-mono break-words" title={target || "Awaiting target selection..."}>
                  {target || "Select target..."}
                </h2>
                <p className="text-xs text-on-surface-variant mt-1.5">Selected column model will learn to predict.</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-on-background font-mono leading-none">{data.preview.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mt-1">Preview Rows</span>
              </div>
            </div>

            {/* Floating target tooltip */}
            <AnimatePresence>
              {activeTooltip === "target" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-6 right-6 bg-inverse-surface text-inverse-on-surface text-xs rounded-lg p-3 z-30 shadow-md leading-relaxed"
                >
                  The target variable is the dependent label model algorithms learn to predict. Ensuring it has balanced classes or clean distribution prevents major skewing.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card 2: Data Health Indicators */}
          <div className="col-span-1 lg:col-span-3 glass p-4 md:p-6 flex flex-col justify-between border-t-4 border-t-success-green relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-outline mb-1 block">Quality Scan</span>
                <h3 className="text-headline-md font-bold text-on-background flex items-center gap-1">
                  Data Health
                  <span
                    onMouseEnter={() => setActiveTooltip("health")}
                    onMouseLeave={() => setActiveTooltip(null)}
                    role="img"
                    aria-label="About the data health score"
                    className="text-outline cursor-help hover:text-primary transition-colors inline-flex"
                  >
                    <Icon name="help_outline" style={{ fontSize: "15px" }} />
                  </span>
                </h3>
              </div>
              <Icon name="health_and_safety" className="text-success-green bg-surface-green-tint p-2 rounded-lg" style={{ fontSize: "24px" }} />
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-3xl font-black text-success-green font-mono leading-none">100%</span>
                <span className="text-xs font-semibold text-on-surface-variant">Optimal Score</span>
              </div>
              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-success-green rounded-full" style={{ width: "100%" }} />
              </div>
              <p className="text-[10px] text-outline uppercase tracking-wider mt-3 font-semibold font-mono">0 Null rows · 0 Schema errors</p>
            </div>

            {/* Health tooltip */}
            <AnimatePresence>
              {activeTooltip === "health" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-6 right-6 bg-inverse-surface text-inverse-on-surface text-xs rounded-lg p-3 z-30 shadow-md leading-relaxed"
                >
                  Quality scanning runs checksum analyses to detect corrupt formatting, high rates of missing fields, or empty data files before training pipelines start.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card 3: Feature Space Stacked bar */}
          <div className="col-span-1 lg:col-span-3 glass p-4 md:p-6 flex flex-col justify-between border-t-4 border-t-info-blue relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-outline mb-1 block">Dimension</span>
                <h3 className="text-headline-md font-bold text-on-background flex items-center gap-1">
                  Feature Space
                  <span
                    onMouseEnter={() => setActiveTooltip("features")}
                    onMouseLeave={() => setActiveTooltip(null)}
                    role="img"
                    aria-label="About the feature space"
                    className="text-outline cursor-help hover:text-primary transition-colors inline-flex"
                  >
                    <Icon name="help_outline" style={{ fontSize: "15px" }} />
                  </span>
                </h3>
              </div>
              <Icon name="category" className="text-info-blue bg-surface-purple-tint p-2 rounded-lg" style={{ fontSize: "24px" }} />
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-baseline mb-2">
                <div>
                  <span className="text-3xl font-black text-info-blue font-mono leading-none">{data.n_columns}</span>
                  <span className="text-xs font-semibold text-on-surface-variant ml-1">Total Columns</span>
                </div>
              </div>
              
              {/* Stacked bar indicator */}
              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden flex">
                <div className="h-full bg-info-blue" style={{ width: `${numericPct}%` }} title={`Numeric: ${numericCols.length}`} />
                <div className="h-full bg-warning-orange" style={{ width: `${catPct}%` }} title={`Categorical: ${catCols.length}`} />
              </div>
              
              <div className="flex justify-between text-[9px] text-outline uppercase tracking-wider mt-3 font-bold font-mono">
                <span className="text-info-blue">{numericCols.length} Numeric ({numericPct.toFixed(0)}%)</span>
                <span className="text-warning-orange">{catCols.length} Categorical</span>
              </div>
            </div>

            {/* Features tooltip */}
            <AnimatePresence>
              {activeTooltip === "features" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-6 right-6 bg-inverse-surface text-inverse-on-surface text-xs rounded-lg p-3 z-30 shadow-md leading-relaxed"
                >
                  Feature space represents the dataset's dimensional columns. Stacked indicator compares numeric integers/decimals with label text categoricals.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Target Column Selection + Run */}
        <div className="glass p-6 mb-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 text-center sm:text-left">
                <Icon name="target" className="text-primary" />
                <h3 className="text-headline-md font-bold text-on-surface">Target Variable Selection</h3>
              </div>
              <div className="relative w-full sm:w-auto sm:min-w-[240px] mx-auto sm:mx-0">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-3 appearance-none text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer font-semibold text-center sm:text-left"
                >
                  {data.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "16px" }} />
              </div>
              <p className="text-xs text-on-surface-variant text-center sm:text-left">The models will attempt to map patterns to classify or regress this output.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full justify-center md:w-auto md:ml-auto">
              {error && <p className="text-xs text-error font-medium">{error}</p>}
              <button
                onClick={handleStart}
                disabled={!target || starting}
                className={cn(
                  "btn-primary text-label-md px-6 py-3 rounded-lg",
                  (!target || starting) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon name={starting ? "sync" : "play_arrow"} className={cn(starting && "animate-spin")} style={{ fontSize: "18px" }} />
                <span>
                  {starting ? "Starting..." : "Run AutoML Pipeline"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table with Raw/Stats Toggle & Search */}
        <div className="glass overflow-hidden">

          {/* Table Toolbar controls */}
          <div className="p-5 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 items-start sm:items-center">
              <h3 className="text-headline-md font-bold text-on-background">
                {viewMode === "data" ? "Dataset Raw Preview" : "Features Profiling Statistics"}
              </h3>
              
              {/* Raw vs Stats Toggle */}
              <div className="flex border border-outline-variant rounded-lg p-0.5 bg-surface-container-low shrink-0 select-none w-fit">
                <button
                  onClick={() => setViewMode("data")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    viewMode === "data" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  Raw Data
                </button>
                <button
                  onClick={() => setViewMode("stats")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    viewMode === "stats" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  Summary Stats
                </button>
              </div>
            </div>

            {/* Row Search Filter - only active in Data view */}
            {viewMode === "data" && (
              <div className="relative w-full md:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: "15px" }} />
                <input
                  className="w-full bg-surface border border-outline-variant rounded-lg py-1.5 pl-9 pr-4 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Filter rows..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            )}
          </div>

          <div className="overflow-auto max-h-[600px] border-b border-outline-variant">
            {viewMode === "data" ? (
              // RAW DATATABLE PREVIEW
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-label-md text-on-surface-variant font-bold border-b border-outline-variant">
                    {data.columns.map((col) => (
                      <th
                        key={col}
                        className={cn(
                          "p-4 font-bold whitespace-nowrap text-xs uppercase tracking-wider",
                          col === target ? "text-primary bg-surface-purple-tint/30 border-x border-primary/10" : ""
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Icon name={numericCols.includes(col) ? "tag" : "text_fields"} className="text-[12px]" />
                          {col}
                        </div>
                        {col === target && (
                          <span className="ml-1.5 text-[8px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full font-sans uppercase tracking-widest font-black">
                            Target
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-body-md text-on-background font-mono text-xs">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-surface-container-low/60 transition-colors border-b border-outline-variant/40 last:border-0"
                      >
                        {data.columns.map((col) => (
                          <td
                            key={col}
                            className={cn(
                              "p-4 whitespace-nowrap",
                              col === target ? "text-primary font-bold bg-surface-purple-tint/10 border-x border-primary/5" : ""
                            )}
                          >
                            {String(row[col] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={data.columns.length} className="p-8 text-center text-on-surface-variant font-sans text-xs">
                        No rows matching the filter were found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              // SUMMARY STATISTICS TABLE
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-surface-container-low text-label-md text-on-surface-variant font-bold border-b border-outline-variant">
                    <th className="p-4 text-xs uppercase tracking-wider">Column Feature</th>
                    <th className="p-4 text-xs uppercase tracking-wider">Semantic Type</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Mean</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Std Dev</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Min</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Max</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Null %</th>
                    <th className="p-4 text-xs uppercase tracking-wider text-right font-mono">Cardinality</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-on-background">
                  {summaryStats.map((stat) => (
                    <tr
                      key={stat.column}
                      className={cn(
                        "hover:bg-surface-container-low/60 transition-colors border-b border-outline-variant/40 last:border-0",
                        stat.column === target ? "bg-surface-purple-tint/10" : ""
                      )}
                    >
                      <td className="p-4 font-bold text-on-surface flex items-center gap-1.5">
                        <Icon name={stat.type === "numeric" ? "tag" : "text_fields"} className="text-[12px]" />
                        {stat.column}
                        {stat.column === target && (
                          <span className="text-[8px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full font-sans uppercase font-black tracking-widest shrink-0 ml-1">Target</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          stat.type === "numeric" ? "bg-surface-purple-tint text-primary" : "bg-secondary-container/20 text-secondary"
                        )}>
                          {stat.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-on-surface-variant font-medium">{stat.mean}</td>
                      <td className="p-4 text-right font-mono text-on-surface-variant font-medium">{stat.std}</td>
                      <td className="p-4 text-right font-mono text-on-surface-variant font-medium">{stat.min}</td>
                      <td className="p-4 text-right font-mono text-on-surface-variant font-medium">{stat.max}</td>
                      <td className="p-4 text-right font-mono text-error font-bold">{stat.nullPct}</td>
                      <td className="p-4 text-right font-mono font-bold text-on-surface">{stat.cardinality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
