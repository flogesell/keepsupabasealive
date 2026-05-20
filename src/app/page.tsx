import { Dashboard } from "@/components/dashboard";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[var(--supabase)]/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>
      <div className="relative flex-1">
        <Dashboard />
      </div>
      <SiteFooter />
    </main>
  );
}
