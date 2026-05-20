import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
};

/** Inline SVG so the logo always renders (no extra request / auth issues). */
export function Logo({ size = 40, className, showWordmark = false }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-3", className)}
      role="img"
      aria-label="KeepSupabaseAlive"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        <rect width="40" height="40" rx="10" fill="#12141a" />
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="9"
          stroke="#3ecf8e"
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />
        <path
          d="M8 24 L13 16 L18 26 L23 14 L28 24"
          stroke="#3ecf8e"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="13" r="3" fill="#3ecf8e" />
        <circle cx="30" cy="13" r="5" stroke="#3ecf8e" strokeOpacity="0.35" />
      </svg>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          KeepSupabaseAlive
        </span>
      )}
    </span>
  );
}
