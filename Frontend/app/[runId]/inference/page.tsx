"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getDeployment,
  getModelSchema,
  startDeploy,
  type Deployment,
  type ModelSchema,
} from "@/lib/api";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";

/* ─── Cloud deploy CTA shown until the model is live ── */
function DeployCallout({
  onDeploy,
  status,
  error,
}: {
  onDeploy: () => void;
  status: "idle" | "deploying" | "failed";
  error: string | null;
}) {
  const isDeploying = status === "deploying";
  const isFailed = status === "failed";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 card-shadow flex flex-col items-center justify-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-purple-tint flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: "34px" }}>cloud_upload</span>
      </div>

      <h2 className="text-2xl font-black text-on-background">Deploy your model to the cloud</h2>
      <p className="text-sm text-on-surface-variant mt-2 max-w-md">
        {isDeploying
          ? "Packaging the model into a fresh container. First-time builds usually take 30 to 90 seconds."
          : "We'll spin up a live container so you can start sending predictions in seconds."}
      </p>

      <button
        onClick={onDeploy}
        disabled={isDeploying}
        className={cn(
          "mt-6 px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
          isDeploying
            ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
            : "bg-primary text-on-primary hover:opacity-90 cursor-pointer shadow-sm"
        )}
      >
        {isDeploying ? (
          <>
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: "20px" }}>sync</span>
            Deploying…
          </>
        ) : isFailed ? (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span>
            Retry deployment
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>rocket_launch</span>
            Deploy model to the cloud
          </>
        )}
      </button>

      {error && (
        <div className="mt-5 p-4 bg-error/5 border border-error/30 rounded-lg text-left w-full max-w-md">
          <p className="text-xs font-bold text-error">Deployment failed</p>
          <p className="text-xs text-on-surface-variant mt-1 font-mono break-words">{error}</p>
        </div>
      )}
    </motion.section>
  );
}


/* ─── Inference page ── */
export default function InferencePage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydration-safe: window.location is only available client-side, and the QR
  // code needs a stable URL string so we set it once on mount.
  useEffect(() => {
    setShareUrl(`${window.location.origin}/share/${runId}`);
  }, [runId]);

  // Initial schema fetch - works as soon as model.joblib exists.
  useEffect(() => {
    getModelSchema(runId)
      .then((s) => {
        setSchema(s);
        setSchemaError(null);
      })
      .catch((e) => setSchemaError(e instanceof Error ? e.message : String(e)));
  }, [runId]);

  // Initial deployment fetch + auto-poll while deploying.
  useEffect(() => {
    getDeployment(runId).then(setDeployment).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId]);

  useEffect(() => {
    if (deployment?.status !== "deploying") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const d = await getDeployment(runId);
        setDeployment(d);
      } catch {
        /* transient */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deployment?.status, runId]);

  // Schema fetch failed - most likely the run hasn't finished yet.
  if (schemaError) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-surface select-none p-gutter">
        <span className="material-symbols-outlined text-outline" style={{ fontSize: "52px" }}>hourglass_empty</span>
        <h2 className="text-headline-md font-bold text-on-background">No model available yet</h2>
        <p className="text-sm text-on-surface-variant text-center max-w-md font-mono">
          Inference needs a trained model. Finish the training run for this dataset first, then come back here to deploy.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${runId}/result`)}
            className="text-xs font-bold text-primary border border-outline-variant px-5 py-2.5 rounded-lg hover:bg-surface-purple-tint/40 transition-all"
          >
            ← Back to Analytics
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-xs font-bold text-on-surface-variant border border-outline-variant px-5 py-2.5 rounded-lg hover:bg-surface-container transition-all"
          >
            Start New Run
          </button>
        </div>
      </div>
    );
  }

  const deployed = deployment?.status === "succeeded" && !!deployment.predict_url;
  const deployStatus: "idle" | "deploying" | "failed" =
    deployBusy || deployment?.status === "deploying"
      ? "deploying"
      : deployment?.status === "failed" || deployError
        ? "failed"
        : "idle";

  const onDeploy = async () => {
    setDeployError(null);
    setDeployBusy(true);
    try {
      const d = await startDeploy(runId);
      setDeployment(d);
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : "Failed to start deployment");
    } finally {
      setDeployBusy(false);
    }
  };

  const copyShareLink = async () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/share/${runId}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      /* clipboard blocked - ignore */
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-gutter relative select-none">
      <div className="max-w-[1280px] mx-auto w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left"
        >
          <div>
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-on-background mb-2">Inference</h1>
            <p className="text-body-md text-on-surface-variant">
              {deployed ? (
                <>
                  Congratulations,{" "}
                  <strong className="text-primary font-bold">{schema?.model_name ?? "Your model"}</strong>
                  {" "}is live. Send it a prediction or share it with friends below.
                </>
              ) : (
                <>
                  Deploy{" "}
                  <strong className="text-primary font-bold">{schema?.model_name ?? "the winning model"}</strong>
                  {" "}to the cloud, then send predictions from this page.
                </>
              )}
            </p>
          </div>

          <div className="shrink-0 flex justify-center md:justify-end">
            {deployed ? (
              <span className="bg-surface-green-tint text-success-green border border-success-green/10 px-5 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>bolt</span>
                Model Deployed
              </span>
            ) : (
              <span className="bg-surface-container text-on-surface-variant border border-outline-variant px-5 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>cloud_off</span>
                Not Deployed
              </span>
            )}
          </div>
        </motion.div>

        {deployed ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 card-shadow text-center"
          >
            {shareUrl && (
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="bg-white p-4 rounded-xl border border-outline-variant">
                  <QRCode
                    value={shareUrl}
                    size={176}
                    fgColor="#38009d"
                    bgColor="#ffffff"
                    level="M"
                  />
                </div>
                <p className="text-xs font-medium text-on-surface-variant max-w-xs">
                  Scan to open the live test page on any device.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={copyShareLink}
                className={cn(
                  "text-sm font-bold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border",
                  shareCopied
                    ? "bg-surface-green-tint text-success-green border-success-green/30"
                    : "text-on-surface-variant border-outline-variant hover:bg-surface-container"
                )}
                title="Copy a public link non-technical viewers can open"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  {shareCopied ? "check" : "share"}
                </span>
                {shareCopied ? "URL copied!" : "Copy shareable URL"}
              </button>
              <button
                onClick={() => router.push(`/share/${runId}`)}
                className="text-sm font-bold bg-primary text-on-primary border border-primary px-4 py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>open_in_new</span>
                Go to test page
              </button>
            </div>
          </motion.section>
        ) : (
          <DeployCallout
            onDeploy={onDeploy}
            status={deployStatus}
            error={deployError ?? deployment?.error ?? null}
          />
        )}
      </div>
    </div>
  );
}
