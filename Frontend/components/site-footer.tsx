export function SiteFooter() {
  return (
    <footer className="w-full bg-surface/70 backdrop-blur-md border-t border-outline-variant px-4 md:px-10 pt-5 pb-10 flex items-center justify-center gap-3 text-center whitespace-nowrap shrink-0">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest shrink-0">
        Made by
      </span>
      <a
        href="https://www.linkedin.com/in/khalid-al-dosari/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-container transition-colors shrink-0"
      >
        <i className="fab fa-linkedin text-[15px]" aria-hidden="true" />
        Khalid Al Dosari
      </a>
      <a
        href="https://www.linkedin.com/in/ahmed-alasmari-sa/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-container transition-colors shrink-0"
      >
        <i className="fab fa-linkedin text-[15px]" aria-hidden="true" />
        Ahmed Alasmari
      </a>
    </footer>
  );
}
