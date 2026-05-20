"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadCSV } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are supported right now.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadCSV(file);
      router.push(`/${res.run_id}/preview`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-gutter">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-headline-lg text-on-surface mb-2">Data Ingestion</h2>
            <p className="text-body-lg text-on-surface-variant">Upload and configure raw datasets for model training.</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full text-label-sm text-on-surface-variant border border-outline-variant">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>storage</span>
              Storage: 45% used
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Upload Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-headline-md text-on-surface">Upload CSV</h3>
                <button className="text-primary hover:bg-surface-purple-tint p-1 rounded transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>link</span>
                  <span className="text-label-md">Import via URL</span>
                </button>
              </div>

              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer group transition-colors duration-200 ${
                  dragging
                    ? "border-primary bg-surface-purple-tint"
                    : file
                    ? "border-primary bg-surface-purple-tint/30"
                    : "border-outline-variant bg-surface hover:border-primary"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById("csv-input-main")?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-surface-purple-tint flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "32px", fontVariationSettings: "'FILL' 1" }}
                  >
                    cloud_upload
                  </span>
                </div>
                {file ? (
                  <>
                    <h4 className="text-headline-md text-on-surface mb-2">{file.name}</h4>
                    <p className="text-body-md text-on-surface-variant mb-6">
                      {(file.size / 1024).toFixed(0)} KB · Ready to upload
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-headline-md text-on-surface mb-2">Drag &amp; Drop files here</h4>
                    <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md">
                      Supported formats: CSV, TSV, JSON (up to 500MB). Files will be securely parsed and validated upon upload.
                    </p>
                  </>
                )}
                <button
                  className="bg-surface-container-high text-on-surface text-label-md px-6 py-2 rounded border border-outline-variant group-hover:border-primary group-hover:text-primary transition-colors"
                  onClick={(e) => { e.stopPropagation(); document.getElementById("csv-input-main")?.click(); }}
                >
                  Browse Files
                </button>
                <input
                  id="csv-input-main"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            </div>

            {/* Configuration Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 card-shadow">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h3 className="text-headline-md text-on-surface">Ingestion Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Column - disabled until upload */}
                <div>
                  <label className="block text-label-md text-on-surface mb-2">Target Column (Prediction Goal)</label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 appearance-none text-body-md text-on-surface-variant cursor-not-allowed opacity-70"
                      disabled
                    >
                      <option>Awaiting dataset upload...</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">Select the variable the model will predict.</p>
                </div>

                {/* Missing Value Strategy */}
                <div>
                  <label className="block text-label-md text-on-surface mb-2">Missing Value Strategy</label>
                  <div className="relative">
                    <select className="w-full bg-surface border border-outline-variant rounded py-2 px-3 appearance-none text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                      <option value="mean">Impute with Mean (Numeric)</option>
                      <option value="median">Impute with Median (Numeric)</option>
                      <option value="mode">Impute with Mode (Categorical)</option>
                      <option value="drop_rows">Drop Rows</option>
                      <option value="flag">Flag as Missing (Indicator Column)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: "20px" }}>expand_more</span>
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">Default behavior for nulls during preprocessing.</p>
                </div>

                {/* Footer row */}
                <div className="md:col-span-2 pt-4 border-t border-surface-container-high flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      defaultChecked
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                      id="auto-detect"
                      type="checkbox"
                    />
                    <label className="text-body-md text-on-surface" htmlFor="auto-detect">Auto-detect datatypes</label>
                  </div>
                  <div className="flex items-center gap-4">
                    {error && <p className="text-sm text-error">{error}</p>}
                    <button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className={`bg-primary-container text-on-primary text-label-md px-6 py-2 rounded shadow-sm hover:bg-primary transition-colors flex items-center gap-2 ${
                        !file || uploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        {uploading ? "sync" : "play_arrow"}
                      </span>
                      {uploading ? "Uploading..." : "Start Ingestion"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Uploads */}
          <div className="xl:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col card-shadow max-h-[800px]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-bright rounded-t-xl">
              <h3 className="text-headline-md text-on-surface">Recent Uploads</h3>
              <button className="text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col gap-2">
                {/* Ready */}
                <li className="bg-surface p-4 rounded-lg border border-transparent hover:border-outline-variant transition-colors group flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-green-tint flex items-center justify-center text-success-green">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="text-label-md text-on-surface truncate w-40" title="customer_churn_Q3.csv">customer_churn_Q3.csv</h4>
                        <p className="text-label-sm text-on-surface-variant">12.4 MB · 2 hrs ago</p>
                      </div>
                    </div>
                    <button className="text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>more_vert</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-surface-green-tint text-success-green px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Ready
                    </span>
                    <span className="text-label-sm text-on-surface-variant">15,420 rows</span>
                  </div>
                </li>

                {/* Processing */}
                <li className="bg-surface p-4 rounded-lg border border-transparent hover:border-outline-variant transition-colors group flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined animate-spin" style={{ fontVariationSettings: "'wght' 300" }}>sync</span>
                      </div>
                      <div>
                        <h4 className="text-label-md text-on-surface truncate w-40">sensor_telemetry_raw.csv</h4>
                        <p className="text-label-sm text-on-surface-variant">450.2 MB · Just now</p>
                      </div>
                    </div>
                    <button className="text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>more_vert</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>hourglass_empty</span> Profiling...
                    </span>
                    <div className="w-24 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "45%" }} />
                    </div>
                  </div>
                </li>

                {/* Error */}
                <li className="bg-surface p-4 rounded-lg border border-transparent hover:border-outline-variant transition-colors group flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-error-container flex items-center justify-center text-error">
                        <span className="material-symbols-outlined">broken_image</span>
                      </div>
                      <div>
                        <h4 className="text-label-md text-on-surface truncate w-40">legacy_logs_2022.csv</h4>
                        <p className="text-label-sm text-on-surface-variant">8.1 MB · Yesterday</p>
                      </div>
                    </div>
                    <button className="text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all">
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>delete</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-error-container text-error px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span> Parsing Error
                    </span>
                    <a className="text-label-sm text-primary hover:underline" href="#">View Log</a>
                  </div>
                </li>

                {/* Ready 2 */}
                <li className="bg-surface p-4 rounded-lg border border-transparent hover:border-outline-variant transition-colors group flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface-green-tint flex items-center justify-center text-success-green">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="text-label-md text-on-surface truncate w-40">product_catalog_v2.csv</h4>
                        <p className="text-label-sm text-on-surface-variant">2.3 MB · Oct 24</p>
                      </div>
                    </div>
                    <button className="text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>more_vert</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-surface-green-tint text-success-green px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Ready
                    </span>
                    <span className="text-label-sm text-on-surface-variant">850 rows</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-bright rounded-b-xl text-center">
              <a className="text-label-md text-primary hover:text-on-primary-fixed-variant transition-colors" href="#">View All Datasets</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
