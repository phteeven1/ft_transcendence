import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="clay-footer mt-auto border-t border-border/60 px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <p className="font-heading text-center sm:text-left">
          © {year} Dicteé — vocabulary games for kids
        </p>
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="legal-footer-link">
            Privacy Policy
          </Link>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Link href="/terms" className="legal-footer-link">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
