"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Database, Target, BarChart2, Wrench, BrainCircuit, LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatus } from "@/lib/api";

/* ─── Step definitions ──────────────────────────────────────────────────── */

const STEPS = [
  {
    key: "profile",
    fn: "profile_dataset(run_id)",
    label: "Profile Dataset",
    Icon: Database,
    description:
      "Scans every column to understand the data — types, missing values, unique counts, and sample values. This gives the AI a mental model of the dataset before doing anything else.",
    outputLines: [
      "Reading column metadata…",
      "Checking dtypes and unique counts",
      "Counting missing values per column",
      "Collecting 5-row sample per column",
      "Profiling complete",
    ],
  },
  {
    key: "detect",
    fn: "detect_problem_type(run_id, target)",
    label: "Detect Problem Type",
    Icon: Target,
    description:
      "Looks at the target column and decides whether the task is regression (predicting a number) or classification (predicting a category). The decision drives every downstream step.",
    outputLines: [
      "Inspecting target column dtype",
      "Counting unique values in target",
      "Evaluating cardinality threshold",
      "Problem type determined",
    ],
  },
  {
    key: "eda",
    fn: "run_eda(run_id, target)",
    label: "Explore the Data",
    Icon: BarChart2,
    description:
      "Runs exploratory analysis to find patterns — distributions, outliers, and which features correlate most with what you're predicting. Helps the AI understand the signal in the data.",
    outputLines: [
      "Computing numeric summaries (mean, std, min, max)",
      "Analyzing target distribution",
      "Computing Pearson correlations with target",
      "Identifying top correlated features",
      "EDA report saved",
    ],
  },
  {
    key: "feature_engineer",
    fn: "feature_engineer(run_id, target)",
    label: "Engineer Features",
    Icon: Wrench,
    description:
      "Cleans and prepares the data for modeling. Drops columns that are mostly empty or act like row IDs. Encodes text categories to numbers. Missing values are filled after the train/test split to prevent data leakage.",
    outputLines: [
      "Dropping columns with >50% missing values",
      "Removing ID-like columns (≥95% unique)",
      "One-hot encoding low-cardinality categoricals",
      "Label-encoding high-cardinality categoricals",
      "Engineered dataset saved",
    ],
  },
  {
    key: "train",
    fn: "train_model(run_id, target, problem_type)",
    label: "Train & Compare Models",
    Icon: BrainCircuit,
    description:
      "Trains 5 different algorithms on your data: Random Forest, Extra Trees, Gradient Boosting, Logistic Regression, and KNN. Each model is evaluated with 5-fold cross-validation. The best model by CV score wins.",
    outputLines: [
      "Splitting data → 80% train / 20% test",
      "Fitting SimpleImputer on training set only",
      "Training RandomForest (200 estimators)…",
      "Training ExtraTrees (200 estimators)…",
      "Training GradientBoosting (early stopping)…",
      "Training LogisticRegression…",
      "Training KNN (k=5)…",
      "Running 5-fold cross-validation on each model",
      "Selecting winner by CV mean score",
      "Training complete",
    ],
  },
  {
    key: "visualize",
    fn: "generate_visualization(run_id, target, problem_type)",
    label: "Generate Results",
    Icon: LineChart,
    description:
      "Creates a diagnostic plot — a confusion matrix for classification problems or predicted vs. actual values for regression — so you can see exactly where the model gets things right and where it struggles.",
    outputLines: [
      "Loading held-out test predictions",
      "Computing visualization data",
      "Rendering plot to PNG",
      "Plot saved",
    ],
  },
];

type StepStatus = "waiting" | "active" | "done" | "error";

/* ─── Sidebar step node ─────────────────────────────────────────────────── */

function SidebarStep({
  step,
  index,
  status,
  expanded,
  onToggle,
  isLast,
}: {
  step: (typeof STEPS)[number];
  index: number;
  status: StepStatus;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const Icon = step.Icon;

  return (
    <div className="relative flex gap-3">
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[15px] top-8 w-[2px] bottom-0 -mb-4 rounded-full transition-colors duration-500",
            status === "done" ? "bg-emerald-200" : "bg-slate-100"
          )}
        />
      )}

      {/* Node icon */}
      <div className="shrink-0 mt-0.5 z-10">
        {status === "done" ? (
          <div className="w-8 h-8 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
        ) : status === "active" ? (
          <div className="w-8 h-8 rounded-full bg-brand-light border-2 border-brand-border flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <Icon size={13} className="text-brand-primary" />
            </motion.div>
          </div>
        ) : status === "error" ? (
          <div className="w-8 h-8 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
            <XCircle size={14} className="text-red-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-elevated border-2 border-surface-border flex items-center justify-center">
            <span className="text-[10px] font-semibold text-slate-400">{index + 1}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-5 min-w-0", isLast && "pb-0")}>
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center justify-between gap-2 text-left transition-colors cursor-pointer",
            status === "waiting" && "opacity-40"
          )}
        >
          <span
            className={cn(
              "text-sm font-semibold leading-tight",
              status === "active" && "text-brand-primary",
              status === "done" && "text-slate-700",
              status === "waiting" && "text-slate-500",
              status === "error" && "text-red-500"
            )}
          >
            {step.label}
          </span>
          {status !== "waiting" && (
            expanded
              ? <ChevronDown size={13} className="text-slate-400 shrink-0" />
              : <ChevronRight size={13} className="text-slate-400 shrink-0" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && status !== "waiting" && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-slate-500 leading-relaxed mt-1.5 overflow-hidden"
            >
              {step.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Colab cell ────────────────────────────────────────────────────────── */

function ColabCell({
  step,
  index,
  status,
  cellNumber,
  elapsedAtDone,
}: {
  step: (typeof STEPS)[number];
  index: number;
  status: StepStatus;
  cellNumber: number;
  elapsedAtDone?: number;
}) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (status !== "active") { setVisibleLines(0); return; }
    let i = 0;
    const tick = () => {
      i++;
      setVisibleLines(i);
      if (i < step.outputLines.length) {
        setTimeout(tick, 420 + Math.random() * 300);
      }
    };
    setTimeout(tick, 300);
  }, [status, step.outputLines.length]);

  const counterLabel =
    status === "waiting" ? " " :
    status === "active"  ? "*" :
    status === "done"    ? String(cellNumber) :
    "!";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "colab-cell text-xs",
        status === "active" && "colab-cell-active",
        status === "done" && "colab-cell-done",
        status === "error" && "colab-cell-error",
        status === "waiting" && "opacity-50"
      )}
    >
      {/* Cell header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 border-b",
          status === "active"
            ? "bg-blue-50 border-brand-border/60"
            : status === "done"
            ? "bg-emerald-50/60 border-emerald-100"
            : status === "error"
            ? "bg-red-50 border-red-100"
            : "bg-surface-elevated border-surface-border"
        )}
      >
        {/* Run counter */}
        <span
          className={cn(
            "text-[11px] shrink-0 select-none",
            status === "active" ? "text-brand-primary" :
            status === "done" ? "text-emerald-600" :
            status === "error" ? "text-red-400" :
            "text-slate-300"
          )}
        >
          In&nbsp;[{counterLabel}]:
        </span>

        {/* Spinner or done icon */}
        {status === "active" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3.5 h-3.5 rounded-full border-2 border-brand-primary border-t-transparent shrink-0"
          />
        )}
        {status === "done" && (
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
        )}
        {status === "error" && (
          <XCircle size={13} className="text-red-400 shrink-0" />
        )}

        {/* Function call */}
        <span className="text-slate-700 truncate">
          <span className="text-blue-600">{step.fn.split("(")[0]}</span>
          <span className="text-slate-500">(</span>
          <span className="text-amber-600">{step.fn.split("(")[1]?.replace(")", "")}</span>
          <span className="text-slate-500">)</span>
        </span>

        {/* Elapsed */}
        {status === "done" && elapsedAtDone !== undefined && (
          <span className="ml-auto text-[10px] text-slate-400 shrink-0">
            {elapsedAtDone}s
          </span>
        )}
      </div>

      {/* Cell output */}
      <AnimatePresence>
        {(status === "active" || status === "done") && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1 min-h-[2.5rem]">
              {status === "done"
                ? step.outputLines.map((line, i) => (
                    <p key={i} className="text-slate-500 leading-relaxed">
                      <span className="text-emerald-500 mr-2">✓</span>{line}
                    </p>
                  ))
                : step.outputLines.slice(0, visibleLines).map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-slate-500 leading-relaxed"
                    >
                      <span className="text-slate-300 mr-2">›</span>{line}
                      {i === visibleLines - 1 && (
                        <span className="inline-block w-1.5 h-3 bg-brand-primary ml-0.5 animate-blink align-middle" />
                      )}
                    </motion.p>
                  ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function RunningPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [expandedStep, setExpandedStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [stepElapsed, setStepElapsed] = useState<number[]>([]);
  const stepStart = useRef<number>(Date.now());
  const runStart = useRef<number>(Date.now());
  const completedCells = useRef(0);

  // Global elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - runStart.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let stepTimer: ReturnType<typeof setTimeout>;
    let poll: ReturnType<typeof setInterval>;

    const STEP_DURATIONS = [3200, 2800, 3600, 3000, 7000, 2500];

    const advanceStep = () => {
      setActiveStep((s) => {
        const elapsed = Math.floor((Date.now() - stepStart.current) / 1000);
        setStepElapsed((prev) => {
          const next = [...prev];
          next[s] = elapsed;
          return next;
        });
        completedCells.current = s + 1;
        stepStart.current = Date.now();

        if (s < STEPS.length - 1) {
          stepTimer = setTimeout(advanceStep, STEP_DURATIONS[s + 1] + Math.random() * 1500);
          setExpandedStep(s + 1);
          return s + 1;
        }
        return s;
      });
    };
    stepStart.current = Date.now();
    stepTimer = setTimeout(advanceStep, STEP_DURATIONS[0] + Math.random() * 1500);

    poll = setInterval(async () => {
      try {
        const s = await getStatus(runId);
        if (s.status === "succeeded") {
          clearInterval(poll);
          clearTimeout(stepTimer);
          setActiveStep(STEPS.length);
          completedCells.current = STEPS.length;
          setTimeout(() => router.push(`/${runId}/result`), 700);
        } else if (s.status === "failed") {
          clearInterval(poll);
          clearTimeout(stepTimer);
          setFailed(true);
          setErrMsg(s.error ?? "Unknown error.");
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => { clearInterval(poll); clearTimeout(stepTimer); };
  }, [runId, router]);

  const allDone = activeStep >= STEPS.length;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-surface">
      {/* ── Left Sidebar ── */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-surface-border p-6 flex flex-col gap-2 shrink-0 overflow-y-auto"
      >
        {/* Sidebar header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-800">Pipeline Steps</h2>
            <span className="text-xs text-slate-400 font-mono">{elapsed}s</span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-brand-primary rounded-full"
              animate={{ width: `${Math.min(100, (activeStep / STEPS.length) * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {allDone
              ? "All steps complete — redirecting…"
              : failed
              ? "Run failed"
              : `Step ${Math.min(activeStep + 1, STEPS.length)} of ${STEPS.length}`}
          </p>
        </div>

        {/* Step nodes */}
        <div className="flex flex-col">
          {STEPS.map((step, i) => {
            const status: StepStatus =
              failed && activeStep === i ? "error" :
              activeStep > i ? "done" :
              activeStep === i ? "active" :
              "waiting";
            return (
              <SidebarStep
                key={step.key}
                step={step}
                index={i}
                status={status}
                expanded={expandedStep === i}
                onToggle={() => setExpandedStep(expandedStep === i ? -1 : i)}
                isLast={i === STEPS.length - 1}
              />
            );
          })}
        </div>

        {/* Error */}
        {failed && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs text-red-600 font-medium">Run failed</p>
            <p className="text-xs text-red-500">{errMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-brand-primary hover:underline cursor-pointer"
            >
              ← Start over
            </button>
          </div>
        )}
      </motion.aside>

      {/* ── Main: Colab cells ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Notebook header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-amber-300" />
              <div className="w-3 h-3 rounded-full bg-emerald-300" />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              modelforge_automl_{runId?.slice(0, 8)}.ipynb
            </span>
            {!failed && !allDone && (
              <span className="ml-auto text-xs text-brand-primary font-medium animate-pulse">
                ● Running
              </span>
            )}
            {allDone && (
              <span className="ml-auto text-xs text-emerald-500 font-medium">
                ✓ All cells executed
              </span>
            )}
          </div>

          {/* Cells */}
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const status: StepStatus =
                failed && activeStep === i ? "error" :
                activeStep > i ? "done" :
                activeStep === i ? "active" :
                "waiting";
              return (
                <ColabCell
                  key={step.key}
                  step={step}
                  index={i}
                  status={status}
                  cellNumber={i + 1}
                  elapsedAtDone={status === "done" ? stepElapsed[i] : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
