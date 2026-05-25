import { Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-outline-variant/40 px-4 md:px-10 pt-5 pb-10 flex items-center justify-center gap-3 text-center whitespace-nowrap shrink-0">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest shrink-0">
        Made by
      </span>
      <a
        href="https://www.linkedin.com/in/khalid-al-dosari/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline shrink-0"
      >
        <Linkedin className="w-3.5 h-3.5" strokeWidth={2.5} />
        Khalid Al Dosari
      </a>
      <a
        href="https://www.linkedin.com/in/ahmed-alasmari-sa/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline shrink-0"
      >
        <Linkedin className="w-3.5 h-3.5" strokeWidth={2.5} />
        Ahmed Alasmari
      </a>
    </footer>
  );
}
