import { RateLimitedView } from "@/components/rate-limited-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Too many attempts — KeepSupabaseAlive",
  description: "Login temporarily locked after too many failed authentication attempts.",
};

type Props = {
  searchParams: Promise<{ retry?: string }>;
};

export default async function RateLimitedPage({ searchParams }: Props) {
  const { retry } = await searchParams;
  const retryAfter = Math.max(0, Number(retry ?? 0));

  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-[var(--supabase)]/5 blur-3xl" />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <RateLimitedView retryAfter={retryAfter} />
      </div>
      <SiteFooter />
    </main>
  );
}
