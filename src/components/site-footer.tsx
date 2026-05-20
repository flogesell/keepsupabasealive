import { Logo } from "@/components/logo";
import { APP_NAME, APP_REPOSITORY, APP_VERSION } from "@/lib/app-meta";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border/80 bg-background/80 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
        <Logo size={44} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">
            Version{" "}
            <span className="font-mono tabular-nums text-foreground/80">
              v{APP_VERSION}
            </span>
          </p>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Self-hosted health checks for free-tier Supabase projects. Not
          affiliated with Supabase.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <a
            href={APP_REPOSITORY}
            className="transition hover:text-[var(--supabase)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <span aria-hidden>·</span>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}
