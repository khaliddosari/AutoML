"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getDeployment,
  getModelSchema,
  type Deployment,
  type ModelSchema,
} from "@/lib/api";
import { TryModelCard } from "@/components/try-model-card";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icon";

export default function PublicSharePage() {
  const { runId } = useParams<{ runId: string }>();

  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getModelSchema(runId)
      .then(setSchema)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
    getDeployment(runId)
      .then(setDeployment)
      .catch(() => {
        /* deployment may not exist - we show a friendly error below */
      });
  }, [runId]);

  const deployed = deployment?.status === "succeeded" && !!deployment.predict_url;

  return (
    <div className="min-h-dvh select-none flex flex-col">
      {/* Top bar */}
      <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between border-b border-outline-variant glass-strong">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(79,195,247,0.4)]">
            <Icon name="graph_3" className="text-on-primary" style={{ fontSize: "24px" }} />
          </div>
          <div className="leading-tight">
            <p className="text-xl text-on-background group-hover:text-primary transition-colors"><Brand /></p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Live AI Model</p>
          </div>
        </Link>
        <Link
          href="/"
          className="text-xs font-bold text-primary hover:underline hidden sm:flex items-center gap-1"
        >
          Build your own
          <Icon name="arrow_outward" style={{ fontSize: "13px" }} />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 py-10 md:py-14">
        <div className="w-full max-w-3xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-primary bg-surface-purple-tint inline-block px-2.5 py-1 rounded-full">
              Try this AI model
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-on-background mt-4 leading-tight">
              {schema ? (
                <>Predict <span className="text-primary">{humanize(schema.feature_cols.length, schema.problem_type)}</span></>
              ) : (
                "Loading model..."
              )}
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mt-3 max-w-xl mx-auto">
              {schema ? (
                <>
                  Powered by a <strong className="text-on-background">{schema.model_name ?? "machine learning"}</strong> model
                  {" "}trained on this dataset. Fill in the values, click Predict, and the model responds live.
                </>
              ) : (
                "Fetching the model schema..."
              )}
            </p>
          </motion.div>

          {/* Error states */}
          {loadError && (
            <div className="bg-error-container border border-error/30 rounded-xl p-5 text-center">
              <Icon name="error" className="text-error" style={{ fontSize: "32px" }} />
              <h3 className="text-sm font-bold text-on-background mt-2">Model unavailable</h3>
              <p className="text-xs text-on-surface-variant mt-1 font-mono break-words">{loadError}</p>
            </div>
          )}

          {/* The form */}
          {!loadError && (
            <TryModelCard runId={runId} schema={schema} deployed={deployed} variant="simple" />
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function humanize(featureCount: number, problemType?: string): string {
  if (problemType === "classification") return "a class";
  if (problemType === "regression") return "a value";
  return `from ${featureCount} features`;
}
