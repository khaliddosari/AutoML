"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "profile",
    fn: "profile_dataset(run_id)",
    label: "Profile Dataset",
    icon: "database",
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
    icon: "target",
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
    icon: "bar_chart",
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
    icon: "build",
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
    icon: "model_training",
    outputLines: [
      "Splitting data → 80% train / 20% test",
      "Fitting SimpleImputer on training set only",
      "Training RandomForest (200 estimators)…",
      "Training ExtraTrees (200 estimators)…",
      "Training GradientBoosting (early stopping)…",
      "Training LogisticRegression…",
      "Running 5-fold cross-validation on each model",
      "Selecting winner by CV mean score",
      "Training complete",
    ],
  },
  {
    key: "visualize",
    fn: "generate_visualization(run_id, target, problem_type)",
    label: "Generate Results",
    icon: "insights",
    outputLines: [
      "Loading held-out test predictions",
      "Computing visualization data",
      "Rendering plot to PNG",
      "Plot saved",
    ],
  },
];

type StepStatus = "waiting" | "active" | "done" | "error";

function SidebarStep({
  step,
  index,
  status,
  isLast,
}: {
  step: (typeof STEPS)[number];
  index: number;
  status: StepStatus;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-2.5">
      {!isLast && (
        <div
          className={cn(
            "absolute left-[12px] top-[26px] w-px bottom-0",
            status === "done" ? "bg-success-green/40" : "bg-outline-variant"
          )}
        />
      )}

      <div className="shrink-0 z-10 mt-0.5">
        {status === "done" ? (
          <div className="w-[25px] h-[25px] rounded-full bg-surface-green-tint border border-success-green flex items-center justify-center">
            <span className="material-symbols-outlined text-success-green" style={{ fontSize: "14px" }}>check_circle</span>
          </div>
        ) : status === "active" ? (
          <div className="w-[25px] h-[25px] rounded-full bg-surface-purple-tint border border-primary flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="material-symbols-outlined text-primary"
              style={{ fontSize: "13px" }}
            >
              {step.icon}
            </motion.span>
          </div>
        ) : status === "error" ? (
          <div className="w-[25px] h-[25px] rounded-full bg-error-container border border-error flex items-center justify-center">
            <span className="material-symbols-outlined text-error" style={{ fontSize: "13px" }}>error</span>
          </div>
        ) : (
          <div className="w-[25px] h-[25px] rounded-full bg-surface-container border border-outline-variant flex items-center justify-center">
            <span className="text-[9px] font-bold text-outline">{index + 1}</span>
          </div>
        )}
      </div>

      <div className={cn("flex-1 min-w-0", !isLast && "pb-3.5")}>
        <p
          className={cn(
            "text-label-md leading-tight py-1 truncate",
            status === "active" && "text-primary font-bold",
            status === "done" && "text-on-surface-variant",
            status === "waiting" && "text-outline opacity-60",
            status === "error" && "text-error"
          )}
        >
          {step.label}
        </p>
      </div>
    </div>
  );
}

function PipelineCell({
  step,
  index,
  status,
  cellNumber,
  elapsedAtDone,
  expanded,
  onToggle,
}: {
  step: (typeof STEPS)[number];
  index: number;
  status: StepStatus;
  cellNumber: number;
  elapsedAtDone?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (status !== "active") { setVisibleLines(0); return; }
    let i = 0;
    const tick = () => {
      i++;
      setVisibleLines(i);
      if (i < step.outputLines.length) setTimeout(tick, 400 + Math.random() * 280);
    };
    setTimeout(tick, 300);
  }, [status, step.outputLines.length]);

  const isClickable = status === "done" || status === "error";
  const showOutput = status === "active" || (isClickable && expanded);

  const counterLabel =
    status === "waiting" ? " " :
    status === "active" ? "*" :
    status === "done" ? String(cellNumber) : "!";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: status === "waiting" ? 0.38 : 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22 }}
      className={cn(
        "bg-surface-container-lowest border rounded-xl overflow-hidden",
        status === "active" && "border-primary/40",
        status === "done" && "border-success-green/40",
        status === "error" && "border-error/40",
        status === "waiting" && "border-outline-variant"
      )}
    >
      {/* Header */}
      <div
        role={isClickable ? "button" : undefined}
        onClick={isClickable ? onToggle : undefined}
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2 border-b",
          isClickable && "cursor-pointer select-none",
          status === "active" && "bg-surface-purple-tint/50 border-primary/20",
          status === "done" && "bg-surface-green-tint/30 border-success-green/20 hover:bg-surface-green-tint/40",
          status === "error" && "bg-error-container/30 border-error/20",
          status === "waiting" && "bg-surface-container border-outline-variant"
        )}
      >
        <span
          className={cn(
            "text-[10px] font-mono shrink-0 w-7 select-none",
            status === "active" ? "text-primary" :
            status === "done" ? "text-success-green" :
            status === "error" ? "text-error" : "text-outline"
          )}
        >
          [{counterLabel}]
        </span>

        {status === "active" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 rounded-full border-[1.5px] border-primary border-t-transparent shrink-0"
          />
        )}
        {status === "done" && (
          <span className="material-symbols-outlined text-success-green shrink-0" style={{ fontSize: "14px" }}>check_circle</span>
        )}
        {status === "error" && (
          <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: "14px" }}>error</span>
        )}

        <span className="truncate flex-1 text-body-md font-mono text-sm">
          <span className="text-primary font-medium">{step.fn.split("(")[0]}</span>
          <span className="text-outline">(</span>
          <span className="text-warning-orange">{step.fn.split("(")[1]?.replace(")", "")}</span>
          <span className="text-outline">)</span>
        </span>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {status === "done" && elapsedAtDone !== undefined && (
            <span className="text-[10px] text-on-surface-variant font-mono tabular-nums">{elapsedAtDone}s</span>
          )}
          {isClickable && (
            <span className="material-symbols-outlined text-outline" style={{ fontSize: "16px" }}>
              {expanded ? "expand_less" : "expand_more"}
            </span>
          )}
        </div>
      </div>

      {/* Output */}
      <AnimatePresence initial={false}>
        {showOutput && (
          <motion.div
            key="output"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 py-2 space-y-1 font-mono text-xs">
              {status === "done"
                ? step.outputLines.map((line, i) => (
                    <p key={i} className="text-on-surface-variant leading-relaxed">
                      <span className="text-success-green font-semibold mr-1.5">✓</span>{line}
                    </p>
                  ))
                : step.outputLines.slice(0, visibleLines).map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -3 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-on-surface-variant leading-relaxed"
                    >
                      <span className="text-outline mr-1.5">›</span>{line}
                      {i === visibleLines - 1 && (
                        <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-blink align-middle rounded-sm" />
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

export default function RunningPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [stepElapsed, setStepElapsed] = useState<number[]>([]);
  const [expandedCells, setExpandedCells] = useState<Set<number>>(new Set());
  const stepStart = useRef<number>(Date.now());
  const runStart = useRef<number>(Date.now());

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - runStart.current) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setExpandedCells(new Set()); }, [activeStep]);

  const toggleCell = (index: number) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    let stepTimer: ReturnType<typeof setTimeout>;
    let poll: ReturnType<typeof setInterval>;
    const STEP_DURATIONS = [3200, 2800, 3600, 3000, 7000, 2500];

    const advanceStep = () => {
      setActiveStep((s) => {
        const el = Math.floor((Date.now() - stepStart.current) / 1000);
        setStepElapsed((prev) => { const n = [...prev]; n[s] = el; return n; });
        stepStart.current = Date.now();
        if (s < STEPS.length - 1) {
          stepTimer = setTimeout(advanceStep, STEP_DURATIONS[s + 1] + Math.random() * 1500);
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
          clearInterval(poll); clearTimeout(stepTimer);
          setActiveStep(STEPS.length);
          setTimeout(() => router.push(`/${runId}/result`), 700);
        } else if (s.status === "failed") {
          clearInterval(poll); clearTimeout(stepTimer);
          setFailed(true);
          setErrMsg(s.error ?? "Unknown error.");
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => { clearInterval(poll); clearTimeout(stepTimer); };
  }, [runId, router]);

  const allDone = activeStep >= STEPS.length;
  const progressPct = Math.min(100, (activeStep / STEPS.length) * 100);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-surface">

      {/* Left sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full lg:w-64 bg-surface-container-lowest border-b lg:border-b-0 lg:border-r border-outline-variant px-5 py-6 flex flex-col shrink-0"
      >
        {/* Header */}
        <div className="mb-6 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>model_training</span>
            <h2 className="text-label-md text-primary font-bold uppercase tracking-wider">Pipeline Progress</h2>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm text-on-surface-variant">
              {allDone ? "Complete" : failed ? "Failed" : `Step ${Math.min(activeStep + 1, STEPS.length)} of ${STEPS.length}`}
            </span>
            <span className="text-label-sm text-on-surface-variant font-mono tabular-nums">{elapsed}s</span>
          </div>
          <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary-container rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {STEPS.map((step, i) => {
              const status: StepStatus =
                failed && activeStep === i ? "error" :
                activeStep > i ? "done" :
                activeStep === i ? "active" : "waiting";
              return (
                <SidebarStep key={step.key} step={step} index={i} status={status} isLast={i === STEPS.length - 1} />
              );
            })}
          </div>

          {failed && (
            <div className="mt-4 bg-error-container border border-error/20 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-label-md text-error font-bold">Run failed</p>
              <p className="text-label-sm text-on-surface-variant leading-relaxed">{errMsg}</p>
              <button
                onClick={() => router.push("/")}
                className="text-label-sm text-primary hover:underline"
              >
                ← Start over
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main: notebook cells */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {/* Notebook bar */}
          <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2 card-shadow shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error-pink/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning-orange/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-success-green/70" />
            </div>
            <span className="text-label-sm text-on-surface-variant font-mono truncate">
              automl_{runId?.slice(0, 8)}.ipynb
            </span>
            {!failed && !allDone && (
              <span className="ml-auto flex items-center gap-1.5 text-label-sm text-primary font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Running
              </span>
            )}
            {allDone && (
              <span className="ml-auto flex items-center gap-1.5 text-label-sm text-success-green font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
                Complete
              </span>
            )}
          </div>

          {/* Cells */}
          {STEPS.map((step, i) => {
            const status: StepStatus =
              failed && activeStep === i ? "error" :
              activeStep > i ? "done" :
              activeStep === i ? "active" : "waiting";
            return (
              <PipelineCell
                key={step.key}
                step={step}
                index={i}
                status={status}
                cellNumber={i + 1}
                elapsedAtDone={status === "done" ? stepElapsed[i] : undefined}
                expanded={expandedCells.has(i)}
                onToggle={() => toggleCell(i)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
