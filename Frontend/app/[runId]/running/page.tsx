"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatus } from "@/lib/api";

const STEPS = [
  { key: "profile",            label: "Profiling dataset",           sub: "Inspecting columns, dtypes, missing values" },
  { key: "detect",             label: "Detecting problem type",       sub: "Regression or classification?" },
  { key: "eda",                label: "Exploratory data analysis",    sub: "Distributions, correlations, statistics" },
  { key: "feature_engineer",   label: "Feature engineering",          sub: "Imputing, encoding, cleaning" },
  { key: "train",              label: "Training model",               sub: "RandomForest with 5-fold cross-validation" },
  { key: "visualize",          label: "Generating visualization",     sub: "Building your result plot" },
];

type StepStatus = "waiting" | "active" | "done";

function useElapsed(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number>(Date.now());
  useEffect(() => {
    if (!running) return;
    start.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);
  return elapsed;
}

export default function RunningPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const elapsed = useElapsed(!failed);

  useEffect(() => {
    let stepTimer: ReturnType<typeof setTimeout>;
    let poll: ReturnType<typeof setInterval>;

    // Animate steps at roughly expected cadence while polling real status.
    const advanceSteps = () => {
      setActiveStep((s) => {
        if (s < STEPS.length - 1) {
          stepTimer = setTimeout(advanceSteps, 4500 + Math.random() * 2000);
          return s + 1;
        }
        return s;
      });
    };
    stepTimer = setTimeout(advanceSteps, 3000);

    poll = setInterval(async () => {
      try {
        const s = await getStatus(runId);
        if (s.status === "succeeded") {
          clearInterval(poll);
          clearTimeout(stepTimer);
          setActiveStep(STEPS.length); // all done
          setTimeout(() => router.push(`/${runId}/result`), 600);
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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-10">
      {/* Header */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold font-heading text-white">
          {failed ? "Run failed" : allDone ? "Almost there…" : "Running AutoML"}
        </h1>
        {!failed && (
          <p className="text-slate-500 text-sm">
            Elapsed: <span className="font-heading text-slate-300">{elapsed}s</span>
          </p>
        )}
      </motion.div>

      {/* Step list */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const status: StepStatus =
            activeStep > i ? "done" : activeStep === i ? "active" : "waiting";

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className={cn(
                "glass rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all duration-300",
                status === "active" && "border-brand-primary/40 glow-blue",
                status === "done" && "border-white/[0.06]",
                status === "waiting" && "opacity-40"
              )}
            >
              {/* Icon */}
              <div className="shrink-0">
                {failed && status === "active" ? (
                  <XCircle size={20} className="text-red-400" />
                ) : status === "done" ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : status === "active" ? (
                  <Loader2 size={20} className="animate-spin text-brand-primary" />
                ) : (
                  <Circle size={20} className="text-slate-700" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-heading font-medium leading-tight",
                  status === "active" ? "text-white" : status === "done" ? "text-slate-300" : "text-slate-600"
                )}>
                  {step.label}
                </p>
                <AnimatePresence>
                  {status === "active" && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-slate-500 mt-0.5"
                    >
                      {step.sub}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Step number */}
              <span className={cn(
                "text-xs font-heading shrink-0",
                status === "done" ? "text-emerald-500" : "text-slate-700"
              )}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Error */}
      <AnimatePresence>
        {failed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border-red-500/30 rounded-xl px-6 py-4 text-center max-w-md"
          >
            <p className="text-red-400 text-sm">{errMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-3 text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
