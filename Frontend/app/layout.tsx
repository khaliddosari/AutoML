import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface antialiased">
        <div className="flex h-dvh">
          <Sidebar />
          
          <div className="ml-64 flex flex-col flex-1 min-h-0">
            <main className="flex-1 min-h-0 flex flex-col">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
