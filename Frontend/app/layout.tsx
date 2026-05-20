import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "AutoML Forge",
  description: "LLM-orchestrated AutoML: upload a CSV, get a ranked model with justification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface">
        <div className="flex h-dvh">
          <Sidebar />
          <div className="ml-64 flex flex-col flex-1 min-h-0">
            {/* Top App Bar */}
            <header className="h-16 flex items-center sticky top-0 z-40 bg-surface border-b border-outline-variant w-full px-gutter shrink-0">
              <div className="w-full flex justify-between items-center">
                {/* Search */}
                <div className="flex-1 flex items-center">
                  <div className="relative w-64">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: "20px" }}>search</span>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Search datasets..."
                      type="text"
                    />
                  </div>
                </div>
                {/* Center nav */}
                <div className="flex-1 flex justify-center items-center gap-6">
                  <h2 className="text-headline-md text-primary font-bold mr-4 hidden lg:block">Project: NeuralEngine_v2</h2>
                  <nav className="hidden md:flex gap-4">
                    <a className="text-label-md text-on-surface-variant hover:text-primary transition-all" href="#">Models</a>
                    <a className="text-label-md text-on-surface-variant hover:text-primary transition-all" href="#">Experiments</a>
                    <a className="text-label-md text-on-surface-variant hover:text-primary transition-all" href="#">Deployments</a>
                  </nav>
                </div>
                {/* Actions */}
                <div className="flex-1 flex justify-end items-center gap-4">
                  <button className="text-label-md text-primary border border-outline-variant px-4 py-1.5 rounded hover:bg-surface-purple-tint transition-all">Export</button>
                  <button className="text-label-md bg-primary-container text-on-primary px-4 py-1.5 rounded hover:bg-on-primary-fixed-variant transition-all">Deploy</button>
                  <div className="flex items-center gap-2 border-l border-outline-variant pl-4 ml-2">
                    <button className="text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant hover:border-primary transition-colors">
                      <span className="material-symbols-outlined text-outline">account_circle</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1 min-h-0 flex flex-col">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
